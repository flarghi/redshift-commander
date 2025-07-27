export interface RedshiftConnection {
  host: string;
  port: number;
  database: string;
  username: string;
  password: string;
  ssl?: boolean;
}

export interface DatabaseObject {
  type: 'database' | 'schema' | 'table' | 'view' | 'function' | 'role';
  name: string;
  schema?: string;
  database?: string;
  children?: DatabaseObject[];
}

export interface User {
  username: string;
  type: 'user' | 'group' | 'role';
  isActive: boolean;
}

export interface Permission {
  objectType: string;
  objectName: string;
  schema: string;
  grantee: string;
  privilege: string;
  grantable: boolean;
}

export interface GrantRequest {
  users: string[];
  objects: string[];
  privileges: string[];
  action: 'grant' | 'revoke' | 'grant_default' | 'revoke_default' | 'grant_role' | 'revoke_role' | 'grant_schema' | 'revoke_schema' | 'grant_database' | 'revoke_database';
  withGrantOption?: boolean;
}

export interface CurrentPermission {
  objectType: 'schema' | 'table' | 'view';
  objectName: string;
  schema?: string;
  privilege: string;
  hasPermission: boolean;
  adminOption: boolean;
  privilegeScope?: string;
}

export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
}