import { FontAwesome, Ionicons } from '@expo/vector-icons';
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
    TextInput,
    TouchableOpacity,
    useColorScheme,
    View
} from 'react-native';
import { LineChart } from 'react-native-chart-kit';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import api from '../../api/api';

const { width } = Dimensions.get('window');

interface AnalyticsData {
  clientesAtivos: number;
  clientesAtendidos: number;
  summary: {
    totalValor: number;
    totalPedidos: number;
    totalQuantidade: number;
    ticketMedio: number;
  };
  chart: { periodo: string; valor: number; quantidade: number }[];
  topProdutos: { produtoId: string; nome: string; quantidade: number; valor: number }[];
  topCategorias: { categoriaId: string; nome: string; quantidade: number; valor: number }[];
  topClientes: { clienteId: string; nome: string; quantidade: number; valor: number }[];
  topCidades: { cidade: string; uf: string; quantidade: number; valor: number }[];
}

interface Colecao {
  idExterno: string;
  nome: string;
}

export default function AnalyticsScreen() {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';
  const insets = useSafeAreaInsets();
  
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [colecoes, setColecoes] = useState<Colecao[]>([]);
  const [selectedColecao, setSelectedColecao] = useState<string | null>(null);
  const [colModalVisible, setColModalVisible] = useState(false);
  const [colSearch, setColSearch] = useState('');
  const [groupBy, setGroupBy] = useState<'day' | 'week' | 'month'>('month');
  
  const [prodSort, setProdSort] = useState<'valor' | 'quantidade'>('valor');
  const [catSort, setCatSort] = useState<'valor' | 'quantidade'>('valor');
  const [cliSort, setCliSort] = useState<'valor' | 'quantidade'>('valor');
  const [citySort, setCitySort] = useState<'valor' | 'quantidade'>('valor');

  const THEME = {
    bg: isDark ? '#1C252E' : '#F2F2F7',
    card: isDark ? '#2C3641' : '#FFFFFF',
    text: isDark ? '#FFFFFF' : '#1C252E',
    secondary: isDark ? '#8E9AA9' : '#636366',
    border: isDark ? '#3D4956' : '#C6C6C8',
    primary: isDark ? '#F9B252' : '#3D4956',
    accent: '#F9B252',
    green: '#32D74B',
    orange: '#F9B252',
    purple: '#F9B252',
    separator: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)',
  };

  const fetchData = async (isRefresh = false) => {
    if (!isRefresh) setLoading(true);
    try {
      const params: any = { groupBy };
      if (selectedColecao) params.colecaoId = selectedColecao;
      
      const response = await api.get('/api/rep/analytics', { params });
      if (response.data) setData(response.data);
    } catch (error: any) {
      console.error('Analytics Fetch Error:', error?.response?.data || error.message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    const loadColecoes = async () => {
      try {
        const colResponse = await api.get('/api/erp/colecoes');
        const collections = colResponse.data.data || colResponse.data;
        if (Array.isArray(collections) && collections.length > 0) {
          setColecoes(collections);
        }
      } catch (error) {
        console.error('Erro ao carregar coleções:', error);
      }
    };
    loadColecoes();
  }, []);

  useEffect(() => { 
    if (selectedColecao !== null || (loading && colecoes.length === 0)) {
      fetchData(); 
    }
  }, [selectedColecao, groupBy]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchData(true);
  }, [selectedColecao, groupBy]);

  const formatCurrency = (cents: number) => {
    return (cents / 100).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  };

  const SectionHeader = ({ title }: { title: string }) => (
    <Text style={[styles.sectionHeader, { color: THEME.secondary }]}>{title.toUpperCase()}</Text>
  );

  const KpiCard = ({ label, value, icon, color }: { label: string, value: string, icon: string, color: string }) => (
    <View style={[styles.kpiCard, { backgroundColor: THEME.card }]}>
      <View style={[styles.kpiIcon, { backgroundColor: color }]}>
        <FontAwesome name={icon as any} size={14} color="#FFF" />
      </View>
      <View style={styles.kpiText}>
        <Text style={[styles.kpiLabel, { color: THEME.secondary }]}>{label}</Text>
        <Text style={[styles.kpiValue, { color: THEME.text }]}>{value}</Text>
      </View>
    </View>
  );

  const RankingRow = ({ label, value, percentage, subtitle, showSeparator }: { label: string, value: string, percentage: number, subtitle?: string, showSeparator?: boolean }) => (
    <View style={styles.rankingRow}>
      <View style={[styles.rankingContent, showSeparator && { borderBottomWidth: 0.5, borderBottomColor: THEME.separator }]}>
        <View style={styles.rankingInfo}>
          <Text style={[styles.rankingLabel, { color: THEME.text }]} numberOfLines={1}>{label}</Text>
          {subtitle && <Text style={[styles.rankingSubtitle, { color: THEME.secondary }]}>{subtitle}</Text>}
          <View style={styles.rankingBarContainer}>
            <View style={[styles.rankingBarBg, { backgroundColor: isDark ? '#333' : '#E5E5EA' }]}>
              <View style={[styles.rankingBarFill, { width: `${percentage}%`, backgroundColor: THEME.accent }]} />
            </View>
          </View>
        </View>
        <Text style={[styles.rankingValue, { color: THEME.text }]}>{value}</Text>
      </View>
    </View>
  );

  const getChartLabels = () => {
    const rawData = data?.chart || [];
    if (rawData.length === 0) return ["-"];
    const allLabels = rawData.map(c => {
      const parts = c.periodo.split('-');
      const year = parseInt(parts[0]);
      const month = parts[1] ? parseInt(parts[1]) - 1 : 0;
      const day = parts[2] ? parseInt(parts[2]) : 1;
      if (groupBy === 'day') return `${day.toString().padStart(2, '0')}/${(month + 1).toString().padStart(2, '0')}`;
      if (groupBy === 'week') return `S${day.toString().padStart(2, '0')}/${(month + 1).toString().padStart(2, '0')}`;
      const monthsAbbr = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
      return `${monthsAbbr[month]}/${parts[0].substring(2)}`;
    });
    const step = Math.ceil(allLabels.length / 6);
    return allLabels.map((l, i) => (i % step === 0 || i === allLabels.length - 1) ? l : "");
  };

  const chartLabels = getChartLabels();
  const chartValues = (data?.chart || []).map(c => c.valor / 100000);
  const chartData = {
    labels: chartLabels,
    datasets: [{
      data: chartValues.length > 0 ? chartValues : [0],
      color: (opacity = 1) => THEME.accent,
      strokeWidth: 2
    }]
  };

  return (
    <View style={[styles.container, { backgroundColor: THEME.bg }]}>
      <Stack.Screen options={{ 
        headerShown: true,
        title: 'Histórico de Metas',
        headerLargeTitle: true,
        headerBackTitle: 'Voltar',
        headerTransparent: true,
        headerBlurEffect: isDark ? 'dark' : 'light',
        headerStyle: { backgroundColor: THEME.bg },
        headerTintColor: THEME.accent,
      }} />

      {loading && !refreshing ? (
         <View style={styles.centered}><ActivityIndicator color={THEME.accent} size="small" /></View>
      ) : (
        <ScrollView 
          style={styles.container}
          contentContainerStyle={[styles.scrollContent, { paddingTop: (insets.top > 0 ? insets.top + 120 : 140) }]}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={THEME.accent} />}
        >

          <View style={styles.filterArea}>
            <SectionHeader title="Filtro de Coleção" />
            <TouchableOpacity 
              style={[styles.pickerTrigger, { backgroundColor: THEME.card, borderColor: THEME.border }]}
              onPress={() => setColModalVisible(true)}
              activeOpacity={0.7}
            >
              <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingRight: 16 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                  <Ionicons name="filter-circle-outline" size={22} color={THEME.accent} style={{ marginRight: 12 }} />
                  <Text style={[styles.pickerValue, { color: THEME.text }]} numberOfLines={1}>
                    {selectedColecao ? colecoes.find(c => c.idExterno === selectedColecao)?.nome : 'Todas as Coleções'}
                  </Text>
                </View>
                <Ionicons name="chevron-down" size={16} color={THEME.secondary} />
              </View>
            </TouchableOpacity>
          </View>

          <SectionHeader title="Resumo Comercial" />
          <View style={styles.kpiGrid}>
            <KpiCard label="Vendas" value={formatCurrency(data?.summary?.totalValor || 0)} icon="money" color={THEME.green} />
            <KpiCard label="Pedidos" value={(data?.summary?.totalPedidos || 0).toString()} icon="shopping-bag" color={THEME.orange} />
            <KpiCard label="Peças" value={(data?.summary?.totalQuantidade || 0).toString()} icon="tags" color={THEME.purple} />
            <KpiCard label="Ticket" value={formatCurrency(data?.summary?.ticketMedio || 0)} icon="calculator" color={THEME.accent} />
          </View>

          <SectionHeader title="Carteira de Clientes" />
          <View style={[styles.insetCard, { backgroundColor: THEME.card }]}>
            <View style={styles.peneStats}>
              <Text style={[styles.peneLabel, { color: THEME.text }]}>Clientes Atendidos</Text>
              <Text style={[styles.peneValue, { color: THEME.accent }]}>
                 {Math.floor(((data?.clientesAtendidos || 0) / (data?.clientesAtivos || 1)) * 100)}%
              </Text>
            </View>
            <View style={[styles.peneBarBg, { backgroundColor: isDark ? '#333' : '#E5E5EA' }]}>
               <View style={[styles.peneBarFill, { 
                 width: `${((data?.clientesAtendidos || 0) / (data?.clientesAtivos || 1)) * 100}%`,
                 backgroundColor: THEME.accent
               }]} />
            </View>
            <Text style={[styles.peneSub, { color: THEME.secondary }]}>
              {data?.clientesAtendidos || 0} de {data?.clientesAtivos || 0} clientes ativos
            </Text>
          </View>

          <View style={styles.sectionHeaderRow}>
            <SectionHeader title="Tendência de Venda" />
            <View style={[styles.segmentedControlSmall, { backgroundColor: isDark ? '#1C1C1E' : 'rgba(118, 118, 128, 0.12)' }]}>
               {(['day', 'week', 'month'] as const).map(t => (
                 <TouchableOpacity 
                  key={t}
                  style={[styles.segmentBtn, groupBy === t && (isDark ? { backgroundColor: '#636366' } : styles.segmentBtnActive)]}
                  onPress={() => setGroupBy(t)}
                 >
                   <Text style={[styles.segmentTextSmall, { color: groupBy === t ? '#FFFFFF' : THEME.secondary }]}>
                     {t === 'day' ? 'Dia' : t === 'week' ? 'Sem' : 'Mês'}
                   </Text>
                 </TouchableOpacity>
               ))}
            </View>
          </View>
          <View style={[styles.insetCard, { backgroundColor: THEME.card, padding: 10, paddingBottom: groupBy === 'month' ? 10 : 20 }]}>
            <LineChart
              data={chartData}
              width={width - 50}
              height={groupBy === 'month' ? 200 : 240}
              withHorizontalLines={false}
              withVerticalLines={false}
              verticalLabelRotation={groupBy === 'month' ? 0 : 45}
              chartConfig={{
                backgroundColor: THEME.card,
                backgroundGradientFrom: THEME.card,
                backgroundGradientTo: THEME.card,
                color: (opacity = 1) => THEME.accent,
                labelColor: (opacity = 1) => THEME.secondary,
                propsForBackgroundLines: { borderRadius: 16 },
                strokeWidth: 2,
                decimalPlaces: 0,
                propsForLabels: { fontSize: 10 }
              }}
              bezier
              style={{ borderRadius: 16, marginTop: groupBy === 'month' ? 0 : 10 }}
            />
          </View>

          <View style={styles.sectionHeaderRow}>
            <SectionHeader title="Top Produtos" />
            <View style={[styles.toggleRow, { backgroundColor: isDark ? '#1C1C1E' : 'rgba(118, 118, 128, 0.12)' }]}>
              <TouchableOpacity onPress={() => setProdSort('valor')} style={[styles.toggleBtn, prodSort === 'valor' && styles.toggleBtnActive]}>
                <Text style={[styles.toggleText, { color: prodSort === 'valor' ? '#FFFFFF' : THEME.secondary }]}>R$</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={() => setProdSort('quantidade')} style={[styles.toggleBtn, prodSort === 'quantidade' && styles.toggleBtnActive]}>
                <Text style={[styles.toggleText, { color: prodSort === 'quantidade' ? '#FFFFFF' : THEME.secondary }]}>un.</Text>
              </TouchableOpacity>
            </View>
          </View>
          <View style={[styles.tableCard, { backgroundColor: THEME.card }]}>
            {(data?.topProdutos || [])
              .sort((a, b) => b[prodSort] - a[prodSort])
              .slice(0, 5)
              .map((p, i, arr) => (
                <RankingRow 
                  key={p.produtoId}
                  label={p.nome}
                  subtitle={p.produtoId}
                  value={prodSort === 'valor' ? formatCurrency(p.valor) : `${p.quantidade} un.`}
                  percentage={arr[0][prodSort] ? (p[prodSort] / arr[0][prodSort]) * 100 : 0}
                  showSeparator={i < 4}
                />
              ))}
          </View>

          <View style={styles.sectionHeaderRow}>
            <SectionHeader title="Top Categorias" />
            <View style={[styles.toggleRow, { backgroundColor: isDark ? '#1C1C1E' : 'rgba(118, 118, 128, 0.12)' }]}>
              <TouchableOpacity onPress={() => setCatSort('valor')} style={[styles.toggleBtn, catSort === 'valor' && styles.toggleBtnActive]}>
                <Text style={[styles.toggleText, { color: catSort === 'valor' ? '#FFFFFF' : THEME.secondary }]}>R$</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={() => setCatSort('quantidade')} style={[styles.toggleBtn, catSort === 'quantidade' && styles.toggleBtnActive]}>
                <Text style={[styles.toggleText, { color: catSort === 'quantidade' ? '#FFFFFF' : THEME.secondary }]}>un.</Text>
              </TouchableOpacity>
            </View>
          </View>
          <View style={[styles.tableCard, { backgroundColor: THEME.card }]}>
            {(data?.topCategorias || [])
              .sort((a, b) => b[catSort] - a[catSort])
              .slice(0, 5)
              .map((c, i, arr) => (
                <RankingRow 
                  key={c.categoriaId}
                  label={c.nome}
                  value={catSort === 'valor' ? formatCurrency(c.valor) : `${c.quantidade} un.`}
                  percentage={arr[0][catSort] ? (c[catSort] / arr[0][catSort]) * 100 : 0}
                  showSeparator={i < 4}
                />
              ))}
          </View>

          <View style={styles.sectionHeaderRow}>
            <SectionHeader title="Top Clientes" />
            <View style={[styles.toggleRow, { backgroundColor: isDark ? '#1C1C1E' : 'rgba(118, 118, 128, 0.12)' }]}>
              <TouchableOpacity onPress={() => setCliSort('valor')} style={[styles.toggleBtn, cliSort === 'valor' && styles.toggleBtnActive]}>
                <Text style={[styles.toggleText, { color: cliSort === 'valor' ? '#FFFFFF' : THEME.secondary }]}>R$</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={() => setCliSort('quantidade')} style={[styles.toggleBtn, cliSort === 'quantidade' && styles.toggleBtnActive]}>
                <Text style={[styles.toggleText, { color: cliSort === 'quantidade' ? '#FFFFFF' : THEME.secondary }]}>un.</Text>
              </TouchableOpacity>
            </View>
          </View>
          <View style={[styles.tableCard, { backgroundColor: THEME.card }]}>
            {(data?.topClientes || [])
              .sort((a, b) => b[cliSort] - a[cliSort])
              .slice(0, 5)
              .map((c, i, arr) => (
                <RankingRow 
                  key={c.clienteId}
                  label={c.nome}
                  value={cliSort === 'valor' ? formatCurrency(c.valor) : `${c.quantidade} un.`}
                  percentage={arr[0][cliSort] ? (c[cliSort] / arr[0][cliSort]) * 100 : 0}
                  showSeparator={i < 4}
                />
              ))}
          </View>

          <View style={styles.sectionHeaderRow}>
            <SectionHeader title="Top Cidades" />
            <View style={[styles.toggleRow, { backgroundColor: isDark ? '#1C1C1E' : 'rgba(118, 118, 128, 0.12)' }]}>
              <TouchableOpacity onPress={() => setCitySort('valor')} style={[styles.toggleBtn, citySort === 'valor' && styles.toggleBtnActive]}>
                <Text style={[styles.toggleText, { color: citySort === 'valor' ? '#FFFFFF' : THEME.secondary }]}>R$</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={() => setCitySort('quantidade')} style={[styles.toggleBtn, citySort === 'quantidade' && styles.toggleBtnActive]}>
                <Text style={[styles.toggleText, { color: citySort === 'quantidade' ? '#FFFFFF' : THEME.secondary }]}>un.</Text>
              </TouchableOpacity>
            </View>
          </View>
          <View style={[styles.tableCard, { backgroundColor: THEME.card }]}>
            {(data?.topCidades || [])
              .sort((a, b) => b[citySort] - a[citySort])
              .slice(0, 5)
              .map((city, i, arr) => (
                <RankingRow 
                  key={city.cidade + city.uf}
                  label={`${city.cidade} - ${city.uf}`}
                  value={citySort === 'valor' ? formatCurrency(city.valor) : `${city.quantidade} un.`}
                  percentage={arr[0][citySort] ? (city[citySort] / arr[0][citySort]) * 100 : 0}
                  showSeparator={i < 4}
                />
              ))}
          </View>

        </ScrollView>
      )}

      <Modal 
        visible={colModalVisible} 
        animationType="slide" 
        presentationStyle="pageSheet" 
        // @ts-ignore
        sheetAllowedDetents={['medium', 'large']}
        onRequestClose={() => setColModalVisible(false)}
      >
        <View style={[styles.modalBase, { backgroundColor: THEME.bg }]}>
          <View style={[styles.modalHeader, { borderBottomColor: THEME.border }]}>
            <TouchableOpacity onPress={() => setColModalVisible(false)} style={styles.modalCancel}>
              <Text style={{ color: THEME.accent, fontSize: 17, fontWeight: '600' }}>Fechar</Text>
            </TouchableOpacity>
            <Text style={[styles.modalTitle, { color: THEME.text }]}>Coleção</Text>
            <View style={{ width: 80 }} />
          </View>

          <View style={styles.modalSearchArea}>
            <View style={[styles.modalSearchBox, { backgroundColor: isDark ? '#2C3641' : 'rgba(118, 118, 128, 0.12)' }]}>
              <Ionicons name="search" size={18} color={THEME.secondary} style={{ marginRight: 10 }} />
              <TextInput
                style={[styles.modalSearchInput, { color: THEME.text }]}
                placeholder="Buscar por nome..."
                placeholderTextColor={THEME.secondary}
                value={colSearch}
                onChangeText={setColSearch}
                autoCorrect={false}
              />
            </View>
          </View>

          <FlatList
            data={[{ idExterno: null, nome: 'Todas as Coleções' }, ...colecoes].filter(c => (c.nome || '').toLowerCase().includes(colSearch.toLowerCase()))}
            keyExtractor={item => item.idExterno || 'all'}
            contentContainerStyle={styles.modalListContent}
            renderItem={({ item }) => (
              <TouchableOpacity 
                style={[styles.modalItem, { borderBottomColor: THEME.border }]}
                onPress={() => {
                  setSelectedColecao(item.idExterno);
                  setColModalVisible(false);
                  setColSearch('');
                }}
              >
                <Text style={[styles.modalItemText, { color: THEME.text }, item.idExterno === selectedColecao && { color: THEME.accent, fontWeight: '700' }]}>
                  {item.nome}
                </Text>
                {item.idExterno === selectedColecao && <Ionicons name="checkmark-circle" size={22} color={THEME.accent} />}
              </TouchableOpacity>
            )}
          />
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  scrollContent: { 
    paddingHorizontal: 16, 
    paddingTop: 140, 
    paddingBottom: 100 
  },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  sectionHeader: {
    fontSize: 13,
    fontWeight: '600',
    marginLeft: 4,
    marginBottom: 8,
    marginTop: 24,
  },
  filterArea: { marginBottom: 8 },
  pickerTrigger: {
    padding: 16,
    borderRadius: 12,
    borderWidth: 0.5,
    marginTop: 8,
  },
  pickerValue: { fontSize: 16, fontWeight: '500', flex: 1 },
  modalBase: { flex: 1 },
  modalHeader: { 
    height: 56, 
    flexDirection: 'row', 
    alignItems: 'center', 
    justifyContent: 'space-between', 
    paddingHorizontal: 16, 
    borderBottomWidth: 0.5 
  },
  modalTitle: { fontSize: 17, fontWeight: '700' },
  modalCancel: { width: 80 },
  modalSearchArea: { padding: 16, borderBottomWidth: 0.5, borderBottomColor: 'rgba(0,0,0,0.05)' },
  modalSearchBox: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    paddingHorizontal: 12, 
    height: 40, 
    borderRadius: 10 
  },
  modalSearchInput: { flex: 1, fontSize: 16, height: '100%' },
  modalListContent: { paddingBottom: 50 },
  modalItem: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    justifyContent: 'space-between', 
    padding: 16, 
    marginHorizontal: 16,
    borderBottomWidth: 0.5 
  },
  modalItemText: { fontSize: 16 },
  colChipText: { fontSize: 13, fontWeight: '600' },
  segmentedControl: {
    flexDirection: 'row',
    borderRadius: 8,
    padding: 2,
    marginTop: 8,
  },
  segmentBtn: {
    flex: 1,
    paddingVertical: 6,
    alignItems: 'center',
    borderRadius: 7,
  },
  segmentBtnActive: {
    backgroundColor: '#F9B252',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  segmentText: { fontSize: 13, fontWeight: '500' },
  segmentedControlSmall: {
    flexDirection: 'row',
    borderRadius: 8,
    padding: 2,
    minWidth: 150,
  },
  segmentTextSmall: { fontSize: 11, fontWeight: '600' },
  kpiGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  kpiCard: {
    width: (width - 42) / 2,
    padding: 12,
    borderRadius: 12,
    marginBottom: 10,
    flexDirection: 'row',
    alignItems: 'center',
  },
  kpiIcon: {
    width: 30,
    height: 30,
    borderRadius: 7,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },
  kpiText: { flex: 1 },
  kpiLabel: { fontSize: 11, fontWeight: '600' },
  kpiValue: { fontSize: 15, fontWeight: '700', marginTop: 1 },
  insetCard: {
    borderRadius: 10,
    padding: 16,
  },
  peneStats: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  peneLabel: { fontSize: 16, fontWeight: '600' },
  peneValue: { fontSize: 16, fontWeight: '700' },
  peneBarBg: { height: 6, borderRadius: 3, overflow: 'hidden' },
  peneBarFill: { height: '100%', borderRadius: 3 },
  peneSub: { fontSize: 12, marginTop: 8 },
  tableCard: {
    borderRadius: 10,
    overflow: 'hidden',
  },
  rankingRow: { paddingLeft: 16 },
  rankingContent: {
    paddingVertical: 12,
    paddingRight: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  rankingInfo: { flex: 1, marginRight: 15 },
  rankingLabel: { fontSize: 15, fontWeight: '600', marginBottom: 2 },
  rankingSubtitle: { fontSize: 11, fontWeight: '500', marginBottom: 6 },
  rankingBarContainer: { height: 3, width: '80%' },
  rankingBarBg: { height: '100%', borderRadius: 1.5 },
  rankingBarFill: { height: '100%' },
  rankingValue: { fontSize: 14, fontWeight: '700' },
  sectionHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingRight: 4,
    marginTop: 24,
    marginBottom: 8,
  },
  toggleRow: {
    flexDirection: 'row',
    backgroundColor: 'rgba(118, 118, 128, 0.12)',
    borderRadius: 7,
    padding: 2,
  },
  toggleBtn: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 6,
  },
  toggleBtnActive: {
    backgroundColor: '#F9B252',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  toggleText: { fontSize: 11, fontWeight: '700' },
});
