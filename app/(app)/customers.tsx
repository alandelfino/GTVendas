import { FontAwesome, Ionicons } from '@expo/vector-icons';
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
    View
} from 'react-native';
import api from '../../api/api';
import OrderDetailSheet, { OrderDetail, ItemPedido } from '../../components/dashboard/OrderDetailSheet';

const { width } = Dimensions.get('window');

interface Customer {
  idExterno: string;
  nome: string;
  fantasia: string;
  cnpj: string;
  telefone?: string;
  email?: string;
  statusDescricao: string;
  endereco: {
    cidade: string;
    uf: string;
    logradouro: string;
    numero: string;
  };
}

interface OrderHistory {
  idExterno: string;
  cadastradoEm: number;
  valorTotal: number;
  status: string;
  totalQuantidade?: number;
}

export default function CustomersScreen() {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';
  
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [search, setSearch] = useState('');
  
  const [detailVisible, setDetailVisible] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [orderHistory, setOrderHistory] = useState<OrderHistory[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);

  // Nested Order Details
  const [orderModalVisible, setOrderModalVisible] = useState(false);
  const [selectedOrderDetail, setSelectedOrderDetail] = useState<OrderDetail | null>(null);
  const [orderDetailLoading, setOrderDetailLoading] = useState(false);

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

  const fetchCustomers = async (isRefresh = false) => {
    if (!isRefresh) setLoading(true);
    try {
      const params: any = { search };
      const response = await api.get('/api/erp/clientes', { params });
      setCustomers(response.data.data || []);
    } catch (error) {
      console.error('Error fetching customers:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const fetchHistory = async (customerId: string) => {
    setHistoryLoading(true);
    try {
      const response = await api.get('/api/erp/pedidos', { params: { clienteId: customerId } });
      const orders = response.data.data || response.data;
      setOrderHistory(Array.isArray(orders) ? orders : []);
    } catch (error) {
      console.error('Error fetching history:', error);
    } finally {
      setHistoryLoading(false);
    }
  };

  const fetchOrderDetail = async (orderId: string) => {
    setOrderDetailLoading(true);
    setOrderModalVisible(true);
    try {
      const response = await api.get(`/api/erp/pedidos/${orderId}`);
      const rawData = response.data.data || response.data;
      console.log('DEBUG [Customers]: Detalhe do Pedido recebido:', JSON.stringify(rawData, null, 2));
      if (rawData) {
        setSelectedOrderDetail(rawData);
      }
    } catch (error) {
      console.error('Error fetching order detail:', error);
    } finally {
      setOrderDetailLoading(false);
    }
  };

  const getStatusColor = (status: string | null | undefined) => {
    const s = (status || '').toLowerCase();
    if (s.includes('ativo') || s.includes('faturado') || s.includes('pago')) return THEME.positive;
    if (s.includes('bloqueado') || s.includes('inativo') || s.includes('cancelado')) return THEME.danger;
    return THEME.accent;
  };

  const getInitials = (name: string | null | undefined) => {
    return (name || '').split(' ').map(n => n[0]).slice(0, 2).join('').toUpperCase();
  };

  const formatCurrency = (cents: number | undefined) => {
    if (cents === undefined || cents === null) return 'R$ 0,00';
    return (cents / 100).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  };

  const openDetail = (customer: Customer) => {
    setSelectedCustomer(customer);
    setDetailVisible(true);
    fetchHistory(customer.idExterno);
  };

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchCustomers(true);
  }, [search]);

  useEffect(() => { fetchCustomers(); }, [search]);

  const renderCustomerItem = ({ item }: { item: Customer }) => (
    <TouchableOpacity 
      activeOpacity={0.7}
      style={[styles.itemRow, { backgroundColor: THEME.card }]}
      onPress={() => openDetail(item)}
    >
      <View style={styles.itemContent}>
        <View style={styles.itemMainInfo}>
           <Text style={[styles.itemCustomerName, { color: THEME.text }]} numberOfLines={1}>
              {item.fantasia || item.nome}
           </Text>
           <Text style={[styles.itemSubDetail, { color: THEME.secondary }]}>
              {item.endereco.cidade}, {item.endereco.uf}
           </Text>
        </View>
        
        <View style={styles.itemRightSide}>
           <Text style={[styles.itemPriceText, { color: THEME.text }]}>{item.cnpj}</Text>
           <View style={[styles.statusBadgeSmall, { backgroundColor: getStatusColor(item.statusDescricao) + '15' }]}>
              <Text style={[styles.statusTextSmall, { color: getStatusColor(item.statusDescricao) }]}>{item.statusDescricao}</Text>
           </View>
        </View>
        <Ionicons name="chevron-forward" size={14} color="#C4C4C6" style={{ marginLeft: 12 }} />
      </View>
    </TouchableOpacity>
  );

  return (
    <View style={[styles.container, { backgroundColor: THEME.bg }]}>
      <Stack.Screen options={{ 
        title: 'Clientes',
        headerLargeTitle: true,
        headerTransparent: true,
        headerBlurEffect: isDark ? 'dark' : 'light',
        headerTintColor: THEME.primary,
        headerSearchBarOptions: {
          placeholder: 'Buscar Cliente',
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
          data={customers}
          renderItem={renderCustomerItem}
          keyExtractor={item => item.idExterno}
          ItemSeparatorComponent={() => <View style={[styles.separatorLine, { backgroundColor: THEME.separator }]} />}
          contentContainerStyle={styles.listContent}
          contentInsetAdjustmentBehavior="automatic"
          showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={THEME.accent} />}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
                <Text style={[styles.emptyText, { color: THEME.secondary }]}>Nenhum cliente</Text>
            </View>
          }
        />
      )}

      <Modal visible={detailVisible} animationType="slide" presentationStyle="pageSheet">
        <View style={[styles.modalBase, { backgroundColor: THEME.bg }]}>
          <View style={[styles.modalHeader, { borderBottomColor: THEME.separator }]}>
             <Text style={[styles.modalTitle, { color: THEME.text }]}>Detalhe do Cliente</Text>
             <TouchableOpacity onPress={() => setDetailVisible(false)} style={styles.modalClose}>
                <Text style={{ color: THEME.primary, fontWeight: '700', fontSize: 16 }}>OK</Text>
             </TouchableOpacity>
          </View>
          
          <ScrollView contentContainerStyle={styles.modalScroll} showsVerticalScrollIndicator={false}>
            {selectedCustomer && (
              <>
               {/* Hero Summary */}
               <View style={styles.heroSection}>
                  <View style={[styles.heroAvatar, { backgroundColor: THEME.accent + '15' }]}>
                     <Text style={[styles.heroAvatarText, { color: THEME.accent }]}>
                        {getInitials(selectedCustomer.fantasia || selectedCustomer.nome)}
                     </Text>
                  </View>
                  <Text style={[styles.iosLabelTitle, { color: THEME.text }]}>
                     {selectedCustomer.fantasia || selectedCustomer.nome}
                  </Text>
                  <Text style={[styles.iosLabelSub, { color: THEME.secondary }]}>
                     {selectedCustomer.nome}
                  </Text>
               </View>

               {/* Quick Actions */}
               <View style={styles.actionGrid}>
                  <TouchableOpacity style={[styles.actionBtn, { backgroundColor: THEME.card }]} onPress={() => Linking.openURL(`tel:${selectedCustomer.telefone}`)}>
                     <Ionicons name="call" size={20} color={THEME.accent} />
                     <Text style={[styles.actionLabel, { color: THEME.text }]}>Telefonar</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={[styles.actionBtn, { backgroundColor: THEME.card }]} onPress={() => Linking.openURL(`whatsapp://send?phone=55${selectedCustomer.telefone?.replace(/\D/g,'')}`)}>
                     <Ionicons name="logo-whatsapp" size={20} color="#25D366" />
                     <Text style={[styles.actionLabel, { color: THEME.text }]}>WhatsApp</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={[styles.actionBtn, { backgroundColor: THEME.card }]} onPress={() => {
                        const address = `${selectedCustomer.endereco.logradouro}, ${selectedCustomer.endereco.numero}, ${selectedCustomer.endereco.cidade}-${selectedCustomer.endereco.uf}`;
                        Linking.openURL(`maps://?q=${encodeURIComponent(address)}`);
                     }}>
                     <Ionicons name="map" size={20} color={THEME.primary} />
                     <Text style={[styles.actionLabel, { color: THEME.text }]}>Mapa</Text>
                  </TouchableOpacity>
               </View>

               <Text style={styles.iosGroupLabel}>DADOS DO CLIENTE</Text>
               <View style={[styles.iosGroupedCard, { backgroundColor: THEME.card }]}>
                  <View style={styles.iosRow}>
                      <Text style={[styles.iosLabel, { color: THEME.secondary }]}>CNPJ</Text>
                      <Text style={[styles.iosValue, { color: THEME.text }]}>{selectedCustomer.cnpj}</Text>
                  </View>
                  <View style={[styles.iosSeparator, { backgroundColor: THEME.separator }]} />
                  <View style={styles.iosRow}>
                      <Text style={[styles.iosLabel, { color: THEME.secondary }]}>Status</Text>
                      <Text style={[styles.iosValue, { color: getStatusColor(selectedCustomer.statusDescricao), fontWeight: '700' }]}>
                        {selectedCustomer.statusDescricao}
                      </Text>
                  </View>
                  <View style={[styles.iosSeparator, { backgroundColor: THEME.separator }]} />
                  <View style={styles.iosRow}>
                      <Text style={[styles.iosLabel, { color: THEME.secondary }]}>E-mail</Text>
                      <Text style={[styles.iosValue, { color: THEME.text }]} numberOfLines={1}>{selectedCustomer.email || 'Não informado'}</Text>
                  </View>
               </View>

               <Text style={styles.iosGroupLabel}>ÚLTIMOS PEDIDOS</Text>
               <View style={[styles.iosGroupedCard, { backgroundColor: THEME.card, paddingHorizontal: 0 }]}>
                  {historyLoading ? (
                    <View style={{ padding: 20 }}><ActivityIndicator color={THEME.accent} /></View>
                  ) : orderHistory.length > 0 ? (
                    orderHistory.slice(0, 5).map((order, idx) => (
                      <TouchableOpacity key={idx} activeOpacity={0.6} onPress={() => fetchOrderDetail(order.idExterno)}>
                        <View style={styles.iosItemRow}>
                           <View>
                              <Text style={[styles.iosItemName, { color: THEME.text }]}>#{order.idExterno}</Text>
                              <Text style={[styles.iosItemRef, { color: THEME.secondary }]}>{new Date(order.cadastradoEm).toLocaleDateString('pt-BR')}</Text>
                           </View>
                           <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                              <Text style={[styles.iosItemPrice, { color: THEME.text }]}>{formatCurrency(order.valorTotal)}</Text>
                              <Ionicons name="chevron-forward" size={14} color="#C4C4C6" style={{ marginLeft: 8 }} />
                           </View>
                        </View>
                        {idx < 4 && idx < orderHistory.length - 1 && (
                          <View style={[styles.iosSeparator, { backgroundColor: THEME.separator, marginLeft: 16 }]} />
                        )}
                      </TouchableOpacity>
                    ))
                  ) : (
                    <View style={{ padding: 20 }}><Text style={{ color: THEME.secondary, textAlign: 'center' }}>Nenhum pedido recente</Text></View>
                  )}
               </View>
              </>
            )}
          </ScrollView>
        </View>

        {/* Level 2: Order Detail Modal */}
        <OrderDetailSheet 
          visible={orderModalVisible} 
          onClose={() => setOrderModalVisible(false)}
          order={selectedOrderDetail}
          loading={orderDetailLoading}
          theme={THEME}
          getStatusColor={getStatusColor}
          formatCurrency={formatCurrency}
        />
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
  modalTitle: { fontSize: 17, fontWeight: '700' },
  modalClose: { position: 'absolute', right: 16 },
  modalLoading: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  modalScroll: { padding: 16, paddingBottom: 60 },
  heroSection: { paddingVertical: 24, alignItems: 'center' },
  iosGroupedCard: { borderRadius: 12, paddingHorizontal: 16, marginBottom: 24, overflow: 'hidden' },
  iosGroupLabel: { fontSize: 13, fontWeight: '400', color: '#8E8E93', marginLeft: 16, marginBottom: 8, textTransform: 'uppercase' },
  heroAvatar: { width: 80, height: 80, borderRadius: 40, justifyContent: 'center', alignItems: 'center', marginBottom: 16 },
  heroAvatarText: { fontSize: 32, fontWeight: '800' },
  actionGrid: { flexDirection: 'row', gap: 12, marginBottom: 30 },
  actionBtn: { flex: 1, borderRadius: 12, padding: 12, alignItems: 'center', justifyContent: 'center', shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 4, elevation: 2 },
  actionLabel: { fontSize: 11, fontWeight: '700', marginTop: 6 },
  iosRow: { height: 44, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  iosRowCol: { paddingVertical: 20, alignItems: 'center' },
  iosLabel: { fontSize: 17, fontWeight: '400' },
  iosLabelTitle: { fontSize: 22, fontWeight: '800', marginBottom: 4, textAlign: 'center' },
  iosLabelSub: { fontSize: 15, fontWeight: '400', textAlign: 'center' },
  iosHeroValue: { fontSize: 20, fontWeight: '900' },
  statusTag: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 },
  statusTagText: { fontSize: 12, fontWeight: '800' },
  iosValue: { fontSize: 17, fontWeight: '400' },
  iosSeparator: { height: StyleSheet.hairlineWidth },
  iosItemRow: { padding: 16, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  iosItemName: { fontSize: 15, fontWeight: '700', marginBottom: 2 },
  iosItemRef: { fontSize: 13 },
  iosItemPrice: { fontSize: 15, fontWeight: '700' },
  iosItemPriceSub: { fontSize: 12, marginTop: 2 },
});
