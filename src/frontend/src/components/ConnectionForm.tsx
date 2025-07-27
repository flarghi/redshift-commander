import { useState } from 'react';
import {
  Box,
  Card,
  CardBody,
  CardHeader,
  Heading,
  FormControl,
  FormLabel,
  Input,
  Button,
  VStack,
  HStack,
  Alert,
  AlertIcon,
  Spinner,
} from '@chakra-ui/react';
import type { RedshiftConnection } from '../types';
import useStore from '../store/store';

const ConnectionForm: React.FC = () => {
  const { connect, isConnecting, connectionError } = useStore();
  const [formData, setFormData] = useState<RedshiftConnection>({
    host: '',
    port: 5439,
    database: 'dev',
    username: '',
    password: '',
  });

  const handleInputChange = (field: keyof RedshiftConnection) => (
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    const value = field === 'port' ? parseInt(e.target.value) || 5439 : e.target.value;
    setFormData((prev: RedshiftConnection) => ({ ...prev, [field]: value }));
  };

  const handleConnect = async () => {
    await connect(formData);
  };

  const isFormValid = formData.host && formData.database && formData.username && formData.password;

  return (
    <Box maxW="md" mx="auto">
      <Card>
        <CardHeader>
          <Heading size="md">Connect to Redshift</Heading>
        </CardHeader>
        <CardBody>
          <VStack spacing={4}>
            <FormControl isRequired>
              <FormLabel>Host</FormLabel>
              <Input
                type="text"
                value={formData.host}
                onChange={handleInputChange('host')}
                placeholder="your-cluster.region.redshift.amazonaws.com"
              />
            </FormControl>

            <FormControl isRequired>
              <FormLabel>Port</FormLabel>
              <Input
                type="number"
                value={formData.port}
                onChange={handleInputChange('port')}
              />
            </FormControl>

            <FormControl isRequired>
              <FormLabel>Database</FormLabel>
              <Input
                type="text"
                value={formData.database}
                onChange={handleInputChange('database')}
                placeholder="dev"
              />
            </FormControl>

            <FormControl isRequired>
              <FormLabel>Username</FormLabel>
              <Input
                type="text"
                value={formData.username}
                onChange={handleInputChange('username')}
                placeholder="admin"
              />
            </FormControl>

            <FormControl isRequired>
              <FormLabel>Password</FormLabel>
              <Input
                type="password"
                value={formData.password}
                onChange={handleInputChange('password')}
              />
            </FormControl>

            {connectionError && (
              <Alert status="error">
                <AlertIcon />
                {connectionError}
              </Alert>
            )}

            <HStack spacing={4} width="100%">
              <Button
                onClick={handleConnect}
                isDisabled={!isFormValid || isConnecting}
                colorScheme="green"
                flex="1"
              >
                {isConnecting ? <Spinner size="sm" /> : 'Connect'}
              </Button>
            </HStack>
          </VStack>
        </CardBody>
      </Card>
    </Box>
  );
};

export default ConnectionForm;

