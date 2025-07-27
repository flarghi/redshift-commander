# Redshift System Views Reference

This document lists the Redshift system views and columns used by the application.

## Users, Groups, and Roles

### Users (`pg_user`)
```sql
SELECT usename, usesuper FROM pg_user WHERE usename NOT IN ('rdsdb', 'awsuser');
```

### Groups (`pg_group`)
```sql
SELECT groname FROM pg_group WHERE groname NOT LIKE 'pg_%' AND groname NOT IN ('rdsdb');
```

### Roles (`svv_roles`)
```sql
SELECT role_name FROM svv_roles 
WHERE role_name NOT LIKE 'pg_%' 
  AND role_name NOT LIKE 'rs_%' 
  AND role_name NOT IN ('rdsdb', 'awsuser');
```

## Objects

### Schemas (`svv_all_schemas`)
```sql
SELECT schema_name, schema_owner FROM svv_all_schemas 
WHERE schema_name NOT IN ('information_schema', 'pg_catalog', 'pg_toast');
```

### Tables (`svv_all_tables`)
```sql
SELECT table_name, schema_name FROM svv_all_tables WHERE schema_name = 'public';
```

### Views (`pg_views`)
```sql
SELECT viewname, schemaname FROM pg_views WHERE schemaname = 'public';
```

## Permissions

### Schema Privileges (`svv_schema_privileges`)
```sql
SELECT 
  namespace_name,
  privilege_type,
  identity_id,
  identity_name,
  identity_type,
  admin_option,
  privilege_scope
FROM svv_schema_privileges 
WHERE namespace_name NOT IN ('information_schema', 'pg_catalog', 'pg_toast')
  AND identity_type IN ('user', 'role', 'group')
  AND identity_name NOT IN ('rdsdb', 'awsuser');
```

### Relation Privileges (`svv_relation_privileges`)
```sql
SELECT 
  namespace_name,
  relation_name,
  privilege_type,
  identity_id,
  identity_name,
  identity_type,
  admin_option
FROM svv_relation_privileges 
WHERE namespace_name NOT IN ('information_schema', 'pg_catalog', 'pg_toast')
  AND identity_type IN ('user', 'role', 'group')
  AND identity_name NOT IN ('rdsdb', 'awsuser');
```

## Testing Queries

You can test these queries directly in your Redshift cluster to verify they work:

1. **Test connection**: `SELECT version();`
2. **List schemas**: `SELECT schema_name FROM svv_all_schemas;`
3. **List users**: `SELECT usename FROM pg_user;`
4. **List groups**: `SELECT groname FROM pg_group;`
5. **List roles**: `SELECT role_name FROM svv_roles;`
6. **Check schema permissions**: `SELECT * FROM svv_schema_privileges LIMIT 10;`
7. **Check relation permissions**: `SELECT * FROM svv_relation_privileges LIMIT 10;`

**Note**: If `svv_relation_privileges` doesn't exist in your Redshift version, try:
- `SELECT * FROM information_schema.table_privileges LIMIT 10;`
- Or use `pg_class` and `pg_namespace` joins for ACL parsing

## Common Issues

- **Missing system views**: Some views like `svv_relation_privileges` may not exist in older Redshift versions
  - The application automatically falls back to `information_schema.table_privileges`
- **Permission errors**: Ensure your user has proper permissions to query system views
- **View errors**: If `svv_all_views` doesn't exist, the app uses `pg_views` instead
- **System objects**: System schemas/users are filtered out to avoid clutter

## Version Compatibility

- **svv_all_schemas**: Available in most Redshift versions
- **svv_all_tables**: Available in most Redshift versions  
- **svv_all_views**: May not exist - app uses `pg_views` fallback
- **svv_relation_privileges**: May not exist - app uses `information_schema.table_privileges` fallback
- **svv_schema_privileges**: May not exist - app uses `information_schema.usage_privileges` fallback
- **svv_roles**: Available in newer Redshift versions