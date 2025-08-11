import { useEffect, useMemo, useCallback } from 'react';
import {
  Box,
  Card,
  CardBody,
  CardHeader,
  Heading,
  VStack,
  Text,
  Table,
  Thead,
  Tbody,
  Tr,
  Th,
  Td,
  Button,
  HStack,
  IconButton,
  useToast,
  Spinner,
  Flex,
  Input,
  InputGroup,
  InputLeftElement,
  Icon,
} from '@chakra-ui/react';
import { RepeatIcon, ChevronLeftIcon, ChevronRightIcon, SearchIcon } from '@chakra-ui/icons';
import useStore from '../store/store';
import { getFilteredPermissions } from '../api';
import { PrivilegeBadge, AllPrivilegesBadge, IdentityBadge, ObjectBadge } from '../utils/badgeUtils';
import { getPrivilegeSetForAction } from '../constants/privileges';
import DynamicTruncatedText from './DynamicTruncatedText';

const PreviewSection: React.FC = () => {
  const {
    selectedIdentities,
    selectedObjects,
    selectedTargetIdentities,
    action,
    allTablesSelection,
    setRefreshPrivilegesCallback,
    currentPrivileges,
    isRefreshingPrivileges,
    privilegesCurrentPage,
    privilegesSearchTerm,
    setCurrentPrivileges,
    setIsRefreshingPrivileges,
    setPrivilegesCurrentPage,
    setPrivilegesSearchTerm,
  } = useStore();

  const itemsPerPage = 10;
  const toast = useToast();

  const isRoleAction = action === 'role';
  const isDatabaseAction = action === 'database_privileges';
  const isDefaultPrivilegesAction = action === 'default_privileges';

  const hasRequiredSelections = selectedIdentities.length > 0;
  const hasObjectSelections = selectedObjects.length > 0 || selectedTargetIdentities.length > 0;

  const filteredPrivileges = useMemo(() => {
    return currentPrivileges.filter((privilege) =>
      privilege.identity.toLowerCase().includes(privilegesSearchTerm.toLowerCase()) ||
      privilege.object?.toLowerCase().includes(privilegesSearchTerm.toLowerCase()) ||
      privilege.schema?.toLowerCase().includes(privilegesSearchTerm.toLowerCase()) ||
      privilege.privileges.some((priv: string) => priv.toLowerCase().includes(privilegesSearchTerm.toLowerCase())) ||
      privilege.owner?.toLowerCase().includes(privilegesSearchTerm.toLowerCase())
    );
  }, [currentPrivileges, privilegesSearchTerm]);

  const paginatedPrivileges = useMemo(() => {
    const startIndex = (privilegesCurrentPage - 1) * itemsPerPage;
    return filteredPrivileges.slice(startIndex, startIndex + itemsPerPage);
  }, [filteredPrivileges, privilegesCurrentPage, itemsPerPage]);

  const totalPages = Math.ceil(filteredPrivileges.length / itemsPerPage);

  // Reset to first page when privileges change
  useEffect(() => {
    setPrivilegesCurrentPage(1);
  }, [currentPrivileges.length, setPrivilegesCurrentPage]);

  const handleRefreshPreview = useCallback(async () => {
    if (!hasRequiredSelections) return;

    setIsRefreshingPrivileges(true);
    try {
      // Call the backend API to get current privileges using SHOW GRANTS
      let objectsToQuery: any[];
      
      if (isRoleAction) {
        // For role actions, use target identities as objects
        objectsToQuery = selectedTargetIdentities.map(identity => ({
          name: identity.name,
          type: 'role' as const,
          schema: undefined
        }));
      } else if (hasObjectSelections) {
        // Use selected objects if available
        objectsToQuery = selectedObjects;
      } else {
        // No objects selected - query all privileges for the identities based on action type
        objectsToQuery = [];
      }
      
      const response = await getFilteredPermissions(
        selectedIdentities,
        objectsToQuery,
        action,
        allTablesSelection
      );
      
      if (response.success && response.data) {
        // Group permissions by identity and object for better display
        const groupedPrivileges = response.data.reduce((acc: any[], permission: any) => {
          // Filter out unsupported RULE and TRIGGER privileges
          if (permission.privilege === 'RULE' || permission.privilege === 'TRIGGER') {
            return acc;
          }
          
          // Find existing entry for this identity/object combination
          const existingEntry = acc.find(entry => 
            entry.identity === permission.identity &&
            entry.object === permission.objectName &&
            entry.objectType === permission.objectType
          );
          
          if (existingEntry) {
            // Add privilege to existing entry
            if (!existingEntry.privileges.includes(permission.privilege)) {
              existingEntry.privileges.push(permission.privilege);
            }
          } else {
            // Create new entry
            acc.push({
              identity: permission.identity,
              object: permission.objectName,
              objectType: permission.objectType,
              schema: permission.schema,
              privileges: [permission.privilege],
              adminOption: permission.adminOption,
              privilegeScope: permission.privilegeScope,
              owner: permission.owner,
              ownerType: permission.ownerType
            });
          }
          
          return acc;
        }, []);
        
        setCurrentPrivileges(groupedPrivileges);
      } else {
        // If no data or API error, show empty state
        setCurrentPrivileges([]);
        toast({
          title: 'No Privileges Found',
          description: response.error || 'No current privileges found for the selected identities and objects.',
          status: 'info',
          duration: 3000,
          isClosable: true,
        });
      }
    } catch (error: any) {
      console.error('Failed to fetch current privileges:', error);
      setCurrentPrivileges([]);
      toast({
        title: 'Error',
        description: error.message || 'Failed to refresh privilege preview.',
        status: 'error',
        duration: 5000,
        isClosable: true,
      });
    } finally {
      setIsRefreshingPrivileges(false);
    }
  }, [hasRequiredSelections, selectedIdentities, selectedObjects, selectedTargetIdentities, action, allTablesSelection, hasObjectSelections, toast, setIsRefreshingPrivileges, setCurrentPrivileges]);

  // Register refresh callback with store
  useEffect(() => {
    setRefreshPrivilegesCallback(handleRefreshPreview);
    return () => setRefreshPrivilegesCallback(null);
  }, [setRefreshPrivilegesCallback, handleRefreshPreview]);

  return (
    <Card display="flex" flexDirection="column">
      <CardHeader>
        <HStack justify="space-between">
          <Heading size="sm">Current Privileges</Heading>
          <IconButton
            aria-label="Refresh preview"
            icon={isRefreshingPrivileges ? <Spinner size="sm" /> : <RepeatIcon />}
            onClick={handleRefreshPreview}
            isDisabled={!hasRequiredSelections || isRefreshingPrivileges}
            size="sm"
            variant="outline"
            colorScheme="blue"
          />
        </HStack>
      </CardHeader>
      <CardBody overflowY="auto" px={3} py={3} maxH="calc(100vh - 280px)">
        {!hasRequiredSelections ? (
          <VStack spacing={4} justify="center">
            <Text color="text-muted" textAlign="center">
              Select identities to see current privileges.
            </Text>
            <Text fontSize="sm" color="text-secondary" textAlign="center">
              {hasObjectSelections 
                ? "Click refresh to load privileges for selected objects."
                : "Click refresh to load all privileges for selected identities."
              }
            </Text>
          </VStack>
        ) : currentPrivileges.length === 0 ? (
          <VStack spacing={3} justify="center">
            <Text color="text-muted" textAlign="center">
              {hasObjectSelections 
                ? "Click refresh to load privileges for selected items."
                : "Click refresh to load all privileges for selected identities."
              }
            </Text>
            <Button
              onClick={handleRefreshPreview}
              isLoading={isRefreshingPrivileges}
              loadingText="Loading..."
              colorScheme="blue"
              variant="outline"
              size="sm"
            >
              Refresh
            </Button>
          </VStack>
        ) : (
          <VStack spacing={3} align="stretch">
            <InputGroup>
              <InputLeftElement pointerEvents="none">
                <Icon as={SearchIcon} color="search-icon" />
              </InputLeftElement>
              <Input
                placeholder="Search privileges..."
                value={privilegesSearchTerm}
                onChange={(e) => setPrivilegesSearchTerm(e.target.value)}
                size="sm"
                borderColor={'input-border'}
              />
            </InputGroup>
            <Text fontSize="sm" color="text-muted">
              Showing {paginatedPrivileges.length} of {filteredPrivileges.length} privilege entries
              {privilegesSearchTerm && ` (filtered from ${currentPrivileges.length} total)`}
            </Text>
            <Box overflowX="auto">
              <Table size="sm" style={{ tableLayout: 'fixed', width: '100%' }}>
                <Thead>
                  <Tr>
                    <Th width="25%">Identity</Th>
                    {!isDatabaseAction && <Th width="25%">{isRoleAction ? 'Role' : 'Object'}</Th>}
                    {!isDatabaseAction && !isRoleAction && <Th width="25%">Schema</Th>}
                    {isDefaultPrivilegesAction && <Th width="25%">Owner</Th>}
                    <Th width="25%">Privileges</Th>
                  </Tr>
                </Thead>
                <Tbody>
                  {paginatedPrivileges.map((privilege, index) => {
                    // Find the identity type from selectedIdentities
                    const identityInfo = selectedIdentities.find(id => id.name === privilege.identity);
                    const identityType = identityInfo?.type || 'user';
                    
                    // Check if all privileges are assigned (excluding unsupported RULE and TRIGGER)
                    const privilegeSet = getPrivilegeSetForAction(action);
                    const allPrivilegeValues = privilegeSet.map(p => p.value);
                    const filteredPrivileges = privilege.privileges.filter((priv: string) => priv !== 'RULE' && priv !== 'TRIGGER');
                    const hasAllPrivileges = filteredPrivileges.length === allPrivilegeValues.length && 
                      allPrivilegeValues.every(p => filteredPrivileges.includes(p));
                    
                    return (
                    <Tr key={index}>
                      <Td>
                        <VStack align="start" spacing={1}>
                          <DynamicTruncatedText 
                            text={privilege.identity}
                            fontSize="sm"
                            fontWeight="medium"
                          />
                          <IdentityBadge type={identityType} size="xs" />
                        </VStack>
                      </Td>
                      {!isDatabaseAction && (
                        <Td>
                          <VStack align="start" spacing={1}>
                            <DynamicTruncatedText 
                              text={privilege.object}
                              fontSize="sm"
                              fontWeight="medium"
                            />
                            {isRoleAction ? (
                              <IdentityBadge type="role" size="xs" />
                            ) : (
                              <ObjectBadge type={privilege.objectType} size="xs" />
                            )}
                          </VStack>
                        </Td>
                      )}
                      {!isDatabaseAction && !isRoleAction && (
                        <Td>
                          {privilege.schema && privilege.schema !== privilege.object ? (
                            <VStack align="start" spacing={1}>
                              <DynamicTruncatedText 
                                text={privilege.schema}
                                fontSize="sm"
                                fontWeight="medium"
                              />
                              <ObjectBadge type="schema" size="xs" />
                            </VStack>
                          ) : (
                            <Text fontSize="xs" color="gray.400">-</Text>
                          )}
                        </Td>
                      )}
                      {isDefaultPrivilegesAction && (
                        <Td>
                          {privilege.owner ? (
                            <VStack align="start" spacing={1}>
                              <DynamicTruncatedText 
                                text={privilege.owner}
                                fontSize="sm"
                                fontWeight="medium"
                              />
                              <IdentityBadge type={privilege.ownerType} size="xs" />
                            </VStack>
                          ) : (
                            <Text fontSize="xs" color="gray.400">-</Text>
                          )}
                        </Td>
                      )}
                      <Td>
                        <HStack spacing={1} wrap="wrap">
                          {hasAllPrivileges ? (
                            <AllPrivilegesBadge />
                          ) : (
                            privilege.privileges
                              .filter((priv: string) => priv !== 'RULE' && priv !== 'TRIGGER')
                              .map((priv: string) => (
                                <PrivilegeBadge 
                                  key={priv}
                                  privilege={priv}
                                  isDefault={privilege.privilegeScope === 'default'}
                                  hasAdminOption={privilege.adminOption}
                                />
                              ))
                          )}
                        </HStack>
                      </Td>
                    </Tr>
                    );
                  })}
                </Tbody>
              </Table>
            </Box>
            {totalPages > 1 && (
              <Flex justify="space-between" align="center">
                <Button
                  size="sm"
                  onClick={() => setPrivilegesCurrentPage(Math.max(1, privilegesCurrentPage - 1))}
                  isDisabled={privilegesCurrentPage === 1}
                  leftIcon={<ChevronLeftIcon />}
                >
                  Previous
                </Button>
                <Text fontSize="sm">
                  Page {privilegesCurrentPage} of {totalPages}
                </Text>
                <Button
                  size="sm"
                  onClick={() => setPrivilegesCurrentPage(Math.min(totalPages, privilegesCurrentPage + 1))}
                  isDisabled={privilegesCurrentPage === totalPages}
                  rightIcon={<ChevronRightIcon />}
                >
                  Next
                </Button>
              </Flex>
            )}
          </VStack>
        )}
      </CardBody>
    </Card>
  );
};

export default PreviewSection;
