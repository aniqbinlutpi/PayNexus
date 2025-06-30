import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  Alert,
  ScrollView,
  Modal,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuthStore } from '../../stores/authStore';
import { apiService } from '../../services/api';
import { useNavigation } from '@react-navigation/native';

export const PaymentScreen: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'send' | 'scan' | 'bills' | 'topup'>('send');
  const [amount, setAmount] = useState('');
  const [recipient, setRecipient] = useState('');
  const [selectedAccountId, setSelectedAccountId] = useState('');
  const [showAccountModal, setShowAccountModal] = useState(false);
  const [showRecipientModal, setShowRecipientModal] = useState(false);
  const [accounts, setAccounts] = useState<any[]>([]);
  const [recipients, setRecipients] = useState<any[]>([]);
  const [selectedRecipient, setSelectedRecipient] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [processing, setProcessing] = useState(false);
  const { user } = useAuthStore();
  const navigation = useNavigation();

  useEffect(() => {
    loadAccountsAndRecipients();
  }, []);

  const loadAccountsAndRecipients = async () => {
    try {
      setLoading(true);
      const [accountsData, recipientsData] = await Promise.all([
        apiService.getAccounts(),
        apiService.getRecipients()
      ]);
      
      setAccounts(accountsData);
      setRecipients(recipientsData);
      
      // Set default account (primary account)
      const primaryAccount = accountsData.find((acc: any) => acc.isPrimary);
      if (primaryAccount) {
        setSelectedAccountId(primaryAccount.id);
      }
    } catch (error) {
      console.error('Failed to load accounts and recipients:', error);
      Alert.alert('Error', 'Failed to load account data. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleSendMoney = async () => {
    if (!amount || !selectedRecipient || !selectedAccountId) {
      Alert.alert('Error', 'Please fill in all fields and select a recipient');
      return;
    }

    const numAmount = parseFloat(amount);
    if (isNaN(numAmount) || numAmount <= 0) {
      Alert.alert('Error', 'Please enter a valid amount');
      return;
    }

    const selectedAccount = accounts.find(acc => acc.id === selectedAccountId);
    if (!selectedAccount) {
      Alert.alert('Error', 'Please select a payment source');
      return;
    }

    // Find recipient's primary account in the same currency if possible, otherwise use first account
    let targetAccount = selectedRecipient.linkedAccounts.find((acc: any) => 
      acc.currency === selectedAccount.currency
    );
    if (!targetAccount) {
      targetAccount = selectedRecipient.linkedAccounts[0];
    }

    const isCrossBorder = selectedAccount.currency !== targetAccount.currency;
    const confirmMessage = isCrossBorder 
      ? `Send ${selectedAccount.currency} ${numAmount} to ${selectedRecipient.firstName} ${selectedRecipient.lastName}?\n\nThis is a cross-border payment from ${selectedAccount.currency} to ${targetAccount.currency}.\n\nUsing: ${selectedAccount.provider} → ${targetAccount.provider}`
      : `Send ${selectedAccount.currency} ${numAmount} to ${selectedRecipient.firstName} ${selectedRecipient.lastName}?\n\nUsing: ${selectedAccount.provider} → ${targetAccount.provider}`;

    Alert.alert(
      'Confirm Payment',
      confirmMessage,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Send',
          onPress: async () => {
            try {
              setProcessing(true);
              
              const transferData = {
                recipientId: selectedRecipient.id,
                amount: numAmount,
                currency: selectedAccount.currency,
                sourceAccountId: selectedAccountId,
                targetAccountId: targetAccount.id,
                description: `Money transfer to ${selectedRecipient.firstName} ${selectedRecipient.lastName}`,
              };

              const result = await apiService.createTransfer(transferData);
              
              Alert.alert(
                'Payment Initiated! 🎉',
                `Transaction ID: ${result.transactionId}\n` +
                `Amount: ${result.currency} ${result.amount}\n` +
                `${result.targetCurrency !== result.currency ? `Target: ${result.targetCurrency} ${result.targetAmount}\n` : ''}` +
                `Recipient: ${result.recipient.name}\n` +
                `Status: ${result.status}\n` +
                `Estimated completion: ${result.estimatedCompletion}`,
                [
                  {
                    text: 'View Transaction',
                    onPress: () => {
                      // Navigate to transactions screen
                      navigation.navigate('Transactions' as never);
                    }
                  },
                  {
                    text: 'OK',
                    onPress: () => {
                      // Clear form
                      setAmount('');
                      setSelectedRecipient(null);
                      setRecipient('');
                      // Reload accounts to get updated balances
                      loadAccountsAndRecipients();
                    }
                  }
                ]
              );
            } catch (error) {
              console.error('Payment failed:', error);
              Alert.alert('Payment Failed', error instanceof Error ? error.message : 'Unknown error occurred');
            } finally {
              setProcessing(false);
            }
          },
        },
      ]
    );
  };

  const formatCurrency = (amount: number, currency: string) => {
    const symbols: { [key: string]: string } = {
      'MYR': 'RM',
      'THB': '฿',
      'SGD': 'S$',
    };
    
    return `${symbols[currency] || currency} ${amount.toFixed(2)}`;
  };

  const getSelectedAccount = () => {
    return accounts.find(acc => acc.id === selectedAccountId);
  };

  const handleRecipientSelect = (recipientData: any) => {
    setSelectedRecipient(recipientData);
    setRecipient(`${recipientData.firstName} ${recipientData.lastName} (${recipientData.countryCode})`);
    setShowRecipientModal(false);
  };

  const handleScanQR = () => {
    Alert.alert(
      'QR Scanner',
      'In a real app, this would open the camera to scan QR codes. For demo: Simulating PromptPay QR scan...',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Simulate Scan',
          onPress: () => {
            Alert.alert(
              'QR Scanned',
              'Thai PromptPay QR detected!\nMerchant: Bangkok Souvenirs\nAmount: 250 THB (≈RM 30.50)\n\nPayNexus Smart Router suggests: Use Maybank → FX Partner → PromptPay',
              [
                { text: 'Cancel', style: 'cancel' },
                {
                  text: 'Pay Now',
                  onPress: () => Alert.alert('Success', 'Cross-border payment completed! 🎉'),
                },
              ]
            );
          },
        },
      ]
    );
  };

  const renderSendMoney = () => (
    <View style={styles.tabContent}>
      <Text style={styles.sectionTitle}>Send Money</Text>
      
      <View style={styles.inputGroup}>
        <Text style={styles.label}>Recipient</Text>
        <TouchableOpacity
          style={styles.input}
          onPress={() => setShowRecipientModal(true)}
        >
          <Text style={[styles.recipientText, !selectedRecipient && styles.placeholderText]}>
            {selectedRecipient 
              ? `${selectedRecipient.firstName} ${selectedRecipient.lastName} (${selectedRecipient.countryCode})`
              : 'Select recipient'
            }
          </Text>
          <Ionicons name="chevron-down" size={20} color="#666" />
        </TouchableOpacity>
      </View>

      <View style={styles.inputGroup}>
        <Text style={styles.label}>Amount ({getSelectedAccount()?.currency || 'MYR'})</Text>
        <TextInput
          style={styles.input}
          placeholder="0.00"
          value={amount}
          onChangeText={setAmount}
          keyboardType="numeric"
        />
      </View>

      <TouchableOpacity
        style={styles.accountSelector}
        onPress={() => setShowAccountModal(true)}
      >
        <Text style={styles.label}>Payment Source</Text>
        <View style={styles.selectedAccount}>
          <View>
            <Text style={styles.accountName}>
              {getSelectedAccount()?.accountName || 'Select account'} ({getSelectedAccount()?.provider})
            </Text>
            <Text style={styles.accountBalance}>
              {getSelectedAccount() ? formatCurrency(getSelectedAccount().balance, getSelectedAccount().currency) : ''}
            </Text>
          </View>
          <Ionicons name="chevron-down" size={20} color="#666" />
        </View>
      </TouchableOpacity>

      <TouchableOpacity 
        style={[styles.primaryButton, processing && styles.disabledButton]} 
        onPress={handleSendMoney}
        disabled={processing}
      >
        {processing ? (
          <>
            <ActivityIndicator size="small" color="#fff" style={{ marginRight: 8 }} />
            <Text style={styles.primaryButtonText}>Processing...</Text>
          </>
        ) : (
          <Text style={styles.primaryButtonText}>Send Money</Text>
        )}
      </TouchableOpacity>
    </View>
  );

  const renderScanQR = () => (
    <View style={styles.tabContent}>
      <Text style={styles.sectionTitle}>Scan QR Code</Text>
      <View style={styles.qrContainer}>
        <Ionicons name="qr-code-outline" size={120} color="#007AFF" />
        <Text style={styles.qrText}>Tap to scan QR code</Text>
        <Text style={styles.qrSubtext}>
          PayNexus supports DuitNow, PromptPay, QRIS, and more
        </Text>
      </View>
      <TouchableOpacity style={styles.primaryButton} onPress={handleScanQR}>
        <Ionicons name="camera" size={20} color="#fff" style={{ marginRight: 8 }} />
        <Text style={styles.primaryButtonText}>Open Scanner</Text>
      </TouchableOpacity>
    </View>
  );

  const renderBills = () => (
    <View style={styles.tabContent}>
      <Text style={styles.sectionTitle}>Pay Bills</Text>
      <View style={styles.billsGrid}>
        {['Electricity', 'Water', 'Internet', 'Phone', 'Insurance', 'Credit Card'].map((bill) => (
          <TouchableOpacity
            key={bill}
            style={styles.billButton}
            onPress={() => Alert.alert('Demo', `${bill} bill payment - Coming soon!`)}
          >
            <Ionicons name="receipt-outline" size={24} color="#007AFF" />
            <Text style={styles.billText}>{bill}</Text>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );

  const renderTopUp = () => (
    <View style={styles.tabContent}>
      <Text style={styles.sectionTitle}>Top Up</Text>
      <View style={styles.topupOptions}>
        {accounts.map((account) => (
          <TouchableOpacity
            key={account.id}
            style={styles.topupCard}
            onPress={() => Alert.alert('Demo', `Top up ${account.accountName} - Coming soon!`)}
          >
            <View>
              <Text style={styles.accountName}>{account.accountName} ({account.provider})</Text>
              <Text style={styles.accountBalance}>{formatCurrency(account.balance, account.currency)}</Text>
            </View>
            <Ionicons name="add-circle" size={24} color="#007AFF" />
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );

  if (loading) {
    return (
      <View style={[styles.container, styles.centered]}>
        <ActivityIndicator size="large" color="#007AFF" />
        <Text style={styles.loadingText}>Loading payment data...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.tabBar}>
        {[
          { key: 'send', label: 'Send', icon: 'send' },
          { key: 'scan', label: 'Scan QR', icon: 'qr-code' },
          { key: 'bills', label: 'Bills', icon: 'card' },
          { key: 'topup', label: 'Top Up', icon: 'add-circle' },
        ].map((tab) => (
          <TouchableOpacity
            key={tab.key}
            style={[styles.tab, activeTab === tab.key && styles.activeTab]}
            onPress={() => setActiveTab(tab.key as any)}
          >
            <Ionicons
              name={tab.icon as any}
              size={20}
              color={activeTab === tab.key ? '#007AFF' : '#666'}
            />
            <Text
              style={[
                styles.tabText,
                activeTab === tab.key && styles.activeTabText,
              ]}
            >
              {tab.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <ScrollView style={styles.content}>
        {activeTab === 'send' && renderSendMoney()}
        {activeTab === 'scan' && renderScanQR()}
        {activeTab === 'bills' && renderBills()}
        {activeTab === 'topup' && renderTopUp()}
      </ScrollView>

      <Modal visible={showAccountModal} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Select Payment Source</Text>
            {accounts.map((account) => (
              <TouchableOpacity
                key={account.id}
                style={styles.accountOption}
                onPress={() => {
                  setSelectedAccountId(account.id);
                  setShowAccountModal(false);
                }}
              >
                <View>
                  <Text style={styles.accountName}>{account.accountName} ({account.provider})</Text>
                  <Text style={styles.accountBalance}>{formatCurrency(account.balance, account.currency)}</Text>
                </View>
                {selectedAccountId === account.id && (
                  <Ionicons name="checkmark" size={20} color="#007AFF" />
                )}
              </TouchableOpacity>
            ))}
            <TouchableOpacity
              style={styles.modalCloseButton}
              onPress={() => setShowAccountModal(false)}
            >
              <Text style={styles.modalCloseText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      <Modal visible={showRecipientModal} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Select Recipient</Text>
            <ScrollView style={styles.recipientList}>
              {recipients.map((recipient) => (
                <TouchableOpacity
                  key={recipient.id}
                  style={styles.recipientOption}
                  onPress={() => handleRecipientSelect(recipient)}
                >
                  <View style={styles.recipientInfo}>
                    <Text style={styles.recipientName}>
                      {recipient.firstName} {recipient.lastName}
                    </Text>
                    <Text style={styles.recipientCountry}>
                      {recipient.countryCode} • {recipient.linkedAccounts.length} account(s)
                    </Text>
                    <Text style={styles.recipientAccounts}>
                      {recipient.linkedAccounts.map((acc: any) => acc.provider).join(', ')}
                    </Text>
                  </View>
                  {selectedRecipient?.id === recipient.id && (
                    <Ionicons name="checkmark" size={20} color="#007AFF" />
                  )}
                </TouchableOpacity>
              ))}
            </ScrollView>
            <TouchableOpacity
              style={styles.modalCloseButton}
              onPress={() => setShowRecipientModal(false)}
            >
              <Text style={styles.modalCloseText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  tabBar: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  tab: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 8,
  },
  activeTab: {
    borderBottomWidth: 2,
    borderBottomColor: '#007AFF',
  },
  tabText: {
    fontSize: 12,
    color: '#666',
    marginTop: 4,
  },
  activeTabText: {
    color: '#007AFF',
    fontWeight: '600',
  },
  content: {
    flex: 1,
  },
  tabContent: {
    padding: 16,
  },
  sectionTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 24,
  },
  inputGroup: {
    marginBottom: 16,
  },
  label: {
    fontSize: 16,
    fontWeight: '500',
    color: '#333',
    marginBottom: 8,
  },
  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 16,
    fontSize: 16,
    backgroundColor: '#fff',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  accountSelector: {
    marginBottom: 24,
  },
  selectedAccount: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 16,
    backgroundColor: '#fff',
  },
  accountName: {
    fontSize: 16,
    fontWeight: '500',
    color: '#333',
  },
  primaryButton: {
    backgroundColor: '#007AFF',
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'center',
  },
  primaryButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  qrContainer: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  qrText: {
    fontSize: 18,
    fontWeight: '500',
    color: '#333',
    marginTop: 16,
  },
  qrSubtext: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    marginTop: 8,
  },
  billsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  billButton: {
    width: '48%',
    aspectRatio: 1,
    backgroundColor: '#fff',
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#eee',
  },
  billText: {
    marginTop: 8,
    fontSize: 14,
    fontWeight: '500',
    color: '#333',
  },
  topupOptions: {
    gap: 12,
  },
  topupCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#eee',
  },
  accountBalance: {
    fontSize: 14,
    color: '#666',
    marginTop: 4,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    marginBottom: 20,
    textAlign: 'center',
  },
  accountOption: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  modalCloseButton: {
    marginTop: 20,
    padding: 16,
    alignItems: 'center',
  },
  modalCloseText: {
    fontSize: 16,
    color: '#007AFF',
    fontWeight: '500',
  },
  recipientText: {
    fontSize: 16,
    fontWeight: '500',
    color: '#333',
  },
  placeholderText: {
    color: '#666',
  },
  disabledButton: {
    backgroundColor: '#ccc',
  },
  loadingText: {
    fontSize: 16,
    fontWeight: '500',
    color: '#333',
    marginTop: 16,
    textAlign: 'center',
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  recipientList: {
    maxHeight: 300,
  },
  recipientOption: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  recipientInfo: {
    flexDirection: 'column',
  },
  recipientName: {
    fontSize: 16,
    fontWeight: '500',
    color: '#333',
  },
  recipientCountry: {
    fontSize: 14,
    color: '#666',
    marginTop: 4,
  },
  recipientAccounts: {
    fontSize: 14,
    color: '#666',
    marginTop: 4,
  },
}); 