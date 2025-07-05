"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const client_1 = require("@prisma/client");
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const prisma = new client_1.PrismaClient();
async function main() {
    console.log('🌱 Starting database seed...');
    // Create sample users
    const users = [
        {
            email: 'john.doe@example.com',
            password: 'password123',
            firstName: 'John',
            lastName: 'Doe',
            phoneNumber: '+60123456789',
            countryCode: 'MY',
        },
        {
            email: 'jane.smith@example.com',
            password: 'password123',
            firstName: 'Jane',
            lastName: 'Smith',
            phoneNumber: '+60123456790',
            countryCode: 'MY',
        },
        {
            email: 'thai.user@example.com',
            password: 'password123',
            firstName: 'Somchai',
            lastName: 'Jaidee',
            phoneNumber: '+66812345678',
            countryCode: 'TH',
        },
        {
            email: 'sg.user@example.com',
            password: 'password123',
            firstName: 'Wei',
            lastName: 'Ming',
            phoneNumber: '+6591234567',
            countryCode: 'SG',
        },
    ];
    console.log('👥 Creating users...');
    for (const userData of users) {
        const hashedPassword = await bcryptjs_1.default.hash(userData.password, 12);
        const user = await prisma.user.upsert({
            where: { email: userData.email },
            update: {},
            create: {
                email: userData.email,
                passwordHash: hashedPassword,
                firstName: userData.firstName,
                lastName: userData.lastName,
                phoneNumber: userData.phoneNumber,
                countryCode: userData.countryCode,
            },
        });
        console.log(`✅ Created user: ${user.email}`);
        // Create linked accounts for each user
        const accounts = [
            {
                accountType: client_1.AccountType.BANK_ACCOUNT,
                provider: userData.countryCode === 'MY' ? client_1.PaymentProvider.MAYBANK : userData.countryCode === 'TH' ? client_1.PaymentProvider.PROMPTPAY : client_1.PaymentProvider.PAYNOW,
                accountNumber: `${userData.countryCode}${Math.floor(Math.random() * 1000000000)}`,
                accountName: `${userData.firstName} ${userData.lastName}`,
                currency: userData.countryCode === 'MY' ? 'MYR' : userData.countryCode === 'TH' ? 'THB' : 'SGD',
                balance: Math.floor(Math.random() * 10000) + 1000,
                isActive: true,
                isPrimary: true,
            },
            {
                accountType: client_1.AccountType.EWALLET,
                provider: userData.countryCode === 'MY' ? client_1.PaymentProvider.TOUCH_N_GO : client_1.PaymentProvider.GRABPAY,
                accountNumber: `${userData.phoneNumber}`,
                accountName: `${userData.firstName} ${userData.lastName}`,
                currency: userData.countryCode === 'MY' ? 'MYR' : userData.countryCode === 'TH' ? 'THB' : 'SGD',
                balance: Math.floor(Math.random() * 5000) + 500,
                isActive: true,
                isPrimary: false,
            },
        ];
        for (const accountData of accounts) {
            const account = await prisma.linkedAccount.upsert({
                where: {
                    userId_provider_accountNumber: {
                        userId: user.id,
                        provider: accountData.provider,
                        accountNumber: accountData.accountNumber,
                    }
                },
                update: {},
                create: {
                    ...accountData,
                    userId: user.id,
                },
            });
            console.log(`💳 Created account: ${account.provider} (${account.currency})`);
        }
    }
    // Create sample transactions
    console.log('💸 Creating sample transactions...');
    const allUsers = await prisma.user.findMany({
        include: { linkedAccounts: true }
    });
    if (allUsers.length >= 2) {
        const malayUser = allUsers.find(u => u.countryCode === 'MY');
        const thaiUser = allUsers.find(u => u.countryCode === 'TH');
        if (malayUser && thaiUser && malayUser.linkedAccounts.length > 0 && thaiUser.linkedAccounts.length > 0) {
            // Cross-border transaction: Malaysian user pays Thai user
            const crossBorderTx = await prisma.paymentTransaction.create({
                data: {
                    userId: malayUser.id,
                    amount: 150.00, // 150 THB
                    currency: 'THB',
                    targetAmount: 18.30, // ~18.30 MYR
                    targetCurrency: 'MYR',
                    exchangeRate: 8.2,
                    sourceAccountId: malayUser.linkedAccounts[0].id,
                    targetAccountId: thaiUser.linkedAccounts[0].id,
                    status: client_1.TransactionStatus.COMPLETED,
                    merchantName: 'Bangkok Street Food',
                    merchantCategory: 'Food & Beverage',
                    merchantLocation: 'Bangkok, Thailand',
                    completedAt: new Date(),
                },
            });
            console.log(`🌏 Created cross-border transaction: ${crossBorderTx.id}`);
            // Domestic transaction
            const domesticTx = await prisma.paymentTransaction.create({
                data: {
                    userId: malayUser.id,
                    amount: 50.00,
                    currency: 'MYR',
                    targetAmount: 50.00,
                    targetCurrency: 'MYR',
                    exchangeRate: 1.0,
                    sourceAccountId: malayUser.linkedAccounts[0].id,
                    targetAccountId: allUsers[1].linkedAccounts[0].id,
                    status: client_1.TransactionStatus.COMPLETED,
                    merchantName: 'Lunch Transfer',
                    merchantCategory: 'Transfer',
                    completedAt: new Date(),
                },
            });
            console.log(`🏠 Created domestic transaction: ${domesticTx.id}`);
        }
    }
    console.log('✅ Database seed completed successfully!');
}
main()
    .catch((e) => {
    console.error('❌ Error during seed:', e);
    process.exit(1);
})
    .finally(async () => {
    await prisma.$disconnect();
});
//# sourceMappingURL=seed.js.map