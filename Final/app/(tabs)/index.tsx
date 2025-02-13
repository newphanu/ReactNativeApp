import React, { useState, useEffect } from 'react';
import { 
  View, 
  Text, 
  TextInput, 
  TouchableOpacity, 
  SectionList, 
  StyleSheet,
  ActivityIndicator,
  Alert 
} from 'react-native';
import axios from 'axios';

const API_URL = 'http://localhost:3000';

export default function App() {
  const [transactions, setTransactions] = useState([]);
  const [amount, setAmount] = useState('');
  const [category, setCategory] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [summary, setSummary] = useState({
    balance: 0
  });

  useEffect(() => {
    fetchTransactions();
  }, []);

  const fetchTransactions = async () => {
    try {
      setIsLoading(true);
      setError(null);
      const response = await axios.get(`${API_URL}/transactions`);
      
      // Group transactions by month
      const grouped = groupTransactionsByMonth(response.data.transactions);
      setTransactions(grouped);
      setSummary({
        balance: response.data.summary.balance
      });
    } catch (error) {
      setError('ไม่สามารถโหลดข้อมูลได้ กรุณาลองใหม่อีกครั้ง');
      console.error('Error fetching transactions:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const groupTransactionsByMonth = (transactions) => {
    const grouped = transactions.reduce((acc, transaction) => {
      const date = new Date(transaction.transaction_date);
      const monthYear = date.toLocaleDateString('th-TH', {
        month: 'long',
        year: 'numeric'
      });

      if (!acc[monthYear]) {
        acc[monthYear] = [];
      }
      acc[monthYear].push(transaction);
      return acc;
    }, {});

    // Convert to SectionList format
    return Object.entries(grouped)
      .map(([title, data]) => ({
        title,
        data: data.sort((a, b) => 
          new Date(b.transaction_date) - new Date(a.transaction_date)
        )
      }))
      .sort((a, b) => {
        const dateA = new Date(a.data[0].transaction_date);
        const dateB = new Date(b.data[0].transaction_date);
        return dateB - dateA;
      });
  };

  const handleAddTransaction = async (type) => {
    if (!amount || !category) {
      Alert.alert('ข้อมูลไม่ครบถ้วน', 'กรุณากรอกจำนวนเงินและหมวดหมู่');
      return;
    }

    if (isNaN(amount) || parseFloat(amount) <= 0) {
      Alert.alert('ข้อมูลไม่ถูกต้อง', 'กรุณากรอกจำนวนเงินเป็นตัวเลขที่มากกว่า 0');
      return;
    }

    try {
      const now = new Date();
      const thailandTime = new Date(now.getTime() + (7 * 60 * 60 * 1000));
    
      const newTransaction = {
        type,
        amount: parseFloat(amount),
        description: category,
        transaction_date: thailandTime.toISOString().slice(0, 19).replace('T', ' '),
      };
    
      await axios.post(`${API_URL}/transactions`, newTransaction);
      fetchTransactions();
      setAmount('');
      setCategory('');
      Alert.alert('สำเร็จ', 'บันทึกข้อมูลเรียบร้อยแล้ว');
    } catch (error) {
      Alert.alert('เกิดข้อผิดพลาด', 'ไม่สามารถบันทึกข้อมูลได้ กรุณาลองใหม่อีกครั้ง');
      console.error('Error adding transaction:', error);
    }
  };

  const formatTime = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleTimeString('th-TH', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: false
    });
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('th-TH', {
      day: 'numeric',
      month: 'long',
      year: 'numeric'
    });
  };

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#1976D2" />
        <Text style={styles.loadingText}>กำลังโหลดข้อมูล...</Text>
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.errorContainer}>
        <Text style={styles.errorText}>{error}</Text>
        <TouchableOpacity style={styles.retryButton} onPress={fetchTransactions}>
          <Text style={styles.retryButtonText}>ลองใหม่</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerText}>บันทึกรายรับ-รายจ่าย</Text>
        
          
        
      </View>

      <View style={styles.inputContainer}>
        <View style={styles.balanceContainer}>
          <Text style={styles.balanceLabel}>ยอดคงเหลือ</Text>
          <Text style={[styles.balanceAmount, { color: summary.balance >= 0 ? '#2E7D32' : '#C62828' }]}>
            {summary.balance.toLocaleString()} บาท
          </Text>
        </View>
        <TextInput
          style={[styles.input, styles.amountInput]}
          placeholder="จำนวนเงิน"
          keyboardType="numeric"
          value={amount}
          onChangeText={setAmount}
          placeholderTextColor="#666"
        />
        <TextInput
          style={[styles.input, styles.categoryInput]}
          placeholder="หมวดหมู่ (เช่น อาหาร, ค่าเดินทาง)"
          value={category}
          onChangeText={setCategory}
          placeholderTextColor="#666"
        />

        <View style={styles.buttonRow}>
          <TouchableOpacity
            style={[styles.button, styles.incomeButton]}
            onPress={() => handleAddTransaction('income')}
          >
            <Text style={styles.buttonText}>+ รายรับ</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.button, styles.expenseButton]}
            onPress={() => handleAddTransaction('expense')}
          >
            <Text style={styles.buttonText}>- รายจ่าย</Text>
          </TouchableOpacity>
        </View>
      </View>

      <SectionList
        sections={transactions}
        keyExtractor={(item) => item.transaction_id.toString()}
        renderSectionHeader={({ section: { title } }) => (
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionHeaderText}>{title}</Text>
          </View>
        )}
        renderItem={({ item }) => (
          <View style={styles.transactionItem}>
            <View style={styles.transactionContent}>
              <Text style={styles.transactionCategory}>{item.description}</Text>
              <Text style={styles.transactionDate}>
                {formatDate(item.transaction_date)} {formatTime(item.transaction_date)} น.
              </Text>
              <Text
                style={[
                  styles.transactionAmount,
                  { color: item.type === 'income' ? '#2E7D32' : '#C62828' }
                ]}
              >
                {item.type === 'income' ? '+' : '-'} {item.amount.toLocaleString()} บาท
              </Text>
            </View>
          </View>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F5F5',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F5F5F5',
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    color: '#666',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F5F5F5',
    padding: 20,
  },
  errorText: {
    fontSize: 16,
    color: '#C62828',
    textAlign: 'center',
    marginBottom: 20,
  },
  retryButton: {
    backgroundColor: '#1976D2',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
  },
  retryButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
  header: {
    backgroundColor: '#1976D2',
    paddingTop: 40,
    paddingBottom: 12,
    elevation: 4,
  },
  headerText: {
    fontSize: 20,
    fontWeight: 'bold',
    color: 'white',
    textAlign: 'center',
    marginBottom: 4,
  },
  balanceContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
  balanceLabel: {
    fontSize: 14,
    color: 'rgba(39, 123, 31, 0.9)',
    marginRight: 8,
  },
  balanceAmount: {
    fontSize: 18,
    fontWeight: 'bold',
    color: 'white',
  },
  inputContainer: {
    backgroundColor: 'white',
    padding: 12,
    margin: 12,
    borderRadius: 10,
    elevation: 2,
    marginBottom: 8,
  },
  inputRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 8,
  },
  input: {
    borderWidth: 1,
    borderColor: '#E0E0E0',
    borderRadius: 8,
    padding: 8,
    fontSize: 16,
    backgroundColor: '#F8F9FA',
  },
  amountInput: {
    flex: 2,
    marginTop: 8
  },
  categoryInput: {
    flex: 3,
  },
  buttonRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 4,
  },
  button: {
    flex: 1,
    padding: 10,
    borderRadius: 8,
    elevation: 1,
  },
  incomeButton: {
    backgroundColor: '#2E7D32',
  },
  expenseButton: {
    backgroundColor: '#C62828',
  },
  buttonText: {
    color: 'white',
    textAlign: 'center',
    fontSize: 14,
    fontWeight: 'bold',
  },
  sectionHeader: {
    backgroundColor: '#E3F2FD',
    padding: 8,
    marginHorizontal: 12,
    marginTop: 8,
    borderRadius: 8,
  },
  sectionHeaderText: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#1976D2',
  },
  transactionItem: {
    backgroundColor: 'white',
    marginHorizontal: 12,
    marginTop: 1,
    marginBottom: 1,
    borderRadius: 8,
    elevation: 1,
  },
  transactionContent: {
    padding: 12,
  },
  transactionCategory: {
    fontSize: 15,
    fontWeight: '500',
    marginBottom: 2,
  },
  transactionDate: {
    fontSize: 13,
    color: '#666',
    marginBottom: 2,
  },
  transactionAmount: {
    fontSize: 15,
    fontWeight: 'bold',
  }
});