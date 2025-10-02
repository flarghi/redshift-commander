/**
 * SQL Utility Functions for Safe Query Construction
 * 
 * These utilities help prevent SQL injection by properly escaping and quoting
 * identifiers and parameters in Redshift/PostgreSQL queries.
 */

/**
 * Safely quotes an identifier (table, column, schema, user, group, role)
 * Uses PostgreSQL's identifier quoting rules - double quotes with internal quotes escaped
 * 
 * @param identifier - The identifier to quote
 * @returns Safely quoted identifier
 * @throws Error if identifier is invalid
 * 
 * @example
 * quoteIdentifier('myschema') // Returns: "myschema"
 * quoteIdentifier('my"schema') // Returns: "my""schema"
 * quoteIdentifier("user'; DROP TABLE users; --") // Returns: "user'; DROP TABLE users; --" (safe)
 */
export function quoteIdentifier(identifier: string): string {
  if (!identifier || typeof identifier !== 'string') {
    throw new Error('Invalid identifier: must be a non-empty string');
  }
  
  if (identifier.trim() !== identifier) {
    throw new Error('Invalid identifier: contains leading or trailing whitespace');
  }
  
  // Escape internal double quotes by doubling them (PostgreSQL standard)
  const escaped = identifier.replace(/"/g, '""');
  
  // Return identifier wrapped in double quotes
  return `"${escaped}"`;
}

/**
 * Safely quotes multiple identifiers
 * 
 * @param identifiers - Array of identifiers to quote
 * @returns Array of safely quoted identifiers
 */
export function quoteIdentifiers(identifiers: string[]): string[] {
  return identifiers.map(id => quoteIdentifier(id));
}

/**
 * Validates that a string is a safe identifier according to Redshift rules
 * Blocks SQL injection patterns and dangerous characters
 * 
 * Redshift identifiers:
 * - Must start with a letter (a-z, A-Z) or underscore (_)
 * - Can contain letters, digits (0-9), underscores, and dollar signs ($)
 * - Maximum 127 characters (Redshift limit)
 * - Case-insensitive unless quoted
 * 
 * Blocked patterns for security:
 * - SQL comments (double dash and block comments)
 * - Statement separators (semicolon)
 * - Control characters (newlines, tabs, null bytes)
 * 
 * @param identifier - The identifier to validate
 * @returns true if valid, false otherwise
 */
export function isValidIdentifier(identifier: string): boolean {
  if (!identifier || typeof identifier !== 'string') {
    return false;
  }
  
  // Check length (Redshift max identifier length is 127)
  if (identifier.length === 0 || identifier.length > 127) {
    return false;
  }
  
  // Block dangerous patterns for SQL injection prevention
  const dangerousPatterns = [
    /--/,           // SQL single-line comments
    /\/\*/,         // Multi-line comment start
    /\*\//,         // Multi-line comment end
    /;/,            // Statement separator
    /\n/,           // Newline
    /\r/,           // Carriage return
    /\t/,           // Tab (often suspicious in identifiers)
    /\0/,           // Null byte
  ];
  
  for (const pattern of dangerousPatterns) {
    if (pattern.test(identifier)) {
      return false;
    }
  }
  
  // Redshift identifier rules: start with letter or underscore, followed by alphanumeric, underscore, or $
  // Maximum 127 characters
  const validPattern = /^[a-zA-Z_][a-zA-Z0-9_$]{0,126}$/;
  return validPattern.test(identifier);
}

/**
 * Validates identifier and throws descriptive error if invalid
 * Provides defense-in-depth by blocking SQL injection patterns BEFORE quoting
 * 
 * @param identifier - The identifier to validate
 * @param name - Descriptive name for error messages (e.g., "schema name", "table name")
 * @throws Error with specific message if identifier is invalid
 */
export function validateIdentifier(identifier: string, name: string = 'identifier'): void {
  if (!identifier || typeof identifier !== 'string') {
    throw new Error(`Invalid ${name}: must be a non-empty string`);
  }
  
  if (identifier.trim() !== identifier) {
    throw new Error(`Invalid ${name}: contains leading or trailing whitespace`);
  }
  
  if (identifier.length > 127) {
    throw new Error(`Invalid ${name}: exceeds maximum length of 127 characters`);
  }
  
  // Check for dangerous patterns with specific error messages
  if (identifier.includes('--')) {
    throw new Error(`Invalid ${name}: SQL comments (--) are not allowed`);
  }
  
  if (identifier.includes(';')) {
    throw new Error(`Invalid ${name}: semicolons (;) are not allowed`);
  }
  
  if (identifier.includes('/*') || identifier.includes('*/')) {
    throw new Error(`Invalid ${name}: multi-line comments (/* */) are not allowed`);
  }
  
  if (identifier.includes('\n') || identifier.includes('\r')) {
    throw new Error(`Invalid ${name}: newline characters are not allowed`);
  }
  
  if (identifier.includes('\0')) {
    throw new Error(`Invalid ${name}: null bytes are not allowed`);
  }
  
  if (identifier.includes('\t')) {
    throw new Error(`Invalid ${name}: tab characters are not allowed`);
  }
  
  // Check valid identifier pattern
  const validPattern = /^[a-zA-Z_][a-zA-Z0-9_$]*$/;
  if (!validPattern.test(identifier)) {
    throw new Error(
      `Invalid ${name}: must start with a letter or underscore, ` +
      `and contain only letters, digits, underscores, and dollar signs`
    );
  }
}

/**
 * Safely formats a list for parameterized IN clause
 * Returns the placeholder string and values array for use with parameterized queries
 * 
 * @param values - Array of values for IN clause
 * @param startIndex - Starting parameter index (default: 1)
 * @returns Object with placeholder string and values array
 * 
 * @example
 * const { placeholder, values } = buildInClause(['user1', 'user2', 'user3']);
 * // placeholder: "($1,$2,$3)"
 * // values: ['user1', 'user2', 'user3']
 * 
 * const query = `SELECT * FROM users WHERE username IN ${placeholder}`;
 * const result = await client.query(query, values);
 */
export function buildInClause(
  values: string[], 
  startIndex: number = 1
): { placeholder: string; values: string[] } {
  if (!Array.isArray(values) || values.length === 0) {
    throw new Error('buildInClause requires a non-empty array');
  }
  
  const placeholders = values.map((_, i) => `$${startIndex + i}`).join(',');
  
  return {
    placeholder: `(${placeholders})`,
    values: values
  };
}

/**
 * Safely escapes a string literal for use in SQL
 * Uses single quotes with internal quotes escaped
 * 
 * WARNING: Prefer parameterized queries over this function!
 * Only use this when parameterization is not possible (e.g., dynamic DDL)
 * 
 * @param value - The string value to escape
 * @returns Safely escaped string literal
 * 
 * @example
 * escapeLiteral("O'Reilly") // Returns: 'O''Reilly'
 * escapeLiteral("It's a test") // Returns: 'It''s a test'
 */
export function escapeLiteral(value: string): string {
  if (typeof value !== 'string') {
    throw new Error('escapeLiteral requires a string value');
  }
  
  // Escape single quotes by doubling them (PostgreSQL standard)
  const escaped = value.replace(/'/g, "''");
  
  // Return wrapped in single quotes
  return `'${escaped}'`;
}

/**
 * Builds a safe schema.table identifier with proper quoting
 * 
 * @param schema - Schema name
 * @param table - Table name
 * @returns Safely quoted schema.table identifier
 * 
 * @example
 * buildSchemaTable('public', 'users') // Returns: "public"."users"
 * buildSchemaTable('my"schema', 'my"table') // Returns: "my""schema"."my""table"
 */
export function buildSchemaTable(schema: string, table: string): string {
  return `${quoteIdentifier(schema)}.${quoteIdentifier(table)}`;
}

/**
 * Validates and sanitizes an array of privilege names
 * Only allows known Redshift privileges to prevent SQL injection via privilege names
 * 
 * @param privileges - Array of privilege names to validate
 * @param objectType - Type of object (table, schema, database, etc.)
 * @returns Validated privilege names
 * @throws Error if any privilege is invalid
 */
export function validatePrivileges(privileges: string[], objectType: string = 'table'): string[] {
  const validTablePrivileges = [
    'SELECT', 'INSERT', 'UPDATE', 'DELETE', 'DROP', 'REFERENCES', 'ALL'
  ];
  
  const validSchemaPrivileges = [
    'CREATE', 'USAGE', 'ALL'
  ];
  
  const validDatabasePrivileges = [
    'CREATE', 'TEMPORARY', 'TEMP', 'ALL'
  ];
  
  const validFunctionPrivileges = [
    'EXECUTE', 'ALL'
  ];
  
  let validPrivileges: string[];
  switch (objectType.toLowerCase()) {
    case 'table':
    case 'view':
      validPrivileges = validTablePrivileges;
      break;
    case 'schema':
      validPrivileges = validSchemaPrivileges;
      break;
    case 'database':
      validPrivileges = validDatabasePrivileges;
      break;
    case 'function':
    case 'procedure':
      validPrivileges = validFunctionPrivileges;
      break;
    default:
      throw new Error(`Unknown object type: ${objectType}`);
  }
  
  const invalidPrivileges = privileges.filter(
    priv => !validPrivileges.includes(priv.toUpperCase())
  );
  
  if (invalidPrivileges.length > 0) {
    throw new Error(
      `Invalid privileges for ${objectType}: ${invalidPrivileges.join(', ')}. ` +
      `Valid privileges are: ${validPrivileges.join(', ')}`
    );
  }
  
  // Return uppercase versions for consistency
  return privileges.map(p => p.toUpperCase());
}

/**
 * Validates that an action is either GRANT or REVOKE
 * 
 * @param action - The action to validate
 * @returns Validated action in uppercase
 * @throws Error if action is invalid
 */
export function validateAction(action: string): 'GRANT' | 'REVOKE' {
  const upperAction = action.toUpperCase();
  if (upperAction !== 'GRANT' && upperAction !== 'REVOKE') {
    throw new Error(`Invalid action: ${action}. Must be GRANT or REVOKE`);
  }
  return upperAction as 'GRANT' | 'REVOKE';
}

/**
 * Safely builds a GRANT/REVOKE statement with proper quoting and validation
 * 
 * @param action - GRANT or REVOKE
 * @param privileges - Array of privileges
 * @param objectType - Type of object (TABLE, SCHEMA, etc.)
 * @param objectName - Name of the object (may include schema.table)
 * @param identity - User, group, or role name
 * @returns Safe SQL statement
 */
export function buildGrantStatement(
  action: string,
  privileges: string[],
  objectType: string,
  objectName: string,
  identity: string
): string {
  // Validate inputs
  const validAction = validateAction(action);
  const validPrivileges = validatePrivileges(privileges, objectType);
  validateIdentifier(identity, 'identity');
  
  const keyword = validAction === 'GRANT' ? 'TO' : 'FROM';
  const privList = validPrivileges.join(', ');
  
  let objectClause: string;
  if (objectName.includes('.')) {
    // Schema.table format
    const [schema, table] = objectName.split('.');
    objectClause = `ON ${objectType.toUpperCase()} ${buildSchemaTable(schema, table)}`;
  } else {
    // Single identifier
    objectClause = `ON ${objectType.toUpperCase()} ${quoteIdentifier(objectName)}`;
  }
  
  return `${validAction} ${privList} ${objectClause} ${keyword} ${quoteIdentifier(identity)};`;
}
