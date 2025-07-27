import { Router } from 'express';
import { currentConnection } from './connect';
import { GrantRequest, ApiResponse } from '../types';

export const grantsRoutes = Router();

const requireConnection = (req: any, res: any, next: any) => {
  if (!currentConnection) {
    return res.status(400).json({
      success: false,
      error: 'No database connection established'
    });
  }
  next();
};

const generateGrantSQL = (request: GrantRequest): string[] => {
  const { users, objects, privileges, action, withGrantOption } = request;
  const statements: string[] = [];
  
  if (action === 'grant_role' || action === 'revoke_role') {
    // For role operations, objects are roles and users are target identities
    for (const user of users) {
      for (const role of objects) {
        const statement = action === 'grant_role' 
          ? `GRANT ROLE ${role} TO ${user};`
          : `REVOKE ROLE ${role} FROM ${user};`;
        statements.push(statement);
      }
    }
  } else if (action === 'grant_database' || action === 'revoke_database') {
    // For database operations, no objects - just privileges and users
    for (const user of users) {
      for (const privilege of privileges) {
        const grantOption = withGrantOption ? ' WITH GRANT OPTION' : '';
        const statement = action === 'grant_database'
          ? `GRANT ${privilege} ON DATABASE current_database() TO ${user}${grantOption};`
          : `REVOKE ${privilege} ON DATABASE current_database() FROM ${user};`;
        statements.push(statement);
      }
    }
  } else {
    // For privilege operations, iterate through privileges
    for (const user of users) {
      for (const object of objects) {
        for (const privilege of privileges) {
          // Determine object type and format correctly
          const objectType = object.includes('.') ? 'TABLE' : 'SCHEMA';
          const grantOption = withGrantOption ? ' WITH GRANT OPTION' : '';
          
          let statement: string;
          
          switch (action) {
            case 'grant_default':
              // Generate ALTER DEFAULT PRIVILEGES statements for grant
              if (objectType === 'SCHEMA') {
                statement = `ALTER DEFAULT PRIVILEGES IN SCHEMA ${object} GRANT ${privilege} ON TABLES TO ${user}${grantOption};`;
              } else {
                // For table objects, use the schema part
                const schema = object.split('.')[0];
                statement = `ALTER DEFAULT PRIVILEGES IN SCHEMA ${schema} GRANT ${privilege} ON TABLES TO ${user}${grantOption};`;
              }
              break;
              
            case 'revoke_default':
              // Generate ALTER DEFAULT PRIVILEGES statements for revoke
              if (objectType === 'SCHEMA') {
                statement = `ALTER DEFAULT PRIVILEGES IN SCHEMA ${object} REVOKE ${privilege} ON TABLES FROM ${user};`;
              } else {
                // For table objects, use the schema part
                const schema = object.split('.')[0];
                statement = `ALTER DEFAULT PRIVILEGES IN SCHEMA ${schema} REVOKE ${privilege} ON TABLES FROM ${user};`;
              }
              break;
              
            case 'grant':
              // Generate regular GRANT statements
              statement = objectType === 'SCHEMA' 
                ? `GRANT ${privilege} ON SCHEMA ${object} TO ${user}${grantOption};`
                : `GRANT ${privilege} ON TABLE ${object} TO ${user}${grantOption};`;
              break;
              
            case 'revoke':
              // Generate regular REVOKE statements
              statement = objectType === 'SCHEMA'
                ? `REVOKE ${privilege} ON SCHEMA ${object} FROM ${user};`
                : `REVOKE ${privilege} ON TABLE ${object} FROM ${user};`;
              break;
              
            case 'grant_schema':
              // Generate schema-level GRANT statements (always on schemas)
              statement = `GRANT ${privilege} ON SCHEMA ${object} TO ${user}${grantOption};`;
              break;
              
            case 'revoke_schema':
              // Generate schema-level REVOKE statements (always on schemas)
              statement = `REVOKE ${privilege} ON SCHEMA ${object} FROM ${user};`;
              break;
              
            default:
              throw new Error(`Unknown action: ${action}`);
          }
          
          statements.push(statement);
        }
      }
    }
  }
  
  return statements;
};

grantsRoutes.post('/preview', requireConnection, async (req, res) => {
  try {
    const request: GrantRequest = req.body;
    const statements = generateGrantSQL(request);
    
    const response: ApiResponse = {
      success: true,
      data: { statements }
    };
    res.json(response);
  } catch (error) {
    const response: ApiResponse = {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to generate SQL preview'
    };
    res.status(400).json(response);
  }
});

grantsRoutes.post('/execute', requireConnection, async (req, res) => {
  try {
    const request: GrantRequest = req.body;
    console.log('Grant request received:', request);
    
    const statements = generateGrantSQL(request);
    console.log('Generated SQL statements:', statements);
    
    const client = await currentConnection!.connect();
    const results: string[] = [];
    const errors: string[] = [];
    
    try {
      await client.query('BEGIN');
      
      for (const statement of statements) {
        try {
          console.log(`Executing: ${statement}`);
          await client.query(statement);
          results.push(`✓ ${statement}`);
          console.log(`Success: ${statement}`);
        } catch (error) {
          const errorMsg = error instanceof Error ? error.message : 'Unknown error';
          console.log(`Error executing ${statement}: ${errorMsg}`);
          errors.push(`✗ ${statement} - ${errorMsg}`);
        }
      }
      
      if (errors.length > 0) {
        await client.query('ROLLBACK');
        const response: ApiResponse = {
          success: false,
          error: 'Some statements failed, transaction rolled back',
          data: { results, errors }
        };
        res.status(400).json(response);
      } else {
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
      error: error instanceof Error ? error.message : 'Failed to execute grants'
    };
    res.status(500).json(response);
  }
});