import {
  Box,
  HStack,
  Button,
  Text,
  Badge,
  Wrap,
  WrapItem,
  Icon,
  IconButton,
  Tooltip,
} from '@chakra-ui/react';
import { ChevronRightIcon, CloseIcon } from '@chakra-ui/icons';
import useStore from '../store/store';

interface BottomBarProps {
  onActionClick: () => void;
  isActionDisabled: boolean;
  isLoading: boolean;
}

const BottomBar: React.FC<BottomBarProps> = ({ onActionClick, isActionDisabled, isLoading }) => {
  const {
    action,
    selectedIdentities,
    selectedObjects,
    selectedTargetIdentities,
    allTablesSelection,
    resetState,
  } = useStore();

  const isRoleAction = action === 'role';
  const totalSelectedObjects = selectedObjects.length + allTablesSelection.size;

  const getRecapText = () => {
    const identityCount = selectedIdentities.length;
    const objectCount = totalSelectedObjects;
    const targetCount = selectedTargetIdentities.length;

    if (isRoleAction) {
      return `${identityCount} identit${identityCount === 1 ? 'y' : 'ies'} → ${targetCount} role${targetCount === 1 ? '' : 's'}`;
    }

    if (action === 'database_privileges') {
      return `${identityCount} identit${identityCount === 1 ? 'y' : 'ies'} → database`;
    }

    return `${identityCount} identit${identityCount === 1 ? 'y' : 'ies'} → ${objectCount} object${objectCount === 1 ? '' : 's'}`;
  };

  const hasSelections = selectedIdentities.length > 0 || totalSelectedObjects > 0 || selectedTargetIdentities.length > 0;

  const getButtonLabel = () => {
    if (action === 'privileges') return 'Manage Table Privileges';
    if (action === 'default_privileges') return 'Manage Default Privileges';
    if (action === 'schema_privileges') return 'Manage Schema Privileges';
    if (action === 'database_privileges') return 'Manage Database Privileges';
    if (action === 'role') return 'Manage Role Assignments';
    return 'Grant / Revoke';
  };

  const handleReset = () => {
    resetState();
  };

  return (
    <Box
      position="fixed"
      bottom={0}
      left={0}
      right={0}
      bg="card-bg"
      borderTop="1px solid"
      borderColor="border-primary"
      px={4}
      py={3}
      zIndex={1000}
      shadow="lg"
    >
      <HStack justify="space-between" align="center" maxW="99vw" mx="auto">
        {/* Left side - Reset button and Recap */}
        <Box flex="1" maxW="60%" minW={0}>
          <HStack spacing={3} align="center">
            {/* Reset button */}
            {hasSelections && (
              <Tooltip label="Clear all selections" placement="top">
                <IconButton
                  aria-label="Clear all selections"
                  icon={<CloseIcon />}
                  size="sm"
                  variant="ghost"
                  colorScheme="red"
                  onClick={handleReset}
                  _hover={{ bg: 'hover-bg', transform: 'scale(1.05)' }}
                  _active={{ transform: 'scale(0.95)' }}
                  borderRadius="full"
                />
              </Tooltip>
            )}
            <Text fontSize="sm" color="text-secondary" isTruncated>
              {getRecapText()}
            </Text>
            
            {/* Quick badges for selections */}
            <Wrap spacing={1} align="center">
              {selectedIdentities.length > 0 && (
                <WrapItem>
                  <Badge colorScheme="blue" size="sm">
                    {selectedIdentities.length} identit{selectedIdentities.length === 1 ? 'y' : 'ies'}
                  </Badge>
                </WrapItem>
              )}
              
              {totalSelectedObjects > 0 && (
                <WrapItem>
                  <Badge colorScheme="green" size="sm">
                    {totalSelectedObjects} object{totalSelectedObjects === 1 ? '' : 's'}
                  </Badge>
                </WrapItem>
              )}
              
              {selectedTargetIdentities.length > 0 && (
                <WrapItem>
                  <Badge colorScheme="purple" size="sm">
                    {selectedTargetIdentities.length} role{selectedTargetIdentities.length === 1 ? '' : 's'}
                  </Badge>
                </WrapItem>
              )}
            </Wrap>
          </HStack>
        </Box>

        {/* Right side - Action Button */}
        <Button
          size="lg"
          colorScheme="blue"
          onClick={onActionClick}
          isDisabled={isActionDisabled || isLoading}
          isLoading={isLoading}
          loadingText="Loading..."
          rightIcon={<Icon as={ChevronRightIcon} />}
          flexShrink={0}
        >
          {getButtonLabel()}
        </Button>
      </HStack>
    </Box>
  );
};

export default BottomBar;