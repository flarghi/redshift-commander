import { useEffect } from 'react';
import {
  Box,
  Container,
  Alert,
  AlertIcon,
  Spinner,
  HStack,
  Text,
  Image,
  Badge,
  Button,
  IconButton,
  Divider,
  useColorModeValue,
} from '@chakra-ui/react';
import { ViewIcon, ViewOffIcon } from '@chakra-ui/icons';
import MainInterface from './components/MainInterface';
import ConnectionForm from './components/ConnectionForm';
import { ThemeToggle } from './components/ThemeToggle';
import useStore from './store/store';
import type { ActionType } from './types';
import logoLight from './assets/logo-light.png';
import logoDark from './assets/logo-dark.png';

function App() {
  const {
    isLoading,
    error,
    isConnected,
    connectionInfo,
    initializeFromSession,
    disconnect,
    action,
    setAction,
    showConnectionString,
    toggleConnectionStringVisibility,
  } = useStore();

  const logo = useColorModeValue(logoLight, logoDark);

  useEffect(() => {
    // Initialize from current browser session first, then check status
    initializeFromSession();
  }, [initializeFromSession]);

  // Cleanup session on page unload for extra security
  useEffect(() => {
    const handleBeforeUnload = () => {
      // Optional: Clear sensitive data on tab close for extra security
      // sessionStorage is already isolated per tab, but this adds extra cleanup
      if (sessionStorage.getItem('redshift-connection-config')) {
        // You could add additional cleanup here if needed
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, []);

  const actionTabs: { value: ActionType; label: string }[] = [
    { value: 'privileges', label: 'Table Privileges' },
    { value: 'default_privileges', label: 'Default Privileges' },
    { value: 'schema_privileges', label: 'Schema Privileges' },
    { value: 'database_privileges', label: 'Database Privileges' },
    { value: 'role', label: 'Roles' },
  ];

  if (isLoading && !isConnected) {
    return (
      <Container maxW="container.xl" py={8}>
        <HStack justify="center">
          <Spinner />
          <Text>Loading...</Text>
        </HStack>
      </Container>
    );
  }

  return (
    <Container maxW="99vw" py={4} px={2} minH="100vh" bg="app-bg">
      <Box mb={6}>
        <Box minH="60px" mb={3} overflow="hidden">
          <HStack justify="space-between" align="center" spacing={4} w="full">
            <HStack spacing={4} flexShrink={0}>
              <Image src={logo} alt="Redshift Commander" h="full" maxH="60px" objectFit="contain" />
            </HStack>

            <HStack spacing={3} flexShrink={0}>
              <ThemeToggle />
              <Badge colorScheme={isConnected ? 'green' : 'red'} size="lg" flexShrink={0}>
                {isConnected ? 'Connected' : 'Disconnected'}
              </Badge>
              {connectionInfo && showConnectionString && (
                <Text 
                  fontSize="sm" 
                  color="text-connection"
                  isTruncated 
                  maxW="calc(100vw - 800px)"
                  minW={0}
                  title={`${connectionInfo.username}@${connectionInfo.host}:${connectionInfo.port}/${connectionInfo.database}`}
                >
                  {connectionInfo.username}@{connectionInfo.host}:{connectionInfo.port}/{connectionInfo.database}
                </Text>
              )}
              {connectionInfo && (
                <IconButton
                  aria-label={showConnectionString ? "Hide connection string" : "Show connection string"}
                  icon={showConnectionString ? <ViewOffIcon /> : <ViewIcon />}
                  size="sm"
                  variant="ghost"
                  onClick={toggleConnectionStringVisibility}
                  flexShrink={0}
                />
              )}
              {isConnected && (
                <Button onClick={disconnect} colorScheme="red" variant="outline" size="sm" flexShrink={0}>
                  Disconnect
                </Button>
              )}
            </HStack>
          </HStack>
        </Box>
        {isConnected && (
          <HStack spacing={0} mt={3}>
            {actionTabs.map((tab) => (
              <Button
                key={tab.value}
                size="sm"
                variant="unstyled"
                px={4}
                py={2}
                fontSize="sm"
                fontWeight={action === tab.value ? 'semibold' : 'normal'}
                color={action === tab.value ? 'tab-active-text' : 'tab-text'}
                borderBottom="2px solid"
                borderColor={action === tab.value ? 'tab-active-border' : 'transparent'}
                borderRadius={0}
                _hover={{
                  color: 'tab-hover-text',
                  borderColor: action === tab.value ? 'tab-active-border' : 'tab-hover-border',
                }}
                onClick={() => setAction(tab.value)}
              >
                {tab.label}
              </Button>
            ))}
          </HStack>
        )}
        <Divider borderColor="divider" />
        {!isConnected && (
          <Alert status="info" mb={6}>
            <AlertIcon />
            Please connect to a Redshift cluster to begin managing permissions.
          </Alert>
        )}
      </Box>
      
      {error && (
        <Alert status="error" mb={4}>
          <AlertIcon />
          {error}
        </Alert>
      )}

      {!isConnected ? <ConnectionForm /> : <MainInterface />}
    </Container>
  );
}

export default App;
