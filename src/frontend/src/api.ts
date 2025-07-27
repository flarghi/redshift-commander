import axios from 'axios';
import type {
  GrantableIdentity,
  GrantableObject,
  Permission,
  RedshiftConnection,
  User,
  Table,
} from './types';

const apiClient = axios.create({
  baseURL: '/api',
  headers: {
    'Content-Type': 'application/json',
  },
});

interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
}

export const connectionApi = {
  test: (config: RedshiftConnection): Promise<ApiResponse<boolean>> =>
    apiClient.post('/connect/test', config).then(res => res.data),
  
  connect: (config: RedshiftConnection): Promise<ApiResponse<boolean>> =>
    apiClient.post('/connect', config).then(res => res.data),
  
  status: (): Promise<ApiResponse<{ connected: boolean; config?: RedshiftConnection }>> =>
    apiClient.get('/connect/status').then(res => res.data),
  
  disconnect: (): Promise<ApiResponse<boolean>> =>
    apiClient.delete('/connect').then(res => res.data),
};

// Fetches all identities (users, groups, roles)
export const fetchIdentities = async (): Promise<User[]> => {
  const response = await apiClient.get('/users');
  return response.data.data;
};

// Fetches all schemas
export const fetchSchemas = async (): Promise<GrantableObject[]> => {
  const response = await apiClient.get('/objects/schemas-only');
  return response.data.data;
};

// Fetches all tables for a given schema
export const fetchTables = async (schema: string): Promise<Table[]> => {
  const response = await apiClient.get(`/objects/tables/${schema}`);
  return response.data.data;
};

export const createUser = async (userData: { username: string; password: string }): Promise<ApiResponse<User>> => {
  console.log('Creating user:', userData.username);
  try {
    const response = await apiClient.post('/users/create-user', userData);
    console.log('Create user response:', response.data);
    if (!response.data.success) {
      throw new Error(response.data.error || 'Failed to create user');
    }
    return response.data;
  } catch (error: any) {
    console.error('Create user API error:', error);
    // Extract error message from axios error response
    const errorMessage = error.response?.data?.error || error.message || 'Failed to create user';
    throw new Error(errorMessage);
  }
};

export const createGroup = async (groupData: { groupname: string; users: string[] }): Promise<ApiResponse<{ groupname: string }>> => {
  console.log('Creating group:', groupData.groupname, 'with users:', groupData.users);
  try {
    const response = await apiClient.post('/users/create-group', groupData);
    console.log('Create group response:', response.data);
    if (!response.data.success) {
      throw new Error(response.data.error || 'Failed to create group');
    }
    return response.data;
  } catch (error: any) {
    console.error('Create group API error:', error);
    const errorMessage = error.response?.data?.error || error.message || 'Failed to create group';
    throw new Error(errorMessage);
  }
};

export const createRole = async (roleData: { rolename: string }): Promise<ApiResponse<{ rolename: string }>> => {
  console.log('Creating role:', roleData.rolename);
  try {
    const response = await apiClient.post('/users/create-role', roleData);
    console.log('Create role response:', response.data);
    if (!response.data.success) {
      throw new Error(response.data.error || 'Failed to create role');
    }
    return response.data;
  } catch (error: any) {
    console.error('Create role API error:', error);
    const errorMessage = error.response?.data?.error || error.message || 'Failed to create role';
    throw new Error(errorMessage);
  }
};

interface PreviewPayload {
  identities: GrantableIdentity[];
  objects: GrantableObject[];
  targets?: GrantableIdentity[];
  permissions?: Permission[];
}

// Generates the SQL preview
export const generatePreview = async (
  action: string,
  payload: PreviewPayload
): Promise<string> => {
  const response = await apiClient.post(`/preview/${action}`, payload);
  return response.data.sql;
};

// Executes a SQL query
export const runQuery = async (sql: string): Promise<void> => {
  await apiClient.post('/preview/run', { sql });
};

// Get current privileges for selected identities and objects using SHOW GRANTS
export const getFilteredPermissions = async (
  identities: GrantableIdentity[],
  objects: GrantableObject[],
  action: string,
  allTablesSelection?: Set<string>
): Promise<ApiResponse<any[]>> => {
  const response = await apiClient.post('/preview/permissions-filtered', {
    identities,
    objects,
    action,
    allTablesSelection: allTablesSelection ? Array.from(allTablesSelection) : []
  });
  return response.data;
};
