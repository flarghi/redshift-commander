import { Router } from 'express';
import { currentConnection } from './connect';
import { ApiResponse } from '../types';

export const previewRoutes = Router();

const requireConnection = (req: any, res: any, next: any) => {
  console.log('Checking database connection...');
  if (!currentConnection) {
    console.log('No database connection established');
    return res.status(400).json({
      success: false,
      error: 'No database connection established'
    });
  }
  console.log('Database connection exists');
  next();
};

interface CurrentPermission {
  objectType: 'schema' | 'table' | 'view';
  objectName: string;
  schema?: string;
  privilege: string;
  hasPermission: boolean;
  adminOption: boolean;
  privilegeScope?: string;
  identity?: string; // Added to track which identity the permission belongs to
  owner?: string; // Added for default privileges to track owner
  ownerType?: string; // Added for default privileges to track owner type
}

// Get specific privileges for an identity on a particular object using SHOW GRANTS
previewRoutes.get('/permissions/:identityName/:objectType/:schemaName/:objectName?', requireConnection, async (req, res) => {
  try {
    const { identityName, objectType, schemaName, objectName } = req.params;
    
    const trimmedIdentityName = identityName.trim();
    const trimmedSchemaName = schemaName.trim();
    const trimmedObjectName = objectName ? objectName.trim() : objectName;
    
    console.log(`SHOW GRANTS query for:`, {
      identityName: trimmedIdentityName,
      objectType,
      schemaName: trimmedSchemaName,
      objectName: trimmedObjectName
    });
    
    const client = await currentConnection!.connect();
    
    // Use SHOW GRANTS FOR query to get privileges for the specific identity
    // Note: For this endpoint, we don't have identity type info, so we'll try both formats
    const showGrantsQuery = `SHOW GRANTS FOR ${trimmedIdentityName}`;
    console.log(`Executing SHOW GRANTS query: ${showGrantsQuery}`);
    
    let result;
    try {
      result = await client.query(showGrantsQuery);
    } catch (error: any) {
      console.log(`SHOW GRANTS error for ${trimmedIdentityName}:`, error.message);
      // Try with ROLE prefix in case it's a role identity
      try {
        const roleQuery = `SHOW GRANTS FOR ROLE ${trimmedIdentityName}`;
        console.log(`Trying SHOW GRANTS with ROLE: ${roleQuery}`);
        result = await client.query(roleQuery);
      } catch (roleError: any) {
        console.log(`SHOW GRANTS with ROLE also failed:`, roleError.message);
        // If both SHOW GRANTS attempts fail, fall back to system views
        if (objectType === 'schema') {
        const fallbackQuery = `
          SELECT DISTINCT
            'schema' as object_type,
            table_schema as object_name,
            table_schema as schema_name,
            'USAGE' as privilege,
            true as has_permission,
            is_grantable = 'YES' as admin_option,
            'schema' as privilege_scope
          FROM information_schema.usage_privileges
          WHERE object_schema = $1 
            AND grantee = $2
            AND object_type = 'SCHEMA'
        `;
        result = await client.query(fallbackQuery, [trimmedSchemaName, trimmedIdentityName]);
      } else {
        const fallbackQuery = `
          SELECT 
            '${objectType}' as object_type,
            table_name as object_name,
            table_schema as schema_name,
            privilege_type as privilege,
            true as has_permission,
            is_grantable = 'YES' as admin_option,
            'table' as privilege_scope
          FROM information_schema.table_privileges
          WHERE table_schema = $1 
            AND table_name = $2
            AND grantee = $3
        `;
        result = await client.query(fallbackQuery, [trimmedSchemaName, trimmedObjectName || '', trimmedIdentityName]);
        }
      }
    }
    
    console.log(`SHOW GRANTS result:`, result.rows);
    
    // Parse SHOW GRANTS results - they come as structured objects, not DDL text
    const permissions: CurrentPermission[] = [];
    
    if (result.rows && result.rows.length > 0) {
      result.rows.forEach(row => {
        // SHOW GRANTS returns structured data with these fields:
        // database_name, schema_name, object_name, object_type, privilege_type, 
        // identity_id, identity_name, identity_type, privilege_scope
        
        // Filter for grants related to our specific schema/object
        if (objectType === 'schema' && row.schema_name === trimmedSchemaName && 
            row.identity_name === trimmedIdentityName) {
          permissions.push({
            objectType: 'schema',
            objectName: row.schema_name,
            schema: row.schema_name,
            privilege: row.privilege_type,
            hasPermission: true,
            adminOption: false, // SHOW GRANTS doesn't show admin option directly
            privilegeScope: row.privilege_scope || 'schema',
            identity: row.identity_name
          });
        } else if (objectType !== 'schema' && trimmedObjectName && 
                   row.schema_name === trimmedSchemaName && 
                   row.object_name === trimmedObjectName &&
                   row.identity_name === trimmedIdentityName) {
          permissions.push({
            objectType: row.object_type.toLowerCase() as 'table' | 'view',
            objectName: row.object_name,
            schema: row.schema_name,
            privilege: row.privilege_type,
            hasPermission: true,
            adminOption: false, // SHOW GRANTS doesn't show admin option directly
            privilegeScope: row.privilege_scope || 'relation',
            identity: row.identity_name
          });
        }
      });
    }
    
    client.release();

    console.log(`Parsed permissions:`, permissions);

    const response: ApiResponse = {
      success: true,
      data: permissions
    };
    res.json(response);
  } catch (error) {
    const response: ApiResponse = {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to fetch current privileges'
    };
    res.status(500).json(response);
  }
});

// Get summary of all permissions for an identity across all objects using SHOW GRANTS
previewRoutes.get('/permissions-summary/:identityName', requireConnection, async (req, res) => {
  try {
    const { identityName } = req.params;
    const trimmedIdentityName = identityName.trim();
    
    console.log(`SHOW GRANTS summary for identity: ${trimmedIdentityName}`);
    
    const client = await currentConnection!.connect();
    
    // Get current database name for database privileges filtering
    let currentDatabaseName = '';
    try {
      const dbResult = await client.query('SELECT current_database() as db_name');
      currentDatabaseName = dbResult.rows[0]?.db_name || '';
      console.log(`Current database for summary: ${currentDatabaseName}`);
    } catch (error: any) {
      console.log(`Failed to get current database name for summary:`, error.message);
    }
    
    // Use SHOW GRANTS FOR query to get all privileges for the identity
    // Note: For this endpoint, we don't have identity type info, so we'll try both formats
    const showGrantsQuery = `SHOW GRANTS FOR ${trimmedIdentityName}`;
    console.log(`Executing SHOW GRANTS query: ${showGrantsQuery}`);
    
    let result;
    try {
      result = await client.query(showGrantsQuery);
    } catch (error: any) {
      console.log(`SHOW GRANTS error for ${trimmedIdentityName}:`, error.message);
      // Try with ROLE prefix in case it's a role identity
      try {
        const roleQuery = `SHOW GRANTS FOR ROLE ${trimmedIdentityName}`;
        console.log(`Trying SHOW GRANTS with ROLE: ${roleQuery}`);
        result = await client.query(roleQuery);
      } catch (roleError: any) {
        console.log(`SHOW GRANTS with ROLE also failed:`, roleError.message);
        // Fall back to information_schema
        const fallbackQuery = `
        SELECT 
          'table' as object_type,
          table_name as object_name,
          table_schema as schema_name,
          privilege_type as privilege,
          is_grantable = 'YES' as admin_option,
          'table' as privilege_scope
        FROM information_schema.table_privileges
        WHERE grantee = $1
        ORDER BY table_schema, table_name, privilege_type
      `;
        result = await client.query(fallbackQuery, [trimmedIdentityName]);
      }
    }
    
    console.log(`SHOW GRANTS summary result:`, result.rows);
    
    // Parse all SHOW GRANTS results - they come as structured objects
    const permissions: CurrentPermission[] = [];
    
    if (result.rows && result.rows.length > 0) {
      result.rows.forEach(row => {
        // SHOW GRANTS returns structured data with these fields:
        // database_name, schema_name, object_name, object_type, privilege_type, 
        // identity_id, identity_name, identity_type, privilege_scope
        
        if (row.identity_name === trimmedIdentityName) {
          // Handle schema privileges
          if (row.privilege_scope === 'SCHEMA' || 
              (row.object_type === 'SCHEMA' && row.schema_name)) {
            permissions.push({
              objectType: 'schema',
              objectName: row.schema_name,
              schema: row.schema_name,
              privilege: row.privilege_type,
              hasPermission: true,
              adminOption: false, // SHOW GRANTS doesn't show admin option directly
              privilegeScope: 'schema',
              identity: row.identity_name
            });
          }
          // Handle table/view privileges  
          else if (row.privilege_scope === 'TABLE' || row.object_type === 'TABLE' || row.object_type === 'VIEW') {
            permissions.push({
              objectType: row.object_type.toLowerCase() as 'table' | 'view',
              objectName: row.object_name,
              schema: row.schema_name,
              privilege: row.privilege_type,
              hasPermission: true,
              adminOption: false, // SHOW GRANTS doesn't show admin option directly
              privilegeScope: 'relation',
              identity: row.identity_name
            });
          }
          // Handle database privileges (filter for current database only)
          else if (row.privilege_scope === 'DATABASE' || row.object_type === 'DATABASE') {
            // Only include privileges for the current connected database
            if (row.database_name === currentDatabaseName) {
              permissions.push({
                objectType: 'schema', // Database shown as schema in UI
                objectName: row.database_name || row.object_name,
                schema: row.database_name || row.object_name,
                privilege: row.privilege_type,
                hasPermission: true,
                adminOption: false, // SHOW GRANTS doesn't show admin option directly
                privilegeScope: 'database',
                identity: row.identity_name
              });
            }
          }
        }
      });
    }
    
    client.release();

    console.log(`Parsed permissions summary:`, permissions);

    const response: ApiResponse = {
      success: true,
      data: permissions
    };
    res.json(response);
  } catch (error) {
    const response: ApiResponse = {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to fetch permissions summary'
    };
    res.status(500).json(response);
  }
});

// Get role grants for a specific identity and role using SVV queries
previewRoutes.get('/role-grants/:identityName/:roleName', requireConnection, async (req, res) => {
  try {
    const { identityName, roleName } = req.params;
    const trimmedIdentityName = identityName.trim();
    const trimmedRoleName = roleName.trim();
    
    console.log(`SVV role check for identity: ${trimmedIdentityName}, role: ${trimmedRoleName}`);
    
    const client = await currentConnection!.connect();
    
    let hasRole = false;
    let adminOption = false;
    
    try {
      // First check user role grants
      const userRoleQuery = `
        SELECT user_name, role_name 
        FROM svv_user_grants 
        WHERE user_name = $1 AND role_name = $2
      `;
      console.log(`Executing user role query: ${userRoleQuery} with params: [${trimmedIdentityName}, ${trimmedRoleName}]`);
      const userRoleResult = await client.query(userRoleQuery, [trimmedIdentityName, trimmedRoleName]);
      console.log(`User role result:`, userRoleResult.rows);
      
      if (userRoleResult.rows && userRoleResult.rows.length > 0) {
        hasRole = true;
      } else {
        // If not found in user grants, check role-to-role grants
        const roleRoleQuery = `
          SELECT role_name, granted_role_name 
          FROM svv_role_grants 
          WHERE role_name = $1 AND granted_role_name = $2
        `;
        console.log(`Executing role-to-role query: ${roleRoleQuery} with params: [${trimmedIdentityName}, ${trimmedRoleName}]`);
        const roleRoleResult = await client.query(roleRoleQuery, [trimmedIdentityName, trimmedRoleName]);
        console.log(`Role-to-role result:`, roleRoleResult.rows);
        
        if (roleRoleResult.rows && roleRoleResult.rows.length > 0) {
          hasRole = true;
        }
      }
    } catch (error: any) {
      console.log(`SVV role queries error:`, error.message);
      // If SVV queries fail, return no role
      hasRole = false;
    }
    
    client.release();

    console.log(`Role grant result - hasRole: ${hasRole}, adminOption: ${adminOption}`);

    const response: ApiResponse = {
      success: true,
      data: { hasRole, adminOption }
    };
    res.json(response);
  } catch (error) {
    const response: ApiResponse = {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to fetch role grants'
    };
    res.status(500).json(response);
  }
});

// Get filtered permissions for multiple identities and objects using SHOW GRANTS
previewRoutes.post('/permissions-filtered', requireConnection, async (req, res) => {
  try {
    const { identities, objects, action, allTablesSelection } = req.body;
    
    console.log(`SHOW GRANTS filtered query for:`, {
      identities: identities?.map((i: any) => i.name),
      objects: objects?.map((o: any) => `${o.schema || ''}.${o.name}`),
      action,
      allTablesSelection: allTablesSelection || []
    });
    
    if (!identities || !Array.isArray(identities) || identities.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'At least one identity must be selected'
      });
    }
    
    const client = await currentConnection!.connect();
    const allPermissions: CurrentPermission[] = [];
    
    // Get current database name for database privileges filtering
    let currentDatabaseName = '';
    try {
      const dbResult = await client.query('SELECT current_database() as db_name');
      currentDatabaseName = dbResult.rows[0]?.db_name || '';
      console.log(`Current database: ${currentDatabaseName}`);
    } catch (error: any) {
      console.log(`Failed to get current database name:`, error.message);
    }
    
    // For default privileges, use svv_default_privileges instead of SHOW GRANTS
    if (action === 'default_privileges') {
      console.log(`Using svv_default_privileges for default privileges action`);
      
      try {
        // Query svv_default_privileges for all selected identities
        const identityNames = identities.map(id => `'${id.name.trim()}'`).join(',');
        const defaultPrivilegesQuery = `
          SELECT 
            schema_name,
            object_type,
            owner_id,
            owner_name,
            owner_type,
            privilege_type,
            grantee_id,
            grantee_name,
            grantee_type,
            admin_option
          FROM svv_default_privileges 
          WHERE grantee_name IN (${identityNames})
        `;
        
        console.log(`Executing svv_default_privileges query: ${defaultPrivilegesQuery}`);
        const result = await client.query(defaultPrivilegesQuery);
        console.log(`svv_default_privileges result:`, result.rows);
        
        if (result.rows && result.rows.length > 0) {
          result.rows.forEach(row => {
            // Filter by selected schemas if any
            const shouldInclude = !objects || objects.length === 0 || 
              objects.some((obj: any) => obj.type === 'schema' && obj.name === row.schema_name);
            
            if (shouldInclude) {
              allPermissions.push({
                objectType: 'schema', // Default privileges are schema-level
                objectName: row.schema_name,
                schema: row.schema_name,
                privilege: row.privilege_type,
                hasPermission: true,
                adminOption: row.admin_option === true || row.admin_option === 't',
                privilegeScope: 'default',
                identity: row.grantee_name,
                owner: row.owner_name,
                ownerType: row.owner_type
              } as CurrentPermission & { identity: string; owner?: string; ownerType?: string });
            }
          });
        }
      } catch (error: any) {
        console.log(`svv_default_privileges error:`, error.message);
        // If svv_default_privileges fails, continue without default privileges
      }
    } else if (action === 'role') {
      // For role action, use SVV queries instead of SHOW GRANTS
      console.log(`Using SVV queries for role action`);
      
      try {
        // Get user role grants
        const userRoleQuery = `SELECT user_name, role_name FROM svv_user_grants`;
        console.log(`Executing user role query: ${userRoleQuery}`);
        const userRoleResult = await client.query(userRoleQuery);
        console.log(`User role result:`, userRoleResult.rows);
        
        // Get role to role grants
        const roleRoleQuery = `SELECT role_name, granted_role_name FROM svv_role_grants`;
        console.log(`Executing role-to-role query: ${roleRoleQuery}`);
        const roleRoleResult = await client.query(roleRoleQuery);
        console.log(`Role-to-role result:`, roleRoleResult.rows);
        
        // Process user role grants
        if (userRoleResult.rows && userRoleResult.rows.length > 0) {
          userRoleResult.rows.forEach(row => {
            // Check if this user is in our selected identities and role is in selected objects
            const isSelectedIdentity = identities.some(id => id.name === row.user_name);
            const isSelectedRole = !objects || objects.length === 0 || 
              objects.some((obj: any) => obj.name === row.role_name);
            
            if (isSelectedIdentity && isSelectedRole) {
              allPermissions.push({
                objectType: 'schema', // Role shown as schema in UI
                objectName: row.role_name,
                schema: row.role_name,
                privilege: 'MEMBER',
                hasPermission: true,
                adminOption: false,
                privilegeScope: 'role',
                identity: row.user_name
              } as CurrentPermission & { identity: string });
            }
          });
        }
        
        // Process role to role grants
        if (roleRoleResult.rows && roleRoleResult.rows.length > 0) {
          roleRoleResult.rows.forEach(row => {
            // Check if this role is in our selected identities and granted role is in selected objects
            const isSelectedIdentity = identities.some(id => id.name === row.role_name);
            const isSelectedRole = !objects || objects.length === 0 || 
              objects.some((obj: any) => obj.name === row.granted_role_name);
            
            if (isSelectedIdentity && isSelectedRole) {
              allPermissions.push({
                objectType: 'schema', // Role shown as schema in UI
                objectName: row.granted_role_name,
                schema: row.granted_role_name,
                privilege: 'MEMBER',
                hasPermission: true,
                adminOption: false,
                privilegeScope: 'role',
                identity: row.role_name
              } as CurrentPermission & { identity: string });
            }
          });
        }
      } catch (error: any) {
        console.log(`SVV role queries error:`, error.message);
        // If SVV queries fail, continue without role privileges
      }
    } else {
      // For non-default and non-role privileges, use SHOW GRANTS for each identity
      for (const identity of identities) {
        const trimmedIdentityName = identity.name.trim();
        // Add ROLE keyword for role identities
        const identityForQuery = identity.type === 'role' ? `ROLE ${trimmedIdentityName}` : trimmedIdentityName;
        const showGrantsQuery = `SHOW GRANTS FOR ${identityForQuery}`;
        console.log(`Executing SHOW GRANTS query: ${showGrantsQuery}`);
        
        try {
          const result = await client.query(showGrantsQuery);
          console.log(`SHOW GRANTS result for ${trimmedIdentityName}:`, result.rows);
        
        if (result.rows && result.rows.length > 0) {
          result.rows.forEach(row => {
            // SHOW GRANTS returns structured data with these fields:
            // database_name, schema_name, object_name, object_type, privilege_type, 
            // identity_id, identity_name, identity_type, privilege_scope
            
            if (row.identity_name === trimmedIdentityName) {
              // For database_privileges action, ONLY show DATABASE privileges
              if (action === 'database_privileges') {
                if (row.privilege_scope === 'DATABASE' && row.database_name === currentDatabaseName) {
                  allPermissions.push({
                    objectType: 'schema', // Database shown as schema in UI
                    objectName: row.database_name,
                    schema: row.database_name,
                    privilege: row.privilege_type,
                    hasPermission: true,
                    adminOption: false, // SHOW GRANTS doesn't show admin option directly
                    privilegeScope: 'database',
                    identity: trimmedIdentityName
                  } as CurrentPermission & { identity: string });
                }
              }
              // For role action, ONLY show ROLE privileges
              else if (action === 'role') {
                if (row.privilege_scope === 'ROLE') {
                  // Filter by selected target roles if any
                  const shouldInclude = !objects || objects.length === 0 || 
                    objects.some((obj: any) => obj.name === row.object_name);
                  
                  if (shouldInclude) {
                    allPermissions.push({
                      objectType: 'schema', // Role shown as schema in UI
                      objectName: row.object_name,
                      schema: row.object_name,
                      privilege: 'MEMBER',
                      hasPermission: true,
                      adminOption: false, // SHOW GRANTS doesn't show admin option directly
                      privilegeScope: 'role',
                      identity: trimmedIdentityName
                    } as CurrentPermission & { identity: string });
                  }
                }
              }
              // For other actions (schema_privileges, privileges), show schema and table privileges
              else {
                // Handle schema privileges
                if (row.privilege_scope === 'SCHEMA' || 
                    (row.object_type === 'SCHEMA' && row.schema_name)) {
                  // Filter by selected objects if any
                  const shouldInclude = !objects || objects.length === 0 || 
                    objects.some((obj: any) => obj.type === 'schema' && obj.name === row.schema_name);
                  
                  if (shouldInclude) {
                    allPermissions.push({
                      objectType: 'schema',
                      objectName: row.schema_name,
                      schema: row.schema_name,
                      privilege: row.privilege_type,
                      hasPermission: true,
                      adminOption: false, // SHOW GRANTS doesn't show admin option directly
                      privilegeScope: 'schema',
                      identity: trimmedIdentityName
                    } as CurrentPermission & { identity: string });
                  }
                }
                
                // Handle table/view privileges  
                else if (row.privilege_scope === 'TABLE' || row.object_type === 'TABLE' || row.object_type === 'VIEW') {
                  // For 'privileges' action (table privileges mode), only show permissions for selected objects
                  const hasObjectSelections = objects && objects.length > 0;
                  const hasAllTablesSelections = allTablesSelection && allTablesSelection.length > 0;
                  
                  let shouldInclude = false;
                  
                  if (action === 'privileges' && (hasObjectSelections || hasAllTablesSelections)) {
                    // Strict filtering for table privileges mode - only show selected objects
                    shouldInclude = objects.some((obj: any) => 
                      (obj.type === 'table' || obj.type === 'view') && 
                      obj.name === row.object_name &&
                      (!obj.schema || obj.schema === row.schema_name)
                    ) ||
                    // Include if the schema is in allTablesSelection (whole schema selected)
                    (allTablesSelection && allTablesSelection.includes(row.schema_name));
                  } else {
                    // For other actions, use original logic
                    shouldInclude = !objects || objects.length === 0 || 
                      objects.some((obj: any) => 
                        (obj.type === 'table' || obj.type === 'view') && 
                        obj.name === row.object_name &&
                        (!obj.schema || obj.schema === row.schema_name)
                      ) ||
                      // Also include if the schema is in allTablesSelection (whole schema selected)
                      (allTablesSelection && allTablesSelection.includes(row.schema_name));
                  }
                  
                  if (shouldInclude) {
                    allPermissions.push({
                      objectType: row.object_type.toLowerCase() as 'table' | 'view',
                      objectName: row.object_name,
                      schema: row.schema_name,
                      privilege: row.privilege_type,
                      hasPermission: true,
                      adminOption: false, // SHOW GRANTS doesn't show admin option directly
                      privilegeScope: 'relation',
                      identity: trimmedIdentityName
                    } as CurrentPermission & { identity: string });
                  }
                }
              }
            }
          });
        }
        } catch (error: any) {
          console.log(`SHOW GRANTS error for ${trimmedIdentityName}:`, error.message);
          // Continue with other identities even if one fails
        }
      }
    }
    
    client.release();

    console.log(`Filtered permissions result:`, allPermissions);

    const response: ApiResponse = {
      success: true,
      data: allPermissions
    };
    res.json(response);
  } catch (error) {
    const response: ApiResponse = {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to fetch filtered permissions'
    };
    res.status(500).json(response);
  }
});

// Execute SQL query endpoint - MUST be before /:action route
previewRoutes.post('/run', requireConnection, async (req, res) => {
  try {
    console.log('Execute endpoint called with body:', req.body);
    const { sql } = req.body;

    if (!sql || typeof sql !== 'string') {
      console.log('No SQL provided in request body or SQL is not a string');
      return res.status(400).json({
        success: false,
        error: 'SQL query is required and must be a string'
      });
    }

    if (sql.trim() === '') {
      console.log('Empty SQL string provided');
      return res.status(400).json({
        success: false,
        error: 'SQL query cannot be empty'
      });
    }

    console.log(`Executing SQL:`, sql);

    let client;
    try {
      client = await currentConnection!.connect();
      console.log('Database client acquired successfully');
    } catch (error) {
      console.error('Failed to acquire database client:', error);
      return res.status(500).json({
        success: false,
        error: 'Failed to connect to database'
      });
    }
    
    try {
      await client.query('BEGIN');
      console.log('Transaction started');
      
      // Split SQL into individual statements and execute each
      const statements = sql.split(';').filter((s: string) => s.trim());
      const results: string[] = [];
      const errors: string[] = [];
      
      for (const statement of statements) {
        try {
          const trimmedStatement = statement.trim();
          if (trimmedStatement) {
            console.log(`Executing: ${trimmedStatement}`);
            await client.query(trimmedStatement);
            results.push(`✓ ${trimmedStatement}`);
            console.log(`Success: ${trimmedStatement}`);
          }
        } catch (error) {
          const errorMsg = error instanceof Error ? error.message : 'Unknown error';
          console.log(`Error executing ${statement}: ${errorMsg}`);
          errors.push(`✗ ${statement} - ${errorMsg}`);
        }
      }
      
      if (errors.length > 0) {
        console.log('Rolling back transaction due to errors:', errors);
        await client.query('ROLLBACK');
        const response: ApiResponse = {
          success: false,
          error: 'Some statements failed, transaction rolled back',
          data: { results, errors }
        };
        res.status(400).json(response);
      } else {
        console.log('Committing transaction, all statements executed successfully');
        await client.query('COMMIT');
        const response: ApiResponse = {
          success: true,
          data: { 
            message: `Successfully executed ${results.length} statements`,
            results 
          }
        };
        res.json(response);
      }
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  } catch (error) {
    const response: ApiResponse = {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to execute SQL'
    };
    res.status(500).json(response);
  }
});

// Generate SQL preview for different actions
previewRoutes.post('/:action', requireConnection, async (req, res) => {
  try {
    const { action } = req.params;
    const { identities, objects, targets, permissions } = req.body;

    console.log(`Generating SQL preview for action: ${action}`);
    console.log(`Request body:`, req.body);

    // Get current database name for database operations
    let currentDatabaseName = '';
    if (action === 'grant_database' || action === 'revoke_database') {
      try {
        const client = await currentConnection!.connect();
        const dbResult = await client.query('SELECT current_database() as db_name');
        currentDatabaseName = dbResult.rows[0]?.db_name || '';
        client.release();
        console.log(`Current database for SQL generation: ${currentDatabaseName}`);
      } catch (error: any) {
        console.log(`Failed to get current database name for SQL generation:`, error.message);
      }
    }

    let sql = '';

    switch (action) {
      case 'grant':
        sql = generateGrantSQL(identities, objects, permissions);
        break;
      case 'revoke':
        sql = generateRevokeSQL(identities, objects, permissions);
        break;
      case 'grant_default':
        sql = generateGrantDefaultSQL(identities, objects, permissions);
        break;
      case 'revoke_default':
        sql = generateRevokeDefaultSQL(identities, objects, permissions);
        break;
      case 'grant_schema':
        sql = generateGrantSchemaSQL(identities, objects, permissions);
        break;
      case 'revoke_schema':
        sql = generateRevokeSchemaSQL(identities, objects, permissions);
        break;
      case 'grant_database':
        sql = generateGrantDatabaseSQL(identities, permissions, currentDatabaseName);
        break;
      case 'revoke_database':
        sql = generateRevokeDatabaseSQL(identities, permissions, currentDatabaseName);
        break;
      case 'grant_role':
        sql = generateGrantRoleSQL(identities, targets);
        break;
      case 'revoke_role':
        sql = generateRevokeRoleSQL(identities, targets);
        break;
      default:
        return res.status(400).json({
          success: false,
          error: `Unknown action: ${action}`
        });
    }

    console.log(`Generated SQL:`, sql);

    res.json({ sql });
  } catch (error) {
    const response: ApiResponse = {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to generate SQL preview'
    };
    res.status(500).json(response);
  }
});

// Helper functions to generate SQL
function generateGrantSQL(identities: any[], objects: any[], permissions: any[]): string {
  const statements: string[] = [];
  
  identities.forEach(identity => {
    objects.forEach(object => {
      const privs = permissions.map(p => p.value).join(', ');
      
      // Handle ALL tables in schema
      if (object.isAllTables && object.type === 'schema') {
        statements.push(`GRANT ${privs} ON ALL TABLES IN SCHEMA ${object.name} TO ${identity.name};`);
      } else {
        const objectType = (object.type === 'table' || object.type === 'view') ? 'TABLE' : 'SCHEMA';
        const objectRef = object.schema ? `${object.schema}.${object.name}` : object.name;
        statements.push(`GRANT ${privs} ON ${objectType} ${objectRef} TO ${identity.name};`);
      }
    });
  });
  
  return statements.join('\n');
}

function generateRevokeSQL(identities: any[], objects: any[], permissions: any[]): string {
  const statements: string[] = [];
  
  identities.forEach(identity => {
    objects.forEach(object => {
      const privs = permissions.map(p => p.value).join(', ');
      
      // Handle ALL tables in schema
      if (object.isAllTables && object.type === 'schema') {
        statements.push(`REVOKE ${privs} ON ALL TABLES IN SCHEMA ${object.name} FROM ${identity.name};`);
      } else {
        const objectType = (object.type === 'table' || object.type === 'view') ? 'TABLE' : 'SCHEMA';
        const objectRef = object.schema ? `${object.schema}.${object.name}` : object.name;
        statements.push(`REVOKE ${privs} ON ${objectType} ${objectRef} FROM ${identity.name};`);
      }
    });
  });
  
  return statements.join('\n');
}

function generateGrantDefaultSQL(identities: any[], objects: any[], permissions: any[]): string {
  const statements: string[] = [];
  
  identities.forEach(identity => {
    objects.forEach(object => {
      const privs = permissions.map(p => p.value).join(', ');
      statements.push(`ALTER DEFAULT PRIVILEGES IN SCHEMA ${object.name} GRANT ${privs} ON TABLES TO ${identity.name};`);
    });
  });
  
  return statements.join('\n');
}

function generateRevokeDefaultSQL(identities: any[], objects: any[], permissions: any[]): string {
  const statements: string[] = [];
  
  identities.forEach(identity => {
    objects.forEach(object => {
      const privs = permissions.map(p => p.value).join(', ');
      statements.push(`ALTER DEFAULT PRIVILEGES IN SCHEMA ${object.name} REVOKE ${privs} ON TABLES FROM ${identity.name};`);
    });
  });
  
  return statements.join('\n');
}

function generateGrantSchemaSQL(identities: any[], objects: any[], permissions: any[]): string {
  const statements: string[] = [];
  
  identities.forEach(identity => {
    objects.forEach(object => {
      const privs = permissions.map(p => p.value).join(', ');
      statements.push(`GRANT ${privs} ON SCHEMA ${object.name} TO ${identity.name};`);
    });
  });
  
  return statements.join('\n');
}

function generateRevokeSchemaSQL(identities: any[], objects: any[], permissions: any[]): string {
  const statements: string[] = [];
  
  identities.forEach(identity => {
    objects.forEach(object => {
      const privs = permissions.map(p => p.value).join(', ');
      statements.push(`REVOKE ${privs} ON SCHEMA ${object.name} FROM ${identity.name};`);
    });
  });
  
  return statements.join('\n');
}

function generateGrantDatabaseSQL(identities: any[], permissions: any[], databaseName: string): string {
  const statements: string[] = [];
  
  identities.forEach(identity => {
    const privs = permissions.map(p => p.value).join(', ');
    const dbName = databaseName || 'current_database()';
    statements.push(`GRANT ${privs} ON DATABASE ${dbName} TO ${identity.name};`);
  });
  
  return statements.join('\n');
}

function generateRevokeDatabaseSQL(identities: any[], permissions: any[], databaseName: string): string {
  const statements: string[] = [];
  
  identities.forEach(identity => {
    const privs = permissions.map(p => p.value).join(', ');
    const dbName = databaseName || 'current_database()';
    statements.push(`REVOKE ${privs} ON DATABASE ${dbName} FROM ${identity.name};`);
  });
  
  return statements.join('\n');
}

function generateGrantRoleSQL(identities: any[], targets: any[]): string {
  const statements: string[] = [];
  
  identities.forEach(identity => {
    targets.forEach(target => {
      // Add ROLE keyword before target role name and identity if it's a role
      const targetWithRole = `ROLE ${target.name}`;
      const identityWithRole = identity.type === 'role' ? `ROLE ${identity.name}` : identity.name;
      statements.push(`GRANT ${targetWithRole} TO ${identityWithRole};`);
    });
  });
  
  return statements.join('\n');
}

function generateRevokeRoleSQL(identities: any[], targets: any[]): string {
  const statements: string[] = [];
  
  identities.forEach(identity => {
    targets.forEach(target => {
      // Add ROLE keyword before target role name and identity if it's a role
      const targetWithRole = `ROLE ${target.name}`;
      const identityWithRole = identity.type === 'role' ? `ROLE ${identity.name}` : identity.name;
      statements.push(`REVOKE ${targetWithRole} FROM ${identityWithRole};`);
    });
  });
  
  return statements.join('\n');
}

