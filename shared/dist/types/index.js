"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.PaymentEventType = exports.RuleActionType = exports.ConditionOperator = exports.ConditionField = exports.FeeType = exports.TransactionStatus = exports.StepStatus = exports.RoutingAction = exports.PaymentProvider = exports.AccountType = exports.RiskProfile = exports.KYCStatus = void 0;
var KYCStatus;
(function (KYCStatus) {
    KYCStatus["PENDING"] = "PENDING";
    KYCStatus["VERIFIED"] = "VERIFIED";
    KYCStatus["REJECTED"] = "REJECTED";
    KYCStatus["EXPIRED"] = "EXPIRED";
})(KYCStatus || (exports.KYCStatus = KYCStatus = {}));
var RiskProfile;
(function (RiskProfile) {
    RiskProfile["LOW"] = "LOW";
    RiskProfile["MEDIUM"] = "MEDIUM";
    RiskProfile["HIGH"] = "HIGH";
})(RiskProfile || (exports.RiskProfile = RiskProfile = {}));
var AccountType;
(function (AccountType) {
    AccountType["BANK_ACCOUNT"] = "BANK_ACCOUNT";
    AccountType["EWALLET"] = "EWALLET";
    AccountType["CREDIT_CARD"] = "CREDIT_CARD";
    AccountType["DEBIT_CARD"] = "DEBIT_CARD";
    AccountType["CRYPTO_WALLET"] = "CRYPTO_WALLET";
})(AccountType || (exports.AccountType = AccountType = {}));
var PaymentProvider;
(function (PaymentProvider) {
    // Malaysian Banks
    PaymentProvider["MAYBANK"] = "MAYBANK";
    PaymentProvider["CIMB"] = "CIMB";
    PaymentProvider["PUBLIC_BANK"] = "PUBLIC_BANK";
    PaymentProvider["RHB"] = "RHB";
    PaymentProvider["HONG_LEONG"] = "HONG_LEONG";
    // Malaysian E-Wallets
    PaymentProvider["TOUCH_N_GO"] = "TOUCH_N_GO";
    PaymentProvider["GRABPAY"] = "GRABPAY";
    PaymentProvider["BOOST"] = "BOOST";
    PaymentProvider["SHOPEE_PAY"] = "SHOPEE_PAY";
    // Regional
    PaymentProvider["PROMPTPAY"] = "PROMPTPAY";
    PaymentProvider["PAYNOW"] = "PAYNOW";
    PaymentProvider["QRIS"] = "QRIS";
    // International
    PaymentProvider["PAYPAL"] = "PAYPAL";
    PaymentProvider["WISE"] = "WISE";
})(PaymentProvider || (exports.PaymentProvider = PaymentProvider = {}));
var RoutingAction;
(function (RoutingAction) {
    RoutingAction["DEBIT"] = "DEBIT";
    RoutingAction["CREDIT"] = "CREDIT";
    RoutingAction["CONVERT"] = "CONVERT";
    RoutingAction["ROUTE"] = "ROUTE";
})(RoutingAction || (exports.RoutingAction = RoutingAction = {}));
var StepStatus;
(function (StepStatus) {
    StepStatus["PENDING"] = "PENDING";
    StepStatus["PROCESSING"] = "PROCESSING";
    StepStatus["COMPLETED"] = "COMPLETED";
    StepStatus["FAILED"] = "FAILED";
})(StepStatus || (exports.StepStatus = StepStatus = {}));
var TransactionStatus;
(function (TransactionStatus) {
    TransactionStatus["PENDING"] = "PENDING";
    TransactionStatus["PROCESSING"] = "PROCESSING";
    TransactionStatus["COMPLETED"] = "COMPLETED";
    TransactionStatus["FAILED"] = "FAILED";
    TransactionStatus["CANCELLED"] = "CANCELLED";
    TransactionStatus["REFUNDED"] = "REFUNDED";
})(TransactionStatus || (exports.TransactionStatus = TransactionStatus = {}));
var FeeType;
(function (FeeType) {
    FeeType["PROCESSING"] = "PROCESSING";
    FeeType["FOREIGN_EXCHANGE"] = "FOREIGN_EXCHANGE";
    FeeType["NETWORK"] = "NETWORK";
    FeeType["CROSS_BORDER"] = "CROSS_BORDER";
})(FeeType || (exports.FeeType = FeeType = {}));
var ConditionField;
(function (ConditionField) {
    ConditionField["AMOUNT"] = "AMOUNT";
    ConditionField["CURRENCY"] = "CURRENCY";
    ConditionField["MERCHANT_CATEGORY"] = "MERCHANT_CATEGORY";
    ConditionField["LOCATION"] = "LOCATION";
    ConditionField["TIME_OF_DAY"] = "TIME_OF_DAY";
    ConditionField["DAY_OF_WEEK"] = "DAY_OF_WEEK";
    ConditionField["ACCOUNT_BALANCE"] = "ACCOUNT_BALANCE";
})(ConditionField || (exports.ConditionField = ConditionField = {}));
var ConditionOperator;
(function (ConditionOperator) {
    ConditionOperator["EQUALS"] = "EQUALS";
    ConditionOperator["NOT_EQUALS"] = "NOT_EQUALS";
    ConditionOperator["GREATER_THAN"] = "GREATER_THAN";
    ConditionOperator["LESS_THAN"] = "LESS_THAN";
    ConditionOperator["CONTAINS"] = "CONTAINS";
    ConditionOperator["IN"] = "IN";
})(ConditionOperator || (exports.ConditionOperator = ConditionOperator = {}));
var RuleActionType;
(function (RuleActionType) {
    RuleActionType["USE_ACCOUNT"] = "USE_ACCOUNT";
    RuleActionType["AVOID_ACCOUNT"] = "AVOID_ACCOUNT";
    RuleActionType["SET_PRIORITY"] = "SET_PRIORITY";
    RuleActionType["REQUIRE_CONFIRMATION"] = "REQUIRE_CONFIRMATION";
})(RuleActionType || (exports.RuleActionType = RuleActionType = {}));
var PaymentEventType;
(function (PaymentEventType) {
    PaymentEventType["PAYMENT_INITIATED"] = "PAYMENT_INITIATED";
    PaymentEventType["PAYMENT_PROCESSING"] = "PAYMENT_PROCESSING";
    PaymentEventType["PAYMENT_COMPLETED"] = "PAYMENT_COMPLETED";
    PaymentEventType["PAYMENT_FAILED"] = "PAYMENT_FAILED";
    PaymentEventType["ROUTING_DECISION"] = "ROUTING_DECISION";
    PaymentEventType["ACCOUNT_BALANCE_UPDATED"] = "ACCOUNT_BALANCE_UPDATED";
    PaymentEventType["NETWORK_STATUS_CHANGED"] = "NETWORK_STATUS_CHANGED";
})(PaymentEventType || (exports.PaymentEventType = PaymentEventType = {}));
//# sourceMappingURL=index.js.map