import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Alert } from 'react-native';

const API_BASE_URL = 'http://192.168.8.120:3000/api';

export const NetworkTest: React.FC = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<string>('');

  const testConnection = async () => {
    setIsLoading(true);
    setResult('Testing...');
    
    try {
      const response = await fetch(`${API_BASE_URL}/auth/register`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: `test${Date.now()}@example.com`,
          password: 'password123',
          firstName: 'Test',
          lastName: 'User',
          phoneNumber: `+6012345${Math.floor(Math.random() * 10000)}`,
          countryCode: 'MY',
        }),
      });

      const data = await response.json();
      
      if (response.ok) {
        setResult('✅ Connection successful! Signup API is working.');
        Alert.alert('Success', 'Backend connection is working!');
      } else {
        setResult(`❌ API Error: ${data.error?.message || data.message}`);
      }
    } catch (error) {
      console.error('Network test error:', error);
      setResult(`❌ Network Error: ${error instanceof Error ? error.message : 'Unknown error'}`);
      Alert.alert('Network Error', 'Cannot connect to backend. Make sure the backend server is running and your IP address is correct.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Network Test</Text>
      <TouchableOpacity
        style={[styles.button, isLoading && styles.buttonDisabled]}
        onPress={testConnection}
        disabled={isLoading}
      >
        <Text style={styles.buttonText}>
          {isLoading ? 'Testing...' : 'Test Backend Connection'}
        </Text>
      </TouchableOpacity>
      {result ? <Text style={styles.result}>{result}</Text> : null}
      <Text style={styles.info}>API URL: {API_BASE_URL}</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    padding: 20,
    backgroundColor: '#f0f0f0',
    margin: 20,
    borderRadius: 8,
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 16,
    textAlign: 'center',
  },
  button: {
    backgroundColor: '#007AFF',
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
    marginBottom: 16,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  buttonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
  },
  result: {
    fontSize: 14,
    marginBottom: 8,
    textAlign: 'center',
  },
  info: {
    fontSize: 12,
    color: '#666',
    textAlign: 'center',
  },
}); 