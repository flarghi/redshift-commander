import { Router } from 'express';
import { Pool } from 'pg';
import { RedshiftConnection, ApiResponse } from '../types';

export const connectRoutes = Router();

let currentConnection: Pool | null = null;
let connectionConfig: RedshiftConnection | null = null;

connectRoutes.post('/test', async (req, res) => {
  try {
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

connectRoutes.post('/', async (req, res) => {
  try {
    const config: RedshiftConnection = req.body;
    
    console.log('Connecting to Redshift:', {
      host: config.host,
      port: config.port,
      database: config.database,
      username: config.username,
      ssl: config.ssl
    });
    
    if (currentConnection) {
      await currentConnection.end();
    }

    currentConnection = new Pool({
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

    const client = await currentConnection.connect();
    const result = await client.query('SELECT current_database(), current_user');
    client.release();

    connectionConfig = config;

    console.log('Connection established successfully');
    const response: ApiResponse = {
      success: true,
      data: {
        database: result.rows[0].current_database,
        user: result.rows[0].current_user
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

connectRoutes.get('/status', (req, res) => {
  const response: ApiResponse = {
    success: true,
    data: {
      connected: currentConnection !== null,
      config: connectionConfig ? {
        host: connectionConfig.host,
        port: connectionConfig.port,
        database: connectionConfig.database,
        username: connectionConfig.username
      } : null
    }
  };
  res.json(response);
});

connectRoutes.delete('/', async (req, res) => {
  try {
    console.log('Attempting to disconnect from Redshift');
    
    if (currentConnection) {
      console.log('Closing existing connection pool');
      await currentConnection.end();
      currentConnection = null;
      connectionConfig = null;
      console.log('Connection pool closed successfully');
    } else {
      console.log('No active connection to disconnect');
    }
    
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

export { currentConnection };