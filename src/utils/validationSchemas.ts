/**
 * Zod Validation Schemas for API Requests
 * 
 * Provides type-safe validation for all API endpoints with:
 * - Input validation
 * - Type checking
 * - Descriptive error messages
 * - SQL injection pattern blocking
 */

import { z } from 'zod';

/**
 * Custom Zod validator for Redshift identifiers
 * Blocks SQL injection patterns and validates format
 */
const redshiftIdentifier = z.string()
  .min(1, 'Identifier cannot be empty')
  .max(127, 'Identifier cannot exceed 127 characters')
  .refine(
    (val) => !val.includes('--'),
    { message: 'SQL comments (--) are not allowed' }
  )
  .refine(
    (val) => !val.includes(';'),
    { message: 'Semicolons (;) are not allowed' }
  )
  .refine(
    (val) => !val.includes('/*') && !val.includes('*/'),
    { message: 'Multi-line comments (/* */) are not allowed' }
  )
  .refine(
    (val) => !val.includes('\n') && !val.includes('\r'),
    { message: 'Newline characters are not allowed' }
  )
  .refine(
    (val) => !val.includes('\t'),
    { message: 'Tab characters are not allowed' }
  )
  .refine(
    (val) => !val.includes('\0'),
    { message: 'Null bytes are not allowed' }
  )
  .refine(
    (val) => /^[a-zA-Z_][a-zA-Z0-9_$]*$/.test(val),
    { message: 'Identifier must start with a letter or underscore, and contain only letters, digits, underscores, and dollar signs' }
  );

/**
 * Session ID validation
 * Must be a non-empty string (64-character hex for our implementation)
 */
const sessionId = z.string()
  .min(1, 'Session ID is required')
  .regex(/^[a-f0-9]{64}$/, 'Invalid session ID format');

/**
 * Connection Configuration Schema
 */
export const ConnectionConfigSchema = z.object({
  host: z.string()
    .min(1, 'Host is required')
    .max(255, 'Host cannot exceed 255 characters')
    .refine(
      (val) => !val.includes(';') && !val.includes('--'),
      { message: 'Host contains invalid characters' }
    ),
  port: z.number()
    .int('Port must be an integer')
    .min(1, 'Port must be at least 1')
    .max(65535, 'Port cannot exceed 65535'),
  database: redshiftIdentifier.describe('database name'),
  username: redshiftIdentifier.describe('username'),
  password: z.string()
    .min(8, 'Password must be at least 8 characters')
    .max(256, 'Password cannot exceed 256 characters'),
  ssl: z.boolean().optional()
});

export type ConnectionConfig = z.infer<typeof ConnectionConfigSchema>;

/**
 * Session ID Schema (for query params and request bodies)
 */
export const SessionIdSchema = z.object({
  sessionId: sessionId
});

export type SessionIdParam = z.infer<typeof SessionIdSchema>;

/**
 * Create User Schema
 */
export const CreateUserSchema = z.object({
  username: redshiftIdentifier.describe('username'),
  password: z.string()
    .min(8, 'Password must be at least 8 characters')
    .max(256, 'Password cannot exceed 256 characters'),
  sessionId: sessionId
});

export type CreateUserRequest = z.infer<typeof CreateUserSchema>;

/**
 * Create Group Schema
 */
export const CreateGroupSchema = z.object({
  groupname: redshiftIdentifier.describe('group name'),
  users: z.array(redshiftIdentifier).default([]),
  sessionId: sessionId
});

export type CreateGroupRequest = z.infer<typeof CreateGroupSchema>;

/**
 * Create Role Schema
 */
export const CreateRoleSchema = z.object({
  rolename: redshiftIdentifier.describe('role name'),
  sessionId: sessionId
});

export type CreateRoleRequest = z.infer<typeof CreateRoleSchema>;

/**
 * Privilege validation
 */
const privilegeValue = z.string()
  .regex(/^[A-Z_]+$/, 'Privilege must be uppercase letters and underscores only')
  .refine(
    (val) => !val.includes(';') && !val.includes('--'),
    { message: 'Privilege contains invalid characters' }
  );

/**
 * Identity Schema (for permissions)
 */
const identitySchema = z.object({
  name: redshiftIdentifier,
  type: z.enum(['user', 'group', 'role']).optional()
});

/**
 * Database Object Schema
 */
const databaseObjectSchema = z.object({
  name: redshiftIdentifier,
  type: z.enum(['schema', 'table', 'view', 'function', 'procedure', 'database', 'role']),
  schema: redshiftIdentifier.optional()
});

/**
 * Permission Schema
 */
const permissionSchema = z.object({
  value: privilegeValue,
  type: z.string().optional()
});

/**
 * Grant/Revoke Permissions Schema
 */
export const GrantRevokeSchema = z.object({
  identities: z.array(identitySchema).min(1, 'At least one identity is required'),
  objects: z.array(databaseObjectSchema).min(1, 'At least one object is required'),
  permissions: z.array(permissionSchema).min(1, 'At least one permission is required'),
  action: z.enum(['GRANT', 'REVOKE']),
  sessionId: sessionId
});

export type GrantRevokeRequest = z.infer<typeof GrantRevokeSchema>;

/**
 * Preview Grant/Revoke Schema (without action)
 */
export const PreviewGrantRevokeSchema = z.object({
  identities: z.array(identitySchema).min(1, 'At least one identity is required'),
  objects: z.array(databaseObjectSchema).optional(),
  permissions: z.array(permissionSchema).optional(),
  sessionId: sessionId
});

export type PreviewGrantRevokeRequest = z.infer<typeof PreviewGrantRevokeSchema>;

/**
 * Get Permissions Schema
 */
export const GetPermissionsSchema = z.object({
  identity: redshiftIdentifier,
  objectType: z.enum(['schema', 'table', 'view', 'function', 'database', 'role']),
  objectName: redshiftIdentifier.optional(),
  schema: redshiftIdentifier.optional(),
  sessionId: sessionId
});

export type GetPermissionsRequest = z.infer<typeof GetPermissionsSchema>;

/**
 * Execute SQL Schema
 */
export const ExecuteSQLSchema = z.object({
  sql: z.string()
    .min(1, 'SQL query is required')
    .max(10000, 'SQL query too long (max 10000 characters)')
    .refine(
      (val) => {
        // Only allow GRANT, REVOKE, and ALTER DEFAULT PRIVILEGES statements
        const upperSQL = val.trim().toUpperCase();
        return upperSQL.startsWith('GRANT ') || upperSQL.startsWith('REVOKE ') || upperSQL.startsWith('ALTER DEFAULT PRIVILEGES ');
      },
      { message: 'Only GRANT, REVOKE, and ALTER DEFAULT PRIVILEGES statements are allowed' }
    ),
  sessionId: sessionId.optional() // Optional because requireConnection accepts it from query or body
});

export type ExecuteSQLRequest = z.infer<typeof ExecuteSQLSchema>;

/**
 * Schema Name Parameter Schema
 */
export const SchemaNameSchema = z.object({
  schema: redshiftIdentifier,
  sessionId: sessionId
});

export type SchemaNameParam = z.infer<typeof SchemaNameSchema>;

/**
 * Helper function to format Zod validation errors
 */
export function formatZodError(error: z.ZodError): string {
  const errors = error.issues.map((err: z.ZodIssue) => {
    const path = err.path.join('.');
    return path ? `${path}: ${err.message}` : err.message;
  });
  return errors.join('; ');
}

/**
 * Type guard to check if error is a ZodError
 */
export function isZodError(error: unknown): error is z.ZodError {
  return error instanceof z.ZodError;
}

/**
 * Permissions Filtered Schema — for POST /permissions-filtered
 */
export const PermissionsFilteredSchema = z.object({
  identities: z.array(identitySchema).min(1, 'At least one identity is required'),
  objects: z.array(databaseObjectSchema).optional(),
  action: z.string().optional(),
  allTablesSelection: z.array(redshiftIdentifier).optional(),
  sessionId: sessionId
});

export type PermissionsFilteredRequest = z.infer<typeof PermissionsFilteredSchema>;

/**
 * Preview Action Schema — for POST /:action preview endpoint
 */
export const PreviewActionSchema = z.object({
  identities: z.array(identitySchema).optional(),
  objects: z.array(databaseObjectSchema).optional(),
  targets: z.array(identitySchema).optional(),
  permissions: z.array(permissionSchema).optional(),
  owner: identitySchema.optional(),
  sessionId: sessionId
});

export type PreviewActionRequest = z.infer<typeof PreviewActionSchema>;
