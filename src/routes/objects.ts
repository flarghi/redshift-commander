import { Router } from 'express';
import { currentConnection } from './connect';
import { DatabaseObject, ApiResponse } from '../types';

export const objectsRoutes = Router();

const requireConnection = (req: any, res: any, next: any) => {
  if (!currentConnection) {
    return res.status(400).json({
      success: false,
      error: 'No database connection established'
    });
  }
  next();
};

objectsRoutes.get('/schemas', requireConnection, async (req, res) => {
  try {
    const client = await currentConnection!.connect();
    
    const query = `
      SELECT 
        schema_name as name,
        schema_owner as owner
      FROM svv_all_schemas 
      WHERE schema_name NOT IN ('information_schema', 'pg_catalog', 'pg_toast')
        AND database_name = current_database()
      ORDER BY schema_name
    `;
    
    const result = await client.query(query);
    client.release();

    const schemas: DatabaseObject[] = result.rows.map(row => ({
      type: 'schema' as const,
      name: row.name,
      children: []
    }));

    const response: ApiResponse = {
      success: true,
      data: schemas
    };
    res.json(response);
  } catch (error) {
    const response: ApiResponse = {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to fetch schemas'
    };
    res.status(500).json(response);
  }
});

objectsRoutes.get('/tables/:schema', requireConnection, async (req, res) => {
  try {
    const { schema } = req.params;
    const client = await currentConnection!.connect();
    
    const query = `
      SELECT 
        t.table_name as name,
        CASE 
          WHEN v.viewname IS NOT NULL THEN 'view'
          ELSE 'table'
        END as type,
        t.schema_name as schema
      FROM svv_all_tables t
      LEFT JOIN pg_views v ON t.table_name = v.viewname AND t.schema_name = v.schemaname
      WHERE t.schema_name = $1 
        AND t.database_name = current_database()
      ORDER BY name
    `;
    
    const result = await client.query(query, [schema]);
    client.release();

    const objects: DatabaseObject[] = result.rows.map(row => ({
      type: row.type as 'table' | 'view',
      name: row.name,
      schema: row.schema
    }));

    const response: ApiResponse = {
      success: true,
      data: objects
    };
    res.json(response);
  } catch (error) {
    const response: ApiResponse = {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to fetch tables'
    };
    res.status(500).json(response);
  }
});

objectsRoutes.get('/functions/:schema', requireConnection, async (req, res) => {
  try {
    const { schema } = req.params;
    const client = await currentConnection!.connect();
    
    const query = `
      SELECT 
        proname as name,
        nspname as schema
      FROM pg_proc p
      JOIN pg_namespace n ON p.pronamespace = n.oid
      WHERE nspname = $1
      ORDER BY proname
    `;
    
    const result = await client.query(query, [schema]);
    client.release();

    const functions: DatabaseObject[] = result.rows.map(row => ({
      type: 'function' as const,
      name: row.name,
      schema: row.schema
    }));

    const response: ApiResponse = {
      success: true,
      data: functions
    };
    res.json(response);
  } catch (error) {
    const response: ApiResponse = {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to fetch functions'
    };
    res.status(500).json(response);
  }
});

// Fast endpoint to get only schema names (for initial load)
objectsRoutes.get('/schemas-only', requireConnection, async (req, res) => {
  try {
    const client = await currentConnection!.connect();
    
    const query = `
      SELECT 
        schema_name as name,
        schema_owner as owner
      FROM svv_all_schemas 
      WHERE schema_name NOT IN ('information_schema', 'pg_catalog', 'pg_toast')
        AND database_name = current_database()
      ORDER BY schema_name
      LIMIT 100
    `;
    
    const result = await client.query(query);
    client.release();

    const schemas: DatabaseObject[] = result.rows.map(row => ({
      type: 'schema' as const,
      name: row.name,
      children: [] // Empty children for fast loading
    }));

    const response: ApiResponse = {
      success: true,
      data: schemas
    };
    res.json(response);
  } catch (error) {
    const response: ApiResponse = {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to fetch schemas'
    };
    res.status(500).json(response);
  }
});

objectsRoutes.get('/roles', requireConnection, async (req, res) => {
  try {
    const client = await currentConnection!.connect();
    
    const query = `
      SELECT 
        role_name as name
      FROM svv_roles 
      WHERE role_name NOT LIKE 'pg_%'
        AND role_name NOT LIKE 'rs_%'
        AND role_name NOT LIKE 'rds%'
      ORDER BY role_name
    `;
    
    const result = await client.query(query);
    
    client.release();

    const roles: DatabaseObject[] = result.rows.map(row => ({
      type: 'role' as const,
      name: row.name
    }));

    const response: ApiResponse = {
      success: true,
      data: roles
    };
    res.json(response);
  } catch (error) {
    const response: ApiResponse = {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to fetch roles'
    };
    res.status(500).json(response);
  }
});

objectsRoutes.get('/hierarchy', requireConnection, async (req, res) => {
  try {
    const client = await currentConnection!.connect();
    
    // Check for limit parameter to avoid loading too many objects
    const limit = parseInt(req.query.limit as string) || 1000; // Default limit of 1000 objects per schema
    
    // Single optimized query to get all schemas and their objects with limits
    const query = `
      WITH schemas AS (
        SELECT schema_name
        FROM svv_all_schemas 
        WHERE schema_name NOT IN ('information_schema', 'pg_catalog', 'pg_toast')
          AND database_name = current_database()
        ORDER BY schema_name
        LIMIT 50  -- Limit schemas to avoid massive results
      ),
      limited_objects AS (
        SELECT 
          t.schema_name,
          t.table_name as object_name,
          CASE 
            WHEN v.viewname IS NOT NULL THEN 'view'
            ELSE 'table'
          END as object_type,
          ROW_NUMBER() OVER (PARTITION BY t.schema_name ORDER BY t.table_name) as rn
        FROM svv_all_tables t
        LEFT JOIN pg_views v ON t.table_name = v.viewname AND t.schema_name = v.schemaname
        WHERE EXISTS (SELECT 1 FROM schemas s WHERE s.schema_name = t.schema_name)
          AND t.database_name = current_database()
      )
      SELECT 
        s.schema_name,
        o.object_name,
        o.object_type
      FROM schemas s
      LEFT JOIN limited_objects o ON s.schema_name = o.schema_name AND o.rn <= $1
      ORDER BY s.schema_name, o.object_name
    `;
    
    const result = await client.query(query, [limit]);
    client.release();
    
    // Group results by schema
    const schemaMap = new Map<string, DatabaseObject>();
    
    for (const row of result.rows) {
      if (!schemaMap.has(row.schema_name)) {
        schemaMap.set(row.schema_name, {
          type: 'schema',
          name: row.schema_name,
          children: []
        });
      }
      
      // Add object if it exists (LEFT JOIN may return null objects for empty schemas)
      if (row.object_name) {
        const schema = schemaMap.get(row.schema_name)!;
        schema.children!.push({
          type: row.object_type as 'table' | 'view',
          name: row.object_name,
          schema: row.schema_name
        });
      }
    }
    
    const hierarchy = Array.from(schemaMap.values());

    const response: ApiResponse = {
      success: true,
      data: hierarchy
    };
    res.json(response);
  } catch (error) {
    const response: ApiResponse = {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to fetch object hierarchy'
    };
    res.status(500).json(response);
  }
});