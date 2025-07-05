export declare class OpenFinanceIntegrationService {
    getUnifiedBalanceView(userId: string): Promise<{
        userId: string;
        totalBalance: number;
        currency: string;
        accounts: ({
            user: {
                id: string;
                email: string;
                phoneNumber: string;
                firstName: string;
                lastName: string;
                countryCode: string;
                preferredCurrency: string;
                passwordHash: string;
                isEmailVerified: boolean;
                isPhoneVerified: boolean;
                createdAt: Date;
                updatedAt: Date;
            };
        } & {
            id: string;
            createdAt: Date;
            updatedAt: Date;
            userId: string;
            currency: string;
            accountType: import(".prisma/client").$Enums.AccountType;
            provider: import(".prisma/client").$Enums.PaymentProvider;
            accountNumber: string;
            accountName: string;
            balance: number | null;
            isActive: boolean;
            isPrimary: boolean;
            priority: number;
            dailyLimit: number | null;
            monthlyLimit: number | null;
            linkedAt: Date;
            lastSyncAt: Date | null;
        })[];
        lastUpdated: Date;
    }>;
    generateSmartPaymentSuggestions(context: any): Promise<{
        suggestionId: string;
        type: string;
        title: string;
        description: string;
        potentialSavings: number;
        confidence: number;
        expiresAt: Date;
    }[]>;
}
