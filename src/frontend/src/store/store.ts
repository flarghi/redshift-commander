
import { create } from 'zustand';
import type {
  GrantableObject,
  ObjectType,
  ActionType,
  GrantOrRevoke,
  Permission,
  GrantableIdentity,
  RedshiftConnection,
  User,
} from '../types';
import {
  connectionApi,
  createGroup,
  createRole,
  createUser,
  fetchIdentities,
  fetchSchemas,
  fetchTables,
  generatePreview,
  runQuery,
} from '../api';

interface AppState {
  // Connection State
  isConnected: boolean;
  isConnecting: boolean;
  connectionError: string | null;
  connectionConfig: RedshiftConnection | null;
  showConnectionString: boolean;

  // App State
  action: ActionType;
  grantOrRevoke: GrantOrRevoke;
  identities: GrantableIdentity[];
  objects: GrantableObject[];
  targetIdentities: GrantableIdentity[];
  selectedIdentities: GrantableIdentity[];
  selectedObjects: GrantableObject[];
  selectedTargetIdentities: GrantableIdentity[];
  permissions: Permission[];
  previewSql: string;
  isLoading: boolean;
  error: string | null;
  loadingSchemas: Set<string>;
  allTablesSelection: Set<string>; // Track schemas with "ALL tables" selected
  refreshPrivilegesCallback: (() => void) | null; // Callback to refresh privileges
  currentPrivileges: any[];
  isRefreshingPrivileges: boolean;
  privilegesCurrentPage: number;
  privilegesSearchTerm: string;

  // Actions
  checkConnectionStatus: () => Promise<void>;
  connect: (config: RedshiftConnection) => Promise<void>;
  disconnect: () => Promise<void>;
  fetchInitialData: () => Promise<void>;
  fetchTablesForSchema: (schemaName: string) => Promise<void>;
  createIdentity: (identityType: 'user' | 'group' | 'role', identityName: string, password?: string, groupUsers?: string[]) => Promise<void>;
  setAction: (action: ActionType) => void;
  setGrantOrRevoke: (grantOrRevoke: GrantOrRevoke) => void;
  setSelectedIdentities: (identities: GrantableIdentity[]) => void;
  setSelectedObjects: (objects: GrantableObject[]) => void;
  setSelectedTargetIdentities: (identities: GrantableIdentity[]) => void;
  setPermissions: (permissions: Permission[]) => void;
  toggleAllTablesSelection: (schemaName: string) => void;
  generatePreview: () => Promise<void>;
  runQuery: () => Promise<void>;
  resetState: () => void;
  setRefreshPrivilegesCallback: (callback: (() => void) | null) => void;
  triggerRefreshPrivileges: () => void;
  toggleConnectionStringVisibility: () => void;
  resetModalState: () => void;
  setCurrentPrivileges: (privileges: any[]) => void;
  setIsRefreshingPrivileges: (isRefreshing: boolean) => void;
  setPrivilegesCurrentPage: (page: number) => void;
  setPrivilegesSearchTerm: (term: string) => void;
  clearCurrentPrivileges: () => void;
}

const useStore = create<AppState>((set, get) => ({
  // Initial State
  isConnected: false,
  isConnecting: false,
  connectionError: null,
  connectionConfig: null,
  showConnectionString: true,
  action: 'privileges',
  grantOrRevoke: 'grant',
  identities: [],
  objects: [],
  targetIdentities: [],
  selectedIdentities: [],
  selectedObjects: [],
  selectedTargetIdentities: [],
  permissions: [],
  previewSql: '',
  isLoading: false,
  error: null,
  loadingSchemas: new Set(),
  allTablesSelection: new Set(),
  refreshPrivilegesCallback: null,
  currentPrivileges: [],
  isRefreshingPrivileges: false,
  privilegesCurrentPage: 1,
  privilegesSearchTerm: '',

  // Actions
  checkConnectionStatus: async () => {
    try {
      const response = await connectionApi.status();
      if (response.success && response.data?.connected) {
        set({ isConnected: true, connectionConfig: response.data.config });
        get().fetchInitialData();
      } else {
        set({ isConnected: false, connectionConfig: null });
      }
    } catch {
      set({ isConnected: false, connectionConfig: null });
    }
  },

  connect: async (config: RedshiftConnection) => {
    set({ isConnecting: true, connectionError: null });
    try {
      const response = await connectionApi.connect(config);
      if (response.success) {
        set({ isConnected: true, isConnecting: false, connectionConfig: config });
        get().fetchInitialData();
      } else {
        set({ isConnected: false, isConnecting: false, connectionError: response.error });
      }
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Connection failed';
      set({ isConnected: false, isConnecting: false, connectionError: errorMessage });
    }
  },

  disconnect: async () => {
    await connectionApi.disconnect();
    set({
      isConnected: false,
      connectionConfig: null,
      identities: [],
      objects: [],
      selectedIdentities: [],
      selectedObjects: [],
    });
  },

  fetchInitialData: async () => {
    set({ isLoading: true, error: null });
    try {
      const [identities, schemas] = await Promise.all([
        fetchIdentities(),
        fetchSchemas(),
      ]);

      const allIdentities: GrantableIdentity[] = identities.map((i: User) => ({ name: i.username, type: i.type }));
      const allObjects: GrantableObject[] = schemas.map((s: { name: string }) => ({ name: s.name, type: 'schema' as ObjectType, children: [] }));

      // Filter out sys:* roles from identities
      const filteredIdentities = allIdentities.filter(i => i.type !== 'role' || !i.name.startsWith('sys:'));

      set({
        identities: filteredIdentities,
        objects: allObjects,
        targetIdentities: allIdentities.filter(i => i.type === 'role' && !i.name.startsWith('sys:')),
        isLoading: false,
      });
    } catch {
      set({ error: 'Failed to fetch initial data.', isLoading: false });
    }
  },

  fetchTablesForSchema: async (schemaName: string) => {
    // Add schema to loading set
    set((state) => ({
      loadingSchemas: new Set([...state.loadingSchemas, schemaName])
    }));

    try {
      const tables = await fetchTables(schemaName);
      set((state) => {
        const newLoadingSchemas = new Set(state.loadingSchemas);
        newLoadingSchemas.delete(schemaName);
        return {
          objects: state.objects.map((o) =>
            o.name === schemaName
              ? { ...o, children: tables.map(t => ({ name: t.name, type: t.type as ObjectType, schema: t.schema })) }
              : o
          ),
          loadingSchemas: newLoadingSchemas
        };
      });
    } catch (error) {
      console.error(`Failed to fetch tables for schema ${schemaName}:`, error);
      // Remove from loading set even on error
      set((state) => {
        const newLoadingSchemas = new Set(state.loadingSchemas);
        newLoadingSchemas.delete(schemaName);
        return { loadingSchemas: newLoadingSchemas };
      });
    }
  },

  createIdentity: async (identityType: 'user' | 'group' | 'role', identityName: string, password?: string, groupUsers?: string[]) => {
    try {
      if (identityType === 'user') {
        await createUser({ username: identityName, password: password! });
      } else if (identityType === 'group') {
        await createGroup({ groupname: identityName, users: groupUsers! });
      } else if (identityType === 'role') {
        await createRole({ rolename: identityName });
      }
      get().fetchInitialData();
    } catch (error) {
      console.error(`Failed to create ${identityType}:`, error);
      throw error; // Re-throw the error so the UI can handle it properly
    }
  },

  setAction: (action: ActionType) => {
    set({
      action,
      selectedIdentities: [],
      selectedObjects: [],
      selectedTargetIdentities: [],
      permissions: [],
      previewSql: '',
      error: null,
      allTablesSelection: new Set(),
      currentPrivileges: [],
      isRefreshingPrivileges: false,
      privilegesCurrentPage: 1,
      privilegesSearchTerm: '',
    });
  },

  setGrantOrRevoke: (grantOrRevoke: GrantOrRevoke) => {
    set({ grantOrRevoke });
  },

  setSelectedIdentities: (selectedIdentities: GrantableIdentity[]) => {
    get().clearCurrentPrivileges();
    set({ selectedIdentities, permissions: [] });
  },

  setSelectedObjects: (selectedObjects: GrantableObject[]) => {
    get().clearCurrentPrivileges();
    set({ selectedObjects, permissions: [] });
  },

  setSelectedTargetIdentities: (selectedTargetIdentities: GrantableIdentity[]) => {
    get().clearCurrentPrivileges();
    set({ selectedTargetIdentities, permissions: [] });
  },

  setPermissions: (permissions: Permission[]) => {
    set({ permissions });
  },

  toggleAllTablesSelection: (schemaName: string) => {
    const { allTablesSelection, selectedObjects } = get();
    const newAllTablesSelection = new Set(allTablesSelection);
    
    if (newAllTablesSelection.has(schemaName)) {
      // Remove from ALL tables selection
      newAllTablesSelection.delete(schemaName);
    } else {
      // Add to ALL tables selection and remove individual table/view selections from this schema
      newAllTablesSelection.add(schemaName);
      
      // Remove any individual table/view selections for this schema
      const filteredObjects = selectedObjects.filter(obj => 
        !(obj.schema === schemaName && (obj.type === 'table' || obj.type === 'view'))
      );
      
      set({ selectedObjects: filteredObjects });
    }
    
    set({ allTablesSelection: newAllTablesSelection });
  },

  generatePreview: async () => {
    const { action, grantOrRevoke, selectedIdentities, selectedObjects, selectedTargetIdentities, permissions, allTablesSelection } = get();
    set({ isLoading: true, error: null });

    // Construct the full action string
    let fullAction: string;
    if (action === 'privileges') {
      fullAction = grantOrRevoke;
    } else if (action === 'default_privileges') {
      fullAction = `${grantOrRevoke}_default`;
    } else if (action === 'schema_privileges') {
      fullAction = `${grantOrRevoke}_schema`;
    } else if (action === 'database_privileges') {
      fullAction = `${grantOrRevoke}_database`;
    } else {
      fullAction = `${grantOrRevoke}_${action}`;
    }


    try {
      // Create objects array that includes ALL tables markers
      let objectsForPreview = [...selectedObjects];
      
      // Add special ALL tables markers for schemas with ALL tables selected
      allTablesSelection.forEach(schemaName => {
        objectsForPreview.push({
          name: schemaName,
          type: 'schema',
          schema: schemaName,
          isAllTables: true // Special marker for ALL tables in schema
        } as GrantableObject);
      });
      
      const sql = await generatePreview(fullAction, {
        identities: selectedIdentities,
        objects: objectsForPreview,
        targets: selectedTargetIdentities,
        permissions: permissions,
      });
      set({ previewSql: sql, isLoading: false });
    } catch {
      set({ error: 'Failed to generate preview.', isLoading: false });
    }
  },

  runQuery: async () => {
    const { previewSql } = get();
    if (!previewSql) return;
    set({ isLoading: true, error: null });
    try {
      await runQuery(previewSql);
      set({ isLoading: false });
    } catch (error) {
      set({ error: 'Failed to run query.', isLoading: false });
      throw error; // Re-throw the error so the component can handle it
    }
  },

  resetState: () => {
    set({
      action: 'privileges',
      grantOrRevoke: 'grant',
      selectedIdentities: [],
      selectedObjects: [],
      selectedTargetIdentities: [],
      permissions: [],
      previewSql: '',
      isLoading: false,
      error: null,
      allTablesSelection: new Set(),
    });
  },

  setRefreshPrivilegesCallback: (callback: (() => void) | null) => {
    set({ refreshPrivilegesCallback: callback });
  },

  triggerRefreshPrivileges: () => {
    const { refreshPrivilegesCallback } = get();
    console.log('triggerRefreshPrivileges called, callback exists:', !!refreshPrivilegesCallback);
    if (refreshPrivilegesCallback) {
      refreshPrivilegesCallback();
    }
  },

  toggleConnectionStringVisibility: () => {
    set((state) => ({ showConnectionString: !state.showConnectionString }));
  },

  resetModalState: () => {
    set({ grantOrRevoke: 'grant', permissions: [] });
  },

  setCurrentPrivileges: (currentPrivileges: any[]) => {
    set({ currentPrivileges });
  },

  setIsRefreshingPrivileges: (isRefreshingPrivileges: boolean) => {
    set({ isRefreshingPrivileges });
  },

  setPrivilegesCurrentPage: (privilegesCurrentPage: number) => {
    set({ privilegesCurrentPage });
  },

  setPrivilegesSearchTerm: (privilegesSearchTerm: string) => {
    set({ privilegesSearchTerm, privilegesCurrentPage: 1 });
  },

  clearCurrentPrivileges: () => {
    set({ 
      currentPrivileges: [],
      isRefreshingPrivileges: false,
      privilegesCurrentPage: 1,
      privilegesSearchTerm: ''
    });
  },
}));

export default useStore;
