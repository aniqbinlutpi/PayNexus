import React, { useEffect } from 'react';
import { StatusBar } from 'expo-status-bar';
import { NavigationContainer } from '@react-navigation/native';
import { Provider as PaperProvider } from 'react-native-paper';
import Toast from 'react-native-toast-message';
import * as Notifications from 'expo-notifications';
import Constants from 'expo-constants';

import { AppNavigator } from './src/navigation/AppNavigator';
import { useAuthStore } from './src/stores/authStore';
import { useNotificationStore } from './src/stores/notificationStore';
import { theme } from './src/theme';
import { LoadingScreen } from './src/components/LoadingScreen';
import { ErrorBoundary } from './src/components/ErrorBoundary';

// Configure notifications
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

export default function App() {
  const { isLoading, isAuthenticated, initialize } = useAuthStore();
  const { registerForPushNotifications } = useNotificationStore();

  useEffect(() => {
    // Initialize the app
    const initializeApp = async () => {
      try {
        // Initialize auth state
        await initialize();
        
        // Register for push notifications
        if (Constants.isDevice) {
          await registerForPushNotifications();
        }
      } catch (error) {
        console.error('Failed to initialize app:', error);
      }
    };

    initializeApp();
  }, [initialize, registerForPushNotifications]);

  if (isLoading) {
    return <LoadingScreen />;
  }

  return (
    <ErrorBoundary>
      <PaperProvider theme={theme}>
        <NavigationContainer>
          <StatusBar style="auto" />
          <AppNavigator isAuthenticated={isAuthenticated} />
          <Toast />
        </NavigationContainer>
      </PaperProvider>
    </ErrorBoundary>
  );
} 