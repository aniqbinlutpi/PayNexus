import { PaymentProvider } from '../types';

// Currency utilities
export const formatCurrency = (amount: number, currency: string): string => {
  const formatter = new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
  
  return formatter.format(amount);
};

export const getCurrencySymbol = (currency: string): string => {
  const symbols: Record<string, string> = {
    MYR: 'RM',
    SGD: 'S$',
    THB: '฿',
    IDR: 'Rp',
    USD: '$',
    EUR: '€',
    GBP: '£',
  };
  
  return symbols[currency] || currency;
};

export const parseCurrencyAmount = (input: string): number => {
  // Remove currency symbols and non-numeric characters except decimal point
  const cleanInput = input.replace(/[^\d.-]/g, '');
  const amount = parseFloat(cleanInput);
  
  return isNaN(amount) ? 0 : amount;
};

// Validation utilities
export const validateEmail = (email: string): boolean => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

export const validatePhoneNumber = (phoneNumber: string, countryCode: string): boolean => {
  // Basic validation - can be enhanced with proper phone number libraries
  const cleanPhone = phoneNumber.replace(/[^\d]/g, '');
  
  const patterns: Record<string, RegExp> = {
    MY: /^60\d{8,9}$/, // Malaysia
    SG: /^65\d{8}$/, // Singapore
    TH: /^66\d{8,9}$/, // Thailand
    ID: /^62\d{8,12}$/, // Indonesia
  };
  
  const pattern = patterns[countryCode];
  return pattern ? pattern.test(cleanPhone) : cleanPhone.length >= 8;
};

export const validateAccountNumber = (accountNumber: string, provider: PaymentProvider): boolean => {
  // Basic validation patterns for different providers
  const patterns: Record<PaymentProvider, RegExp> = {
    // Malaysian Banks (simplified)
    [PaymentProvider.MAYBANK]: /^\d{12}$/,
    [PaymentProvider.CIMB]: /^\d{10,14}$/,
    [PaymentProvider.PUBLIC_BANK]: /^\d{10,12}$/,
    [PaymentProvider.RHB]: /^\d{10,14}$/,
    [PaymentProvider.HONG_LEONG]: /^\d{10,12}$/,
    
    // E-wallets (phone number based)
    [PaymentProvider.TOUCH_N_GO]: /^(\+?60|0)\d{8,10}$/,
    [PaymentProvider.GRABPAY]: /^(\+?60|0)\d{8,10}$/,
    [PaymentProvider.BOOST]: /^(\+?60|0)\d{8,10}$/,
    [PaymentProvider.SHOPEE_PAY]: /^(\+?60|0)\d{8,10}$/,
    
    // Regional
    [PaymentProvider.PROMPTPAY]: /^(\+?66|0)\d{8,9}$/,
    [PaymentProvider.PAYNOW]: /^(\+?65|0)\d{8}$/,
    [PaymentProvider.QRIS]: /^(\+?62|0)\d{8,12}$/,
    
    // International
    [PaymentProvider.PAYPAL]: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
    [PaymentProvider.WISE]: /^[A-Z0-9]{8,20}$/,
  };
  
  const pattern = patterns[provider];
  return pattern ? pattern.test(accountNumber) : accountNumber.length > 0;
};

// ID generation utilities
export const generateId = (): string => {
  return Math.random().toString(36).substring(2) + Date.now().toString(36);
};

export const generateTransactionId = (): string => {
  const timestamp = Date.now().toString(36);
  const random = Math.random().toString(36).substring(2, 8);
  return `TXN-${timestamp}-${random}`.toUpperCase();
};

export const generateQRCode = (data: any): string => {
  // In a real implementation, this would generate an actual QR code
  // For now, return a base64 encoded JSON string
  return Buffer.from(JSON.stringify(data)).toString('base64');
};

// Date utilities
export const formatDate = (date: Date, format: 'short' | 'long' | 'time' = 'short'): string => {
  let options: Intl.DateTimeFormatOptions;
  
  switch (format) {
    case 'short':
      options = { year: 'numeric', month: 'short', day: 'numeric' };
      break;
    case 'long':
      options = { year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' };
      break;
    case 'time':
      options = { hour: '2-digit', minute: '2-digit', second: '2-digit' };
      break;
    default:
      options = { year: 'numeric', month: 'short', day: 'numeric' };
  }
  
  return new Intl.DateTimeFormat('en-US', options).format(date);
};

export const isBusinessHours = (date: Date = new Date()): boolean => {
  const hour = date.getHours();
  const day = date.getDay(); // 0 = Sunday, 6 = Saturday
  
  // Business hours: Monday-Friday 9AM-6PM
  return day >= 1 && day <= 5 && hour >= 9 && hour < 18;
};

export const addBusinessDays = (date: Date, days: number): Date => {
  const result = new Date(date);
  let addedDays = 0;
  
  while (addedDays < days) {
    result.setDate(result.getDate() + 1);
    if (result.getDay() !== 0 && result.getDay() !== 6) { // Not weekend
      addedDays++;
    }
  }
  
  return result;
};

// Network and performance utilities
export const delay = (ms: number): Promise<void> => {
  return new Promise(resolve => setTimeout(resolve, ms));
};

export const retry = async <T>(
  operation: () => Promise<T>,
  maxRetries: number = 3,
  delayMs: number = 1000
): Promise<T> => {
  let lastError: Error;
  
  for (let i = 0; i <= maxRetries; i++) {
    try {
      return await operation();
    } catch (error) {
      lastError = error as Error;
      if (i < maxRetries) {
        await delay(delayMs * Math.pow(2, i)); // Exponential backoff
      }
    }
  }
  
  throw lastError!;
};

export const timeout = <T>(promise: Promise<T>, ms: number): Promise<T> => {
  return Promise.race([
    promise,
    new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error('Operation timed out')), ms)
    ),
  ]);
};

// Security utilities
export const maskAccountNumber = (accountNumber: string): string => {
  if (accountNumber.length <= 4) return accountNumber;
  
  const visibleChars = 4;
  const maskedLength = accountNumber.length - visibleChars;
  const masked = '*'.repeat(maskedLength);
  
  return masked + accountNumber.slice(-visibleChars);
};

export const maskEmail = (email: string): string => {
  const [localPart, domain] = email.split('@');
  if (localPart.length <= 2) return email;
  
  const visibleChars = 2;
  const maskedLength = localPart.length - visibleChars;
  const masked = '*'.repeat(maskedLength);
  
  return localPart.substring(0, visibleChars) + masked + '@' + domain;
};

export const generateOTP = (length: number = 6): string => {
  const digits = '0123456789';
  let otp = '';
  
  for (let i = 0; i < length; i++) {
    otp += digits[Math.floor(Math.random() * digits.length)];
  }
  
  return otp;
};

// Data transformation utilities
export const groupBy = <T, K extends keyof any>(
  array: T[],
  getKey: (item: T) => K
): Record<K, T[]> => {
  return array.reduce((groups, item) => {
    const key = getKey(item);
    if (!groups[key]) {
      groups[key] = [];
    }
    groups[key].push(item);
    return groups;
  }, {} as Record<K, T[]>);
};

export const sortBy = <T>(
  array: T[],
  getKey: (item: T) => string | number,
  direction: 'asc' | 'desc' = 'asc'
): T[] => {
  return [...array].sort((a, b) => {
    const aKey = getKey(a);
    const bKey = getKey(b);
    
    if (aKey < bKey) return direction === 'asc' ? -1 : 1;
    if (aKey > bKey) return direction === 'asc' ? 1 : -1;
    return 0;
  });
};

export const chunk = <T>(array: T[], size: number): T[][] => {
  const chunks: T[][] = [];
  for (let i = 0; i < array.length; i += size) {
    chunks.push(array.slice(i, i + size));
  }
  return chunks;
};

// Environment utilities
export const isDevelopment = (): boolean => {
  return process.env.NODE_ENV === 'development';
};

export const isProduction = (): boolean => {
  return process.env.NODE_ENV === 'production';
};

export const getEnvironmentVariable = (key: string, defaultValue?: string): string => {
  const value = process.env[key];
  if (value === undefined) {
    if (defaultValue !== undefined) {
      return defaultValue;
    }
    throw new Error(`Environment variable ${key} is not defined`);
  }
  return value;
};

// Logging utilities
export const createLogger = (context: string) => {
  return {
    info: (message: string, data?: any) => {
      console.log(`[${context}] INFO: ${message}`, data || '');
    },
    warn: (message: string, data?: any) => {
      console.warn(`[${context}] WARN: ${message}`, data || '');
    },
    error: (message: string, error?: any) => {
      console.error(`[${context}] ERROR: ${message}`, error || '');
    },
    debug: (message: string, data?: any) => {
      if (isDevelopment()) {
        console.debug(`[${context}] DEBUG: ${message}`, data || '');
      }
    },
  };
}; 