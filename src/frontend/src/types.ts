export type IdentityType = 'user' | 'group' | 'role';
export type ObjectType = 'database' | 'schema' | 'table' | 'view' | 'function' | 'role';
export type ActionType =
  | 'privileges'
  | 'default_privileges'
  | 'schema_privileges'
  | 'database_privileges'
  | 'role';
export type GrantOrRevoke = 'grant' | 'revoke';

export interface RedshiftConnection {
  host: string;
  port: number;
  database: string;
  username: string;
  password: string;
}

export interface User {
  name: string;
  username: string;
  type: IdentityType;
}

export interface Group {
  name: string;
}

export interface Role {
  name: string;
}

export interface Schema {
  name: string;
}

export interface Table {
  name: string;
  schema: string;
  type: 'table' | 'view';
}

export interface GrantableIdentity {
  name: string;
  type: IdentityType;
}

export interface GrantableObject {
  name: string;
  type: ObjectType;
  schema?: string;
  children?: GrantableObject[];
  isAllTables?: boolean; // Special marker for ALL tables in schema
}

export interface Permission {
  name: string;
  value: string;
}
