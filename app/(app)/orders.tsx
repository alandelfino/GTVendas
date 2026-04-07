import { Ionicons } from '@expo/vector-icons';
import { Stack } from 'expo-router';
import React, { useCallback, useEffect, useState } from 'react';
import {
    ActivityIndicator,
    Dimensions,
    FlatList,
    Modal,
    RefreshControl,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    useColorScheme,
    View
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
    positive: '#34C759',
    danger: '#FF3B30',
    separator: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)',
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
    if (s.includes('faturado') || s.includes('pago')) return THEME.positive;
    if (s.includes('cancelado')) return THEME.danger;
    return THEME.accent;
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
      activeOpacity={0.7}
      style={[styles.itemRow, { backgroundColor: THEME.card }]}
      onPress={() => fetchOrderDetail(item.idExterno)}
    >
      <View style={styles.itemContent}>
        <View style={styles.itemMainInfo}>
           <Text style={[styles.itemCustomerName, { color: THEME.text }]} numberOfLines={1}>
              {item.cliente?.fantasia}
           </Text>
           <Text style={[styles.itemSubDetail, { color: THEME.secondary }]}>
              {new Date(item.cadastradoEm).toLocaleDateString('pt-BR')}
           </Text>
        </View>
        
        <View style={styles.itemRightSide}>
           <Text style={[styles.itemPriceText, { color: THEME.text }]}>{formatCurrency(item.valorTotal)}</Text>
           <View style={[styles.statusBadgeSmall, { backgroundColor: getStatusColor(item.status) + '15' }]}>
              <Text style={[styles.statusTextSmall, { color: getStatusColor(item.status) }]}>{item.status}</Text>
           </View>
        </View>
        <Ionicons name="chevron-forward" size={14} color="#C4C4C6" style={{ marginLeft: 12 }} />
      </View>
    </TouchableOpacity>
  );

  return (
    <View style={[styles.container, { backgroundColor: THEME.bg }]}>
      <Stack.Screen options={{ 
        title: 'Pedidos',
        headerLargeTitle: true,
        headerTransparent: true,
        headerBlurEffect: isDark ? 'dark' : 'light',
        headerTintColor: THEME.primary,
        headerSearchBarOptions: {
          placeholder: 'Buscar',
          onChangeText: (e) => setSearch(e.nativeEvent.text),
          headerIconColor: THEME.secondary,
        }
      }} />

      {loading && !refreshing ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator color={THEME.accent} size="small" />
        </View>
      ) : (
        <FlatList
          data={orders}
          renderItem={renderOrderItem}
          keyExtractor={item => item.idExterno}
          ItemSeparatorComponent={() => <View style={[styles.separatorLine, { backgroundColor: THEME.separator }]} />}
          contentContainerStyle={styles.listContent}
          contentInsetAdjustmentBehavior="automatic"
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl 
                refreshing={refreshing} 
                onRefresh={onRefresh} 
                tintColor={THEME.accent}
            />
          }
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
                <Text style={[styles.emptyText, { color: THEME.secondary }]}>Nenhum pedido</Text>
            </View>
          }
        />
      )}

      <Modal visible={detailVisible} animationType="slide" presentationStyle="pageSheet">
        <View style={[styles.modalBase, { backgroundColor: THEME.bg }]}>
          <View style={[styles.modalHeader, { borderBottomColor: THEME.separator }]}>
             <Text style={[styles.modalTitle, { color: THEME.text }]}>Detalhes</Text>
             <TouchableOpacity onPress={() => setDetailVisible(false)} style={styles.modalClose}>
                <Text style={{ color: THEME.primary, fontWeight: '600', fontSize: 17 }}>OK</Text>
             </TouchableOpacity>
          </View>
          
          {detailLoading ? (
             <View style={styles.modalLoading}><ActivityIndicator color={THEME.accent} /></View>
          ) : selectedOrderDetail && (
            <ScrollView contentContainerStyle={styles.modalScroll}>
               {/* Resumo do Pedido - Estilo iOS Inset Grouped */}
               <View style={[styles.iosGroupedCard, { backgroundColor: THEME.card }]}>
                  <View style={styles.iosRow}>
                      <Text style={[styles.iosLabel, { color: THEME.text }]}>Código</Text>
                      <Text style={[styles.iosValue, { color: THEME.secondary }]}>#{selectedOrderDetail.idExterno}</Text>
                  </View>
                  <View style={[styles.iosSeparator, { backgroundColor: THEME.separator }]} />
                  <View style={styles.iosRow}>
                      <Text style={[styles.iosLabel, { color: THEME.text }]}>Status</Text>
                      <Text style={[styles.iosValue, { color: getStatusColor(selectedOrderDetail.status), fontWeight: '700' }]}>
                        {selectedOrderDetail.status}
                      </Text>
                  </View>
                  <View style={[styles.iosSeparator, { backgroundColor: THEME.separator }]} />
                  <View style={styles.iosRow}>
                      <Text style={[styles.iosLabel, { color: THEME.text }]}>Total</Text>
                      <Text style={[styles.iosValue, { color: THEME.text, fontWeight: '800' }]}>{formatCurrency(selectedOrderDetail.valorTotal)}</Text>
                  </View>
               </View>

               <Text style={styles.iosGroupLabel}>CLIENTE</Text>
               <View style={[styles.iosGroupedCard, { backgroundColor: THEME.card }]}>
                  <View style={styles.iosRowCol}>
                      <Text style={[styles.iosLabelLarge, { color: THEME.text }]}>{selectedOrderDetail.cliente.fantasia}</Text>
                      <Text style={[styles.iosSubValue, { color: THEME.secondary }]}>{selectedOrderDetail.cliente.localidade}</Text>
                  </View>
               </View>

               <Text style={styles.iosGroupLabel}>ITENS DO PEDIDO</Text>
               <View style={[styles.iosGroupedCard, { backgroundColor: THEME.card, paddingHorizontal: 0 }]}>
                  {selectedOrderDetail.itens?.map((item, idx) => (
                    <View key={idx}>
                      <View style={styles.iosItemRow}>
                         <View style={{ flex: 1 }}>
                            <Text style={[styles.iosItemName, { color: THEME.text }]}>{item.nome}</Text>
                            <Text style={[styles.iosItemRef, { color: THEME.accent }]}>REF: {item.referencia}</Text>
                         </View>
                         <View style={{ alignItems: 'flex-end' }}>
                            <Text style={[styles.iosItemPrice, { color: THEME.text }]}>{item.quantidadeItem} un</Text>
                            <Text style={[styles.iosItemPriceSub, { color: THEME.secondary }]}>{formatCurrency(item.valorUnitario)}</Text>
                         </View>
                      </View>
                      {idx < selectedOrderDetail.itens.length - 1 && (
                        <View style={[styles.iosSeparator, { backgroundColor: THEME.separator, marginLeft: 16 }]} />
                      )}
                    </View>
                  ))}
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
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  listContent: { paddingBottom: 40 },
  separatorLine: { height: StyleSheet.hairlineWidth, marginLeft: 16 },
  itemRow: { paddingVertical: 14, paddingHorizontal: 16 },
  itemContent: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  itemMainInfo: { flex: 1 },
  itemCustomerName: { fontSize: 17, fontWeight: '700', marginBottom: 2 },
  itemSubDetail: { fontSize: 13 },
  itemRightSide: { alignItems: 'flex-end' },
  itemPriceText: { fontSize: 15, fontWeight: '400', marginBottom: 4 },
  statusBadgeSmall: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 6 },
  statusTextSmall: { fontSize: 10, fontWeight: '600' },
  emptyContainer: { flex: 1, paddingTop: 100, alignItems: 'center' },
  emptyText: { fontSize: 17 },
  modalBase: { flex: 1 },
  modalHeader: { height: 56, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', borderBottomWidth: StyleSheet.hairlineWidth },
  modalTitle: { fontSize: 17, fontWeight: '600' },
  modalClose: { position: 'absolute', right: 16 },
  modalLoading: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  modalScroll: { padding: 16, paddingBottom: 60 },
  iosGroupedCard: { borderRadius: 10, paddingHorizontal: 16, marginBottom: 20, overflow: 'hidden' },
  iosGroupLabel: { fontSize: 13, color: '#6e6e73', marginLeft: 16, marginBottom: 8, textTransform: 'uppercase' },
  iosRow: { height: 44, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  iosRowCol: { paddingVertical: 12 },
  iosLabel: { fontSize: 17 },
  iosLabelLarge: { fontSize: 17, fontWeight: '600' },
  iosValue: { fontSize: 17 },
  iosSubValue: { fontSize: 14, marginTop: 2 },
  iosSeparator: { height: StyleSheet.hairlineWidth },
  iosItemRow: { padding: 16, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  iosItemName: { fontSize: 15, fontWeight: '600', marginBottom: 2 },
  iosItemRef: { fontSize: 12, fontWeight: '600' },
  iosItemPrice: { fontSize: 15, fontWeight: '600' },
  iosItemPriceSub: { fontSize: 13, marginTop: 2 }
});
