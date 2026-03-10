import { Router } from 'express';
import { getConnectionBySessionId } from './connect';
import { GrantRequest, ApiResponse } from '../types';
import { validateBody } from '../utils/validationMiddleware';
import { GrantRevokeSchema, PreviewGrantRevokeSchema } from '../utils/validationSchemas';
import {
  quoteIdentifier,
  validateIdentityName,
  validateIdentifier,
  validatePrivileges,
  buildSchemaTable
} from '../utils/sqlUtils';

export const grantsRoutes = Router();

const requireConnection = (req: any, res: any, next: any) => {
  const sessionId = req.query.sessionId || req.body.sessionId;
  
  if (!sessionId) {
    return res.status(400).json({
      success: false,
      error: 'Session ID required'
    });
  }

  const connection = getConnectionBySessionId(sessionId);
  if (!connection) {
    return res.status(401).json({
      success: false,
      error: 'Invalid or expired session'
    });
  }

  req.connection = connection;
  next();
};

const generateGrantSQL = (request: GrantRequest): string[] => {
  const { users, objects, privileges, action, withGrantOption, owner } = request;
  const statements: string[] = [];

  let forUserClause = '';
  if (owner) {
    validateIdentityName(owner, 'owner');
    forUserClause = `FOR USER ${quoteIdentifier(owner)} `;
  }

  if (action === 'grant_role' || action === 'revoke_role') {
    for (const user of users) {
      validateIdentityName(user, 'user');
      const quotedUser = quoteIdentifier(user);
      for (const role of objects) {
        validateIdentityName(role, 'role');
        const quotedRole = quoteIdentifier(role);
        const statement = action === 'grant_role'
          ? `GRANT ROLE ${quotedRole} TO ${quotedUser};`
          : `REVOKE ROLE ${quotedRole} FROM ${quotedUser};`;
        statements.push(statement);
      }
    }
  } else if (action === 'grant_database' || action === 'revoke_database') {
    for (const user of users) {
      validateIdentityName(user, 'user');
      const quotedUser = quoteIdentifier(user);
      const validPrivs = validatePrivileges(privileges, 'database');
      for (const privilege of validPrivs) {
        const grantOption = withGrantOption ? ' WITH GRANT OPTION' : '';
        const statement = action === 'grant_database'
          ? `GRANT ${privilege} ON DATABASE current_database() TO ${quotedUser}${grantOption};`
          : `REVOKE ${privilege} ON DATABASE current_database() FROM ${quotedUser};`;
        statements.push(statement);
      }
    }
  } else {
    for (const user of users) {
      validateIdentityName(user, 'user');
      const quotedUser = quoteIdentifier(user);
      for (const object of objects) {
        const objectType = object.includes('.') ? 'TABLE' : 'SCHEMA';

        let quotedObject: string;
        let schemaName: string;
        if (object.includes('.')) {
          const parts = object.split('.');
          if (parts.length !== 2) {
            throw new Error(`Invalid object name: expected schema.table format, got "${object}"`);
          }
          validateIdentifier(parts[0], 'schema name');
          validateIdentifier(parts[1], 'table name');
          quotedObject = buildSchemaTable(parts[0], parts[1]);
          schemaName = parts[0];
        } else {
          validateIdentifier(object, 'object name');
          quotedObject = quoteIdentifier(object);
          schemaName = object;
        }

        const privObjectType = objectType === 'TABLE' ? 'table' : 'schema';
        const validPrivs = validatePrivileges(privileges, privObjectType);
        for (const privilege of validPrivs) {
          const grantOption = withGrantOption ? ' WITH GRANT OPTION' : '';

          let statement: string;

          switch (action) {
            case 'grant_default': {
              const quotedSchema = quoteIdentifier(schemaName);
              statement = `ALTER DEFAULT PRIVILEGES ${forUserClause}IN SCHEMA ${quotedSchema} GRANT ${privilege} ON TABLES TO ${quotedUser}${grantOption};`;
              break;
            }

            case 'revoke_default': {
              const quotedSchema = quoteIdentifier(schemaName);
              statement = `ALTER DEFAULT PRIVILEGES ${forUserClause}IN SCHEMA ${quotedSchema} REVOKE ${privilege} ON TABLES FROM ${quotedUser};`;
              break;
            }

            case 'grant':
              statement = objectType === 'SCHEMA'
                ? `GRANT ${privilege} ON SCHEMA ${quotedObject} TO ${quotedUser}${grantOption};`
                : `GRANT ${privilege} ON TABLE ${quotedObject} TO ${quotedUser}${grantOption};`;
              break;

            case 'revoke':
              statement = objectType === 'SCHEMA'
                ? `REVOKE ${privilege} ON SCHEMA ${quotedObject} FROM ${quotedUser};`
                : `REVOKE ${privilege} ON TABLE ${quotedObject} FROM ${quotedUser};`;
              break;

            case 'grant_schema':
              statement = `GRANT ${privilege} ON SCHEMA ${quotedObject} TO ${quotedUser}${grantOption};`;
              break;

            case 'revoke_schema':
              statement = `REVOKE ${privilege} ON SCHEMA ${quotedObject} FROM ${quotedUser};`;
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

grantsRoutes.post('/preview', validateBody(PreviewGrantRevokeSchema), requireConnection, async (req, res) => {
  try {
    // Request body is now validated and typed by Zod
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

grantsRoutes.post('/execute', validateBody(GrantRevokeSchema), requireConnection, async (req, res) => {
  try {
    // Request body is now validated and typed by Zod
    const request: GrantRequest = req.body;
    console.log('Grant request received:', request);
    
    const statements = generateGrantSQL(request);
    console.log('Generated SQL statements:', statements);
    
    const client = await (req as any).connection.connect();
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