# Required Privileges for Redshift Commander

This document lists all the privileges and permissions that the connecting user must have for Redshift Commander to function properly.

## Executive Summary

**MINIMUM REQUIRED**: The connecting user needs **SUPERUSER** privileges OR specific privileges listed below.

**RECOMMENDED**: Use a **SUPERUSER** account for full functionality.

## Recommended User Setup

### Option 1: SUPERUSER (Recommended)
```sql
-- Create a dedicated superuser for Redshift Commander
CREATE USER redshift_commander WITH PASSWORD 'secure_password' CREATEUSER;
ALTER USER redshift_commander CREATEUSER;
-- Grant superuser if needed for full functionality
ALTER USER redshift_commander CREATEDB SUPERUSER;
```

### Option 2: Limited Privileges (Minimum Required)
```sql
-- Create user with specific privileges
CREATE USER redshift_commander WITH PASSWORD 'secure_password';

-- Grant system catalog access
GRANT SELECT ON pg_user TO redshift_commander;
GRANT SELECT ON pg_group TO redshift_commander;
GRANT SELECT ON svv_roles TO redshift_commander;
GRANT SELECT ON svv_all_schemas TO redshift_commander;
GRANT SELECT ON svv_all_tables TO redshift_commander;
GRANT SELECT ON pg_views TO redshift_commander;
GRANT SELECT ON pg_proc TO redshift_commander;
GRANT SELECT ON pg_namespace TO redshift_commander;
GRANT SELECT ON svv_relation_privileges TO redshift_commander;
GRANT SELECT ON svv_default_privileges TO redshift_commander;
GRANT SELECT ON svv_user_grants TO redshift_commander;
GRANT SELECT ON svv_role_grants TO redshift_commander;

-- Grant information_schema access
GRANT SELECT ON information_schema.table_privileges TO redshift_commander;
GRANT SELECT ON information_schema.usage_privileges TO redshift_commander;

-- For privilege management (requires per-schema/table grants)
-- This needs to be done for each schema/table the user should manage
-- Example:
-- GRANT ALL ON SCHEMA your_schema TO redshift_commander WITH GRANT OPTION;
-- GRANT ALL ON ALL TABLES IN SCHEMA your_schema TO redshift_commander WITH GRANT OPTION;
```

## Important Notes

1. **SUPERUSER is strongly recommended** for full functionality, especially for:
   - Creating users, groups, and roles
   - Viewing all privileges across the cluster
   - Managing privileges on all schemas and tables

2. **Limited privilege setup requires extensive per-object grants** and may not work for all schemas/tables

3. **SHOW GRANTS command** requires SUPERUSER privileges in most cases

4. **Some system views** may require SUPERUSER access depending on Redshift version

5. **Error handling** is implemented to gracefully degrade functionality when certain privileges are missing

## Security Considerations

- Use a dedicated service account for Redshift Commander
- Rotate passwords regularly
- Consider using IAM authentication where possible
- Audit the privileges granted to the service account
- Monitor usage through CloudTrail and Redshift logs

## Troubleshooting

If certain features don't work:

1. Check if the user has SUPERUSER privileges: `SELECT usesuper FROM pg_user WHERE usename = 'your_user';`
2. Review Redshift logs for permission denied errors
3. Test individual queries manually to identify missing privileges
4. Consider upgrading to SUPERUSER if extensive privilege management is needed