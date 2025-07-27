import { Badge, VStack, Text } from '@chakra-ui/react';

// Color schemes for different entity types
export const IDENTITY_COLORS = {
  user: 'blue',
  group: 'pink',
  role: 'purple'
} as const;

export const OBJECT_COLORS = {
  schema: 'cyan',
  table: 'teal',
  view: 'green'
} as const;

export const PRIVILEGE_COLORS = {
  select: 'green',
  update: 'yellow',
  insert: 'yellow',
  drop: 'red',
  delete: 'red',
  // Add other common privileges with grey as default
  usage: 'green',
  create: 'green',
  connect: 'gray',
  temporary: 'gray',
  temp: 'gray',
  member: 'gray',
  references: 'gray',
  truncate: 'red',
  alter: 'red',
  execute: 'gray',
  default: 'gray'
} as const;

export type IdentityType = keyof typeof IDENTITY_COLORS;
export type ObjectType = keyof typeof OBJECT_COLORS;
export type PrivilegeType = keyof typeof PRIVILEGE_COLORS;

// Get color scheme for identity type
export const getIdentityColorScheme = (type: string): string => {
  return IDENTITY_COLORS[type.toLowerCase() as IdentityType] || 'gray';
};

// Get color scheme for object type
export const getObjectColorScheme = (type: string): string => {
  return OBJECT_COLORS[type.toLowerCase() as ObjectType] || 'gray';
};

// Get color scheme for privilege type
export const getPrivilegeColorScheme = (privilege: string): string => {
  return PRIVILEGE_COLORS[privilege.toLowerCase() as PrivilegeType] || 'gray';
};

// Unified badge components
export const IdentityBadge: React.FC<{ type: string; size?: string }> = ({ type, size = 'sm' }) => (
  <Badge colorScheme={getIdentityColorScheme(type)} size={size}>
    {type.toUpperCase()}
  </Badge>
);

export const ObjectBadge: React.FC<{ type: string; size?: string }> = ({ type, size = 'sm' }) => (
  <Badge colorScheme={getObjectColorScheme(type)} size={size}>
    {type.toUpperCase()}
  </Badge>
);

export const PrivilegeBadge: React.FC<{ 
  privilege: string; 
  isDefault?: boolean; 
  hasAdminOption?: boolean; 
  size?: string 
}> = ({ privilege, isDefault = false, hasAdminOption = false, size = 'xs' }) => {
  const displayText = isDefault ? `${privilege.toUpperCase()} (DEFAULT)` : privilege.toUpperCase();
  const finalText = hasAdminOption ? `${displayText} (ADMIN)` : displayText;
  
  return (
    <Badge 
      colorScheme={getPrivilegeColorScheme(privilege)} 
      size={size}
      variant={isDefault ? 'solid' : 'outline'}
    >
      {finalText}
    </Badge>
  );
};

// Combined badge for identity with name and type
export const IdentityWithBadge: React.FC<{ name: string; type: string }> = ({ name, type }) => (
  <VStack align="start" spacing={1}>
    <Text fontSize="sm" fontWeight="medium">{name}</Text>
    <IdentityBadge type={type} size="xs" />
  </VStack>
);

// Combined badge for object with name and type
export const ObjectWithBadge: React.FC<{ name: string; type: string }> = ({ name, type }) => (
  <VStack align="start" spacing={1}>
    <Text fontSize="sm" fontWeight="medium">{name}</Text>
    <ObjectBadge type={type} size="xs" />
  </VStack>
);

// Combined badge for owner with name and type (for default privileges)
export const OwnerWithBadge: React.FC<{ name: string; type: string }> = ({ name, type }) => (
  <VStack align="start" spacing={1}>
    <Text fontSize="sm" fontWeight="medium">{name}</Text>
    <IdentityBadge type={type} size="xs" />
  </VStack>
);

// Special "ALL" badge for when all privileges are assigned
export const AllPrivilegesBadge: React.FC<{ size?: string }> = ({ size = 'xs' }) => (
  <Badge colorScheme="red" size={size}>
    ALL
  </Badge>
);