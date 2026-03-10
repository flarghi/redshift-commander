import axios from 'axios';
import type {
  GrantableIdentity,
  GrantableObject,
  Permission,
  RedshiftConnection,
  User,
  Table,
} from './types';
import { sessionUtils } from './utils/sessionUtils';

const apiClient = axios.create({
  baseURL: '/api',
  headers: {
    'Content-Type': 'application/json',
  },
});

// Helper function to get session ID and throw error if not found
const getSessionId = (): string => {
  const sessionId = sessionUtils.getSessionId();
  if (!sessionId) {
    throw new Error('No active session. Please connect to Redshift first.');
  }
  return sessionId;
};

interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
}

export const connectionApi = {
  test: (config: RedshiftConnection): Promise<ApiResponse<boolean>> =>
    apiClient.post('/connect/test', config).then(res => res.data),
  
  connect: (config: RedshiftConnection): Promise<ApiResponse<any>> =>
    apiClient.post('/connect', config).then(res => res.data),
  
  status: (sessionId: string): Promise<ApiResponse<{ connected: boolean; config?: any }>> =>
    apiClient.get('/connect/status', { params: { sessionId } }).then(res => res.data),
  
  disconnect: (sessionId: string): Promise<ApiResponse<boolean>> =>
    apiClient.delete('/connect', { params: { sessionId } }).then(res => res.data),
};

// Fetches all identities (users, groups, roles)
export const fetchIdentities = async (): Promise<User[]> => {
  const sessionId = getSessionId();
  const response = await apiClient.get('/users', { params: { sessionId } });
  return response.data.data;
};

// Fetches all schemas
export const fetchSchemas = async (): Promise<GrantableObject[]> => {
  const sessionId = getSessionId();
  const response = await apiClient.get('/objects/schemas-only', { params: { sessionId } });
  return response.data.data;
};

// Fetches all tables for a given schema
export const fetchTables = async (schema: string): Promise<Table[]> => {
  const sessionId = getSessionId();
  const response = await apiClient.get(`/objects/tables/${schema}`, { params: { sessionId } });
  return response.data.data;
};

export const createUser = async (userData: { username: string; password: string }): Promise<ApiResponse<User>> => {
  const sessionId = getSessionId();
  console.log('Creating user:', userData.username);
  try {
    const response = await apiClient.post('/users/create-user', { ...userData, sessionId });
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
  const sessionId = getSessionId();
  console.log('Creating group:', groupData.groupname, 'with users:', groupData.users);
  try {
    const response = await apiClient.post('/users/create-group', { ...groupData, sessionId });
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
  const sessionId = getSessionId();
  console.log('Creating role:', roleData.rolename);
  try {
    const response = await apiClient.post('/users/create-role', { ...roleData, sessionId });
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
  owner?: GrantableIdentity;
}

// Generates the SQL preview
export const generatePreview = async (
  action: string,
  payload: PreviewPayload
): Promise<string> => {
  const sessionId = getSessionId();
  const response = await apiClient.post(`/preview/${action}`, { ...payload, sessionId });
  return response.data.sql;
};

// Executes a SQL query
export const runQuery = async (sql: string): Promise<void> => {
  const sessionId = getSessionId();
  await apiClient.post('/preview/run', { sql, sessionId });
};

// Get current privileges for selected identities and objects using SHOW GRANTS
export const getFilteredPermissions = async (
  identities: GrantableIdentity[],
  objects: GrantableObject[],
  action: string,
  allTablesSelection?: Set<string>
): Promise<ApiResponse<any[]>> => {
  const sessionId = getSessionId();
  const response = await apiClient.post('/preview/permissions-filtered', {
    identities,
    objects,
    action,
    allTablesSelection: allTablesSelection ? Array.from(allTablesSelection) : [],
    sessionId
  });
  return response.data;
};
