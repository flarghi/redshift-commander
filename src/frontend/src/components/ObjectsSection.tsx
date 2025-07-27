import { useState, useMemo, useEffect } from 'react';
import {
  Box,
  Card,
  CardBody,
  CardHeader,
  Heading,
  VStack,
  HStack,
  Text,
  Checkbox,
  Icon,
  Input,
  InputGroup,
  InputLeftElement,
  Flex,
  Button,
  Table,
  Thead,
  Tbody,
  Tr,
  Th,
  Td,
  Spinner,
  IconButton,
} from '@chakra-ui/react';
import { ChevronDownIcon, ChevronRightIcon, SearchIcon, ChevronLeftIcon, ChevronRightIcon as ChevronRightIconPagination, RepeatIcon } from '@chakra-ui/icons';
import useStore from '../store/store';
import type { GrantableObject } from '../types';
import { ObjectBadge, IdentityBadge } from '../utils/badgeUtils';
import DynamicTruncatedText from './DynamicTruncatedText';

const ObjectsSection: React.FC = () => {
  const { objects, selectedObjects, setSelectedObjects, action, fetchTablesForSchema, loadingSchemas, fetchInitialData, allTablesSelection, toggleAllTablesSelection } = useStore();
  const [expandedSchemas, setExpandedSchemas] = useState<Set<string>>(new Set());
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const itemsPerPage = 10;

  const handleSelection = (object: GrantableObject, checked: boolean) => {
    // Prevent individual table/view selection if ALL is selected for this schema
    if (object.schema && allTablesSelection.has(object.schema) && (object.type === 'table' || object.type === 'view')) {
      return;
    }
    
    const newSelection = checked
      ? [...selectedObjects, object]
      : selectedObjects.filter((o) => o.name !== object.name);
    setSelectedObjects(newSelection);
  };

  const toggleSchema = (schemaName: string) => {
    const newExpanded = new Set(expandedSchemas);
    if (newExpanded.has(schemaName)) {
      newExpanded.delete(schemaName);
    } else {
      newExpanded.add(schemaName);
      fetchTablesForSchema(schemaName);
    }
    setExpandedSchemas(newExpanded);
  };

  const handleRefresh = async () => {
    setIsRefreshing(true);
    try {
      await fetchInitialData();
    } catch (error) {
      console.error('Failed to refresh objects:', error);
    } finally {
      setIsRefreshing(false);
    }
  };

  const filteredObjects = useMemo(() => {
    return objects.filter((o) =>
      o.name.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [objects, searchTerm]);

  const paginatedObjects = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    return filteredObjects.slice(startIndex, startIndex + itemsPerPage);
  }, [filteredObjects, currentPage, itemsPerPage]);

  const totalPages = Math.ceil(filteredObjects.length / itemsPerPage);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm]);

  // Reset local state when action changes
  useEffect(() => {
    setSearchTerm('');
    setCurrentPage(1);
    setExpandedSchemas(new Set());
  }, [action]);

  const isRoleAction = action === 'role';
  const isTableAction = action === 'privileges';
  const isSchemaAction = ['default_privileges', 'schema_privileges'].includes(action);
  const heading = isRoleAction ? 'Roles' : 'Objects';
  
  const handleAllTablesToggle = (schemaName: string) => {
    if (isTableAction) {
      toggleAllTablesSelection(schemaName);
    }
  };

  return (
    <Card display="flex" flexDirection="column">
      <CardHeader>
        <HStack justify="space-between">
          <Heading size="sm">{heading}</Heading>
          <IconButton
            aria-label="Refresh objects"
            icon={isRefreshing ? <Spinner size="sm" /> : <RepeatIcon />}
            onClick={handleRefresh}
            isDisabled={isRefreshing}
            size="sm"
            variant="outline"
            colorScheme="blue"
          />
        </HStack>
      </CardHeader>
      <CardBody overflowY="auto" px={3} py={3} maxH="calc(100vh - 280px)">
        <VStack spacing={3} align="stretch">
          <InputGroup>
            <InputLeftElement pointerEvents="none">
              <Icon as={SearchIcon} color="gray.300" />
            </InputLeftElement>
            <Input
              placeholder={`Search ${heading.toLowerCase()}...`}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              size="sm"
            />
          </InputGroup>
          <Text fontSize="sm" color="gray.500">
            Showing {paginatedObjects.length} of {filteredObjects.length} {heading.toLowerCase()}
            {searchTerm && ` (filtered from ${objects.length} total)`}
          </Text>
          {isSchemaAction ? (
            // Flat list for schema actions - similar to IdentitiesSection
            <Box overflowX="auto">
              <Table size="sm" style={{ tableLayout: 'fixed', width: '100%' }}>
                <Thead>
                  <Tr>
                    <Th width="90px">Select</Th>
                    <Th>Schema Name</Th>
                    <Th width="80px">Type</Th>
                  </Tr>
                </Thead>
                <Tbody>
                  {paginatedObjects.map((object) => (
                    <Tr key={object.name}>
                      <Td>
                        <Checkbox
                          isChecked={selectedObjects.some((o) => o.name === object.name)}
                          onChange={(e) => handleSelection(object, e.target.checked)}
                        />
                      </Td>
                      <Td>
                        <DynamicTruncatedText 
                          text={object.name}
                          fontSize="sm"
                        />
                      </Td>
                      <Td>
                        {object.type === 'role' ? (
                          <IdentityBadge type={object.type} />
                        ) : (
                          <ObjectBadge type={object.type} />
                        )}
                      </Td>
                    </Tr>
                  ))}
                </Tbody>
              </Table>
            </Box>
          ) : (
            // Compact table view for table actions
            <Box overflowX="auto">
              <Table size="sm" style={{ tableLayout: 'fixed', width: '100%' }}>
                <Thead>
                  <Tr>
                    <Th width="90px">Select</Th>
                    <Th>Name</Th>
                    <Th width="80px">Type</Th>
                  </Tr>
                </Thead>
                <Tbody>
                  {paginatedObjects.map((object) => (
                    <>
                      <Tr key={object.name}>
                        <Td>
                          {object.type === 'schema' && !isRoleAction ? (
                            <HStack spacing={2}>
                              <Icon
                                as={expandedSchemas.has(object.name) ? ChevronDownIcon : ChevronRightIcon}
                                onClick={() => toggleSchema(object.name)}
                                cursor="pointer"
                                color="gray.500"
                                _hover={{ color: 'gray.700' }}
                              />
                              {isTableAction && (
                                <Checkbox
                                  isChecked={allTablesSelection.has(object.name)}
                                  onChange={() => handleAllTablesToggle(object.name)}
                                  size="sm"
                                />
                              )}
                              {loadingSchemas.has(object.name) && (
                                <Spinner size="xs" color="blue.500" />
                              )}
                            </HStack>
                          ) : (
                            <Checkbox
                              isChecked={selectedObjects.some((o) => o.name === object.name)}
                              onChange={(e) => handleSelection(object, e.target.checked)}
                              isDisabled={isTableAction && object.type === 'schema'}
                            />
                          )}
                        </Td>
                        <Td color={isTableAction && object.type === 'schema' ? 'gray.500' : 'inherit'}>
                          <DynamicTruncatedText 
                            text={object.name}
                            fontSize="sm"
                            color={isTableAction && object.type === 'schema' ? 'gray.500' : 'inherit'}
                          />
                        </Td>
                        <Td>
                          {object.type === 'role' ? (
                            <IdentityBadge type={object.type} />
                          ) : (
                            <ObjectBadge type={object.type} />
                          )}
                        </Td>
                      </Tr>
                      {object.type === 'schema' && expandedSchemas.has(object.name) && (
                        (object.children || []).map((child: GrantableObject) => {
                          const isAllTablesSelected = allTablesSelection.has(object.name);
                          const isChildDisabled = isAllTablesSelected && (child.type === 'table' || child.type === 'view');
                          
                          return (
                          <Tr key={`${object.name}-${child.name}`} bg={isChildDisabled ? "gray.100" : "gray.25"} opacity={isChildDisabled ? 0.6 : 1}>
                            <Td pl={12}>
                              <Checkbox
                                size="sm"
                                isChecked={isChildDisabled ? false : selectedObjects.some((o) => o.name === child.name && o.schema === child.schema)}
                                onChange={(e) => handleSelection(child, e.target.checked)}
                                isDisabled={isChildDisabled}
                              />
                            </Td>
                            <Td pl={12} fontSize="sm">
                              <DynamicTruncatedText 
                                text={child.name}
                                fontSize="sm"
                              />
                            </Td>
                            <Td>
                              <ObjectBadge type={child.type} />
                            </Td>
                          </Tr>
                          );
                        })
                      )}
                    </>
                  ))}
                </Tbody>
              </Table>
            </Box>
          )}
          {totalPages > 1 && (
            <Flex justify="space-between" align="center">
              <Button
                size="sm"
                onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                isDisabled={currentPage === 1}
                leftIcon={<ChevronLeftIcon />}
              >
                Previous
              </Button>
              <Text fontSize="sm">
                Page {currentPage} of {totalPages}
              </Text>
              <Button
                size="sm"
                onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                isDisabled={currentPage === totalPages}
                rightIcon={<ChevronRightIconPagination />}
              >
                Next
              </Button>
            </Flex>
          )}
        </VStack>
      </CardBody>
    </Card>
  );
};

export default ObjectsSection;
