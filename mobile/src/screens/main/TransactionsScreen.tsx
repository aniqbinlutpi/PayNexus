import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuthStore } from '../../stores/authStore';
import { apiService } from '../../services/api';
import { useFocusEffect } from '@react-navigation/native';

type TransactionFilter = 'All' | 'Sent' | 'Received' | 'Payments';

export const TransactionsScreen: React.FC = () => {
  const { user, isAuthenticated } = useAuthStore();
  const [activeFilter, setActiveFilter] = useState<TransactionFilter>('All');
  const [transactions, setTransactions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadTransactions = async () => {
    if (!isAuthenticated) return;

    try {
      setLoading(true);
      const data = await apiService.getTransactionHistory(20, 0); // Get more transactions
      setTransactions(data);
    } catch (error) {
      console.error('Failed to load transactions:', error);
      Alert.alert('Error', 'Failed to load transactions. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadTransactions();
    setRefreshing(false);
  };

  useEffect(() => {
    loadTransactions();
  }, [isAuthenticated]);

  // Refresh transactions when screen comes into focus
  useFocusEffect(
    React.useCallback(() => {
      if (isAuthenticated) {
        loadTransactions();
      }
    }, [isAuthenticated])
  );

  const formatCurrency = (amount: number, currency: string) => {
    const symbols: { [key: string]: string } = {
      'MYR': 'RM',
      'THB': '฿',
      'SGD': 'S$',
    };
    
    return `${symbols[currency] || currency} ${amount.toFixed(2)}`;
  };

  const formatTransactionAmount = (transaction: any) => {
    // Use the transaction type from metadata (set by backend)
    const transactionType = transaction.metadata?.transactionType;
    
    if (transactionType === 'RECEIVED') {
      // Money coming in - show positive
      const amount = transaction.targetAmount || transaction.amount;
      const currency = transaction.targetCurrency || transaction.currency;
      return `+${formatCurrency(amount, currency)}`;
    } else if (transactionType === 'SENT') {
      // Money going out - show negative
      const amount = transaction.amount;
      const currency = transaction.currency;
      return `-${formatCurrency(amount, currency)}`;
    } else {
      // Fallback for other transaction types
      const amount = transaction.amount;
      const currency = transaction.currency;
      return formatCurrency(amount, currency);
    }
  };

  const getTransactionIcon = (transaction: any) => {
    const category = transaction.merchantCategory?.toLowerCase();
    const transactionType = transaction.metadata?.transactionType;
    
    // Check transaction type first
    if (transactionType === 'RECEIVED') {
      return { name: 'arrow-down-circle', color: '#4CAF50' }; // Green for incoming
    } else if (transactionType === 'SENT') {
      return { name: 'arrow-up-circle', color: '#FF6B6B' }; // Red for outgoing
    }
    
    // Fallback to category-based icons
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

  const getFilteredTransactions = () => {
    return transactions.filter(transaction => {
      const transactionType = transaction.metadata?.transactionType;
      
      switch (activeFilter) {
        case 'Sent':
          return transactionType === 'SENT';
        case 'Received':
          return transactionType === 'RECEIVED';
        case 'Payments':
          return transaction.merchantCategory?.toLowerCase().includes('payment') || 
                 transaction.merchantCategory?.toLowerCase().includes('bill');
        default:
          return true; // Show all transactions
      }
    });
  };

  const calculateTotalAmount = () => {
    const filtered = getFilteredTransactions();
    const total = filtered.reduce((sum, transaction) => {
      const transactionType = transaction.metadata?.transactionType;
      
      if (transactionType === 'RECEIVED') {
        // Money coming in - add to total
        const amount = transaction.targetAmount || transaction.amount;
        return sum + amount;
      } else if (transactionType === 'SENT') {
        // Money going out - subtract from total
        const amount = transaction.amount;
        return sum - amount;
      }
      return sum;
    }, 0);
    
    // Use user's primary currency (assume MYR for now)
    return formatCurrency(Math.abs(total), 'MYR');
  };

  const filters: TransactionFilter[] = ['All', 'Sent', 'Received', 'Payments'];

  if (loading) {
    return (
      <View style={[styles.container, styles.centered]}>
        <ActivityIndicator size="large" color="#007AFF" />
        <Text style={styles.loadingText}>Loading transactions...</Text>
      </View>
    );
  }

  const filteredTransactions = getFilteredTransactions();

  return (
    <ScrollView 
      style={styles.container}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
      }
    >
      <View style={styles.header}>
        <Text style={styles.title}>Transactions</Text>
        <Text style={styles.subtitle}>
          {filteredTransactions.length} transactions • {calculateTotalAmount()}
        </Text>
      </View>

      <View style={styles.filterContainer}>
        {filters.map((filter) => (
          <TouchableOpacity
            key={filter}
            style={[
              styles.filterButton,
              activeFilter === filter && styles.activeFilterButton,
            ]}
            onPress={() => setActiveFilter(filter)}
          >
            <Text
              style={[
                styles.filterText,
                activeFilter === filter && styles.activeFilterText,
              ]}
            >
              {filter}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <View style={styles.transactionsList}>
        {filteredTransactions.length > 0 ? (
          filteredTransactions.map((transaction, index) => {
            const icon = getTransactionIcon(transaction);
            const transactionType = transaction.metadata?.transactionType;
            const isReceived = transactionType === 'RECEIVED';
            const isSent = transactionType === 'SENT';
            const isCrossBorder = transaction.sourceAccount?.currency !== transaction.targetAccount?.currency;
            
            return (
              <TouchableOpacity 
                key={transaction.id || index} 
                style={styles.transactionItem}
                onPress={() => {
                  Alert.alert(
                    'Transaction Details',
                    `Transaction ID: ${transaction.id}\n` +
                    `Status: ${transaction.status}\n` +
                    `Type: ${transactionType || 'Other'}\n` +
                    `Amount: ${formatTransactionAmount(transaction)}\n` +
                    `Route: ${transaction.sourceAccount?.provider} → ${transaction.targetAccount?.provider}\n` +
                    `${isCrossBorder ? `Exchange Rate: ${transaction.exchangeRate}\n` : ''}` +
                    `Time: ${new Date(transaction.createdAt).toLocaleString()}`
                  );
                }}
              >
                <View style={styles.transactionIcon}>
                  <Ionicons name={icon.name as any} size={24} color={icon.color} />
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
                    {isCrossBorder && <Text style={styles.crossBorderBadge}> CROSS-BORDER</Text>}
                    <Text style={[styles.statusBadge, 
                      transaction.status === 'COMPLETED' ? styles.completedStatus : styles.pendingStatus
                    ]}> {transaction.status}</Text>
                  </Text>
                </View>
                <View style={styles.transactionAmountContainer}>
                  <Text style={[
                    styles.transactionAmount,
                    isReceived ? styles.positiveAmount : styles.negativeAmount
                  ]}>
                    {formatTransactionAmount(transaction)}
                  </Text>
                  <Ionicons name="chevron-forward" size={16} color="#ccc" />
                </View>
              </TouchableOpacity>
            );
          })
        ) : (
          <View style={styles.emptyState}>
            <Text style={styles.emptyStateTitle}>No transactions found.</Text>
            <Text style={styles.emptyStateText}>
              It looks like you haven't made any transactions yet.
            </Text>
          </View>
        )}
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
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#333',
  },
  subtitle: {
    fontSize: 16,
    color: '#666',
    marginTop: 4,
  },
  filterContainer: {
    flexDirection: 'row',
    paddingHorizontal: 24,
    paddingVertical: 16,
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  filterButton: {
    paddingHorizontal: 20,
    paddingVertical: 8,
    marginRight: 12,
    borderRadius: 20,
    backgroundColor: '#f8f9fa',
  },
  activeFilterButton: {
    backgroundColor: '#007AFF',
  },
  filterText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#666',
  },
  activeFilterText: {
    color: '#ffffff',
  },
  transactionsList: {
    padding: 16,
  },
  transactionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    padding: 16,
    marginBottom: 8,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  transactionIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#f8f9fa',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 16,
  },
  transactionDetails: {
    flex: 1,
  },
  transactionTitle: {
    fontSize: 16,
    fontWeight: '600',
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
    marginTop: 4,
  },
  crossBorderBadge: {
    color: '#FF6B6B',
    fontWeight: '600',
  },
  statusBadge: {
    fontSize: 10,
    fontWeight: '600',
  },
  completedStatus: {
    color: '#4CAF50',
  },
  pendingStatus: {
    color: '#FF9F43',
  },
  transactionAmountContainer: {
    alignItems: 'flex-end',
    flexDirection: 'row',
    alignItems: 'center',
  },
  transactionAmount: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginRight: 8,
  },
  positiveAmount: {
    color: '#4CAF50',
  },
  negativeAmount: {
    color: '#FF6B6B',
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 48,
    paddingHorizontal: 24,
  },
  emptyStateTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    marginTop: 16,
  },
  emptyStateText: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    marginTop: 8,
  },
});