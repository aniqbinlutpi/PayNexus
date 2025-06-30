"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createLogger = exports.getEnvironmentVariable = exports.isProduction = exports.isDevelopment = exports.chunk = exports.sortBy = exports.groupBy = exports.generateOTP = exports.maskEmail = exports.maskAccountNumber = exports.timeout = exports.retry = exports.delay = exports.addBusinessDays = exports.isBusinessHours = exports.formatDate = exports.generateQRCode = exports.generateTransactionId = exports.generateId = exports.validateAccountNumber = exports.validatePhoneNumber = exports.validateEmail = exports.parseCurrencyAmount = exports.getCurrencySymbol = exports.formatCurrency = void 0;
const types_1 = require("../types");
// Currency utilities
const formatCurrency = (amount, currency) => {
    const formatter = new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: currency,
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
    });
    return formatter.format(amount);
};
exports.formatCurrency = formatCurrency;
const getCurrencySymbol = (currency) => {
    const symbols = {
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
exports.getCurrencySymbol = getCurrencySymbol;
const parseCurrencyAmount = (input) => {
    // Remove currency symbols and non-numeric characters except decimal point
    const cleanInput = input.replace(/[^\d.-]/g, '');
    const amount = parseFloat(cleanInput);
    return isNaN(amount) ? 0 : amount;
};
exports.parseCurrencyAmount = parseCurrencyAmount;
// Validation utilities
const validateEmail = (email) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
};
exports.validateEmail = validateEmail;
const validatePhoneNumber = (phoneNumber, countryCode) => {
    // Basic validation - can be enhanced with proper phone number libraries
    const cleanPhone = phoneNumber.replace(/[^\d]/g, '');
    const patterns = {
        MY: /^60\d{8,9}$/, // Malaysia
        SG: /^65\d{8}$/, // Singapore
        TH: /^66\d{8,9}$/, // Thailand
        ID: /^62\d{8,12}$/, // Indonesia
    };
    const pattern = patterns[countryCode];
    return pattern ? pattern.test(cleanPhone) : cleanPhone.length >= 8;
};
exports.validatePhoneNumber = validatePhoneNumber;
const validateAccountNumber = (accountNumber, provider) => {
    // Basic validation patterns for different providers
    const patterns = {
        // Malaysian Banks (simplified)
        [types_1.PaymentProvider.MAYBANK]: /^\d{12}$/,
        [types_1.PaymentProvider.CIMB]: /^\d{10,14}$/,
        [types_1.PaymentProvider.PUBLIC_BANK]: /^\d{10,12}$/,
        [types_1.PaymentProvider.RHB]: /^\d{10,14}$/,
        [types_1.PaymentProvider.HONG_LEONG]: /^\d{10,12}$/,
        // E-wallets (phone number based)
        [types_1.PaymentProvider.TOUCH_N_GO]: /^(\+?60|0)\d{8,10}$/,
        [types_1.PaymentProvider.GRABPAY]: /^(\+?60|0)\d{8,10}$/,
        [types_1.PaymentProvider.BOOST]: /^(\+?60|0)\d{8,10}$/,
        [types_1.PaymentProvider.SHOPEE_PAY]: /^(\+?60|0)\d{8,10}$/,
        // Regional
        [types_1.PaymentProvider.PROMPTPAY]: /^(\+?66|0)\d{8,9}$/,
        [types_1.PaymentProvider.PAYNOW]: /^(\+?65|0)\d{8}$/,
        [types_1.PaymentProvider.QRIS]: /^(\+?62|0)\d{8,12}$/,
        // International
        [types_1.PaymentProvider.PAYPAL]: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
        [types_1.PaymentProvider.WISE]: /^[A-Z0-9]{8,20}$/,
    };
    const pattern = patterns[provider];
    return pattern ? pattern.test(accountNumber) : accountNumber.length > 0;
};
exports.validateAccountNumber = validateAccountNumber;
// ID generation utilities
const generateId = () => {
    return Math.random().toString(36).substring(2) + Date.now().toString(36);
};
exports.generateId = generateId;
const generateTransactionId = () => {
    const timestamp = Date.now().toString(36);
    const random = Math.random().toString(36).substring(2, 8);
    return `TXN-${timestamp}-${random}`.toUpperCase();
};
exports.generateTransactionId = generateTransactionId;
const generateQRCode = (data) => {
    // In a real implementation, this would generate an actual QR code
    // For now, return a base64 encoded JSON string
    return Buffer.from(JSON.stringify(data)).toString('base64');
};
exports.generateQRCode = generateQRCode;
// Date utilities
const formatDate = (date, format = 'short') => {
    let options;
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
exports.formatDate = formatDate;
const isBusinessHours = (date = new Date()) => {
    const hour = date.getHours();
    const day = date.getDay(); // 0 = Sunday, 6 = Saturday
    // Business hours: Monday-Friday 9AM-6PM
    return day >= 1 && day <= 5 && hour >= 9 && hour < 18;
};
exports.isBusinessHours = isBusinessHours;
const addBusinessDays = (date, days) => {
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
exports.addBusinessDays = addBusinessDays;
// Network and performance utilities
const delay = (ms) => {
    return new Promise(resolve => setTimeout(resolve, ms));
};
exports.delay = delay;
const retry = async (operation, maxRetries = 3, delayMs = 1000) => {
    let lastError;
    for (let i = 0; i <= maxRetries; i++) {
        try {
            return await operation();
        }
        catch (error) {
            lastError = error;
            if (i < maxRetries) {
                await (0, exports.delay)(delayMs * Math.pow(2, i)); // Exponential backoff
            }
        }
    }
    throw lastError;
};
exports.retry = retry;
const timeout = (promise, ms) => {
    return Promise.race([
        promise,
        new Promise((_, reject) => setTimeout(() => reject(new Error('Operation timed out')), ms)),
    ]);
};
exports.timeout = timeout;
// Security utilities
const maskAccountNumber = (accountNumber) => {
    if (accountNumber.length <= 4)
        return accountNumber;
    const visibleChars = 4;
    const maskedLength = accountNumber.length - visibleChars;
    const masked = '*'.repeat(maskedLength);
    return masked + accountNumber.slice(-visibleChars);
};
exports.maskAccountNumber = maskAccountNumber;
const maskEmail = (email) => {
    const [localPart, domain] = email.split('@');
    if (localPart.length <= 2)
        return email;
    const visibleChars = 2;
    const maskedLength = localPart.length - visibleChars;
    const masked = '*'.repeat(maskedLength);
    return localPart.substring(0, visibleChars) + masked + '@' + domain;
};
exports.maskEmail = maskEmail;
const generateOTP = (length = 6) => {
    const digits = '0123456789';
    let otp = '';
    for (let i = 0; i < length; i++) {
        otp += digits[Math.floor(Math.random() * digits.length)];
    }
    return otp;
};
exports.generateOTP = generateOTP;
// Data transformation utilities
const groupBy = (array, getKey) => {
    return array.reduce((groups, item) => {
        const key = getKey(item);
        if (!groups[key]) {
            groups[key] = [];
        }
        groups[key].push(item);
        return groups;
    }, {});
};
exports.groupBy = groupBy;
const sortBy = (array, getKey, direction = 'asc') => {
    return [...array].sort((a, b) => {
        const aKey = getKey(a);
        const bKey = getKey(b);
        if (aKey < bKey)
            return direction === 'asc' ? -1 : 1;
        if (aKey > bKey)
            return direction === 'asc' ? 1 : -1;
        return 0;
    });
};
exports.sortBy = sortBy;
const chunk = (array, size) => {
    const chunks = [];
    for (let i = 0; i < array.length; i += size) {
        chunks.push(array.slice(i, i + size));
    }
    return chunks;
};
exports.chunk = chunk;
// Environment utilities
const isDevelopment = () => {
    return process.env.NODE_ENV === 'development';
};
exports.isDevelopment = isDevelopment;
const isProduction = () => {
    return process.env.NODE_ENV === 'production';
};
exports.isProduction = isProduction;
const getEnvironmentVariable = (key, defaultValue) => {
    const value = process.env[key];
    if (value === undefined) {
        if (defaultValue !== undefined) {
            return defaultValue;
        }
        throw new Error(`Environment variable ${key} is not defined`);
    }
    return value;
};
exports.getEnvironmentVariable = getEnvironmentVariable;
// Logging utilities
const createLogger = (context) => {
    return {
        info: (message, data) => {
            console.log(`[${context}] INFO: ${message}`, data || '');
        },
        warn: (message, data) => {
            console.warn(`[${context}] WARN: ${message}`, data || '');
        },
        error: (message, error) => {
            console.error(`[${context}] ERROR: ${message}`, error || '');
        },
        debug: (message, data) => {
            if ((0, exports.isDevelopment)()) {
                console.debug(`[${context}] DEBUG: ${message}`, data || '');
            }
        },
    };
};
exports.createLogger = createLogger;
//# sourceMappingURL=index.js.map