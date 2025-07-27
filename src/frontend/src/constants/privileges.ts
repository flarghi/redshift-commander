import type { Permission } from '../types';

export const PRIVILEGES: Permission[] = [
  { name: 'SELECT', value: 'SELECT' },
  { name: 'INSERT', value: 'INSERT' },
  { name: 'UPDATE', value: 'UPDATE' },
  { name: 'DELETE', value: 'DELETE' },
  { name: 'DROP', value: 'DROP' },
  { name: 'TRUNCATE', value: 'TRUNCATE' },
  { name: 'ALTER', value: 'ALTER' },
  { name: 'REFERENCES', value: 'REFERENCES' },
];

export const SCHEMA_PRIVILEGES: Permission[] = [
  { name: 'USAGE', value: 'USAGE' },
  { name: 'CREATE', value: 'CREATE' },
  { name: 'DROP', value: 'DROP' },
  { name: 'ALTER', value: 'ALTER' },
];

export const DATABASE_PRIVILEGES: Permission[] = [
  { name: 'CREATE', value: 'CREATE' },
  { name: 'ALTER', value: 'ALTER' },
  { name: 'TEMPORARY', value: 'TEMPORARY' },
];

export const getPrivilegeSetForAction = (action: string): Permission[] => {
  if (action === 'schema_privileges') return SCHEMA_PRIVILEGES;
  if (action === 'database_privileges') return DATABASE_PRIVILEGES;
  return PRIVILEGES;
};