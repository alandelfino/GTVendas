import React, { useState, useEffect, useCallback } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  FlatList, 
  TouchableOpacity, 
  useColorScheme, 
  ActivityIndicator,
  Dimensions,
  RefreshControl,
  Platform,
  Modal,
  ScrollView,
  Linking,
  ActionSheetIOS,
} from 'react-native';
import { Stack } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
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
    statusDescricao?: string;
    localidade?: string;
    telefone?: string;
    email?: string;
    endereco: {
      cidade: string;
      uf: string;
      logradouro: string;
      numero: string | number | null;
    };
  };
}

interface OrderItem {
  produtoId: string;
  nome: string;
  referencia: string;
  valorUnitario: number;
  quantidadeItem: number;
  grade?: any;
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
    bg: isDark ? '#000000' : '#F2F2F7',
    card: isDark ? '#1C1C1E' : '#FFFFFF',
    text: isDark ? '#FFFFFF' : '#000000',
    secondary: isDark ? '#8E8E93' : '#636366',
    border: isDark ? '#2C2C2E' : '#E5E5EA',
    accent: '#0A84FF',
    green: '#34C759',
    red: '#FF3B30',
    orange: '#FF9500',
    separator: isDark ? '#38383A' : '#C6C6C8',
    itemBg: isDark ? '#1C1C1E' : '#FFFFFF',
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
          cliente: {
             ...c,
             fantasia: c.fantasia || c.nome || 'Cliente não Identificado',
             localidade: c.cidade ? `${c.cidade} - ${c.uf}` : ''
          }
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
      
      if (rawData && typeof rawData === 'object') {
        rawData.idExterno = rawData.idExterno || rawData.id || rawData.codigo || rawData.numPedido || orderId;
        
        const c = rawData.cliente || rawData.customer || {};
        const nomeFantasia = c.fantasia || c.nome || rawData.clienteNome || rawData.cliente_nome || 'Cliente não Identificado';
        
        rawData.cliente = {
           ...c,
           idExterno: c.idExterno || c.id || rawData.clienteId || 'S/ ID',
           fantasia: nomeFantasia,
           nome: c.nome || c.razaoSocial || nomeFantasia,
           cnpj: c.cnpj || rawData.clienteCnpj || '',
           telefone: c.telefone || rawData.telefone || '',
           email: c.email || rawData.email || '',
           endereco: c.endereco || rawData.endereco || { cidade: rawData.cidade || '', uf: rawData.uf || '', logradouro: '', numero: '' }
        };

        const itemsRaw = rawData.produtos || rawData.itens || rawData.items || [];
        
        rawData.itens = (Array.isArray(itemsRaw) ? itemsRaw : []).map((it: any) => {
          const variacoesRaw = it.variacoes || it.grade || it.grade_itens || [];
          
          return {
            ...it,
            nome: it.descricao || it.nome || it.nomeProduto || 'Produto s/ Nome',
            referencia: it.produtoId || it.id || it.idExterno || 'S/ Ref',
            valorUnitario: it.valorUnitario || it.precoVendido || it.preco || 0,
            quantidadeItem: it.quantidade || it.quantidadeTotal || (Array.isArray(variacoesRaw) ? variacoesRaw.reduce((acc: number, v: any) => acc + (v.amount || v.quantidade || 0), 0) : 0),
            cores: [{
              corNome: it.grade || 'Grade Vendida',
              tamanhos: (Array.isArray(variacoesRaw) ? variacoesRaw : []).map((v: any) => ({
                tamanho: v.value || v.nome || v.tamanho || '?',
                quantidade: v.amount || v.quantidade || 0
              }))
            }]
          };
        });

        setSelectedOrderDetail(rawData);
      }
    } catch (error) {
      console.error('Error fetching order detail:', error);
    } finally {
      setDetailLoading(false);
    }
  };

  const handleMapPress = (customer: any) => {
    if (!customer?.endereco) return;
    const addr = customer.endereco;
    const address = `${addr.logradouro}, ${addr.numero}, ${addr.cidade}, ${addr.uf}`;
    const encodedAddress = encodeURIComponent(address);
    ActionSheetIOS.showActionSheetWithOptions(
      { options: ['Cancelar', 'Apple Maps', 'Google Maps'], cancelButtonIndex: 0, title: 'Abrir Mapa' },
      (buttonIndex) => {
        if (buttonIndex === 1) Linking.openURL(`maps://?q=${encodedAddress}`);
        else if (buttonIndex === 2) Linking.openURL(`https://www.google.com/maps/search/?api=1&query=${encodedAddress}`);
      }
    );
  };

  const getStatusColor = (status: string | null | undefined) => {
    const s = (status || '').toLowerCase();
    if (s.includes('faturado') || s.includes('pago') || s.includes('finalizado')) return THEME.green;
    if (s.includes('cancelado') || s.includes('erro')) return THEME.red;
    if (s.includes('pendente') || s.includes('aberto') || s.includes('digit')) return THEME.orange;
    return THEME.secondary;
  };

  const formatCurrency = (cents: number | undefined) => {
    if (cents === undefined || cents === null) return 'R$ 0,00';
    return (cents / 100).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  };

  const formatDate = (ts: number | undefined) => {
    if (!ts) return '--/--/----';
    return new Date(ts).toLocaleDateString('pt-BR');
  };

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchOrders(true);
  }, []);

  useEffect(() => { fetchOrders(); }, [search]);

  const renderOrderItem = ({ item }: { item: Order }) => (
    <TouchableOpacity 
      style={[styles.itemRow, { backgroundColor: THEME.card }]}
      onPress={() => fetchOrderDetail(item.idExterno)}
      activeOpacity={0.6}
      hitSlop={{ top: 5, bottom: 5, left: 0, right: 0 }}
    >
      <View style={{ flexDirection: 'row', alignItems: 'center' }}>
        <View style={[styles.statusIconCircle, { backgroundColor: getStatusColor(item.status) + '15' }]}>
          <Ionicons 
            name={item.status.toLowerCase().includes('cancel') ? 'close' : 'cart'} 
            size={22} 
            color={getStatusColor(item.status)} 
          />
        </View>
        
        <View style={{ flex: 1 }}>
          <View style={{ marginBottom: 2 }}>
            <Text style={[styles.itemCustomerName, { color: THEME.text }]} numberOfLines={1}>
              {item.cliente?.fantasia}
            </Text>
          </View>
          
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
            <Text style={[styles.itemPriceID, { color: THEME.secondary, flex: 1, marginRight: 8 }]} numberOfLines={1}>
              {formatDate(item.cadastradoEm)} • Pedido {item.idExterno} • {formatCurrency(item.valorTotal)}
            </Text>
            <Ionicons name="chevron-forward" size={14} color={THEME.border} />
          </View>
          
          <View style={styles.itemMetaRow}>
            <View style={[styles.statusTagMini, { backgroundColor: getStatusColor(item.status) + '15' }]}>
               <View style={[styles.statusDot, { backgroundColor: getStatusColor(item.status) }]} />
               <Text style={[styles.statusTagTextMini, { color: getStatusColor(item.status) }]}>
                 {item.status.toUpperCase()}
               </Text>
            </View>
            <View style={{ flexDirection: 'row', alignItems: 'center', marginLeft: 12 }}>
              <Ionicons name="location-outline" size={12} color={THEME.secondary} style={{ marginRight: 4 }} />
              <Text style={[styles.itemMetaText, { color: THEME.secondary }]}>{item.cliente.localidade || 'Local'}</Text>
            </View>
          </View>
        </View>
      </View>
    </TouchableOpacity>
  );

  return (
    <View style={[styles.container, { backgroundColor: THEME.bg }]}>
      <Stack.Screen options={{ 
        title: 'Pedidos',
        headerLargeTitle: true,
        headerBlurEffect: isDark ? 'dark' : 'light',
        headerStyle: { backgroundColor: THEME.bg },
        headerSearchBarOptions: {
          placeholder: 'Buscar Pedido',
          onChangeText: (e) => setSearch(e.nativeEvent.text),
          onCancelButtonPress: () => setSearch(''),
        }
      }} />

      <FlatList
        data={orders}
        renderItem={renderOrderItem}
        keyExtractor={item => item.idExterno}
        contentContainerStyle={styles.listContent}
        contentInsetAdjustmentBehavior="automatic"
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={THEME.accent} />}
        ItemSeparatorComponent={() => <View style={[styles.itemSeparator, { backgroundColor: THEME.border }]} />}
      />

      <Modal visible={detailVisible} animationType="slide" presentationStyle="pageSheet" onRequestClose={() => setDetailVisible(false)}>
        <View style={[styles.modalBase, { backgroundColor: THEME.bg }]}>
          <View style={[styles.modalHeader, { borderBottomColor: THEME.border }]}>
            <TouchableOpacity 
              onPress={() => setDetailVisible(false)}
              style={{ flexDirection: 'row', alignItems: 'center' }}
              hitSlop={{ top: 15, bottom: 15, left: 15, right: 15 }}
            >
              <Ionicons name="chevron-back" size={24} color={THEME.accent} />
              <Text style={{ color: THEME.accent, fontSize: 17, marginLeft: 5 }}>Voltar</Text>
            </TouchableOpacity>
            <Text style={[styles.headerTitle, { color: THEME.text }]}>Detalhes</Text>
            <View style={{ width: 60 }} />
          </View>

          {detailLoading ? (
            <View style={styles.centered}><ActivityIndicator color={THEME.accent} size="large" /></View>
          ) : selectedOrderDetail && (
            <ScrollView showsVerticalScrollIndicator={false}>
               <View style={styles.modalHero}>
                  <View style={[styles.statusHeroBadge, { backgroundColor: getStatusColor(selectedOrderDetail.status) + '15' }]}>
                    <Text style={[styles.statusHeroText, { color: getStatusColor(selectedOrderDetail.status) }]}>
                      {selectedOrderDetail.status.toUpperCase()}
                    </Text>
                  </View>
                  <Text style={[styles.heroValue, { color: THEME.text }]}>{formatCurrency(selectedOrderDetail.valorTotal)}</Text>
                  <Text style={[styles.heroDate, { color: THEME.secondary }]}>Pedido #{selectedOrderDetail.idExterno} • {formatDate(selectedOrderDetail.cadastradoEm)}</Text>
                  
                  <View style={styles.actionRow}>
                    <TouchableOpacity 
                      style={styles.actionBtn} 
                      disabled={!selectedOrderDetail.cliente?.telefone}
                      onPress={() => Linking.openURL(`tel:${selectedOrderDetail.cliente?.telefone}`)}
                      hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                    >
                      <View style={[styles.actionIcon, { backgroundColor: selectedOrderDetail.cliente?.telefone ? THEME.accent : THEME.border }]}>
                        <Ionicons name="call" size={20} color="#FFF" />
                      </View>
                      <Text style={[styles.actionLabel, !selectedOrderDetail.cliente?.telefone && { color: THEME.border }]}>Ligar</Text>
                    </TouchableOpacity>

                    <TouchableOpacity 
                      style={styles.actionBtn} 
                      disabled={!selectedOrderDetail.cliente?.telefone}
                      onPress={() => Linking.openURL(`whatsapp://send?phone=55${selectedOrderDetail.cliente?.telefone?.replace(/\D/g,'')}`)}
                      hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                    >
                      <View style={[styles.actionIcon, { backgroundColor: selectedOrderDetail.cliente?.telefone ? '#25D366' : THEME.border }]}>
                        <Ionicons name="logo-whatsapp" size={20} color="#FFF" />
                      </View>
                      <Text style={[styles.actionLabel, !selectedOrderDetail.cliente?.telefone && { color: THEME.border }]}>WhatsApp</Text>
                    </TouchableOpacity>

                    <TouchableOpacity 
                      style={styles.actionBtn} 
                      onPress={() => handleMapPress(selectedOrderDetail.cliente)}
                      hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                    >
                      <View style={[styles.actionIcon, { backgroundColor: THEME.accent }]}><Ionicons name="map" size={18} color="#FFF" /></View>
                      <Text style={styles.actionLabel}>Mapa</Text>
                    </TouchableOpacity>
                  </View>
               </View>

               <View style={styles.insetSection}>
                  <Text style={styles.sectionTitle}>CLIENTE</Text>
                  <View style={[styles.insetGroup, { backgroundColor: THEME.card }]}>
                     <DetailRow label="Empresa" value={selectedOrderDetail.cliente?.nome} theme={THEME} />
                     <DetailRow label="Fantasia" value={selectedOrderDetail.cliente?.fantasia} theme={THEME} last />
                     <DetailRow label="CNPJ" value={selectedOrderDetail.cliente?.cnpj || selectedOrderDetail.cliente?.idExterno} theme={THEME} last />
                  </View>

                  <Text style={styles.sectionTitle}>PRODUTOS</Text>
                  {selectedOrderDetail.itens.map((item, idx) => (
                    <View key={item.produtoId + idx} style={[styles.productCard, { backgroundColor: THEME.card }]}>
                       <View style={styles.productMainRow}>
                          <View style={{ flex: 1 }}>
                             <Text style={[styles.productName, { color: THEME.text }]} numberOfLines={2}>{item.nome}</Text>
                             <Text style={[styles.productRef, { color: THEME.secondary }]}>Ref: {item.referencia}</Text>
                          </View>
                          <View style={{ alignItems: 'flex-end', marginLeft: 12 }}>
                             <Text style={[styles.productPrice, { color: THEME.text }]}>{formatCurrency(item.valorUnitario)}</Text>
                             <Text style={[styles.productQty, { color: THEME.secondary }]}>{item.quantidadeItem} un.</Text>
                             <Text style={[styles.productTotal, { color: THEME.accent }]}>{formatCurrency(item.valorUnitario * item.quantidadeItem)}</Text>
                          </View>
                       </View>

                       {item.cores.map((cor, cIdx) => (
                         <View key={cor.corNome + cIdx} style={styles.gradeSection}>
                            <View style={styles.gradeHeader}>
                             <Ionicons name="bookmark-outline" size={10} color={THEME.secondary} style={{ marginRight: 6 }} />
                             <Text style={[styles.gradeHeaderText, { color: THEME.secondary }]}>{cor.corNome}</Text>
                            </View>
                            <View style={styles.sizeMatrix}>
                              {cor.tamanhos.map((tam, tIdx) => (
                                <View key={tam.tamanho + tIdx} style={[styles.sizePill, { backgroundColor: isDark ? '#2C2C2E' : '#F2F2F7' }]}>
                                   <Text style={[styles.sizePillLabel, { color: THEME.secondary }]}>{tam.tamanho}</Text>
                                   <Text style={[styles.sizePillValue, { color: THEME.text }]}>{tam.quantidade}</Text>
                                </View>
                              ))}
                            </View>
                         </View>
                       ))}
                    </View>
                  ))}
               </View>
               <View style={{ height: 100 }} />
            </ScrollView>
          )}
        </View>
      </Modal>
    </View>
  );
}

const DetailRow = ({ label, value, theme, last }: any) => (
  <View style={[styles.detailRow, !last && { borderBottomWidth: 0.5, borderBottomColor: theme.border }]}>
    <Text style={[styles.detailLabel, { color: theme.text }]}>{label}</Text>
    <Text style={[styles.detailValue, { color: theme.secondary }]} numberOfLines={1}>{value || '--'}</Text>
  </View>
);

const styles = StyleSheet.create({
  container: { flex: 1 },
  listContent: { 
    paddingHorizontal: 16, 
    paddingTop: 20,
    paddingBottom: 100 
  },
  itemRow: { 
    padding: 16,
    paddingTop: 12,
    paddingBottom: 12,
    borderRadius: 12,
    marginBottom: 10,
  },
  itemSeparator: { height: 0, opacity: 0 },
  itemMainRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  itemOrderLabel: { fontSize: 11, fontWeight: '800', textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 4, opacity: 0.6 },
  itemCustomerName: { fontSize: 16, fontWeight: '700', letterSpacing: -0.3 },
  itemPriceID: { fontSize: 13, fontWeight: '400' },
  itemMetaRow: { flexDirection: 'row', alignItems: 'center', marginTop: 8 },
  itemMetaText: { fontSize: 12, fontWeight: '400' },
  statusIconCircle: { width: 44, height: 44, borderRadius: 22, justifyContent: 'center', alignItems: 'center', marginRight: 15 },
  statusTagMini: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 7, paddingVertical: 3, borderRadius: 10 },
  statusDot: { width: 6, height: 6, borderRadius: 3, marginRight: 5 },
  statusTagTextMini: { fontSize: 10, fontWeight: '800' },
  dateText: { fontSize: 12, fontWeight: '400' },

  modalBase: { flex: 1 },
  modalHeader: { height: 56, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, borderBottomWidth: 0.5 },
  headerTitle: { fontSize: 17, fontWeight: '700' },
  modalHero: { alignItems: 'center', paddingVertical: 40, paddingHorizontal: 20 },
  statusHeroBadge: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8, marginBottom: 12 },
  statusHeroText: { fontSize: 12, fontWeight: '800', letterSpacing: 1 },
  heroValue: { fontSize: 40, fontWeight: '800', marginBottom: 4, letterSpacing: -1 },
  heroDate: { fontSize: 14, fontWeight: '500' },
  
  actionRow: { flexDirection: 'row', justifyContent: 'center', width: '100%', gap: 24, marginTop: 32 },
  actionBtn: { alignItems: 'center', width: 70 },
  actionIcon: { width: 48, height: 48, borderRadius: 24, justifyContent: 'center', alignItems: 'center', marginBottom: 8 },
  actionLabel: { fontSize: 12, fontWeight: '600', color: '#0A84FF' },
  
  insetSection: { paddingHorizontal: 16 },
  sectionTitle: { fontSize: 13, fontWeight: '600', color: '#8E8E93', marginLeft: 8, marginBottom: 8, marginTop: 24, textTransform: 'uppercase' },
  insetGroup: { borderRadius: 10, overflow: 'hidden' },
  detailRow: { flexDirection: 'row', justifyContent: 'space-between', padding: 14, alignItems: 'center' },
  detailLabel: { fontSize: 16, fontWeight: '400' },
  detailValue: { fontSize: 16, fontWeight: '400', textAlign: 'right', flex: 1, marginLeft: 20 },
  
  productCard: { borderRadius: 10, padding: 16, marginBottom: 12 },
  productMainRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 16 },
  productName: { fontSize: 16, fontWeight: '700', lineHeight: 22 },
  productRef: { fontSize: 13, marginTop: 4 },
  productPrice: { fontSize: 15, fontWeight: '500' },
  productQty: { fontSize: 13, marginTop: 2 },
  productTotal: { fontSize: 16, fontWeight: '700', marginTop: 4 },
  
  gradeSection: { marginTop: 12, paddingTop: 12, borderTopWidth: 0.5, borderTopColor: 'rgba(0,0,0,0.05)' },
  gradeHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
  gradeHeaderText: { fontSize: 11, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.5 },
  sizeMatrix: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  sizePill: { minWidth: 50, paddingHorizontal: 10, paddingVertical: 8, borderRadius: 8, alignItems: 'center' },
  sizePillLabel: { fontSize: 10, fontWeight: '700', marginBottom: 2, opacity: 0.6 },
  sizePillValue: { fontSize: 15, fontWeight: '800' },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center' }
});
