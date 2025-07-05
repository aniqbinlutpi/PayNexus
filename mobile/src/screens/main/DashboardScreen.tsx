import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuthStore } from '../../stores/authStore';
import { useNavigation } from '@react-navigation/native';
import { apiService } from '../../services/api';
import { useFocusEffect } from '@react-navigation/native';

export const DashboardScreen: React.FC = () => {
  const { user, isAuthenticated } = useAuthStore();
  const navigation = useNavigation();
  
  const [balance, setBalance] = useState<any>(null);
  const [recentTransactions, setRecentTransactions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadDashboardData = async () => {
    if (!isAuthenticated) return;

    try {
      setLoading(true);
      
      // Load balance and recent transactions in parallel
      const [balanceData, transactionsData] = await Promise.all([
        apiService.getTotalBalance(),
        apiService.getTransactionHistory(3, 0), // Get last 3 transactions
      ]);

      setBalance(balanceData);
      setRecentTransactions(transactionsData);
    } catch (error) {
      console.error('Failed to load dashboard data:', error);
      Alert.alert('Error', 'Failed to load account data. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadDashboardData();
    setRefreshing(false);
  };

  useEffect(() => {
    loadDashboardData();
  }, [isAuthenticated]);

  // Refresh dashboard when screen comes into focus
  useFocusEffect(
    React.useCallback(() => {
      if (isAuthenticated) {
        loadDashboardData();
      }
    }, [isAuthenticated])
  );

  const handleSendMoney = () => {
    navigation.navigate('Payment' as never);
  };

  const handleScanQR = () => {
    Alert.alert(
      'QR Scanner',
      'Simulating QR scan for demo...',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Simulate PromptPay QR',
          onPress: () => {
            Alert.alert(
              'QR Scanned - Cross Border Payment',
              'Thai PromptPay QR detected!\n\nMerchant: Bangkok Street Food\nAmount: 150 THB (≈RM 18.30)\n\nPayNexus Smart Router:\n✓ Primary: Maybank (Available)\n✓ FX Rate: 1 MYR = 8.2 THB\n✓ Route: DuitNow → FX Partner → PromptPay',
              [
                { text: 'Cancel', style: 'cancel' },
                {
                  text: 'Pay Now',
                  onPress: () => {
                    Alert.alert(
                      'Payment Successful! 🎉',
                      'Cross-border payment completed in 3.2 seconds\n\nPaid: RM 18.30 (150 THB)\nUsed: Maybank → PromptPay\nFees: RM 0.50\n\nThis is the magic of PayNexus Smart Router!'
                    );
                    // Refresh data after simulated payment
                    loadDashboardData();
                  },
                },
              ]
            );
          },
        },
      ]
    );
  };

  const handlePayBills = () => {
    Alert.alert('Pay Bills', 'Bill payment feature - Coming in next update!');
  };

  const handleTopUp = () => {
    Alert.alert('Top Up', 'Account top-up feature - Coming in next update!');
  };

  const handleSmartPayments = () => {
    navigation.navigate('Smart' as never);
  };

  const formatCurrency = (amount: number, currency: string) => {
    const symbols: { [key: string]: string } = {
      'MYR': 'RM',
      'THB': '฿',
      'SGD': 'S$',
    };
    
    return `${symbols[currency] || currency} ${amount.toFixed(2)}`;
  };

  const formatTransactionAmount = (transaction: any) => {
    const isIncoming = transaction.targetAccount?.user?.id === user?.id;
    const amount = isIncoming ? transaction.targetAmount : transaction.amount;
    const currency = isIncoming ? transaction.targetCurrency : transaction.currency;
    const sign = isIncoming ? '+' : '-';
    
    return `${sign}${formatCurrency(amount, currency)}`;
  };

  const getTransactionIcon = (transaction: any) => {
    const category = transaction.merchantCategory?.toLowerCase();
    
    if (category?.includes('food') || category?.includes('restaurant')) {
      return { name: 'restaurant', color: '#FF6B6B' };
    } else if (category?.includes('transport') || category?.includes('ride')) {
      return { name: 'car', color: '#4ECDC4' };
    } else if (category?.includes('transfer') || category?.includes('p2p')) {
      return { name: 'person', color: '#45B7D1' };
    } else if (category?.includes('shopping')) {
      return { name: 'basket-outline', color: '#FF9F43' };
    } else {
      return { name: 'card', color: '#6C5CE7' };
    }
  };

  const formatTransactionTime = (timestamp: string) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffInHours = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60));
    
    if (diffInHours < 1) {
      return 'Just now';
    } else if (diffInHours < 24) {
      return `${diffInHours}h ago`;
    } else if (diffInHours < 48) {
      return 'Yesterday';
    } else {
      return date.toLocaleDateString();
    }
  };

  if (loading) {
    return (
      <View style={[styles.container, styles.centered]}>
        <ActivityIndicator size="large" color="#007AFF" />
        <Text style={styles.loadingText}>Loading your account...</Text>
      </View>
    );
  }

  return (
    <ScrollView 
      style={styles.container}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
      }
    >
      <View style={styles.header}>
        <Text style={styles.greeting}>Hello, {user?.firstName}!</Text>
        <Text style={styles.subtitle}>Welcome to PayNexus</Text>
      </View>

      <View style={styles.balanceCard}>
        <Text style={styles.balanceLabel}>Total Balance</Text>
        <Text style={styles.balanceAmount}>
          {balance ? formatCurrency(balance.total, balance.currency) : 'Loading...'}
        </Text>
        <Text style={styles.balanceSubtext}>
          Across {balance?.accountCount || 0} linked accounts
        </Text>
      </View>

      <View style={styles.quickActions}>
        <Text style={styles.sectionTitle}>Quick Actions</Text>
        <View style={styles.actionGrid}>
          <TouchableOpacity style={styles.actionButton} onPress={handleSendMoney}>
            <Ionicons name="send" size={24} color="#007AFF" />
            <Text style={styles.actionText}>Send Money</Text>
          </TouchableOpacity>
          
          <TouchableOpacity style={styles.actionButton} onPress={handleScanQR}>
            <Ionicons name="qr-code" size={24} color="#007AFF" />
            <Text style={styles.actionText}>Scan QR</Text>
          </TouchableOpacity>
          
          <TouchableOpacity style={styles.actionButton} onPress={handleSmartPayments}>
            <Ionicons name="flash" size={24} color="#FF6B35" />
            <Text style={styles.actionText}>Smart Pay</Text>
          </TouchableOpacity>
          
          <TouchableOpacity style={styles.actionButton} onPress={handleTopUp}>
            <Ionicons name="add-circle" size={24} color="#007AFF" />
            <Text style={styles.actionText}>Top Up</Text>
          </TouchableOpacity>
        </View>
      </View>

      <View style={styles.recentTransactions}>
        <Text style={styles.sectionTitle}>Recent Transactions</Text>
        <View style={styles.transactionList}>
          {recentTransactions.length > 0 ? (
            recentTransactions.map((transaction, index) => {
              const icon = getTransactionIcon(transaction);
              const isIncoming = transaction.targetAccount?.user?.id === user?.id;
              
              return (
                <View key={transaction.id || index} style={styles.transactionItem}>
                  <View style={styles.transactionIcon}>
                    <Ionicons name={icon.name as any} size={20} color={icon.color} />
                  </View>
                  <View style={styles.transactionDetails}>
                    <Text style={styles.transactionTitle}>
                      {transaction.merchantName || 'Payment'}
                    </Text>
                    <Text style={styles.transactionSubtitle}>
                      {formatTransactionTime(transaction.createdAt)}
                    </Text>
                    <Text style={styles.transactionRoute}>
                      {transaction.sourceAccount?.provider} → {transaction.targetAccount?.provider}
                    </Text>
                  </View>
                  <Text style={[
                    styles.transactionAmount,
                    isIncoming && styles.positiveAmount
                  ]}>
                    {formatTransactionAmount(transaction)}
                  </Text>
                </View>
              );
            })
          ) : (
            <View style={styles.emptyState}>
              <Text style={styles.emptyStateText}>No recent transactions</Text>
            </View>
          )}
        </View>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  centered: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#666',
  },
  header: {
    padding: 24,
    backgroundColor: '#ffffff',
  },
  greeting: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
  },
  subtitle: {
    fontSize: 16,
    color: '#666',
    marginTop: 4,
  },
  balanceCard: {
    margin: 16,
    padding: 24,
    backgroundColor: '#007AFF',
    borderRadius: 16,
    alignItems: 'center',
  },
  balanceLabel: {
    color: '#ffffff',
    fontSize: 16,
    opacity: 0.8,
  },
  balanceAmount: {
    color: '#ffffff',
    fontSize: 36,
    fontWeight: 'bold',
    marginTop: 8,
  },
  balanceSubtext: {
    color: '#ffffff',
    fontSize: 14,
    opacity: 0.8,
    marginTop: 4,
  },
  quickActions: {
    margin: 16,
    padding: 16,
    backgroundColor: '#ffffff',
    borderRadius: 12,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    marginBottom: 16,
  },
  actionGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  actionButton: {
    width: '48%',
    aspectRatio: 1,
    backgroundColor: '#f8f9fa',
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  actionText: {
    marginTop: 8,
    fontSize: 14,
    fontWeight: '500',
    color: '#333',
  },
  recentTransactions: {
    margin: 16,
    padding: 16,
    backgroundColor: '#ffffff',
    borderRadius: 12,
  },
  transactionList: {
    gap: 12,
  },
  transactionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
  },
  transactionIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#f8f9fa',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  transactionDetails: {
    flex: 1,
  },
  transactionTitle: {
    fontSize: 16,
    fontWeight: '500',
    color: '#333',
  },
  transactionSubtitle: {
    fontSize: 14,
    color: '#666',
    marginTop: 2,
  },
  transactionRoute: {
    fontSize: 12,
    color: '#007AFF',
    marginTop: 2,
  },
  transactionAmount: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  positiveAmount: {
    color: '#4CAF50',
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 24,
  },
  emptyStateText: {
    fontSize: 16,
    color: '#666',
  },
}); 