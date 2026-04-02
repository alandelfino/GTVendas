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

const { width } = Dimensions.get('window');

interface Customer {
  idExterno: string;
  nome: string;
  fantasia: string;
  cnpj: string;
  statusDescricao: string;
  telefone?: string;
  email?: string;
  endereco: {
    cidade: string;
    uf: string;
    logradouro: string;
    numero: number | null;
    bairro: string;
    cep: string;
  };
}

interface OrderHistory {
  idExterno: string;
  cadastradoEm: number;
  valorTotal: number;
  status: string;
  totalQuantidade?: number;
}

interface OrderItem {
  produtoId: string;
  nome: string;
  referencia: string;
  cores: {
    corNome: string;
    tamanhos: {
      tamanho: string;
      quantidade: number;
    }[];
  }[];
}

interface OrderDetail extends OrderHistory {
  itens: OrderItem[];
  items?: OrderItem[];
}

export default function CustomersScreen() {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';
  
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [search, setSearch] = useState('');
  
  // Detail Modal States
  const [detailVisible, setDetailVisible] = useState(false);
  const [detailTab, setDetailTab] = useState<'info' | 'history'>('info');
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [orderHistory, setOrderHistory] = useState<OrderHistory[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  
  // Order Detail Modal States (Nested)
  const [orderModalVisible, setOrderModalVisible] = useState(false);
  const [selectedOrderDetail, setSelectedOrderDetail] = useState<OrderDetail | null>(null);
  const [orderDetailLoading, setOrderDetailLoading] = useState(false);

  const THEME = {
    bg: isDark ? '#000000' : '#F2F2F7',
    card: isDark ? '#1C1C1E' : '#FFFFFF',
    text: isDark ? '#FFFFFF' : '#000000',
    secondary: isDark ? '#8E8E93' : '#636366',
    border: isDark ? '#38383A' : '#C6C6C8',
    accent: '#0A84FF',
    green: '#34C759',
    red: '#FF3B30',
    orange: '#FF9500',
    separator: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)',
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
      const url = `/api/erp/clientes/${customerId}/pedidos`;
      const response = await api.get(url);
      const orders = response.data.data || response.data;
      setOrderHistory(Array.isArray(orders) ? orders : []);
    } catch (error) {
      console.error('Error fetching history:', error);
      setOrderHistory([]);
    } finally {
      setHistoryLoading(false);
    }
  };

  const fetchOrderDetail = async (orderId: string) => {
    console.log(`--- [DEBUG TITANIUM] Buscando Pedido: ${orderId} ---`);
    if (!orderId) return;
    
    setOrderDetailLoading(true);
    setOrderModalVisible(true);
    try {
      const response = await api.get(`/api/erp/pedidos/${orderId}`);
      const rawData = response.data.data || response.data;
      
      console.log('--- [DEBUG TITANIUM] DADOS DO PEDIDO CARREGADOS ---');
      
      // Defesa e Normalização completa
      if (rawData && typeof rawData === 'object') {
        console.log('--- [DEBUG TITANIUM] JSON COMPLETO DO PEDIDO ---');
        console.log(JSON.stringify(rawData, null, 2));

        // Normalização do ID do Pedido
        rawData.idExterno = rawData.idExterno || rawData.id || rawData.codigo || rawData.numPedido || orderId;
        
        // Tenta encontrar a lista de itens em várias chaves possíveis
        const items = rawData.itens || rawData.items || rawData.pedidos_itens || rawData.itensPedido || [];
        rawData.itens = Array.isArray(items) ? items : [];
        
        // Normaliza cada item individualmente (nomes de campos)
        rawData.itens = rawData.itens.map((it: any) => {
          const cores = it.cores || it.cores_itens || it.itens_cores || [];
          const totalQty = cores.reduce((acc: number, cor: any) => 
            acc + (cor.tamanhos || []).reduce((tAcc: number, tam: any) => tAcc + (tam.quantidade || tam.qtd || 0), 0)
          , 0);

          return {
            ...it,
            nome: it.nome || it.nomeProduto || it.descricao || it.produtoDescricao || 'Produto s/ Nome',
            referencia: it.idExterno || it.referencia || it.ref || it.id || it.codigo || it.codProduto || it.produtoId || it.sku || 'S/ Ref',
            valorUnitario: it.valorUnitario || it.valor || it.preco || 0,
            quantidadeItem: it.quantidadeTotal || it.quantidade || totalQty,
            cores: cores.map((c: any) => ({
              ...c,
              corNome: c.corNome || c.nomeCor || c.descricaoCor || 'Cor Padrão',
              tamanhos: (c.tamanhos || []).map((t: any) => ({
                tamanho: t.tamanho || t.sigla || t.tam || '?',
                quantidade: t.quantidade || t.qtd || 0
              }))
            }))
          };
        });

        setSelectedOrderDetail(rawData);
      } else {
         setSelectedOrderDetail(null);
      }
    } catch (error: any) {
      console.error('Error fetching order detail:', error?.response?.data || error.message);
      setSelectedOrderDetail(null);
    } finally {
      setOrderDetailLoading(false);
    }
  };

  const handleMapPress = (customer: Customer) => {
    const address = `${customer.endereco.logradouro}, ${customer.endereco.numero}, ${customer.endereco.cidade}, ${customer.endereco.uf}`;
    const encodedAddress = encodeURIComponent(address);
    ActionSheetIOS.showActionSheetWithOptions(
      {
        options: ['Cancelar', 'Apple Maps', 'Google Maps'],
        cancelButtonIndex: 0,
        title: 'Abrir Mapa',
        message: 'Como deseja seguir a rota?'
      },
      (buttonIndex) => {
        if (buttonIndex === 1) {
          Linking.openURL(`maps://?q=${encodedAddress}`);
        } else if (buttonIndex === 2) {
          const googleUrl = `comgooglemaps://?q=${encodedAddress}`;
          Linking.canOpenURL(googleUrl).then(supported => {
            if (supported) {
              Linking.openURL(googleUrl);
            } else {
              Linking.openURL(`https://www.google.com/maps/search/?api=1&query=${encodedAddress}`);
            }
          });
        }
      }
    );
  };

  const getStatusColor = (status: string | null | undefined) => {
    const s = (status || '').toLowerCase();
    if (s.includes('ativo') || s.includes('faturado') || s.includes('pago')) return THEME.green;
    if (s.includes('bloqueado') || s.includes('inativo') || s.includes('cancelado')) return THEME.red;
    if (s.includes('restri') || s.includes('pendente')) return THEME.orange;
    return THEME.secondary;
  };

  const getInitials = (name: string | null | undefined) => {
    return (name || '').split(' ').map(n => n[0]).slice(0, 2).join('').toUpperCase();
  };

  const formatCurrency = (cents: number | undefined) => {
    if (cents === undefined || cents === null) return 'R$ 0,00';
    return (cents / 100).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  };

  const formatDate = (ts: number | undefined) => {
    if (!ts) return '--/--/----';
    return new Date(ts).toLocaleDateString('pt-BR');
  };

  const openDetail = (customer: Customer) => {
    setSelectedCustomer(customer);
    setDetailTab('info');
    setDetailVisible(true);
    fetchHistory(customer.idExterno);
  };

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchCustomers(true);
  }, [search]);

  useEffect(() => {
    fetchCustomers();
  }, [search]);

  const renderCustomerItem = ({ item }: { item: Customer }) => (
    <TouchableOpacity 
      style={[
        styles.itemContainer, 
        { backgroundColor: THEME.card }
      ]}
      onPress={() => openDetail(item)}
      activeOpacity={0.7}
    >
      <View style={[styles.avatar, { backgroundColor: getStatusColor(item.statusDescricao) + '20' }]}>
        <Text style={[styles.avatarText, { color: getStatusColor(item.statusDescricao) }]}>
          {getInitials(item.fantasia || item.nome)}
        </Text>
      </View>
      <View style={styles.itemContent}>
        <Text style={[styles.itemName, { color: THEME.text }]} numberOfLines={1}>
          {item.fantasia || item.nome}
        </Text>
        <Text style={[styles.itemSub, { color: THEME.secondary }]}>{item.cnpj}</Text>
        <Text style={[styles.itemLoc, { color: THEME.secondary }]}>{item.endereco.cidade}, {item.endereco.uf}</Text>
      </View>
      <Ionicons name="chevron-forward" size={16} color={THEME.border} />
    </TouchableOpacity>
  );

  return (
    <View style={[styles.container, { backgroundColor: THEME.bg }]}>
      <Stack.Screen options={{ 
        title: 'Clientes',
        headerLargeTitle: true,
        headerBackTitle: 'Voltar',
        headerBlurEffect: isDark ? 'dark' : 'light',
        headerStyle: { backgroundColor: THEME.bg },
        headerSearchBarOptions: {
          placeholder: 'Nome ou CNPJ',
          onChangeText: (e) => setSearch(e.nativeEvent.text),
          onCancelButtonPress: () => setSearch(''),
          hideWhenScrolling: false,
          autoCapitalize: 'none',
        }
      }} />

      <FlatList
        data={customers}
        renderItem={renderCustomerItem}
        keyExtractor={item => item.idExterno}
        contentContainerStyle={styles.listContent}
        contentInsetAdjustmentBehavior="automatic"
        ListHeaderComponent={
          <View style={styles.listHeader}>
             <Text style={[styles.statsCounter, { color: THEME.secondary }]}>
               {customers.length} CONTATOS NA CARTEIRA
             </Text>
          </View>
        }
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={THEME.accent} />}
        ItemSeparatorComponent={() => <View style={[styles.fullSeparator, { backgroundColor: THEME.separator }]} />}
      />

      {/* CUSTOMER DETAIL MODAL */}
      <Modal
        visible={detailVisible}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setDetailVisible(false)}
      >
        <View style={[styles.modalBase, { backgroundColor: THEME.bg }]}>
          <View style={styles.modalHeader}>
            <TouchableOpacity onPress={() => setDetailVisible(false)}>
              <Text style={{ color: THEME.accent, fontSize: 17 }}>Cancelar</Text>
            </TouchableOpacity>
            <Text style={[styles.headerTitle, { color: THEME.text }]}>Detalhes</Text>
            <View style={{ width: 60 }} />
          </View>

          <ScrollView showsVerticalScrollIndicator={false}>
            {selectedCustomer && (
              <View style={styles.modalHero}>
                <View style={[styles.heroAvatar, { backgroundColor: getStatusColor(selectedCustomer.statusDescricao) + '15' }]}>
                  <Text style={[styles.heroAvatarText, { color: getStatusColor(selectedCustomer.statusDescricao) }]}>
                    {getInitials(selectedCustomer.fantasia || selectedCustomer.nome)}
                  </Text>
                </View>
                <Text style={[styles.heroName, { color: THEME.text }]}>{selectedCustomer.fantasia || selectedCustomer.nome}</Text>
                <Text style={[styles.heroSub, { color: THEME.secondary }]}>{selectedCustomer.cnpj}</Text>
                
                <View style={styles.actionRow}>
                  <TouchableOpacity 
                    style={styles.actionBtn} 
                    disabled={!selectedCustomer.telefone}
                    onPress={() => Linking.openURL(`tel:${selectedCustomer.telefone}`)}
                    hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                  >
                    <View style={[styles.actionIcon, { backgroundColor: selectedCustomer.telefone ? THEME.accent : THEME.border }]}>
                      <Ionicons name="call" size={18} color="#FFF" />
                    </View>
                    <Text style={[styles.actionLabel, !selectedCustomer.telefone && { color: THEME.border }]}>Ligar</Text>
                  </TouchableOpacity>

                  <TouchableOpacity 
                    style={styles.actionBtn} 
                    disabled={!selectedCustomer.telefone}
                    onPress={() => Linking.openURL(`whatsapp://send?phone=55${selectedCustomer.telefone?.replace(/\D/g,'')}`)}
                    hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                  >
                    <View style={[styles.actionIcon, { backgroundColor: selectedCustomer.telefone ? '#25D366' : THEME.border }]}>
                      <Ionicons name="logo-whatsapp" size={18} color="#FFF" />
                    </View>
                    <Text style={[styles.actionLabel, !selectedCustomer.telefone && { color: THEME.border }]}>Whats</Text>
                  </TouchableOpacity>

                  <TouchableOpacity 
                    style={styles.actionBtn} 
                    disabled={!selectedCustomer.email}
                    onPress={() => Linking.openURL(`mailto:${selectedCustomer.email}`)}
                    hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                  >
                    <View style={[styles.actionIcon, { backgroundColor: selectedCustomer.email ? THEME.orange : THEME.border }]}>
                      <Ionicons name="mail" size={18} color="#FFF" />
                    </View>
                    <Text style={[styles.actionLabel, !selectedCustomer.email && { color: THEME.border }]}>E-mail</Text>
                  </TouchableOpacity>

                  <TouchableOpacity 
                    style={styles.actionBtn}
                    onPress={() => handleMapPress(selectedCustomer)}
                    hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                  >
                    <View style={[styles.actionIcon, { backgroundColor: THEME.accent }]}><Ionicons name="map" size={18} color="#FFF" /></View>
                    <Text style={styles.actionLabel}>Mapa</Text>
                  </TouchableOpacity>
                </View>
              </View>
            )}

            <View style={styles.tabArea}>
              <View style={[styles.segmented, { backgroundColor: isDark ? '#1C1C1E' : 'rgba(118, 118, 128, 0.12)' }]}>
                <TouchableOpacity 
                  onPress={() => setDetailTab('info')} 
                  style={[styles.segBtn, detailTab === 'info' && (isDark ? { backgroundColor: '#636366' } : styles.segBtnActive)]}
                >
                  <Text style={[styles.segText, { color: detailTab === 'info' ? THEME.text : THEME.secondary }]}>Infos</Text>
                </TouchableOpacity>
                <TouchableOpacity 
                  onPress={() => setDetailTab('history')} 
                  style={[styles.segBtn, detailTab === 'history' && (isDark ? { backgroundColor: '#636366' } : styles.segBtnActive)]}
                >
                  <Text style={[styles.segText, { color: detailTab === 'history' ? THEME.text : THEME.secondary }]}>Pedidos</Text>
                </TouchableOpacity>
              </View>
            </View>

            {detailTab === 'info' ? (
              <View style={{ paddingHorizontal: 16 }}>
                <Text style={styles.modalSectionLabel}>ENDEREÇO</Text>
                <View style={[styles.insetGroup, { backgroundColor: THEME.card }]}>
                  <View style={styles.insetRow}>
                    <Text style={[styles.insetLabel, { color: THEME.secondary }]}>Rua</Text>
                    <Text style={[styles.insetVal, { color: THEME.text }]}>{selectedCustomer?.endereco.logradouro}, {selectedCustomer?.endereco.numero}</Text>
                  </View>
                  <View style={[styles.insetRow, { borderTopWidth: 0.5, borderTopColor: THEME.separator }]}>
                    <Text style={[styles.insetLabel, { color: THEME.secondary }]}>Cidade</Text>
                    <Text style={[styles.insetVal, { color: THEME.text }]}>{selectedCustomer?.endereco.cidade} - {selectedCustomer?.endereco.uf}</Text>
                  </View>
                </View>
              </View>
            ) : (
              <View style={{ paddingHorizontal: 16 }}>
                <Text style={styles.modalSectionLabel}>PEDIDOS RECENTES</Text>
                <View style={[styles.historyCard, { backgroundColor: THEME.card }]}>
                   {historyLoading ? (
                     <ActivityIndicator style={{ padding: 20 }} color={THEME.accent} />
                   ) : orderHistory.length > 0 ? (
                      orderHistory.map((order, idx) => (
                        <TouchableOpacity 
                          key={order.idExterno} 
                          style={[styles.historyItem, idx < orderHistory.length - 1 && { borderBottomWidth: 0.5, borderBottomColor: THEME.separator }]}
                          onPress={() => fetchOrderDetail(order.idExterno)}
                          activeOpacity={0.5}
                        >
                           <View>
                             <Text style={[styles.historyId, { color: THEME.text }]}>#{order.idExterno}</Text>
                             <Text style={[styles.historyDate, { color: THEME.secondary }]}>{formatDate(order.cadastradoEm)}</Text>
                           </View>
                           <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                             <View style={{ marginRight: 8, alignItems: 'flex-end' }}>
                               <Text style={[styles.historyValue, { color: THEME.text }]}>{formatCurrency(order.valorTotal)}</Text>
                               <Text style={[styles.historyStatus, { color: THEME.secondary, fontSize: 11 }]}>{order.status}</Text>
                             </View>
                             <Ionicons name="chevron-forward" size={12} color={THEME.secondary} />
                           </View>
                        </TouchableOpacity>
                      ))
                   ) : (
                     <Text style={{ textAlign: 'center', padding: 20, color: THEME.secondary }}>Nenhum pedido</Text>
                   )}
                </View>
              </View>
            )}
            <View style={{ height: 60 }} />
          </ScrollView>

          {/* ORDER DETAIL NESTED MODAL */}
          <Modal
            key="order_detail_nested"
            visible={orderModalVisible}
            animationType="slide"
            presentationStyle="pageSheet"
            onRequestClose={() => setOrderModalVisible(false)}
          >
            <View style={[styles.modalBase, { backgroundColor: THEME.bg }]}>
              <View style={styles.modalHeader}>
                <TouchableOpacity 
                  onPress={() => setOrderModalVisible(false)} 
                  style={{ flexDirection: 'row', alignItems: 'center' }}
                  hitSlop={{ top: 15, bottom: 15, left: 15, right: 15 }}
                >
                  <Ionicons name="chevron-back" size={24} color={THEME.accent} />
                  <Text style={{ color: THEME.accent, fontSize: 17, marginLeft: 5 }}>Voltar</Text>
                </TouchableOpacity>
                <View style={{ alignItems: 'center' }}>
                   <Text style={[styles.headerTitle, { color: THEME.text }]}>Pedido #{selectedOrderDetail?.idExterno}</Text>
                </View>
                <View style={{ width: 60 }} />
              </View>
              
              {orderDetailLoading ? (
                <View style={styles.centered}><ActivityIndicator color={THEME.accent} size="large" /></View>
              ) : selectedOrderDetail && (
                <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 60 }}>
                   <View style={styles.orderHero}>
                      <Text style={[styles.orderHeroStatus, { color: getStatusColor(selectedOrderDetail.status) }]}>
                        {(selectedOrderDetail.status || 'STATUS').toUpperCase()}
                      </Text>
                      <Text style={[styles.orderHeroValue, { color: THEME.text }]}>
                        {formatCurrency(selectedOrderDetail.valorTotal)}
                      </Text>
                      <Text style={[styles.orderHeroDate, { color: THEME.secondary }]}>
                        Emissão: {formatDate(selectedOrderDetail.cadastradoEm)}
                      </Text>
                   </View>

                   <Text style={styles.modalSectionLabel}>ITENS DO PEDIDO</Text>
                   
                   {(selectedOrderDetail.itens || []).length > 0 ? (
                     (selectedOrderDetail.itens || []).map((item: any, idx: number) => (
                       <View key={item.produtoId + idx} style={[styles.orderItemCard, { backgroundColor: THEME.card }]}>
                          <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 }}>
                             <View style={{ flex: 1, marginRight: 12 }}>
                               <Text style={[styles.orderItemName, { color: THEME.text }]} numberOfLines={2}>{item.nome}</Text>
                               <Text style={[styles.orderItemRef, { color: THEME.secondary }]}>Ref: {item.referencia}</Text>
                             </View>
                             <View style={{ alignItems: 'flex-end', minWidth: 80 }}>
                               <Text style={[styles.orderItemPrice, { color: THEME.accent }]}>{formatCurrency(item.valorUnitario || 0)}</Text>
                               <Text style={[styles.orderItemQtyTotal, { color: THEME.text }]}>{item.quantidadeItem} un.</Text>
                             </View>
                          </View>
                          
                          {(item.cores || []).map((cor: any, cIdx: number) => (
                            <View key={cor.corNome + cIdx} style={{ marginTop: 12, borderTopWidth: 0.5, borderTopColor: THEME.separator, paddingTop: 12 }}>
                               <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 10 }}>
                                  <View style={[styles.colorDot, { backgroundColor: THEME.accent }]} />
                                  <Text style={{ fontSize: 13, fontWeight: '700', color: THEME.text }}>{cor.corNome}</Text>
                               </View>
                               <View style={styles.sizeMatrix}>
                                 {(cor.tamanhos || []).map((tam: any, tIdx: number) => (
                                   <View key={tam.tamanho + tIdx} style={[styles.sizeBox, { borderColor: THEME.separator }]}>
                                      <Text style={[styles.sizeLabel, { color: THEME.secondary }]}>{tam.tamanho}</Text>
                                      <Text style={[styles.sizeQty, { color: THEME.text }]}>{tam.quantidade}</Text>
                                   </View>
                                 ))}
                               </View>
                            </View>
                          ))}
                       </View>
                     ))
                   ) : (
                     <View style={styles.emptyHistory}>
                        <Text style={{ color: THEME.secondary }}>Nenhum item encontrado no pedido.</Text>
                     </View>
                   )}
                </ScrollView>
              )}
            </View>
          </Modal>
        </View>
      </Modal>

      {loading && !refreshing && (
        <View style={[styles.centered, StyleSheet.absoluteFill, { backgroundColor: THEME.bg }]}>
          <ActivityIndicator size="large" color={THEME.accent} />
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  listContent: { 
    paddingHorizontal: 16, 
    paddingTop: 20,
    paddingBottom: 100 
  },
  listHeader: { paddingHorizontal: 16, marginTop: 8, marginBottom: 8 },
  statsCounter: { fontSize: 12, fontWeight: '600', letterSpacing: 0.5 },
  itemContainer: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    paddingHorizontal: 16, 
    paddingVertical: 12,
    borderRadius: 12,
    marginBottom: 10,
  },
  avatar: { width: 50, height: 50, borderRadius: 25, justifyContent: 'center', alignItems: 'center', marginRight: 15 },
  avatarText: { fontSize: 18, fontWeight: '700' },
  itemContent: { flex: 1 },
  itemName: { fontSize: 17, fontWeight: '700', marginBottom: 2 },
  itemSub: { fontSize: 13, marginBottom: 1 },
  itemLoc: { fontSize: 12 },
  fullSeparator: { height: 0, opacity: 0 },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  
  modalBase: { flex: 1 },
  modalHeader: { height: 56, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, borderBottomWidth: 0.5, borderBottomColor: 'rgba(0,0,0,0.1)' },
  headerTitle: { fontSize: 17, fontWeight: '600' },
  modalHero: { alignItems: 'center', paddingVertical: 24, paddingHorizontal: 20 },
  heroAvatar: { width: 90, height: 90, borderRadius: 45, justifyContent: 'center', alignItems: 'center', marginBottom: 20 },
  heroAvatarText: { fontSize: 36, fontWeight: '700' },
  heroName: { fontSize: 24, fontWeight: '800', textAlign: 'center', marginBottom: 4 },
  heroSub: { fontSize: 15, marginBottom: 8 },
  actionRow: { flexDirection: 'row', justifyContent: 'center', width: '100%', marginTop: 24, gap: 12 },
  actionBtn: { alignItems: 'center', width: 75 },
  actionIcon: { width: 40, height: 40, borderRadius: 20, justifyContent: 'center', alignItems: 'center', marginBottom: 6 },
  actionLabel: { fontSize: 11, fontWeight: '500', color: '#0A84FF' },
  
  tabArea: { paddingHorizontal: 16, marginTop: 24, marginBottom: 16 },
  segmented: { flexDirection: 'row', padding: 2, borderRadius: 10 },
  segBtn: { flex: 1, paddingVertical: 8, alignItems: 'center', borderRadius: 8 },
  segBtnActive: { backgroundColor: '#FFF', shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 4, elevation: 3 },
  segText: { fontSize: 13, fontWeight: '600' },
  
  modalSectionLabel: { fontSize: 13, fontWeight: '600', color: '#8E8E93', marginLeft: 16, marginBottom: 8, marginTop: 16 },
  insetGroup: { borderRadius: 12, overflow: 'hidden' },
  insetRow: { flexDirection: 'row', justifyContent: 'space-between', padding: 14, alignItems: 'center' },
  insetLabel: { fontSize: 15, fontWeight: '400' },
  insetVal: { fontSize: 15, fontWeight: '500', textAlign: 'right' },
  
  historyCard: { borderRadius: 12, overflow: 'hidden' },
  historyItem: { flexDirection: 'row', justifyContent: 'space-between', padding: 16, alignItems: 'center' },
  historyId: { fontSize: 15, fontWeight: '700' },
  historyDate: { fontSize: 13, marginTop: 1 },
  historyValue: { fontSize: 15, fontWeight: '700' },
  historyStatus: { fontSize: 12, marginTop: 1 },
  
  orderHero: { alignItems: 'center', paddingVertical: 20, borderBottomWidth: 0.5, borderBottomColor: 'rgba(0,0,0,0.05)' },
  orderHeroStatus: { fontSize: 13, fontWeight: '700', letterSpacing: 1 },
  orderHeroValue: { fontSize: 32, fontWeight: '800', marginVertical: 4 },
  orderHeroDate: { fontSize: 13 },
  orderItemCard: { marginHorizontal: 16, borderRadius: 12, padding: 16, marginBottom: 16 },
  orderItemName: { fontSize: 16, fontWeight: '700' },
  orderItemRef: { fontSize: 13, marginTop: 2 },
  orderItemPrice: { fontSize: 16, fontWeight: '700' },
  orderItemQtyTotal: { fontSize: 13, fontWeight: '600', marginTop: 2 },
  colorDot: { width: 8, height: 8, borderRadius: 4, marginRight: 8 },
  sizeMatrix: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  sizeBox: { width: 44, height: 44, borderRadius: 8, borderWidth: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: 'rgba(0,0,0,0.02)' },
  sizeLabel: { fontSize: 9, fontWeight: '600' },
  sizeQty: { fontSize: 14, fontWeight: '800' },
  emptyHistory: { alignItems: 'center', padding: 40, opacity: 0.5 }
});
