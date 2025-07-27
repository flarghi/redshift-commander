import {
  VStack,
  Grid,
  GridItem,
  useDisclosure,
  useToast,
  Box,
} from '@chakra-ui/react';
import useStore from '../store/store';
import ObjectsSection from './ObjectsSection';
import IdentitiesSection from './IdentitiesSection';
import PreviewSection from './PreviewSection';
import PreviewModal from './PreviewModal';
import BottomBar from './BottomBar';

const MainInterface: React.FC = () => {
  const {
    action,
    selectedIdentities,
    selectedObjects,
    selectedTargetIdentities,
    allTablesSelection,
    isLoading,
    generatePreview,
  } = useStore();

  const { isOpen, onOpen, onClose } = useDisclosure();
  const toast = useToast();

  const isRoleAction = action === 'role';
  const objectsRequired = action !== 'database_privileges';

  // Action button logic
  const hasObjectSelections = selectedObjects.length > 0 || allTablesSelection.size > 0;
  
  const isActionDisabled =
    (isRoleAction && (selectedIdentities.length === 0 || selectedTargetIdentities.length === 0)) ||
    (action === 'database_privileges' && selectedIdentities.length === 0) ||
    (!isRoleAction && action !== 'database_privileges' && (selectedIdentities.length === 0 || !hasObjectSelections));

  const handlePreview = async () => {
    try {
      await generatePreview();
      onOpen();
    } catch {
      toast({
        title: 'Error',
        description: 'Failed to generate SQL preview. Please check your selections.',
        status: 'error',
        duration: 5000,
        isClosable: true,
      });
    }
  };

  return (
    <>
      <Box position="relative" w="full" h="calc(100vh - 280px)" pb={4}>
        <VStack spacing={3} align="stretch" w="full" p={1} h="full">
          {/* Full height 3-column grid: Identities (25%) + Objects (25%) + Current Privileges Preview (50%) */}
          <Grid
            templateColumns="1fr 1fr 2fr"
            gap={3}
            h="full"
          >
            <GridItem>
              <IdentitiesSection isTarget={false} />
            </GridItem>

            <GridItem>
              {objectsRequired ? (
                isRoleAction ? <IdentitiesSection isTarget={true} /> : <ObjectsSection />
              ) : null}
            </GridItem>

            <GridItem>
              <PreviewSection />
            </GridItem>
          </Grid>
        </VStack>

        {/* Preview Modal */}
        <PreviewModal isOpen={isOpen} onClose={onClose} />
      </Box>

      {/* Bottom Bar */}
      <BottomBar
        onActionClick={handlePreview}
        isActionDisabled={isActionDisabled}
        isLoading={isLoading}
      />
    </>
  );
};

export default MainInterface;
