import { Ionicons } from '@expo/vector-icons';
import { Stack } from 'expo-router';
import React, { useCallback, useEffect, useState } from 'react';
import {
    ActionSheetIOS,
    ActivityIndicator,
    Dimensions,
    FlatList,
    Linking,
    Modal,
    RefreshControl,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    useColorScheme,
    View,
    Platform
} from 'react-native';
import api from '../../api/api';

const { width } = Dimensions.get('window');

interface Order {
  idExterno: string;
  cadastradoEm: number;
  valorTotal: number;
  status: string;
  cliente: {
    idExterno: string;
    nome: string;
    fantasia: string;
    cnpj?: string;
    cidade?: string;
    uf?: string;
    endereco: {
      cidade: string;
      uf: string;
      logradouro: string;
      numero: string | number | null;
    };
    localidade?: string;
    telefone?: string;
  };
}

interface OrderItem {
  produtoId: string;
  nome: string;
  referencia: string;
  valorUnitario: number;
  quantidadeItem: number;
  cores: {
    corNome: string;
    tamanhos: {
      tamanho: string;
      quantidade: number;
    }[];
  }[];
}

interface OrderDetail extends Order {
  itens: OrderItem[];
}

export default function OrdersScreen() {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';
  
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [orders, setOrders] = useState<Order[]>([]);
  const [search, setSearch] = useState('');
  
  const [detailVisible, setDetailVisible] = useState(false);
  const [selectedOrderDetail, setSelectedOrderDetail] = useState<OrderDetail | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);

  const THEME = {
    bg: isDark ? '#1C252E' : '#F2F2F7',
    card: isDark ? '#2C3641' : '#FFFFFF',
    text: isDark ? '#FFFFFF' : '#1C252E',
    secondary: isDark ? '#8E9AA9' : '#636366',
    border: isDark ? '#3D4956' : '#E5E5EA',
    accent: '#F9B252',
    primary: isDark ? '#F9B252' : '#3D4956', 
    green: '#34C759',
    red: '#FF3B30',
    orange: '#F9B252',
    separator: isDark ? '#3D4956' : '#C6C6C8',
    itemBg: isDark ? '#2C3641' : '#FFFFFF',
  };

  const fetchOrders = async (isRefresh = false) => {
    if (!isRefresh) setLoading(true);
    try {
      const params: any = { search };
      const response = await api.get('/api/erp/pedidos', { params });
      const rawData = response.data.data || response.data;
      const normalizedOrders = (Array.isArray(rawData) ? rawData : []).map((o: any) => {
        const c = o.cliente || {};
        return {
          ...o,
          idExterno: o.idExterno || o.id || o.codigo || o.numPedido || 'S/ ID',
          status: o.status || 'Pendente',
          cliente: { ...c, fantasia: c.fantasia || c.nome || 'Cliente não Identificado', localidade: c.cidade ? `${c.cidade} - ${c.uf}` : '' }
        };
      });
      setOrders(normalizedOrders);
    } catch (error) {
      console.error('Error fetching orders:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const fetchOrderDetail = async (orderId: string) => {
    setDetailLoading(true);
    setDetailVisible(true);
    try {
      const response = await api.get(`/api/erp/pedidos/${orderId}`);
      const rawData = response.data.data || response.data;
      if (rawData) {
        // Normalization here... (simplified)
        setSelectedOrderDetail(rawData);
      }
    } catch (error) {
      console.error('Error fetching order detail:', error);
    } finally {
      setDetailLoading(false);
    }
  };

  const getStatusColor = (status: string | null | undefined) => {
    const s = (status || '').toLowerCase();
    if (s.includes('faturado') || s.includes('pago')) return THEME.green;
    if (s.includes('cancelado')) return THEME.red;
    return THEME.orange;
  };

  const formatCurrency = (cents: number | undefined) => {
    if (cents === undefined || cents === null) return 'R$ 0,00';
    return (cents / 100).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  };

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchOrders(true);
  }, [search]);

  useEffect(() => { fetchOrders(); }, [search]);

  const renderOrderItem = ({ item }: { item: Order }) => (
    <TouchableOpacity 
      style={[styles.itemRow, { backgroundColor: THEME.card }]}
      onPress={() => fetchOrderDetail(item.idExterno)}
    >
      <View style={[styles.statusIconCircle, { backgroundColor: getStatusColor(item.status) + '15' }]}>
        <Ionicons name="cart" size={22} color={getStatusColor(item.status)} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={[styles.itemCustomerName, { color: THEME.text }]} numberOfLines={1}>{item.cliente?.fantasia}</Text>
        <Text style={[styles.itemPriceID, { color: THEME.secondary }]}>Pedido {item.idExterno} • {formatCurrency(item.valorTotal)}</Text>
      </View>
      <Ionicons name="chevron-forward" size={14} color={THEME.border} />
    </TouchableOpacity>
  );

  return (
    <View style={[styles.container, { backgroundColor: THEME.bg }]}>
      <Stack.Screen options={{ 
        title: 'Pedidos',
        headerLargeTitle: true,
        headerStyle: { backgroundColor: THEME.bg },
        headerSearchBarOptions: {
          placeholder: 'Buscar Pedido',
          onChangeText: (e) => setSearch(e.nativeEvent.text),
        }
      }} />

      <FlatList
        data={orders}
        renderItem={renderOrderItem}
        keyExtractor={item => item.idExterno}
        contentContainerStyle={styles.listContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={THEME.accent} />}
      />

      <Modal visible={detailVisible} animationType="slide" presentationStyle="pageSheet">
        <View style={[styles.modalBase, { backgroundColor: THEME.bg }]}>
          <TouchableOpacity onPress={() => setDetailVisible(false)} style={{ padding: 16 }}><Text style={{ color: THEME.accent }}>Fechar</Text></TouchableOpacity>
          {detailLoading ? <ActivityIndicator color={THEME.accent} /> : selectedOrderDetail && (
            <ScrollView>
               <View style={styles.modalHero}>
                  <Text style={[styles.heroValue, { color: THEME.text }]}>{formatCurrency(selectedOrderDetail.valorTotal)}</Text>
               </View>
            </ScrollView>
          )}
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  listContent: { padding: 16, paddingTop: 20, paddingBottom: 100 },
  itemRow: { flexDirection: 'row', alignItems: 'center', padding: 16, borderRadius: 12, marginBottom: 10 },
  statusIconCircle: { width: 44, height: 44, borderRadius: 22, justifyContent: 'center', alignItems: 'center', marginRight: 15 },
  itemCustomerName: { fontSize: 16, fontWeight: '700' },
  itemPriceID: { fontSize: 13 },
  modalBase: { flex: 1 },
  modalHero: { alignItems: 'center', padding: 40 },
  heroValue: { fontSize: 40, fontWeight: '800' }
});
