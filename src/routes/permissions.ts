import { Router } from 'express';
import { currentConnection } from './connect';
import { Permission, ApiResponse } from '../types';

export const permissionsRoutes = Router();

const requireConnection = (req: any, res: any, next: any) => {
  if (!currentConnection) {
    return res.status(400).json({
      success: false,
      error: 'No database connection established'
    });
  }
  next();
};

permissionsRoutes.get('/', requireConnection, async (req, res) => {
  try {
    const client = await currentConnection!.connect();
    
    // Try svv_relation_privileges first, fallback to information_schema if it doesn't exist
    let query = `
      SELECT 
        namespace_name as schema,
        relation_name as objectname,
        'table' as objecttype,
        identity_name as grantee,
        privilege_type as privilege,
        is_grantable as grantable
      FROM svv_relation_privileges 
      WHERE namespace_name NOT IN ('information_schema', 'pg_catalog', 'pg_toast')
        AND identity_type IN ('user', 'role', 'group')
        AND identity_name NOT IN ('rdsdb', 'awsuser')
      ORDER BY schema, objectname, grantee, privilege
    `;
    
    let result;
    try {
      result = await client.query(query);
    } catch (error: any) {
      // Fallback to information_schema if svv_relation_privileges doesn't exist
      if (error.message.includes('does not exist')) {
        query = `
          SELECT 
            table_schema as schema,
            table_name as objectname,
            'table' as objecttype,
            grantee,
            privilege_type as privilege,
            is_grantable as grantable
          FROM information_schema.table_privileges
          WHERE table_schema NOT IN ('information_schema', 'pg_catalog', 'pg_toast')
            AND grantee NOT IN ('rdsdb', 'awsuser')
          ORDER BY schema, objectname, grantee, privilege
        `;
        result = await client.query(query);
      } else {
        throw error;
      }
    }
    
    client.release();

    const permissions: Permission[] = result.rows.map(row => ({
      objectType: row.objecttype,
      objectName: row.objectname,
      schema: row.schema,
      grantee: row.grantee,
      privilege: row.privilege,
      grantable: row.grantable === 'true' || row.grantable === true
    }));

    const response: ApiResponse = {
      success: true,
      data: permissions
    };
    res.json(response);
  } catch (error) {
    const response: ApiResponse = {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to fetch permissions'
    };
    res.status(500).json(response);
  }
});

permissionsRoutes.get('/object/:schema/:objectName', requireConnection, async (req, res) => {
  try {
    const { schema, objectName } = req.params;
    const client = await currentConnection!.connect();
    
    let query = `
      SELECT 
        namespace_name as schema,
        relation_name as objectname,
        'table' as objecttype,
        identity_name as grantee,
        privilege_type as privilege,
        is_grantable as grantable
      FROM svv_relation_privileges 
      WHERE namespace_name = $1 
        AND relation_name = $2
        AND identity_type IN ('user', 'role', 'group')
        AND identity_name NOT IN ('rdsdb', 'awsuser')
      ORDER BY grantee, privilege
    `;
    
    let result;
    try {
      result = await client.query(query, [schema, objectName]);
    } catch (error: any) {
      // Fallback to information_schema if svv_relation_privileges doesn't exist
      if (error.message.includes('does not exist')) {
        query = `
          SELECT 
            table_schema as schema,
            table_name as objectname,
            'table' as objecttype,
            grantee,
            privilege_type as privilege,
            is_grantable as grantable
          FROM information_schema.table_privileges
          WHERE table_schema = $1 
            AND table_name = $2
            AND grantee NOT IN ('rdsdb', 'awsuser')
          ORDER BY grantee, privilege
        `;
        result = await client.query(query, [schema, objectName]);
      } else {
        throw error;
      }
    }
    
    client.release();

    const permissions: Permission[] = result.rows.map(row => ({
      objectType: row.objecttype,
      objectName: row.objectname,
      schema: row.schema,
      grantee: row.grantee,
      privilege: row.privilege,
      grantable: row.grantable === 'true' || row.grantable === true
    }));

    const response: ApiResponse = {
      success: true,
      data: permissions
    };
    res.json(response);
  } catch (error) {
    const response: ApiResponse = {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to fetch object permissions'
    };
    res.status(500).json(response);
  }
});