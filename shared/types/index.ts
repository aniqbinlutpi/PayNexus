// User Management Types
export interface User {
  id: string;
  email: string;
  phoneNumber: string;
  firstName: string;
  lastName: string;
  countryCode: string;
  preferredCurrency: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface UserProfile {
  id: string;
  userId: string;
  avatarUrl?: string;
  dateOfBirth?: Date;
  address?: Address;
  kycStatus: KYCStatus;
  riskProfile: RiskProfile;
}

export interface Address {
  street: string;
  city: string;
  state: string;
  postalCode: string;
  country: string;
}

export enum KYCStatus {
  PENDING = 'PENDING',
  VERIFIED = 'VERIFIED',
  REJECTED = 'REJECTED',
  EXPIRED = 'EXPIRED'
}

export enum RiskProfile {
  LOW = 'LOW',
  MEDIUM = 'MEDIUM',
  HIGH = 'HIGH'
}

// Financial Account Types
export interface LinkedAccount {
  id: string;
  userId: string;
  accountType: AccountType;
  provider: PaymentProvider;
  accountNumber: string;
  accountName: string;
  currency: string;
  balance?: number;
  isActive: boolean;
  isPrimary: boolean;
  priority: number; // 1 = highest priority
  dailyLimit?: number;
  monthlyLimit?: number;
  linkedAt: Date;
  lastSyncAt?: Date;
}

export enum AccountType {
  BANK_ACCOUNT = 'BANK_ACCOUNT',
  EWALLET = 'EWALLET',
  CREDIT_CARD = 'CREDIT_CARD',
  DEBIT_CARD = 'DEBIT_CARD',
  CRYPTO_WALLET = 'CRYPTO_WALLET'
}

export enum PaymentProvider {
  // Malaysian Banks
  MAYBANK = 'MAYBANK',
  CIMB = 'CIMB',
  PUBLIC_BANK = 'PUBLIC_BANK',
  RHB = 'RHB',
  HONG_LEONG = 'HONG_LEONG',
  
  // Malaysian E-Wallets
  TOUCH_N_GO = 'TOUCH_N_GO',
  GRABPAY = 'GRABPAY',
  BOOST = 'BOOST',
  SHOPEE_PAY = 'SHOPEE_PAY',
  
  // Regional
  PROMPTPAY = 'PROMPTPAY', // Thailand
  PAYNOW = 'PAYNOW', // Singapore
  QRIS = 'QRIS', // Indonesia
  
  // International
  PAYPAL = 'PAYPAL',
  WISE = 'WISE'
}

// Payment Processing Types
export interface PaymentRequest {
  id: string;
  userId: string;
  amount: number;
  currency: string;
  targetCurrency?: string;
  merchantId?: string;
  merchantName?: string;
  description?: string;
  qrCode?: string;
  metadata?: Record<string, any>;
  expiresAt?: Date;
  createdAt: Date;
}

export interface PaymentTransaction {
  id: string;
  userId: string;
  paymentRequestId?: string;
  amount: number;
  currency: string;
  targetAmount?: number;
  targetCurrency?: string;
  exchangeRate?: number;
  sourceAccountId: string;
  targetAccountId?: string;
  routingPath: RoutingStep[];
  status: TransactionStatus;
  failureReason?: string;
  merchantInfo?: MerchantInfo;
  fees: Fee[];
  metadata?: Record<string, any>;
  initiatedAt: Date;
  completedAt?: Date;
  failedAt?: Date;
}

export interface RoutingStep {
  stepNumber: number;
  provider: PaymentProvider;
  action: RoutingAction;
  amount: number;
  currency: string;
  status: StepStatus;
  processingTime?: number; // milliseconds
  fees?: Fee[];
  externalTransactionId?: string;
}

export enum RoutingAction {
  DEBIT = 'DEBIT',
  CREDIT = 'CREDIT',
  CONVERT = 'CONVERT',
  ROUTE = 'ROUTE'
}

export enum StepStatus {
  PENDING = 'PENDING',
  PROCESSING = 'PROCESSING',
  COMPLETED = 'COMPLETED',
  FAILED = 'FAILED'
}

export enum TransactionStatus {
  PENDING = 'PENDING',
  PROCESSING = 'PROCESSING',
  COMPLETED = 'COMPLETED',
  FAILED = 'FAILED',
  CANCELLED = 'CANCELLED',
  REFUNDED = 'REFUNDED'
}

export interface MerchantInfo {
  id: string;
  name: string;
  category: string;
  location?: string;
  qrCode?: string;
}

export interface Fee {
  type: FeeType;
  amount: number;
  currency: string;
  description: string;
}

export enum FeeType {
  PROCESSING = 'PROCESSING',
  FOREIGN_EXCHANGE = 'FOREIGN_EXCHANGE',
  NETWORK = 'NETWORK',
  CROSS_BORDER = 'CROSS_BORDER'
}

// Smart Routing Types
export interface RoutingRule {
  id: string;
  userId: string;
  name: string;
  conditions: RoutingCondition[];
  actions: RoutingRuleAction[];
  priority: number;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface RoutingCondition {
  field: ConditionField;
  operator: ConditionOperator;
  value: any;
}

export enum ConditionField {
  AMOUNT = 'AMOUNT',
  CURRENCY = 'CURRENCY',
  MERCHANT_CATEGORY = 'MERCHANT_CATEGORY',
  LOCATION = 'LOCATION',
  TIME_OF_DAY = 'TIME_OF_DAY',
  DAY_OF_WEEK = 'DAY_OF_WEEK',
  ACCOUNT_BALANCE = 'ACCOUNT_BALANCE'
}

export enum ConditionOperator {
  EQUALS = 'EQUALS',
  NOT_EQUALS = 'NOT_EQUALS',
  GREATER_THAN = 'GREATER_THAN',
  LESS_THAN = 'LESS_THAN',
  CONTAINS = 'CONTAINS',
  IN = 'IN'
}

export interface RoutingRuleAction {
  type: RuleActionType;
  accountId?: string;
  priority?: number;
  maxAmount?: number;
}

export enum RuleActionType {
  USE_ACCOUNT = 'USE_ACCOUNT',
  AVOID_ACCOUNT = 'AVOID_ACCOUNT',
  SET_PRIORITY = 'SET_PRIORITY',
  REQUIRE_CONFIRMATION = 'REQUIRE_CONFIRMATION'
}

// Smart Routing Engine Types
export interface RoutingDecision {
  selectedRoute: RoutingPath;
  alternativeRoutes: RoutingPath[];
  decisionFactors: DecisionFactor[];
  estimatedTime: number; // seconds
  totalCost: number;
  confidence: number; // 0-1
}

export interface RoutingPath {
  id: string;
  steps: RoutingStep[];
  totalCost: number;
  estimatedTime: number;
  successProbability: number;
  riskScore: number;
}

export interface DecisionFactor {
  factor: string;
  weight: number;
  value: any;
  impact: number; // -1 to 1
}

// External API Types
export interface ExchangeRate {
  fromCurrency: string;
  toCurrency: string;
  rate: number;
  timestamp: Date;
  provider: string;
}

export interface AccountBalance {
  accountId: string;
  balance: number;
  currency: string;
  availableBalance: number;
  lastUpdated: Date;
}

export interface PaymentNetworkStatus {
  provider: PaymentProvider;
  isOnline: boolean;
  responseTime: number; // milliseconds
  lastChecked: Date;
  maintenanceWindow?: {
    start: Date;
    end: Date;
  };
}

// API Response Types
export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
    details?: any;
  };
  timestamp: Date;
}

export interface PaginatedResponse<T> {
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

// Real-time Event Types
export interface PaymentEvent {
  type: PaymentEventType;
  transactionId: string;
  userId: string;
  data: any;
  timestamp: Date;
}

export enum PaymentEventType {
  PAYMENT_INITIATED = 'PAYMENT_INITIATED',
  PAYMENT_PROCESSING = 'PAYMENT_PROCESSING',
  PAYMENT_COMPLETED = 'PAYMENT_COMPLETED',
  PAYMENT_FAILED = 'PAYMENT_FAILED',
  ROUTING_DECISION = 'ROUTING_DECISION',
  ACCOUNT_BALANCE_UPDATED = 'ACCOUNT_BALANCE_UPDATED',
  NETWORK_STATUS_CHANGED = 'NETWORK_STATUS_CHANGED'
} 