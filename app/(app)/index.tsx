import { FontAwesome } from '@expo/vector-icons';
import { Link, Stack, useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import {
    ActivityIndicator,
    Dimensions,
    Image,
    Modal,
    Pressable,
    ScrollView,
    StatusBar,
    StyleSheet,
    Text,
    TouchableOpacity,
    useColorScheme,
    View
} from 'react-native';
import { LineChart } from 'react-native-chart-kit';
import Svg, { Path } from 'react-native-svg';
import api from '../../api/api';
import { useAuth } from '../../context/AuthContext';

const BronzeTrophy = require('../../assets/images/bronze.png');
const SilverTrophy = require('../../assets/images/prata.png');
const GoldTrophy = require('../../assets/images/ouro.png');

const { width } = Dimensions.get('window');

interface MetaGrupo {
  grupoId: number;
  grupoNome: string;
  colecaoNome: string;
  bronze: number;
  prata: number;
  ouro: number;
  totalUnidades: number;
  inicioMeta: string;
  fimMeta: string;
}

export default function DashboardScreen() {
  const { user, signOut } = useAuth();
  const router = useRouter();
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';

  const [loading, setLoading] = useState(true);
  const [metas, setMetas] = useState<MetaGrupo[]>([]);
  const [selectedMeta, setSelectedMeta] = useState<MetaGrupo | null>(null);
  const [showUserMenu, setShowUserMenu] = useState(false);
  
  // Interactive Chart State
  const [tooltipData, setTooltipData] = useState<{ value: number, index: number, x: number, y: number } | null>(null);

  const THEME = {
    bg: isDark ? '#000000' : '#F2F2F7',
    card: isDark ? '#1C1C1E' : '#FFFFFF',
    text: isDark ? '#FFFFFF' : '#000000',
    secondaryText: isDark ? '#8E8E93' : '#636366',
    navAction: isDark ? '#1C1C1E' : '#E5E5EA',
    navText: isDark ? '#0A84FF' : '#007AFF',
    separator: isDark ? '#38383A' : '#C6C6C8',
    accent: '#6C5CE7',
    positive: '#32D74B', 
  };

  useEffect(() => {
    fetchMetas();
  }, []);

  const fetchMetas = async () => {
    try {
      const response = await api.get('/api/rep/metas');
      const allMetas = response.data;
      setMetas(allMetas);

      if (allMetas.length > 0) {
        const today = new Date().getTime();
        const active = allMetas.find((m: MetaGrupo) => {
          const start = new Date(m.inicioMeta).getTime();
          const end = new Date(m.fimMeta).getTime();
          return today >= start && today <= end;
        });

        if (active) {
          setSelectedMeta(active);
        } else {
          const sorted = [...allMetas].sort((a, b) => new Date(b.inicioMeta).getTime() - new Date(a.inicioMeta).getTime());
          setSelectedMeta(sorted[0]);
        }
      }
    } catch (error) {
      console.error('Erro ao buscar metas:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatDateRange = (start: string, end: string) => {
    const d1 = new Date(start);
    const d2 = new Date(end);
    const months = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez'];
    return `${d1.getDate()} ${months[d1.getMonth()]} — ${d2.getDate()} ${months[d2.getMonth()]} de ${d2.getFullYear()}`;
  };

  const currentLevel = () => {
    if (!selectedMeta) return 'SEM NÍVEL';
    if (selectedMeta.totalUnidades >= selectedMeta.ouro) return 'OURO';
    if (selectedMeta.totalUnidades >= selectedMeta.prata) return 'PRATA';
    if (selectedMeta.totalUnidades >= selectedMeta.bronze) return 'BRONZE';
    return 'SEM NÍVEL';
  };

  const nextLevelInfo = () => {
    if (!selectedMeta) return null;
    let nextLevelLabel = 'Bronze';
    let target = selectedMeta.bronze;
    let nextIcon = BronzeTrophy;

    if (selectedMeta.totalUnidades >= selectedMeta.bronze) {
      nextLevelLabel = 'Prata';
      target = selectedMeta.prata;
      nextIcon = SilverTrophy;
    }
    if (selectedMeta.totalUnidades >= selectedMeta.prata) {
      nextLevelLabel = 'Ouro';
      target = selectedMeta.ouro;
      nextIcon = GoldTrophy;
    }
    if (selectedMeta.totalUnidades >= selectedMeta.ouro) {
      return { nextLevelLabel: 'Máximo', target: selectedMeta.ouro, remaining: 0, progress: 100, nextIcon: GoldTrophy };
    };

    const remaining = target - selectedMeta.totalUnidades;
    const progress = Math.min((selectedMeta.totalUnidades / target) * 100, 100);

    return { nextLevelLabel, target, remaining, progress, nextIcon };
  };

  const calculateForecast = () => {
    if (!selectedMeta) return 0;
    const start = new Date(selectedMeta.inicioMeta).getTime();
    const now = new Date().getTime();
    const elapsed = now - start;
    const daysElapsed = Math.max(elapsed / (1000 * 60 * 60 * 24), 1);
    const dailyPace = selectedMeta.totalUnidades / daysElapsed;
    
    const end = new Date(selectedMeta.fimMeta).getTime();
    const totalDuration = (end - start) / (1000 * 60 * 60 * 24);
    return Math.round(dailyPace * totalDuration);
  };

  const handleLogout = () => {
    setShowUserMenu(false);
    signOut();
  };

  // Custom Half-Gauge Component
  const HalfGauge = ({ totalUnits, bronze, prata, ouro, isDark, THEME, metaName, metaDate }: { totalUnits: number, bronze: number, prata: number, ouro: number, isDark: boolean, THEME: any, metaName: string, metaDate: string }) => {
    const size = width - 80;
    const strokeWidth = 22;
    const radius = (size - strokeWidth) / 2;
    const circumference = Math.PI * radius;
    
    // Main progress towards GOLD
    const overallProgress = Math.min((totalUnits / ouro) * 100, 100);
    const strokeDashoffset = circumference - (overallProgress / 100) * circumference;

    // Calc percentages for each level
    const bronzePct = Math.min(Math.round((totalUnits / bronze) * 100), 100);
    const silverPct = Math.min(Math.round((totalUnits / prata) * 100), 100);
    const goldPct = Math.min(Math.round((totalUnits / ouro) * 100), 100);

    const LevelPill = ({ icon, percent, label, tint }: { icon: any, percent: number, label: string, tint: string }) => (
      <View style={[styles.levelPill, { backgroundColor: isDark ? '#1C1C1E' : '#FFFFFF', borderColor: isDark ? '#2C2C2E' : '#E5E5EA' }]}>
        <View style={[styles.pillIconBg, { backgroundColor: tint + (isDark ? '30' : '15') }]}>
          <Image source={icon} style={styles.pillIcon} />
        </View>
        <View>
          <Text style={[styles.pillPercent, { color: THEME.text }]}>{percent}%</Text>
          <Text style={[styles.pillLabel, { color: THEME.secondaryText }]}>{label}</Text>
        </View>
      </View>
    );

    return (
      <View style={styles.gaugeContainer}>
        <View style={{ position: 'relative', alignItems: 'center' }}>
          <Svg width={size} height={size / 2 + 10} viewBox={`0 0 ${size} ${size / 2 + 10}`}>
            <Path
              d={`M ${strokeWidth/2} ${size/2} A ${radius} ${radius} 0 0 1 ${size - strokeWidth/2} ${size/2}`}
              fill="none"
              stroke={isDark ? '#1C1C1E' : '#E5E5EA'}
              strokeWidth={strokeWidth}
              strokeLinecap="round"
            />
            <Path
              d={`M ${strokeWidth/2} ${size/2} A ${radius} ${radius} 0 0 1 ${size - strokeWidth/2} ${size/2}`}
              fill="none"
              stroke={THEME.navText}
              strokeWidth={strokeWidth}
              strokeDasharray={`${circumference} ${circumference}`}
              strokeDashoffset={strokeDashoffset}
              strokeLinecap="round"
            />
          </Svg>
          <View style={styles.gaugeContent}>
            <Text style={[styles.gaugeUnits, { color: THEME.text }]}>{totalUnits.toLocaleString('pt-BR')}</Text>
            <Text style={[styles.gaugeSublabel, { color: THEME.secondaryText }]}>unidades vendidas</Text>
            <Text style={[styles.gaugeMetaName, { color: THEME.text }]} numberOfLines={1}>{metaName}</Text>
            <Text style={[styles.gaugeMetaDate, { color: THEME.secondaryText }]}>{metaDate}</Text>
          </View>
        </View>

        <View style={styles.pillsContainer}>
          <LevelPill icon={BronzeTrophy} percent={bronzePct} label="Bronze" tint="#CD7F32" />
          <LevelPill icon={SilverTrophy} percent={silverPct} label="Prata" tint="#C0C0C0" />
          <LevelPill icon={GoldTrophy} percent={goldPct} label="Ouro" tint="#FFD700" />
        </View>
      </View>
    );
  };

  if (loading) {
    return (
      <View style={[styles.loadingContainer, { backgroundColor: THEME.bg }]}>
        <ActivityIndicator size="small" color={THEME.navText} />
      </View>
    );
  }

  const next = nextLevelInfo();
  const forecast = calculateForecast();

  // Mock data for the collections chart (Gradient Line Chart)
  const chartLabels = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun'];
  const chartValues = [
    Math.round(selectedMeta?.totalUnidades ? selectedMeta.totalUnidades * 0.4 : 1200),
    Math.round(selectedMeta?.totalUnidades ? selectedMeta.totalUnidades * 0.55 : 1800),
    Math.round(selectedMeta?.totalUnidades ? selectedMeta.totalUnidades * 0.48 : 1500),
    Math.round(selectedMeta?.totalUnidades ? selectedMeta.totalUnidades * 0.75 : 2200),
    Math.round(selectedMeta?.totalUnidades ? selectedMeta.totalUnidades * 0.88 : 2600),
    selectedMeta?.totalUnidades || 3000
  ];

  const chartData = {
    labels: chartLabels,
    datasets: [{ data: chartValues }]
  };

  return (
    <View style={[styles.container, { backgroundColor: THEME.bg }]}>
      <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} />
      <Stack.Screen options={{ headerShown: false }} />

      <View style={[styles.topNav, { backgroundColor: THEME.bg }]}>
        <TouchableOpacity 
          style={[styles.navAction, { backgroundColor: THEME.navAction }]}
          onPress={() => router.push('/metas-history')}
        >
          <FontAwesome name="history" size={18} color={THEME.navText} />
          <Text style={[styles.navActionText, { color: THEME.navText }]}>Histórico</Text>
        </TouchableOpacity>
        
        <Pressable 
          style={styles.navProfile}
          onPress={() => setShowUserMenu(true)}
        >
          <View style={[styles.avatarMini, { backgroundColor: THEME.navText }]}>
            <Text style={styles.avatarInitial}>
              {(user?.nomeCompleto || user?.username || 'U').charAt(0)}
            </Text>
          </View>
        </Pressable>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <View style={styles.headerTitleArea}>
          <Text style={[styles.userName, { color: THEME.text }]}>Olá, {user?.nomeCompleto?.split(' ')[0] || user?.username}</Text>
          <Text style={[styles.headerSubtitle, { color: THEME.secondaryText }]}>Dashboard Grupo Titanium</Text>
        </View>

        {selectedMeta ? (
          <View style={styles.sectionGroup}>
            {/* Performance Gauge Card */}
            <View style={styles.iosCardMain}>
              <View style={styles.gaugeHeader}>
                <Text style={[styles.cardTag, { color: THEME.secondaryText }]}>PROGRESSO DA META</Text>
              </View>
              
              <HalfGauge 
                totalUnits={selectedMeta.totalUnidades}
                bronze={selectedMeta.bronze}
                prata={selectedMeta.prata}
                ouro={selectedMeta.ouro}
                isDark={isDark}
                THEME={THEME}
                metaName={selectedMeta.grupoNome}
                metaDate={formatDateRange(selectedMeta.inicioMeta, selectedMeta.fimMeta)}
              />
            </View>

            {/* Injected Urgent Performance Alert right after the Gauge */}
            {forecast < selectedMeta.bronze && (
              <View style={[styles.iosAlertCard, { 
                backgroundColor: isDark ? '#2C1B00' : '#FFF9F2', 
                borderColor: isDark ? '#4F3500' : '#FFECC7',
                marginBottom: 20,
                marginTop: -4 // Bridge the gap with the gauge card
              }]}>
                <View style={[styles.alertIconBg, { backgroundColor: '#FF950030' }]}>
                  <FontAwesome name="exclamation-triangle" size={14} color="#FF9F0A" />
                </View>
                <View style={styles.alertContent}>
                  <Text style={[styles.alertTitle, { color: '#FF9F0A' }]}>Abaixo da Meta Bronze</Text>
                  <Text style={[styles.alertDescription, { color: isDark ? '#FFD4A1' : '#3A3A3C' }]}>
                    Sua projeção atual não atinge o primeiro nível. Aumente seu ritmo para garantir o troféu do Grupo Titanium!
                  </Text>
                </View>
              </View>
            )}

            {/* Sales Evolution Chart Card */}
            <View style={[styles.iosCard, { backgroundColor: THEME.card, paddingVertical: 20 }]}>
              <Text style={[styles.cardTag, { marginLeft: 16, marginBottom: 16, color: THEME.secondaryText }]}>EVOLUÇÃO MENSAL</Text>
              
              <View style={{ position: 'relative' }}>
                <LineChart
                  data={chartData}
                  width={width - 72}
                  height={180}
                  chartConfig={{
                    backgroundColor: THEME.card,
                    backgroundGradientFrom: THEME.card,
                    backgroundGradientTo: THEME.card,
                    decimalPlaces: 0,
                    color: (opacity = 1) => isDark ? `rgba(10, 132, 255, ${opacity})` : `rgba(0, 122, 255, ${opacity})`,
                    labelColor: (opacity = 1) => THEME.secondaryText,
                    style: { borderRadius: 16 },
                    propsForDots: { r: "4", strokeWidth: "2", stroke: THEME.navText },
                    propsForBackgroundLines: { 
                      strokeDasharray: "", 
                      strokeWidth: 0.5, 
                      stroke: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)' 
                    }
                  }}
                  bezier
                  style={{ marginVertical: 8, borderRadius: 16 }}
                  withInnerLines={true}
                  withOuterLines={false}
                  withVerticalLines={false}
                  fromZero={true}
                  onDataPointClick={({ value, index, x, y }) => {
                    setTooltipData({ value, index, x, y });
                  }}
                />

                {/* Vertical Cursor and Tooltip */}
                {tooltipData && (
                  <>
                    <View style={[styles.verticalLine, { 
                      left: tooltipData.x, 
                      backgroundColor: THEME.navText 
                    }]} />
                    <View style={[styles.chartTooltip, { 
                      left: tooltipData.x - 45, 
                      top: tooltipData.y - 45,
                      backgroundColor: isDark ? '#2C2C2E' : '#000000'
                    }]}>
                      <Text style={styles.tooltipMonth}>{chartLabels[tooltipData.index]}</Text>
                      <Text style={styles.tooltipValue}>{tooltipData.value.toLocaleString('pt-BR')} un</Text>
                    </View>
                    <Pressable 
                      style={StyleSheet.absoluteFill} 
                      onPress={() => setTooltipData(null)}
                    />
                  </>
                )}
              </View>
            </View>

            {/* Forecast Section */}
            <View style={styles.forecastSection}>
              <Text style={[styles.sectionTitle, { color: THEME.secondaryText }]}>PREVISÃO DE FECHAMENTO</Text>
              <View style={[styles.forecastCard, { backgroundColor: THEME.card }]}>
                <View style={[styles.forecastIconBg, { backgroundColor: isDark ? '#222224' : '#F0F0F7' }]}>
                  <FontAwesome name="line-chart" size={14} color={THEME.navText} />
                </View>
                <View style={styles.forecastInfo}>
                  <Text style={[styles.forecastSubtext, { color: THEME.secondaryText }]}>Ritmo Estimado</Text>
                  <Text style={[styles.forecastMainValue, { color: THEME.text }]}>
                    {forecast.toLocaleString('pt-BR')} un
                  </Text>
                </View>
              </View>
            </View>
          </View>
        ) : (
          <View style={styles.emptyContainer}>
            <FontAwesome name="calendar-o" size={40} color={isDark ? '#38383A' : '#AEAEB2'} />
            <Text style={[styles.emptyText, { color: THEME.secondaryText }]}>Sem campanhas ativas</Text>
            <TouchableOpacity onPress={() => router.push('/metas-history')}>
              <Text style={[styles.historyLinkText, { color: THEME.navText }]}>Ver histórico completo</Text>
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>

      {/* Floating Action (Chat) */}
      <TouchableOpacity 
        style={[styles.iosFab, { backgroundColor: THEME.navText, shadowColor: THEME.navText }]}
        onPress={() => router.push('/chat')}
      >
        <FontAwesome name="commenting" size={24} color="#FFFFFF" />
      </TouchableOpacity>

      {/* iOS Modal Menu */}
      <Modal visible={showUserMenu} animationType="fade" transparent={true}>
        <Pressable style={styles.iosModalOverlay} onPress={() => setShowUserMenu(false)}>
          <View style={[styles.iosMenuSheet, { backgroundColor: isDark ? '#1C1C1E' : '#F2F2F7' }]}>
            <View style={styles.menuHeader}>
              <View style={[styles.menuAvatarLarge, { backgroundColor: isDark ? '#2C2C2E' : '#FFFFFF' }]}>
                <Text style={[styles.avatarLabelLarge, { color: THEME.navText }]}>{(user?.nomeCompleto || user?.username || 'U').charAt(0)}</Text>
              </View>
              <Text style={[styles.menuName, { color: THEME.text }]}>{user?.nomeCompleto || user?.username}</Text>
              <Text style={[styles.menuRole, { color: THEME.secondaryText }]}>{user?.role || 'Representante Comercial'}</Text>
            </View>
            <View style={[styles.menuSeparator, { backgroundColor: THEME.separator }]} />
            <TouchableOpacity style={styles.menuActionItem} onPress={handleLogout}>
              <Text style={styles.logoutText}>Sair da Conta</Text>
              <FontAwesome name="sign-out" size={18} color="#FF453A" />
            </TouchableOpacity>
          </View>
        </Pressable>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  topNav: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 60,
    paddingHorizontal: 20,
    paddingBottom: 10,
  },
  navAction: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  navActionText: {
    marginLeft: 6,
    fontSize: 14,
    fontWeight: '600',
  },
  navProfile: {
    padding: 2,
  },
  avatarMini: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarInitial: {
    color: '#FFF',
    fontSize: 14,
    fontWeight: '700',
  },
  scrollContent: {
    paddingBottom: 100,
  },
  headerTitleArea: {
    paddingHorizontal: 20,
    paddingTop: 10,
    marginBottom: 25,
  },
  userName: {
    fontSize: 34,
    fontWeight: '700',
    letterSpacing: -0.5,
  },
  headerSubtitle: {
    fontSize: 17,
    marginTop: 2,
    fontWeight: '400',
  },
  sectionGroup: {
    paddingHorizontal: 20,
  },
  metaHeader: {
    marginBottom: 16,
  },
  metaTitle: {
    fontSize: 20,
    fontWeight: '600',
  },
  metaDate: {
    fontSize: 13,
    marginTop: 2,
    fontWeight: '400',
  },
  iosCardMain: {
    borderRadius: 24,
    padding: 24,
    marginBottom: 0,
    backgroundColor: 'transparent',
  },
  gaugeHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  cardTag: {
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  gaugeContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 10,
    marginBottom: 20,
  },
  gaugeContent: {
    position: 'absolute',
    top: '40%', 
    alignItems: 'center',
  },
  gaugeUnits: {
    fontSize: 44,
    fontWeight: '800',
    letterSpacing: -1,
  },
  gaugeSublabel: {
    fontSize: 12,
    fontWeight: '500',
    marginTop: -2,
    opacity: 0.6,
    textTransform: 'uppercase',
  },
  gaugeMetaName: {
    fontSize: 11,
    fontWeight: '700',
    marginTop: 4,
    textAlign: 'center',
  },
  gaugeMetaDate: {
    fontSize: 10,
    fontWeight: '400',
    marginTop: 0,
    opacity: 0.8,
  },
  pillsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
    marginTop: 20,
    gap: 10,
  },
  levelPill: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    padding: 8,
    borderRadius: 20,
    borderWidth: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 5,
    elevation: 2,
  },
  pillIconBg: {
    width: 28,
    height: 28,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 6,
  },
  pillIcon: {
    width: 16,
    height: 16,
    resizeMode: 'contain',
  },
  pillPercent: {
    fontSize: 14,
    fontWeight: '700',
  },
  pillLabel: {
    fontSize: 12,
    fontWeight: '400',
  },
  levelBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  levelBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  iosCard: {
    borderRadius: 24,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.08,
    shadowRadius: 15,
    elevation: 4,
  },
  verticalLine: {
    position: 'absolute',
    width: 2,
    opacity: 0.5,
    zIndex: 1,
    top: 40,
    height: 130,
  },
  chartTooltip: {
    position: 'absolute',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 5,
    elevation: 10,
    minWidth: 80,
  },
  tooltipMonth: {
    fontSize: 10,
    fontWeight: '700',
    color: '#AEAEB2',
    marginBottom: 2,
    textTransform: 'uppercase',
  },
  tooltipValue: {
    fontSize: 14,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  forecastSection: {
    marginTop: 10,
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: '600',
    marginBottom: 12,
    marginLeft: 4,
    letterSpacing: 0.5,
  },
  forecastCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 16,
  },
  forecastIconBg: {
    width: 36,
    height: 36,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  forecastInfo: {
    flex: 1,
  },
  forecastSubtext: {
    fontSize: 12,
    marginBottom: 2,
  },
  forecastMainValue: {
    fontSize: 20,
    fontWeight: '700',
  },
  iosAlertCard: {
    flexDirection: 'row',
    padding: 16,
    borderRadius: 20,
    marginTop: 16,
    borderWidth: 1,
    alignItems: 'center',
  },
  alertIconBg: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  alertContent: {
    flex: 1,
  },
  alertTitle: {
    fontSize: 14,
    fontWeight: '700',
    marginBottom: 2,
  },
  alertDescription: {
    fontSize: 13,
    lineHeight: 18,
  },
  emptyContainer: {
    padding: 60,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 17,
    marginTop: 12,
    marginBottom: 16,
  },
  historyLinkText: {
    fontSize: 16,
    fontWeight: '600',
  },
  iosFab: {
    position: 'absolute',
    bottom: 34,
    right: 20,
    width: 60,
    height: 60,
    borderRadius: 30,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 9999,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 15,
    elevation: 15,
  },
  iosModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.3)',
    justifyContent: 'flex-end',
  },
  iosMenuSheet: {
    borderTopLeftRadius: 30,
    borderTopRightRadius: 30,
    padding: 24,
    paddingBottom: 40,
  },
  menuHeader: {
    alignItems: 'center',
    marginBottom: 24,
  },
  menuAvatarLarge: {
    width: 72,
    height: 72,
    borderRadius: 36,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 10,
    elevation: 5,
  },
  avatarLabelLarge: {
    fontSize: 28,
    fontWeight: '700',
  },
  menuName: {
    fontSize: 22,
    fontWeight: '700',
  },
  menuRole: {
    fontSize: 14,
    marginTop: 2,
  },
  menuSeparator: {
    height: StyleSheet.hairlineWidth,
    marginHorizontal: -24,
  },
  menuActionItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 18,
  },
  logoutText: {
    fontSize: 17,
    fontWeight: '600',
  },
});
