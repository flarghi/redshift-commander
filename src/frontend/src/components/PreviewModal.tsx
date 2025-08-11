import { useEffect } from 'react';
import {
  Modal,
  ModalOverlay,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalFooter,
  ModalCloseButton,
  VStack,
  HStack,
  Text,
  Code,
  Box,
  Button,
  ButtonGroup,
  Checkbox,
  Badge,
  Grid,
  useToast,
} from '@chakra-ui/react';
import useStore from '../store/store';
import type { Permission } from '../types';
import { PrivilegeBadge } from '../utils/badgeUtils';
import { getPrivilegeSetForAction } from '../constants/privileges';

interface PreviewModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const PreviewModal: React.FC<PreviewModalProps> = ({ isOpen, onClose }) => {
  const {
    action,
    permissions,
    setPermissions,
    grantOrRevoke,
    setGrantOrRevoke,
    previewSql,
    isLoading,
    runQuery,
    triggerRefreshPrivileges,
    generatePreview,
    resetModalState,
  } = useStore();

  const toast = useToast();
  const isRoleAction = action === 'role';

  const handleClose = () => {
    resetModalState();
    onClose();
  };

  const handlePrivilegeChange = (permission: Permission, checked: boolean) => {
    const newPermissions = checked
      ? [...permissions, permission]
      : permissions.filter((p) => p.value !== permission.value);
    setPermissions(newPermissions);
  };

  const handleSelectAll = (privilegeSet: Permission[], checked: boolean) => {
    setPermissions(checked ? privilegeSet : []);
  };

  // Regenerate preview whenever permissions or grantOrRevoke change
  useEffect(() => {
    if (isOpen && (!isRoleAction || permissions.length > 0 || isRoleAction)) {
      generatePreview().catch(() => {
        // Handle error silently for now
      });
    }
  }, [permissions, grantOrRevoke, isOpen, isRoleAction, generatePreview]);

  const handleExecute = async () => {
    try {
      await runQuery();
      toast({
        title: 'Success',
        description: 'Query executed successfully.',
        status: 'success',
        duration: 3000,
        isClosable: true,
      });
      handleClose();
      triggerRefreshPrivileges();
    } catch (error: any) {
      const errorMessage = error?.response?.data?.error || 
                           error?.response?.data?.message || 
                           error?.message || 
                           'Failed to execute query. Please try again.';
      
      toast({
        title: 'Error',
        description: errorMessage,
        status: 'error',
        duration: 5000,
        isClosable: true,
      });
    }
  };

  const privilegeSet = getPrivilegeSetForAction(action);
  
  // Check if privileges are required and selected
  const privilegesRequired = !isRoleAction;
  const hasPrivilegesSelected = permissions.length > 0;
  const isExecuteDisabled = privilegesRequired && !hasPrivilegesSelected;

  return (
    <Modal isOpen={isOpen} onClose={handleClose} size="xl">
      <ModalOverlay />
      <ModalContent>
        <ModalHeader>Action</ModalHeader>
        <ModalCloseButton />
        <ModalBody>
          <VStack align="stretch" spacing={4}>
            {/* Grant/Revoke Switch */}
            <ButtonGroup size="sm" isAttached variant="outline">
              <Button
                onClick={() => setGrantOrRevoke('grant')}
                colorScheme={grantOrRevoke === 'grant' ? 'green' : 'gray'}
                variant={grantOrRevoke === 'grant' ? 'solid' : 'outline'}
              >
                Grant
              </Button>
              <Button
                onClick={() => setGrantOrRevoke('revoke')}
                colorScheme={grantOrRevoke === 'revoke' ? 'red' : 'gray'}
                variant={grantOrRevoke === 'revoke' ? 'solid' : 'outline'}
              >
                Revoke
              </Button>
            </ButtonGroup>

            {/* Privileges Selection */}
            {!isRoleAction && (
              <VStack spacing={3} align="stretch">
                <HStack justify="space-between">
                  <Badge>{permissions.length} selected</Badge>
                </HStack>
                <VStack align="start" spacing={3}>
                  <Checkbox
                    isChecked={permissions.length === privilegeSet.length}
                    isIndeterminate={permissions.length > 0 && permissions.length < privilegeSet.length}
                    onChange={(e) => handleSelectAll(privilegeSet, e.target.checked)}
                    size="sm"
                  >
                    <Badge colorScheme="red">
                      ALL
                    </Badge>
                  </Checkbox>
                  <Grid templateColumns="repeat(2, 1fr)" gap={2} w="full">
                    {privilegeSet.map((p) => (
                      <Checkbox
                        key={p.value}
                        isChecked={permissions.some((perm) => perm.value === p.value)}
                        onChange={(e) => handlePrivilegeChange(p, e.target.checked)}
                        size="sm"
                      >
                        <PrivilegeBadge privilege={p.value} size="xs" />
                      </Checkbox>
                    ))}
                  </Grid>
                </VStack>
              </VStack>
            )}

            {/* SQL Preview */}
            <VStack align="stretch" spacing={2}>
              <Text fontWeight="semibold">The following SQL statements will be executed:</Text>
              <Box maxH="400px" overflowY="auto">
                {(isExecuteDisabled && !isRoleAction) ? (
                  <Text fontSize="sm" color="text-muted" fontStyle="italic" p={2}>
                    Select at least one privilege to see the SQL preview
                  </Text>
                ) : (
                  <Code display="block" p={2} mb={2} fontSize="sm">
                    {previewSql}
                  </Code>
                )}
              </Box>
            </VStack>
          </VStack>
        </ModalBody>
        <ModalFooter>
          <ButtonGroup>
            <Button
              variant="solid"
              bg="neutral-button"
              color="neutral-button-text"
              _hover={{ bg: 'neutral-button-hover' }}
              onClick={handleClose}
            >
              Cancel
            </Button>
            <Button
              variant="solid"
              bg={grantOrRevoke === 'grant' ? 'green.500' : 'red.500'}
              color="white"
              _hover={{ bg: grantOrRevoke === 'grant' ? 'green.600' : 'red.600' }}
              onClick={handleExecute}
              isLoading={isLoading}
              loadingText="Executing..."
              isDisabled={isExecuteDisabled || !previewSql || isLoading}
            >
              Execute {grantOrRevoke === 'grant' ? 'Grants' : 'Revokes'}
            </Button>
          </ButtonGroup>
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
};

export default PreviewModal;