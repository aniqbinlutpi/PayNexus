import { useAuthStore } from '../stores/authStore';

// Use your computer's IP address instead of localhost for mobile testing
const API_BASE_URL = __DEV__ 
  ? 'http://192.168.0.34:3000/api'
  : 'https://your-production-api.com/api';

class ApiService {
  private async makeRequest(endpoint: string, options: RequestInit = {}) {
    const { accessToken } = useAuthStore.getState();
    
    const url = `${API_BASE_URL}${endpoint}`;
    const config: RequestInit = {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...(accessToken && { Authorization: `Bearer ${accessToken}` }),
        ...options.headers,
      },
    };

    console.log('API Request:', url, config);

    try {
      const response = await fetch(url, config);
      const data = await response.json();

      console.log('API Response:', response.status, data);

      if (!response.ok) {
        throw new Error(data.error?.message || data.message || 'API request failed');
      }

      return data;
    } catch (error) {
      console.error('API Error:', error);
      throw error;
    }
  }

  // Account methods
  async getAccounts() {
    const response = await this.makeRequest('/payments/accounts');
    return response.data;
  }

  async getRecipients() {
    const response = await this.makeRequest('/payments/recipients');
    return response.data;
  }

  // Transaction methods
  async getTransactionHistory(limit = 10, offset = 0) {
    const response = await this.makeRequest(`/payments/history?limit=${limit}&offset=${offset}`);
    return response.data;
  }

  async getTransactionStatus(transactionId: string) {
    const response = await this.makeRequest(`/payments/status/${transactionId}`);
    return response.data;
  }

  async createTransfer(transferData: {
    recipientId: string;
    amount: number;
    currency: string;
    sourceAccountId: string;
    targetAccountId: string;
    description?: string;
  }) {
    const response = await this.makeRequest('/payments/transfer', {
      method: 'POST',
      body: JSON.stringify(transferData),
    });
    return response.data;
  }

  // Helper method to calculate total balance across accounts
  async getTotalBalance() {
    const accounts = await this.getAccounts();
    
    // Group by currency and sum balances
    const balanceByCurrency: { [currency: string]: number } = {};
    let accountCount = 0;

    accounts.forEach((account: any) => {
      if (account.balance) {
        balanceByCurrency[account.currency] = (balanceByCurrency[account.currency] || 0) + account.balance;
        accountCount++;
      }
    });

    // For simplicity, convert everything to user's primary currency (first account's currency)
    const primaryCurrency = accounts[0]?.currency || 'MYR';
    const primaryBalance = balanceByCurrency[primaryCurrency] || 0;

    // Simple conversion rates (in a real app, this would be from an API)
    const conversionRates: { [key: string]: number } = {
      'THB_MYR': 0.122,
      'SGD_MYR': 3.125,
      'MYR_MYR': 1.0,
    };

    let totalInPrimaryCurrency = primaryBalance;

    // Convert other currencies to primary currency
    Object.entries(balanceByCurrency).forEach(([currency, balance]) => {
      if (currency !== primaryCurrency) {
        const rate = conversionRates[`${currency}_${primaryCurrency}`] || 1;
        totalInPrimaryCurrency += balance * rate;
      }
    });

    return {
      total: totalInPrimaryCurrency,
      currency: primaryCurrency,
      accountCount,
      breakdown: balanceByCurrency,
    };
  }
}

export const apiService = new ApiService(); 