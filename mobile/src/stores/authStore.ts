import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { User } from '@paynexus/shared';

interface AuthState {
  user: User | null;
  accessToken: string | null;
  refreshToken: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  
  // Actions
  setUser: (user: User) => void;
  setTokens: (accessToken: string, refreshToken: string) => void;
  clearAuth: () => void;
  initialize: () => Promise<void>;
  login: (email: string, password: string) => Promise<void>;
  register: (userData: {
    email: string;
    password: string;
    firstName: string;
    lastName: string;
    phoneNumber: string;
    countryCode: string;
  }) => Promise<void>;
  logout: () => Promise<void>;
}

// Use your computer's IP address instead of localhost for mobile testing
const API_BASE_URL = __DEV__ 
  ? 'http://192.168.0.34:3000/api'  // Your actual IP
  : 'https://your-production-api.com/api';

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  accessToken: null,
  refreshToken: null,
  isAuthenticated: false,
  isLoading: true,

  setUser: (user: User) => set({ user }),
  
  setTokens: (accessToken: string, refreshToken: string) => {
    set({ accessToken, refreshToken, isAuthenticated: true });
    AsyncStorage.setItem('accessToken', accessToken);
    AsyncStorage.setItem('refreshToken', refreshToken);
  },

  clearAuth: () => {
    set({
      user: null,
      accessToken: null,
      refreshToken: null,
      isAuthenticated: false,
    });
    AsyncStorage.multiRemove(['accessToken', 'refreshToken', 'user']);
  },

  initialize: async () => {
    try {
      set({ isLoading: true });
      
      const [accessToken, refreshToken, userJson] = await AsyncStorage.multiGet([
        'accessToken',
        'refreshToken',
        'user',
      ]);

      if (accessToken[1] && refreshToken[1] && userJson[1]) {
        const user = JSON.parse(userJson[1]);
        set({
          accessToken: accessToken[1],
          refreshToken: refreshToken[1],
          user,
          isAuthenticated: true,
        });
      }
    } catch (error) {
      console.error('Failed to initialize auth:', error);
      get().clearAuth();
    } finally {
      set({ isLoading: false });
    }
  },

  login: async (email: string, password: string) => {
    try {
      console.log('Attempting to login with:', email);
      console.log('API URL:', `${API_BASE_URL}/auth/login`);
      
      const response = await fetch(`${API_BASE_URL}/auth/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, password }),
      });

      console.log('Response status:', response.status);
      const data = await response.json();
      console.log('Response data:', data);

      if (!response.ok) {
        throw new Error(data.error?.message || data.message || 'Login failed');
      }

      const { user, accessToken, refreshToken } = data.data;
      
      set({ user, accessToken, refreshToken, isAuthenticated: true });
      
      // Store in AsyncStorage
      await AsyncStorage.multiSet([
        ['accessToken', accessToken],
        ['refreshToken', refreshToken],
        ['user', JSON.stringify(user)],
      ]);
      
      console.log('Login successful');
    } catch (error) {
      console.error('Login error:', error);
      if (error instanceof Error) {
        throw new Error(error.message);
      } else {
        throw new Error('Network error - please check your internet connection');
      }
    }
  },

  register: async (userData) => {
    try {
      console.log('Attempting to register with:', { ...userData, password: '[HIDDEN]' });
      console.log('API URL:', `${API_BASE_URL}/auth/register`);
      
      const response = await fetch(`${API_BASE_URL}/auth/register`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(userData),
      });

      console.log('Response status:', response.status);
      const data = await response.json();
      console.log('Response data:', data);

      if (!response.ok) {
        throw new Error(data.error?.message || data.message || 'Registration failed');
      }

      const { user, accessToken, refreshToken } = data.data;
      
      set({ user, accessToken, refreshToken, isAuthenticated: true });
      
      // Store in AsyncStorage
      await AsyncStorage.multiSet([
        ['accessToken', accessToken],
        ['refreshToken', refreshToken],
        ['user', JSON.stringify(user)],
      ]);
      
      console.log('Registration successful');
    } catch (error) {
      console.error('Registration error:', error);
      if (error instanceof Error) {
        throw new Error(error.message);
      } else {
        throw new Error('Network error - please check your internet connection');
      }
    }
  },

  logout: async () => {
    try {
      get().clearAuth();
    } catch (error) {
      console.error('Logout error:', error);
    }
  },
})); 