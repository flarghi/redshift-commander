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
  Select,
  IconButton,
} from '@chakra-ui/react';
import { ViewIcon, ViewOffIcon } from '@chakra-ui/icons';
import MainInterface from './components/MainInterface';
import ConnectionForm from './components/ConnectionForm';
import useStore from './store/store';
import type { ActionType } from './types';
import logo from './assets/logo-2.png';

function App() {
  const {
    isLoading,
    error,
    isConnected,
    connectionConfig,
    checkConnectionStatus,
    disconnect,
    action,
    setAction,
    showConnectionString,
    toggleConnectionStringVisibility,
  } = useStore();

  useEffect(() => {
    checkConnectionStatus();
  }, [checkConnectionStatus]);

  const handleActionChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setAction(e.target.value as ActionType);
  };

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
    <Container maxW="99vw" py={4} px={2} minH="100vh">
      <Box mb={6}>
        <Box minH="60px" mb={3} overflow="hidden">
          <HStack justify="space-between" align="center" spacing={4} w="full">
            <HStack spacing={4} flexShrink={0}>
              <Image src={logo} alt="Redshift Commander" h="full" maxH="60px" objectFit="contain" />
              
              {/* Left-aligned Mode Selector */}
              {isConnected && (
                <HStack spacing={2} bg="gray.50" px={3} py={1.5} borderRadius="md" border="1px solid" borderColor="gray.300">
                  <Text fontSize="md" fontWeight="bold" color="gray.700">Mode</Text>
                  <Select 
                    value={action} 
                    onChange={handleActionChange} 
                    size="md" 
                    w="220px"
                    bg="white"
                    borderColor="gray.400"
                    _hover={{ borderColor: "gray.500" }}
                    _focus={{ borderColor: "gray.600", boxShadow: "0 0 0 1px gray.600" }}
                  >
                    <option value="privileges">Table Privileges</option>
                    <option value="default_privileges">Default Privileges</option>
                    <option value="schema_privileges">Schema Privileges</option>
                    <option value="database_privileges">Database Privileges</option>
                    <option value="role">Role</option>
                  </Select>
                </HStack>
              )}
            </HStack>

            <HStack spacing={3} flexShrink={0}>
              <Badge colorScheme={isConnected ? 'green' : 'red'} size="lg" flexShrink={0}>
                {isConnected ? 'Connected' : 'Disconnected'}
              </Badge>
              {connectionConfig && showConnectionString && (
                <Text 
                  fontSize="sm" 
                  color="gray.600" 
                  isTruncated 
                  maxW="calc(100vw - 800px)"
                  minW={0}
                  title={`${connectionConfig.username}@${connectionConfig.host}:${connectionConfig.port}/${connectionConfig.database}`}
                >
                  {connectionConfig.username}@{connectionConfig.host}:{connectionConfig.port}/{connectionConfig.database}
                </Text>
              )}
              {connectionConfig && (
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
        <hr/>
        {!isConnected && (
          <Alert status="info" mb={6}>
            <AlertIcon />
            Please connect to a Redshift database to begin managing permissions.
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
