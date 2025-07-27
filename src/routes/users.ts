import { Router } from 'express';
import { currentConnection } from './connect';
import { User, ApiResponse } from '../types';

export const usersRoutes = Router();

const requireConnection = (req: any, res: any, next: any) => {
  if (!currentConnection) {
    return res.status(400).json({
      success: false,
      error: 'No database connection established'
    });
  }
  next();
};

usersRoutes.get('/', requireConnection, async (req, res) => {
  try {
    const client = await currentConnection!.connect();
    
    const usersQuery = `
      SELECT 
        usename as username,
        'user' as type,
        usesuper as is_active
      FROM pg_user
      WHERE usename NOT IN ('rdsdb', 'awsuser')
      ORDER BY usename
    `;
    
    const groupsQuery = `
      SELECT 
        groname as username,
        'group' as type,
        true as is_active
      FROM pg_group
      WHERE groname NOT LIKE 'pg_%'
        AND groname NOT IN ('rdsdb')
      ORDER BY groname
    `;
    
    const rolesQuery = `
      SELECT 
        role_name as username,
        'role' as type,
        true as is_active
      FROM svv_roles
      WHERE role_name NOT LIKE 'pg_%'
        AND role_name NOT LIKE 'rs_%'
        AND role_name NOT IN ('rdsdb', 'awsuser')
        AND role_name NOT IN (SELECT usename FROM pg_user)
        AND role_name NOT IN (SELECT groname FROM pg_group)
      ORDER BY role_name
    `;
    
    const [usersResult, groupsResult, rolesResult] = await Promise.all([
      client.query(usersQuery),
      client.query(groupsQuery),
      client.query(rolesQuery)
    ]);
    
    client.release();

    const users: User[] = [
      ...usersResult.rows.map(row => ({
        username: row.username,
        type: 'user' as const,
        isActive: row.is_active
      })),
      ...groupsResult.rows.map(row => ({
        username: row.username,
        type: 'group' as const,
        isActive: row.is_active
      })),
      ...rolesResult.rows.map(row => ({
        username: row.username,
        type: 'role' as const,
        isActive: row.is_active
      }))
    ];

    const response: ApiResponse = {
      success: true,
      data: users
    };
    res.json(response);
  } catch (error) {
    const response: ApiResponse = {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to fetch users'
    };
    res.status(500).json(response);
  }
});

// Create User endpoint
usersRoutes.post('/create-user', requireConnection, async (req, res) => {
  try {
    const { username, password } = req.body;
    
    if (!username || !password) {
      return res.status(400).json({
        success: false,
        error: 'Username and password are required'
      });
    }

    const client = await currentConnection!.connect();
    
    // Escape the username and password for SQL injection protection
    const escapedUsername = username.replace(/'/g, "''");
    const escapedPassword = password.replace(/'/g, "''");
    
    const createUserQuery = `CREATE USER "${escapedUsername}" WITH PASSWORD '${escapedPassword}';`;
    
    console.log('Executing SQL:', createUserQuery.replace(escapedPassword, '***'));
    await client.query(createUserQuery);
    console.log('User created successfully');
    client.release();

    const response: ApiResponse = {
      success: true,
      data: { message: `User "${username}" created successfully` }
    };
    res.json(response);
  } catch (error) {
    console.error('Error creating user:', error);
    const response: ApiResponse = {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to create user'
    };
    res.status(500).json(response);
  }
});

// Create Group endpoint
usersRoutes.post('/create-group', requireConnection, async (req, res) => {
  try {
    const { groupname, users = [] } = req.body;
    
    if (!groupname) {
      return res.status(400).json({
        success: false,
        error: 'Group name is required'
      });
    }

    const client = await currentConnection!.connect();
    
    // Escape the group name for SQL injection protection
    const escapedGroupname = groupname.replace(/'/g, "''");
    
    const createGroupQuery = `CREATE GROUP "${escapedGroupname}";`;
    console.log('Executing SQL:', createGroupQuery);
    await client.query(createGroupQuery);
    console.log('Group created successfully');
    
    // Add users to group if specified
    if (users.length > 0) {
      const escapedUsers = users.map((user: string) => `"${user.replace(/'/g, "''")}"`).join(', ');
      const addUsersQuery = `ALTER GROUP "${escapedGroupname}" ADD USER ${escapedUsers};`;
      console.log('Executing SQL:', addUsersQuery);
      await client.query(addUsersQuery);
      console.log('Users added to group successfully');
    }
    
    client.release();

    const response: ApiResponse = {
      success: true,
      data: { 
        message: `Group "${groupname}" created successfully${users.length > 0 ? ` with ${users.length} user(s)` : ''}`
      }
    };
    res.json(response);
  } catch (error) {
    console.error('Error creating group:', error);
    const response: ApiResponse = {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to create group'
    };
    res.status(500).json(response);
  }
});

// Create Role endpoint
usersRoutes.post('/create-role', requireConnection, async (req, res) => {
  try {
    const { rolename } = req.body;
    
    if (!rolename) {
      return res.status(400).json({
        success: false,
        error: 'Role name is required'
      });
    }

    const client = await currentConnection!.connect();
    
    // Escape the role name for SQL injection protection
    const escapedRolename = rolename.replace(/'/g, "''");
    
    const createRoleQuery = `CREATE ROLE "${escapedRolename}";`;
    
    console.log('Executing SQL:', createRoleQuery);
    await client.query(createRoleQuery);
    console.log('Role created successfully');
    client.release();

    const response: ApiResponse = {
      success: true,
      data: { message: `Role "${rolename}" created successfully` }
    };
    res.json(response);
  } catch (error) {
    console.error('Error creating role:', error);
    const response: ApiResponse = {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to create role'
    };
    res.status(500).json(response);
  }
});