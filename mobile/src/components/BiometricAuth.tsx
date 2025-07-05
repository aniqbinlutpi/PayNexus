import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Alert,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as LocalAuthentication from 'expo-local-authentication';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { apiService } from '../services/api';

interface BiometricAuthProps {
  onSuccess: (templateId: string) => void;
  onError: (error: string) => void;
  mode: 'register' | 'verify';
}

export const BiometricAuth: React.FC<BiometricAuthProps> = ({
  onSuccess,
  onError,
  mode
}) => {
  const [isSupported, setIsSupported] = useState(false);
  const [biometricType, setBiometricType] = useState<string>('');
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    checkBiometricSupport();
  }, []);

  const checkBiometricSupport = async () => {
    try {
      const compatible = await LocalAuthentication.hasHardwareAsync();
      const enrolled = await LocalAuthentication.isEnrolledAsync();
      const supportedTypes = await LocalAuthentication.supportedAuthenticationTypesAsync();
      
      setIsSupported(compatible && enrolled);
      
      if (supportedTypes.includes(LocalAuthentication.AuthenticationType.FACIAL_RECOGNITION)) {
        setBiometricType('FACE_ID');
      } else if (supportedTypes.includes(LocalAuthentication.AuthenticationType.FINGERPRINT)) {
        setBiometricType('FINGERPRINT');
      }
    } catch (error) {
      console.error('Biometric support check failed:', error);
      setIsSupported(false);
    }
  };

  const handleBiometricAuth = async () => {
    if (!isSupported) {
      onError('Biometric authentication not supported on this device');
      return;
    }

    setIsLoading(true);

    try {
      // Generate challenge for security
      const challenge = generateChallenge();
      
      // Perform biometric authentication
      const result = await LocalAuthentication.authenticateAsync({
        promptMessage: mode === 'register' 
          ? 'Register your biometric for secure payments' 
          : 'Verify your identity for secure payment',
        cancelLabel: 'Cancel',
        disableDeviceFallback: false,
      });

      if (result.success) {
        // Get device ID
        const deviceId = await getDeviceId();
        
        // Simulate biometric data (in production, this would be actual biometric template)
        const biometricData = generateBiometricData(result);

        if (mode === 'register') {
          await registerBiometric(biometricType, biometricData, deviceId);
        } else {
          await verifyBiometric(biometricType, biometricData, deviceId, challenge);
        }
      } else {
        onError('Biometric authentication cancelled or failed');
      }
    } catch (error) {
      console.error('Biometric authentication error:', error);
      onError('Biometric authentication failed');
    } finally {
      setIsLoading(false);
    }
  };

  const registerBiometric = async (type: string, data: string, deviceId: string) => {
    try {
      const API_BASE_URL = __DEV__ ? 'http://192.168.8.120:3000/api' : 'https://your-production-api.com/api';
      const response = await fetch(`${API_BASE_URL}/security/biometric/register`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${await AsyncStorage.getItem('accessToken')}`
        },
        body: JSON.stringify({
          biometricType: type,
          biometricData: data,
          deviceId
        })
      });

      const result = await response.json();

      if (result.success) {
        await AsyncStorage.setItem('biometricEnabled', 'true');
        await AsyncStorage.setItem('biometricTemplateId', result.data.templateId);
        onSuccess(result.data.templateId);
      } else {
        onError(result.error || 'Biometric registration failed');
      }
    } catch (error) {
      console.error('Biometric registration error:', error);
      onError('Failed to register biometric');
    }
  };

  const verifyBiometric = async (type: string, data: string, deviceId: string, challenge: string) => {
    try {
      const API_BASE_URL = __DEV__ ? 'http://192.168.8.120:3000/api' : 'https://your-production-api.com/api';
      const response = await fetch(`${API_BASE_URL}/security/biometric/verify`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${await AsyncStorage.getItem('accessToken')}`
        },
        body: JSON.stringify({
          biometricType: type,
          biometricData: data,
          deviceId,
          challenge
        })
      });

      const result = await response.json();

      if (result.success && result.data.verified) {
        onSuccess(result.data.templateId);
      } else {
        onError(result.error || 'Biometric verification failed');
      }
    } catch (error) {
      console.error('Biometric verification error:', error);
      onError('Failed to verify biometric');
    }
  };

  const generateChallenge = (): string => {
    return Math.random().toString(36).substring(2, 15) + 
           Math.random().toString(36).substring(2, 15);
  };

  const getDeviceId = async (): Promise<string> => {
    let deviceId = await AsyncStorage.getItem('deviceId');
    if (!deviceId) {
      deviceId = Platform.OS + '_' + Math.random().toString(36).substring(2, 15);
      await AsyncStorage.setItem('deviceId', deviceId);
    }
    return deviceId;
  };

  const generateBiometricData = (authResult: any): string => {
    // In production, this would extract actual biometric features
    // For demo, we'll create a mock template based on device and timestamp
    const mockData = {
      timestamp: Date.now(),
      deviceInfo: Platform.OS,
      authType: biometricType,
      sessionId: Math.random().toString(36)
    };
    
    return Buffer.from(JSON.stringify(mockData)).toString('base64');
  };

  const getBiometricIcon = () => {
    switch (biometricType) {
      case 'FACE_ID':
        return 'scan-outline';
      case 'FINGERPRINT':
        return 'finger-print-outline';
      default:
        return 'shield-checkmark-outline';
    }
  };

  const getBiometricLabel = () => {
    switch (biometricType) {
      case 'FACE_ID':
        return 'Face ID';
      case 'FINGERPRINT':
        return 'Fingerprint';
      default:
        return 'Biometric';
    }
  };

  if (!isSupported) {
    return (
      <View style={styles.container}>
        <Ionicons name="warning-outline" size={48} color="#FF6B6B" />
        <Text style={styles.unsupportedText}>
          Biometric authentication is not available on this device
        </Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <TouchableOpacity
        style={[styles.biometricButton, isLoading && styles.buttonDisabled]}
        onPress={handleBiometricAuth}
        disabled={isLoading}
      >
        <Ionicons 
          name={getBiometricIcon() as any} 
          size={32} 
          color={isLoading ? "#999" : "#007AFF"} 
        />
        <Text style={[styles.buttonText, isLoading && styles.buttonTextDisabled]}>
          {isLoading 
            ? 'Processing...' 
            : `${mode === 'register' ? 'Register' : 'Verify'} ${getBiometricLabel()}`
          }
        </Text>
      </TouchableOpacity>
      
      <Text style={styles.description}>
        {mode === 'register' 
          ? `Register your ${getBiometricLabel().toLowerCase()} for secure and convenient authentication`
          : `Use your ${getBiometricLabel().toLowerCase()} to verify this transaction`
        }
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    padding: 20,
  },
  biometricButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F0F8FF',
    paddingHorizontal: 24,
    paddingVertical: 16,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#007AFF',
    marginBottom: 16,
  },
  buttonDisabled: {
    backgroundColor: '#F5F5F5',
    borderColor: '#DDD',
  },
  buttonText: {
    marginLeft: 12,
    fontSize: 16,
    fontWeight: '600',
    color: '#007AFF',
  },
  buttonTextDisabled: {
    color: '#999',
  },
  description: {
    textAlign: 'center',
    fontSize: 14,
    color: '#666',
    lineHeight: 20,
  },
  unsupportedText: {
    textAlign: 'center',
    fontSize: 16,
    color: '#666',
    marginTop: 16,
    lineHeight: 22,
  },
}); 