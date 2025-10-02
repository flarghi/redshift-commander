import { Router } from 'express';
import { Pool } from 'pg';
import { RedshiftConnection, ApiResponse } from '../types';
import { serverSessionManager } from '../utils/serverSessionManager';
import { validateBody, validateQuery } from '../utils/validationMiddleware';
import { ConnectionConfigSchema, SessionIdSchema } from '../utils/validationSchemas';

export const connectRoutes = Router();

// Store connection pools by session ID
const connectionPools = new Map<string, Pool>();

connectRoutes.post('/test', validateBody(ConnectionConfigSchema), async (req, res) => {
  try {
    // Request body is now validated and typed by Zod
    const config: RedshiftConnection = req.body;
    
    console.log('Testing connection to:', {
      host: config.host,
      port: config.port,
      database: config.database,
      username: config.username,
      ssl: config.ssl
    });

    const testPool = new Pool({
      host: config.host,
      port: config.port,
      database: config.database,
      user: config.username,
      password: config.password,
      max: 1,
      connectionTimeoutMillis: 5000,
      ssl: config.ssl !== false
    });

    const client = await testPool.connect();
    const result = await client.query('SELECT version()');
    client.release();
    await testPool.end();

    console.log('Connection test successful');
    const response: ApiResponse = {
      success: true,
      data: { version: result.rows[0].version }
    };
    res.json(response);
  } catch (error) {
    console.error('Connection test failed:', {
      error: error instanceof Error ? error.message : 'Unknown error',
      code: error instanceof Error && 'code' in error ? error.code : undefined,
      detail: error instanceof Error && 'detail' in error ? error.detail : undefined,
      severity: error instanceof Error && 'severity' in error ? error.severity : undefined,
      stack: error instanceof Error ? error.stack : undefined
    });
    
    const response: ApiResponse = {
      success: false,
      error: error instanceof Error ? error.message : 'Connection failed'
    };
    res.status(400).json(response);
  }
});

connectRoutes.post('/', validateBody(ConnectionConfigSchema), async (req, res) => {
  try {
    // Request body is now validated and typed by Zod
    const config: RedshiftConnection = req.body;
    
    console.log('Connecting to Redshift:', {
      host: config.host,
      port: config.port,
      database: config.database,
      username: config.username,
      ssl: config.ssl
    });

    // Create connection pool
    const pool = new Pool({
      host: config.host,
      port: config.port,
      database: config.database,
      user: config.username,
      password: config.password,
      max: 10,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 10000,
      ssl: config.ssl !== false
    });

    // Test connection
    const client = await pool.connect();
    const result = await client.query('SELECT current_database(), current_user');
    client.release();

    // Create server-side session (password NOT stored)
    const sessionId = serverSessionManager.createSession(config);
    
    // Store connection pool
    connectionPools.set(sessionId, pool);

    console.log('Connection established successfully');
    const response: ApiResponse = {
      success: true,
      data: {
        sessionId,
        database: result.rows[0].current_database,
        user: result.rows[0].current_user,
        connectionInfo: {
          host: config.host,
          database: config.database,
          username: config.username,
          port: config.port,
          ssl: config.ssl
        }
      }
    };
    res.json(response);
  } catch (error) {
    console.error('Connection failed:', {
      error: error instanceof Error ? error.message : 'Unknown error',
      code: error instanceof Error && 'code' in error ? error.code : undefined,
      detail: error instanceof Error && 'detail' in error ? error.detail : undefined,
      severity: error instanceof Error && 'severity' in error ? error.severity : undefined,
      stack: error instanceof Error ? error.stack : undefined
    });
    
    const response: ApiResponse = {
      success: false,
      error: error instanceof Error ? error.message : 'Connection failed'
    };
    res.status(400).json(response);
  }
});

connectRoutes.get('/status', validateQuery(SessionIdSchema), (req, res) => {
  // Query is now validated and typed by Zod
  const { sessionId } = req.query as { sessionId: string };

  const session = serverSessionManager.getSession(sessionId);
  const pool = connectionPools.get(sessionId);

  if (!session || !pool) {
    return res.json({
      success: true,
      data: {
        connected: false,
        config: null
      }
    } as ApiResponse);
  }

  const response: ApiResponse = {
    success: true,
    data: {
      connected: true,
      config: session.connectionInfo
    }
  };
  res.json(response);
});

connectRoutes.delete('/', validateQuery(SessionIdSchema), async (req, res) => {
  try {
    // Query is now validated and typed by Zod
    const { sessionId } = req.query as { sessionId: string };

    console.log(`Attempting to disconnect session: ${sessionId.substring(0, 8)}...`);
    
    // Close connection pool
    const pool = connectionPools.get(sessionId);
    if (pool) {
      console.log('Closing connection pool');
      await pool.end();
      connectionPools.delete(sessionId);
    } else {
      console.log('No active connection pool found');
    }

    // Destroy session
    serverSessionManager.destroySession(sessionId);
    
    const response: ApiResponse = {
      success: true,
      data: { message: 'Disconnected' }
    };
    res.json(response);
  } catch (error) {
    console.error('Disconnect failed:', {
      error: error instanceof Error ? error.message : 'Unknown error',
      code: error instanceof Error && 'code' in error ? error.code : undefined,
      stack: error instanceof Error ? error.stack : undefined
    });
    
    const response: ApiResponse = {
      success: false,
      error: error instanceof Error ? error.message : 'Disconnect failed'
    };
    res.status(500).json(response);
  }
});

// Helper function to get connection pool by session ID
export function getConnectionBySessionId(sessionId: string): Pool | null {
  // Validate session is still active
  const session = serverSessionManager.getSession(sessionId);
  if (!session) {
    return null;
  }

  return connectionPools.get(sessionId) || null;
}