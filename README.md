# Redshift Commander

A single-container full-stack webapp for managing Amazon Redshift database permissions, users, groups, and roles. This tool provides a comprehensive visual interface for Redshift privilege management.

## Key Features

- **Identity Management**: Create and manage users, groups, and roles
- **Comprehensive Privilege Operations**: Support for all 5 types of Redshift grants/revokes:
  - Table/View privileges (SELECT, INSERT, UPDATE, DELETE, DROP, REFERENCES)
  - Default privileges (schema-level defaults)
  - Schema privileges (USAGE, CREATE)
  - Database privileges (CONNECT, CREATE, TEMP)
  - Role assignments (GRANT/REVOKE roles)
- **Interactive Interface**: Single-page application with dedicated sections for actions, identities, objects, and privilege preview
- **Smart Object Browser**: Expandable schema tree with lazy-loading tables and views
- **Live Current Privileges**: See current permissions for selected identities and objects
- **SQL Preview & Execution**: Review generated GRANT/REVOKE statements before execution
- **Transaction Safety**: All operations wrapped in transactions with rollback support
- **Performance Optimized**: Handles large clusters with thousands of objects efficiently

## Architecture

- **Frontend**: React + TypeScript + Chakra UI with Zustand state management
- **Backend**: Node.js + Express + TypeScript
- **Database**: Amazon Redshift via `pg` library as target, no local db
- **Deployment**: Single container serving both frontend and API

## Quick Start

### Using Docker (Recommended)

```bash
docker pull flarghi/redshift-commander
docker run -p 80:80 flarghi/redshift-commander

# Access the application
open http://localhost:80
```

### Production Build

```bash
# Build the application
npm run build

# Start production server
npm start

# Access the application
open http://localhost:80
```

## Usage

1. **Connect to Redshift**: Enter cluster credentials and establish connection
2. **Select Action Type**: Choose from 5 privilege operation types:
   - **Table Privileges**: Table/view level permissions
   - **Default Privileges**: Schema-level defaults for future objects
   - **Schema Privileges**: Schema access and creation rights
   - **Database Privileges**: Database-level permissions
   - **Role**: Role assignment/revocation
3. **Create/Select Identities**: Create new users/groups/roles or select existing ones
4. **Select Objects**: Choose target schemas, tables, views, or roles based on action type
5. **Check Current Privileges**: View existing permissions for selected identities and objects
6. **Check Bottom Bar**: Check recap on the bottom bar, open modal on bottom right button to check aviaialble actions
7. **Execute Operations**: Select Grant / Revoke and privileges, review generated SQL and execute with transaction safety

## Required Privileges

The connecting user needs specific Redshift privileges to function properly. **SUPERUSER privileges are recommended** for full functionality.

### Quick Setup (Recommended)
```sql
CREATE USER adminuser CREATEUSER PASSWORD '1234Admin';
ALTER USER adminuser CREATEUSER;
```

### Minimum Required Privileges
See [`REQUIRED_PRIVILEGES.md`](REQUIRED_PRIVILEGES.md) for detailed privilege requirements and setup instructions for non-superuser accounts.

## System Views Used

The application queries these Redshift system views and catalogs:
- `pg_user`, `pg_group`, `svv_roles` - Identity management
- `svv_all_schemas`, `svv_all_tables`, `pg_views` - Object discovery
- `svv_relation_privileges`, `svv_schema_privileges` - Permission queries

See [`REDSHIFT_QUERIES.md`](REDSHIFT_QUERIES.md) for complete query reference and version compatibility notes.

## Performance & Security

### Performance Features
- **Lazy Loading**: Schemas load instantly, objects on-demand
- **Query Optimization**: Efficient bulk operations, built-in limits
- **Large Cluster Support**: Handles thousands of objects efficiently with pagination
- **Fallback Support**: Graceful degradation across Redshift versions

### Security Features
- **Connection Validation**: Test connections before establishing sessions
- **SQL Preview**: Always show generated SQL before execution
- **Transaction Safety**: All operations are atomic with rollback
- **Input Sanitization**: Proper parameterized queries
- **Security Headers**: Helmet.js protection and CORS configuration

## Development

### Build Commands
```bash
npm run dev                    # Development (both backend/frontend)
npm run build                 # Production build
npm start                     # Production server
```

## Deployment

### Container Deployment
```bash
docker build -t redshift-commander .
docker run -p 80:80 redshift-commander
```

Deploy to any container platform: AWS ECS/Fargate, Google Cloud Run, Azure Container Instances, Kubernetes.

## Contributing

1. Fork the repository
2. Create a feature branch  
3. Test thoroughly
4. Submit a pull request

## License

MIT License