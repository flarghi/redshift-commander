import type { Permission } from '../types';

export const PRIVILEGES: Permission[] = [
  { name: 'SELECT', value: 'SELECT' },
  { name: 'INSERT', value: 'INSERT' },
  { name: 'UPDATE', value: 'UPDATE' },
  { name: 'DELETE', value: 'DELETE' },
  { name: 'DROP', value: 'DROP' },
  { name: 'REFERENCES', value: 'REFERENCES' },
  { name: 'ALL', value: 'ALL' }, // ALL is a shorthand for all table privileges
];

export const SCHEMA_PRIVILEGES: Permission[] = [
  { name: 'USAGE', value: 'USAGE' },
  { name: 'CREATE', value: 'CREATE' },
  { name: 'ALL', value: 'ALL' }, // ALL is a shorthand for all schema privileges
];

export const DATABASE_PRIVILEGES: Permission[] = [
  { name: 'CREATE', value: 'CREATE' },
  { name: 'TEMPORARY', value: 'TEMPORARY' },
  { name: 'ALL', value: 'ALL' }, // ALL is a shorthand for all database privileges
];

export const getPrivilegeSetForAction = (action: string): Permission[] => {
  if (action === 'schema_privileges') return SCHEMA_PRIVILEGES;
  if (action === 'database_privileges') return DATABASE_PRIVILEGES;
  return PRIVILEGES;
};