import { prisma } from '../config/database';
import { logger } from '../utils/logger';

export interface FraudAnalysis {
  isFraudulent: boolean;
  riskScore: number;
  reasons: string[];
  confidence: number;
  requiredActions: string[];
}

export interface TransactionPattern {
  userId: string;
  averageAmount: number;
  commonHours: number[];
  frequentProviders: string[];
  typicalCurrencies: string[];
  velocityPattern: number;
}

export class FraudDetectionService {
  private static readonly FRAUD_THRESHOLD = 80;
  private static readonly HIGH_RISK_THRESHOLD = 60;

  async analyzeTransaction(transactionData: {
    userId: string;
    amount: number;
    currency: string;
    targetCurrency?: string;
    sourceProvider: string;
    targetProvider: string;
    deviceFingerprint?: string;
    ipAddress?: string;
    timestamp: Date;
  }): Promise<FraudAnalysis> {
    try {
      logger.info(`Analyzing transaction for fraud: ${transactionData.userId}`);
      
      const [
        userPattern,
        velocityAnalysis,
        deviceAnalysis,
        amountAnalysis,
        geographicAnalysis
      ] = await Promise.all([
        this.getUserPattern(transactionData.userId),
        this.analyzeVelocity(transactionData.userId, transactionData.timestamp),
        this.analyzeDevice(transactionData.userId, transactionData.deviceFingerprint),
        this.analyzeAmount(transactionData.userId, transactionData.amount),
        this.analyzeGeographic(transactionData.userId, transactionData.ipAddress)
      ]);

      let riskScore = 0;
      const reasons: string[] = [];
      const requiredActions: string[] = [];

      // Velocity-based analysis
      if (velocityAnalysis.isAnomalous) {
        riskScore += 25;
        reasons.push(`Unusual transaction velocity: ${velocityAnalysis.recentCount} transactions in last hour`);
        if (velocityAnalysis.recentCount > 10) {
          requiredActions.push('TEMPORARY_ACCOUNT_FREEZE');
        }
      }

      // Device-based analysis
      if (deviceAnalysis.isNewDevice) {
        riskScore += 20;
        reasons.push('Transaction from unrecognized device');
        requiredActions.push('DEVICE_VERIFICATION');
      }

      // Amount-based analysis
      if (amountAnalysis.isAnomalous) {
        riskScore += amountAnalysis.severity * 15;
        reasons.push(`Transaction amount ${amountAnalysis.deviationLevel}x above user's average`);
        if (amountAnalysis.severity > 2) {
          requiredActions.push('MANUAL_REVIEW');
        }
      }

      // Time-based analysis
      const hour = transactionData.timestamp.getHours();
      if (!userPattern.commonHours.includes(hour)) {
        riskScore += 10;
        reasons.push('Transaction at unusual time');
      }

      // Cross-border analysis
      if (transactionData.targetCurrency && 
          transactionData.currency !== transactionData.targetCurrency &&
          !userPattern.typicalCurrencies.includes(transactionData.targetCurrency)) {
        riskScore += 15;
        reasons.push('Unusual cross-border transaction');
        requiredActions.push('ENHANCED_VERIFICATION');
      }

      // Provider analysis
      if (!userPattern.frequentProviders.includes(transactionData.targetProvider)) {
        riskScore += 10;
        reasons.push('Transaction to unfamiliar payment provider');
      }

      // Geographic analysis
      if (geographicAnalysis.isAnomalous) {
        riskScore += 20;
        reasons.push(`Transaction from unusual location: ${geographicAnalysis.location}`);
        requiredActions.push('LOCATION_VERIFICATION');
      }

      // Behavioral pattern analysis
      const behavioralScore = await this.analyzeBehavioralPattern(transactionData.userId, transactionData);
      riskScore += behavioralScore.score;
      reasons.push(...behavioralScore.reasons);

      // Calculate confidence based on data quality
      const confidence = this.calculateConfidence(userPattern, transactionData);

      const isFraudulent = riskScore >= FraudDetectionService.FRAUD_THRESHOLD;
      
      if (riskScore >= FraudDetectionService.HIGH_RISK_THRESHOLD) {
        requiredActions.push('ADDITIONAL_AUTHENTICATION');
      }

      // Log fraud analysis
      await this.logFraudAnalysis(transactionData.userId, {
        riskScore,
        reasons,
        confidence,
        isFraudulent,
        transactionData
      });

      return {
        isFraudulent,
        riskScore,
        reasons,
        confidence,
        requiredActions
      };

    } catch (error) {
      logger.error('Fraud detection analysis failed:', error);
      return {
        isFraudulent: false,
        riskScore: 0,
        reasons: ['Analysis failed'],
        confidence: 0,
        requiredActions: []
      };
    }
  }

  private async getUserPattern(userId: string): Promise<TransactionPattern> {
    const transactions = await prisma.paymentTransaction.findMany({
      where: {
        userId,
        status: 'COMPLETED',
        createdAt: {
          gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) // Last 30 days
        }
      },
      include: {
        sourceAccount: true,
        targetAccount: true
      }
    });

    if (transactions.length === 0) {
      return {
        userId,
        averageAmount: 0,
        commonHours: [],
        frequentProviders: [],
        typicalCurrencies: [],
        velocityPattern: 0
      };
    }

    const amounts = transactions.map(tx => tx.amount);
    const averageAmount = amounts.reduce((sum, amount) => sum + amount, 0) / amounts.length;

    const hours = transactions.map(tx => tx.createdAt.getHours());
    const hourCounts = hours.reduce((acc, hour) => {
      acc[hour] = (acc[hour] || 0) + 1;
      return acc;
    }, {} as Record<number, number>);
    
    const commonHours = Object.entries(hourCounts)
      .filter(([_, count]) => count >= Math.max(1, transactions.length * 0.1))
      .map(([hour, _]) => parseInt(hour));

    const providers = transactions.map(tx => tx.targetAccount?.provider).filter(Boolean);
    const providerCounts = providers.reduce((acc, provider) => {
      if (provider) acc[provider] = (acc[provider] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
    
    const frequentProviders = Object.entries(providerCounts)
      .filter(([_, count]) => count >= 2)
      .map(([provider, _]) => provider);

    const currencies = [...new Set(transactions.map(tx => tx.currency))];
    const velocityPattern = transactions.length / 30; // Transactions per day

    return {
      userId,
      averageAmount,
      commonHours,
      frequentProviders,
      typicalCurrencies: currencies,
      velocityPattern
    };
  }

  private async analyzeVelocity(userId: string, timestamp: Date): Promise<{
    isAnomalous: boolean;
    recentCount: number;
  }> {
    const oneHourAgo = new Date(timestamp.getTime() - 60 * 60 * 1000);
    
    const recentTransactions = await prisma.paymentTransaction.count({
      where: {
        userId,
        createdAt: {
          gte: oneHourAgo
        }
      }
    });

    return {
      isAnomalous: recentTransactions > 5,
      recentCount: recentTransactions
    };
  }

  private async analyzeDevice(userId: string, deviceFingerprint?: string): Promise<{
    isNewDevice: boolean;
  }> {
    if (!deviceFingerprint) {
      return { isNewDevice: true };
    }

    const existingSession = await prisma.userSession.findFirst({
      where: {
        userId,
        deviceInfo: {
          path: ['fingerprint'],
          equals: deviceFingerprint
        }
      }
    });

    return {
      isNewDevice: !existingSession
    };
  }

  private async analyzeAmount(userId: string, amount: number): Promise<{
    isAnomalous: boolean;
    deviationLevel: number;
    severity: number;
  }> {
    const recentTransactions = await prisma.paymentTransaction.findMany({
      where: {
        userId,
        status: 'COMPLETED',
        createdAt: {
          gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
        }
      },
      select: { amount: true }
    });

    if (recentTransactions.length === 0) {
      return {
        isAnomalous: amount > 1000,
        deviationLevel: 1,
        severity: amount > 5000 ? 3 : 1
      };
    }

    const amounts = recentTransactions.map(tx => tx.amount);
    const averageAmount = amounts.reduce((sum, amt) => sum + amt, 0) / amounts.length;
    const deviationLevel = amount / averageAmount;

    return {
      isAnomalous: deviationLevel > 3,
      deviationLevel,
      severity: deviationLevel > 10 ? 3 : deviationLevel > 5 ? 2 : 1
    };
  }

  private async analyzeGeographic(userId: string, ipAddress?: string): Promise<{
    isAnomalous: boolean;
    location: string;
  }> {
    // Simplified geographic analysis
    // In production, this would use a real IP geolocation service
    const mockLocation = this.getMockLocationFromIP(ipAddress);
    
    const recentSessions = await prisma.userSession.findMany({
      where: {
        userId,
        createdAt: {
          gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
        }
      },
      select: { ipAddress: true }
    });

    const knownLocations = recentSessions
      .map(session => this.getMockLocationFromIP(session.ipAddress || undefined))
      .filter(Boolean);

    const isAnomalous = knownLocations.length > 0 && 
                       !knownLocations.includes(mockLocation);

    return {
      isAnomalous,
      location: mockLocation
    };
  }

  private getMockLocationFromIP(ipAddress?: string): string {
    if (!ipAddress) return 'Unknown';
    
    // Mock location mapping for demo
    const ipToLocation: Record<string, string> = {
      '192.168.': 'Local Network',
      '127.0.0.1': 'Localhost',
      '::1': 'Localhost'
    };

    for (const [prefix, location] of Object.entries(ipToLocation)) {
      if (ipAddress.startsWith(prefix)) {
        return location;
      }
    }

    return 'Malaysia'; // Default for demo
  }

  private async analyzeBehavioralPattern(userId: string, transactionData: any): Promise<{
    score: number;
    reasons: string[];
  }> {
    const reasons: string[] = [];
    let score = 0;

    // Check for round number amounts (often fraud)
    if (transactionData.amount % 100 === 0 && transactionData.amount >= 1000) {
      score += 5;
      reasons.push('Round number amount pattern');
    }

    // Check for weekend transactions (unusual for business)
    const dayOfWeek = transactionData.timestamp.getDay();
    if (dayOfWeek === 0 || dayOfWeek === 6) {
      score += 5;
      reasons.push('Weekend transaction');
    }

    return { score, reasons };
  }

  private calculateConfidence(pattern: TransactionPattern, transactionData: any): number {
    let confidence = 50; // Base confidence

    // More historical data = higher confidence
    if (pattern.velocityPattern > 1) confidence += 20;
    if (pattern.frequentProviders.length > 2) confidence += 15;
    if (pattern.commonHours.length > 3) confidence += 15;

    return Math.min(confidence, 100);
  }

  private async logFraudAnalysis(userId: string, analysis: any): Promise<void> {
    await prisma.auditLog.create({
      data: {
        userId,
        action: 'FRAUD_ANALYSIS',
        resource: 'TRANSACTION',
        details: analysis,
        timestamp: new Date()
      }
    });
  }
} 