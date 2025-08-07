import { useState, useMemo, useEffect } from 'react';
import {
  Box,
  Card,
  CardBody,
  CardHeader,
  Heading,
  VStack,
  HStack,
  Table,
  Thead,
  Tbody,
  Tr,
  Th,
  Td,
  Checkbox,
  Input,
  InputGroup,
  InputLeftElement,
  Icon,
  Text,
  Flex,
  Button,
  Modal,
  ModalOverlay,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalFooter,
  ModalCloseButton,
  useDisclosure,
  FormControl,
  FormLabel,
  Select,
  IconButton,
  useToast,
  InputRightElement,
  Tooltip,
  Spinner,
} from '@chakra-ui/react';
import { SearchIcon, ChevronLeftIcon, ChevronRightIcon, AddIcon, ViewIcon, ViewOffIcon, RepeatIcon } from '@chakra-ui/icons';
import useStore from '../store/store';
import type { GrantableIdentity } from '../types';
import { IdentityBadge } from '../utils/badgeUtils';
import DynamicTruncatedText from './DynamicTruncatedText';

interface IdentitiesProps {
  isTarget?: boolean;
}

const IdentitiesSection: React.FC<IdentitiesProps> = ({ isTarget = false }) => {
  const {
    identities,
    targetIdentities,
    selectedIdentities,
    selectedTargetIdentities,
    setSelectedIdentities,
    setSelectedTargetIdentities,
    action,
    createIdentity,
    fetchInitialData,
  } = useStore();
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  // New Identity Modal State
  const { isOpen, onOpen, onClose } = useDisclosure();
  const [creating, setCreating] = useState(false);
  const [identityType, setIdentityType] = useState<'user' | 'group' | 'role'>('user');
  const [identityName, setIdentityName] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [groupUsers, setGroupUsers] = useState<string[]>([]);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const toast = useToast();

  const sourceIdentities = isTarget ? targetIdentities : identities;
  const selection = isTarget ? selectedTargetIdentities : selectedIdentities;
  const setSelection = isTarget ? setSelectedTargetIdentities : setSelectedIdentities;

  const handleSelection = (identity: GrantableIdentity, checked: boolean) => {
    const newSelection = checked
      ? [...selection, identity]
      : selection.filter((i) => i.name !== identity.name);
    setSelection(newSelection);
  };

  const filteredIdentities = useMemo(() => {
    return sourceIdentities.filter((i) =>
      i.name.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [sourceIdentities, searchTerm]);

  const paginatedIdentities = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    return filteredIdentities.slice(startIndex, startIndex + itemsPerPage);
  }, [filteredIdentities, currentPage, itemsPerPage]);

  const totalPages = Math.ceil(filteredIdentities.length / itemsPerPage);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm]);

  // Reset local state when action changes
  useEffect(() => {
    setSearchTerm('');
    setCurrentPage(1);
  }, [action]);

  const handleOpenModal = () => {
    // Reset form state
    setIdentityType('user');
    setIdentityName('');
    setPassword('');
    setShowPassword(false);
    setGroupUsers([]);
    onOpen();
  };

  const handleCreateIdentity = async () => {
    if (!identityName.trim()) {
      toast({
        title: 'Name Required',
        description: 'Please enter a name for the identity.',
        status: 'warning',
        duration: 3000,
      });
      return;
    }

    if (identityType === 'user' && !password.trim()) {
      toast({
        title: 'Password Required',
        description: 'Please enter a password for the user.',
        status: 'warning',
        duration: 3000,
      });
      return;
    }

    setCreating(true);
    try {
      await createIdentity(identityType, identityName, password, groupUsers);
      toast({
        title: 'Identity Created',
        description: `${identityType.charAt(0).toUpperCase() + identityType.slice(1)} "${identityName}" has been created successfully.`,
        status: 'success',
        duration: 5000,
      });
      onClose();
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : `Failed to create ${identityType}.`;
      toast({
        title: 'Creation Failed',
        description: errorMessage,
        status: 'error',
        duration: 5000,
      });
    } finally {
      setCreating(false);
    }
  };

  const handleGroupUserSelection = (username: string, checked: boolean) => {
    const newSelection = [...groupUsers];
    if (checked) {
      if (!newSelection.includes(username)) {
        newSelection.push(username);
      }
    } else {
      const index = newSelection.indexOf(username);
      if (index > -1) {
        newSelection.splice(index, 1);
      }
    }
    setGroupUsers(newSelection);
  };

  const handleRefresh = async () => {
    setIsRefreshing(true);
    try {
      await fetchInitialData();
    } catch (error) {
      console.error('Failed to refresh identities:', error);
    } finally {
      setIsRefreshing(false);
    }
  };

  const isRoleAction = action === 'role';
  const heading = isTarget 
    ? (isRoleAction ? 'Roles' : 'Target Identities')
    : 'Identities';

  return (
    <Card display="flex" flexDirection="column">
      <CardHeader>
        <HStack justify="space-between">
          <HStack spacing={2}>
            <Heading size="sm">{heading}</Heading>
            <Tooltip label="Create new identity" placement="top">
              <IconButton
                aria-label="Create new identity"
                icon={<AddIcon />}
                size="sm"
                variant="ghost"
                colorScheme="blue"
                onClick={handleOpenModal}
                _hover={{ bg: 'blue.50', transform: 'scale(1.05)' }}
                _active={{ transform: 'scale(0.95)' }}
                borderRadius="full"
              />
            </Tooltip>
          </HStack>
          <IconButton
            aria-label="Refresh identities"
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
              <Icon as={SearchIcon} color="search-icon" />
            </InputLeftElement>
            <Input
              placeholder={`Search ${heading.toLowerCase()}...`}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              size="sm"
              borderColor={'input-border'}
            />
          </InputGroup>
          <Text fontSize="sm" color="text-muted">
            Showing {paginatedIdentities.length} of {filteredIdentities.length} {heading.toLowerCase()}
            {searchTerm && ` (filtered from ${sourceIdentities.length} total)`}
          </Text>
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
                {paginatedIdentities.map((identity) => (
                  <Tr key={identity.name}>
                    <Td>
                      <Checkbox
                        isChecked={selection.some((i) => i.name === identity.name)}
                        onChange={(e) => handleSelection(identity, e.target.checked)}
                      />
                    </Td>
                    <Td>
                      <DynamicTruncatedText 
                        text={identity.name}
                        fontSize="sm"
                        fontWeight="medium"
                      />
                    </Td>
                    <Td>
                      <IdentityBadge type={identity.type} />
                    </Td>
                  </Tr>
                ))}
              </Tbody>
            </Table>
          </Box>
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
                rightIcon={<ChevronRightIcon />}
              >
                Next
              </Button>
            </Flex>
          )}
        </VStack>
      </CardBody>

      {/* Create Identity Modal */}
      <Modal isOpen={isOpen} onClose={onClose} size="lg">
        <ModalOverlay />
        <ModalContent>
          <ModalHeader>Create New Identity</ModalHeader>
          <ModalCloseButton />
          <ModalBody>
            <VStack spacing={4} align="stretch">
              <FormControl>
                <FormLabel>Identity Type</FormLabel>
                <Select
                  value={identityType}
                  onChange={(e) => setIdentityType(e.target.value as 'user' | 'group' | 'role')}
                >
                  <option value="user">User</option>
                  <option value="group">Group</option>
                  <option value="role">Role</option>
                </Select>
              </FormControl>

              <FormControl>
                <FormLabel>
                  {identityType === 'user' ? 'Username' :
                   identityType === 'group' ? 'Group Name' : 'Role Name'}
                </FormLabel>
                <Input
                  value={identityName}
                  onChange={(e) => setIdentityName(e.target.value)}
                  placeholder={`Enter ${identityType} name`}
                />
              </FormControl>

              {identityType === 'user' && (
                <FormControl>
                  <FormLabel>Password</FormLabel>
                  <InputGroup>
                    <Input
                      type={showPassword ? 'text' : 'password'}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="Enter password"
                    />
                    <InputRightElement>
                      <IconButton
                        aria-label={showPassword ? 'Hide password' : 'Show password'}
                        icon={showPassword ? <ViewOffIcon /> : <ViewIcon />}
                        size="sm"
                        variant="ghost"
                        onClick={() => setShowPassword(!showPassword)}
                      />
                    </InputRightElement>
                  </InputGroup>
                </FormControl>
              )}

              {identityType === 'group' && (
                <FormControl>
                  <FormLabel>Add Users to Group (Optional)</FormLabel>
                  <Box maxH="200px" overflowY="auto" border="1px" borderColor="border-primary" borderRadius="md" p={2}>
                    <VStack align="stretch" spacing={1}>
                      {identities.filter(u => u.type === 'user').map((user) => (
                        <Checkbox
                          key={user.name}
                          isChecked={groupUsers.includes(user.name)}
                          onChange={(e) => handleGroupUserSelection(user.name, e.target.checked)}
                          size="sm"
                        >
                          <DynamicTruncatedText 
                            text={user.name}
                            fontSize="sm"
                            as="span"
                          />
                        </Checkbox>
                      ))}
                      {identities.filter(u => u.type === 'user').length === 0 && (
                        <Text fontSize="sm" color="text-muted" textAlign="center" py={2}>
                          No users available
                        </Text>
                      )}
                    </VStack>
                  </Box>
                  <Text fontSize="xs" color="text-muted" mt={1}>
                    {groupUsers.length} user(s) selected
                  </Text>
                </FormControl>
              )}

              <Box bg="code-bg" p={3} borderRadius="md" border="1px" borderColor="border-primary">
                <Text fontSize="sm" fontWeight="medium" mb={2}>SQL Command Preview:</Text>
                <Text fontSize="sm" fontFamily="mono" color="text-code" whiteSpace="pre-line">
                  {identityType === 'user' && identityName && password ?
                    `CREATE USER "${identityName}" WITH PASSWORD '${password.replace(/./g, '*')}'` :
                   identityType === 'group' && identityName ?
                    `CREATE GROUP "${identityName}";${groupUsers.length > 0 ? `\nALTER GROUP "${identityName}" ADD USER ${groupUsers.join(', ')};` : ''}` :
                   identityType === 'role' && identityName ?
                    `CREATE ROLE "${identityName}";` :
                    'Enter details to see SQL preview'
                  }
                </Text>
              </Box>
            </VStack>
          </ModalBody>
          <ModalFooter>
            <HStack spacing={3}>
              <Button variant="outline" onClick={onClose}>
                Cancel
              </Button>
              <Button
                colorScheme="blue"
                onClick={handleCreateIdentity}
                isLoading={creating}
                loadingText="Creating..."
                isDisabled={!identityName.trim() || (identityType === 'user' && !password.trim())}
              >
                Create {identityType.charAt(0).toUpperCase() + identityType.slice(1)}
              </Button>
            </HStack>
          </ModalFooter>
        </ModalContent>
      </Modal>
    </Card>
  );
};

export default IdentitiesSection;
