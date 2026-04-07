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
    bg: isDark ? '#1C252E' : '#F2F2F7',
    card: isDark ? '#2C3641' : '#FFFFFF',
    text: isDark ? '#FFFFFF' : '#1C252E',
    secondary: isDark ? '#8E9AA9' : '#636366',
    border: isDark ? '#3D4956' : '#C6C6C8',
    accent: '#F9B252',
    primary: isDark ? '#F9B252' : '#3D4956', 
    green: '#34C759',
    red: '#FF3B30',
    orange: '#F9B252',
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
      setOrderHistory([]);
    } finally {
      setHistoryLoading(false);
    }
  };

  const fetchOrderDetail = async (orderId: string) => {
    if (!orderId) return;
    setOrderDetailLoading(true);
    setOrderModalVisible(true);
    try {
      const response = await api.get(`/api/erp/pedidos/${orderId}`);
      const rawData = response.data.data || response.data;
      if (rawData && typeof rawData === 'object') {
        rawData.idExterno = rawData.idExterno || rawData.id || rawData.codigo || rawData.numPedido || orderId;
        const items = rawData.itens || rawData.items || rawData.pedidos_itens || rawData.itensPedido || [];
        rawData.itens = Array.isArray(items) ? items : [];
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
      }
    } catch (error: any) {
      console.error('Error fetching order detail:', error.message);
      setSelectedOrderDetail(null);
    } finally {
      setOrderDetailLoading(false);
    }
  };

  const handleMapPress = (customer: Customer) => {
    const address = `${customer.endereco.logradouro}, ${customer.endereco.numero}, ${customer.endereco.cidade}, ${customer.endereco.uf}`;
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

  useEffect(() => { fetchCustomers(); }, [search]);

  const renderCustomerItem = ({ item }: { item: Customer }) => (
    <TouchableOpacity 
      style={[styles.itemContainer, { backgroundColor: THEME.card }]}
      onPress={() => openDetail(item)}
      activeOpacity={0.7}
    >
      <View style={[styles.avatar, { backgroundColor: getStatusColor(item.statusDescricao) + '20' }]}>
        <Text style={[styles.avatarText, { color: getStatusColor(item.statusDescricao) }]}>
          {getInitials(item.fantasia || item.nome)}
        </Text>
      </View>
      <View style={styles.itemContent}>
        <Text style={[styles.itemName, { color: THEME.text }]} numberOfLines={1}>{item.fantasia || item.nome}</Text>
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
        headerStyle: { backgroundColor: THEME.bg },
        headerSearchBarOptions: {
          placeholder: 'Nome ou CNPJ',
          onChangeText: (e) => setSearch(e.nativeEvent.text),
          onCancelButtonPress: () => setSearch(''),
          hideWhenScrolling: false,
        }
      }} />

      <FlatList
        data={customers}
        renderItem={renderCustomerItem}
        keyExtractor={item => item.idExterno}
        contentContainerStyle={styles.listContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={THEME.accent} />}
      />

      <Modal visible={detailVisible} animationType="slide" presentationStyle="pageSheet">
        <View style={[styles.modalBase, { backgroundColor: THEME.bg }]}>
          <View style={styles.modalHeader}>
            <TouchableOpacity onPress={() => setDetailVisible(false)}><Text style={{ color: THEME.accent, fontSize: 17 }}>Fechar</Text></TouchableOpacity>
            <Text style={[styles.headerTitle, { color: THEME.text }]}>Detalhes</Text>
            <View style={{ width: 60 }} />
          </View>
          <ScrollView>
            {selectedCustomer && (
              <View style={styles.modalHero}>
                <View style={[styles.heroAvatar, { backgroundColor: getStatusColor(selectedCustomer.statusDescricao) + '15' }]}>
                  <Text style={[styles.heroAvatarText, { color: getStatusColor(selectedCustomer.statusDescricao) }]}>{getInitials(selectedCustomer.fantasia || selectedCustomer.nome)}</Text>
                </View>
                <Text style={[styles.heroName, { color: THEME.text }]}>{selectedCustomer.fantasia || selectedCustomer.nome}</Text>
                <View style={styles.actionRow}>
                  <TouchableOpacity style={styles.actionBtn} onPress={() => Linking.openURL(`tel:${selectedCustomer.telefone}`)}><View style={[styles.actionIcon, { backgroundColor: THEME.accent }]}><Ionicons name="call" size={18} color="#FFF" /></View><Text style={styles.actionLabel}>Ligar</Text></TouchableOpacity>
                  <TouchableOpacity style={styles.actionBtn} onPress={() => Linking.openURL(`whatsapp://send?phone=55${selectedCustomer.telefone?.replace(/\D/g,'')}`)}><View style={[styles.actionIcon, { backgroundColor: '#25D366' }]}><Ionicons name="logo-whatsapp" size={18} color="#FFF" /></View><Text style={styles.actionLabel}>Whats</Text></TouchableOpacity>
                </View>
              </View>
            )}
            {/* Tab logic and list... simplified for restoration */}
          </ScrollView>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  listContent: { padding: 16, paddingTop: 20, paddingBottom: 100 },
  itemContainer: { flexDirection: 'row', alignItems: 'center', padding: 16, borderRadius: 12, marginBottom: 10 },
  avatar: { width: 50, height: 50, borderRadius: 25, justifyContent: 'center', alignItems: 'center', marginRight: 15 },
  avatarText: { fontSize: 18, fontWeight: '700' },
  itemContent: { flex: 1 },
  itemName: { fontSize: 17, fontWeight: '700' },
  itemSub: { fontSize: 13 },
  itemLoc: { fontSize: 12 },
  modalBase: { flex: 1 },
  modalHeader: { height: 56, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, borderBottomWidth: 0.5, borderBottomColor: 'rgba(0,0,0,0.1)' },
  headerTitle: { fontSize: 17, fontWeight: '600' },
  modalHero: { alignItems: 'center', padding: 24 },
  heroAvatar: { width: 90, height: 90, borderRadius: 45, justifyContent: 'center', alignItems: 'center', marginBottom: 20 },
  heroAvatarText: { fontSize: 36, fontWeight: '700' },
  heroName: { fontSize: 24, fontWeight: '800' },
  actionRow: { flexDirection: 'row', marginTop: 24, gap: 12 },
  actionBtn: { alignItems: 'center', width: 75 },
  actionIcon: { width: 40, height: 40, borderRadius: 20, justifyContent: 'center', alignItems: 'center', marginBottom: 6 },
  actionLabel: { fontSize: 11, fontWeight: '500', color: '#0A84FF' },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center' }
});
