import { create } from 'zustand';
import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import Constants from 'expo-constants';

interface NotificationState {
  expoPushToken: string | null;
  notification: Notifications.Notification | null;
  
  // Actions
  registerForPushNotifications: () => Promise<void>;
  setNotification: (notification: Notifications.Notification) => void;
}

export const useNotificationStore = create<NotificationState>((set, get) => ({
  expoPushToken: null,
  notification: null,

  registerForPushNotifications: async () => {
    try {
      if (!Device.isDevice) {
        console.log('Must use physical device for Push Notifications');
        return;
      }

      const { status: existingStatus } = await Notifications.getPermissionsAsync();
      let finalStatus = existingStatus;
      
      if (existingStatus !== 'granted') {
        const { status } = await Notifications.requestPermissionsAsync();
        finalStatus = status;
      }
      
      if (finalStatus !== 'granted') {
        console.log('Failed to get push token for push notification!');
        return;
      }
      
      const token = (await Notifications.getExpoPushTokenAsync({
        projectId: Constants.expoConfig?.extra?.eas?.projectId,
      })).data;
      
      console.log('Expo Push Token:', token);
      set({ expoPushToken: token });
      
      if (Device.osName === 'Android') {
        Notifications.setNotificationChannelAsync('default', {
          name: 'default',
          importance: Notifications.AndroidImportance.MAX,
          vibrationPattern: [0, 250, 250, 250],
          lightColor: '#FF231F7C',
        });
      }
    } catch (error) {
      console.error('Error registering for push notifications:', error);
    }
  },

  setNotification: (notification: Notifications.Notification) => {
    set({ notification });
  },
}));