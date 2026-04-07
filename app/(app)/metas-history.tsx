import React, { useEffect, useState } from 'react';
import { 
  StyleSheet, 
  ScrollView, 
  ActivityIndicator, 
  View, 
  Text, 
  Image, 
  TouchableOpacity, 
  StatusBar,
  useColorScheme
} from 'react-native';
import { Stack, useRouter } from 'expo-router';
import { FontAwesome } from '@expo/vector-icons';
import api from '../../api/api';

const BronzeTrophy = require('../../assets/images/bronze.png');
const SilverTrophy = require('../../assets/images/prata.png');
const GoldTrophy = require('../../assets/images/ouro.png');

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

export default function MetasHistoryScreen() {
  const router = useRouter();
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';
  
  const THEME = {
    bg: isDark ? '#1C252E' : '#F2F2F7',
    card: isDark ? '#2C3641' : '#FFFFFF',
    text: isDark ? '#FFFFFF' : '#1C252E',
    secondaryText: isDark ? '#8E9AA9' : '#636366',
    primary: isDark ? '#F9B252' : '#3D4956',
    border: isDark ? '#3D4956' : '#E5E5EA',
    accent: '#F9B252',
    positive: '#34C759',
    neutral: '#8E9AA9',
  };

  const [loading, setLoading] = useState(true);
  const [metas, setMetas] = useState<MetaGrupo[]>([]);

  useEffect(() => {
    fetchMetas();
  }, []);

  const fetchMetas = async () => {
    try {
      const response = await api.get('/api/rep/metas');
      const sorted = response.data.sort((a: MetaGrupo, b: MetaGrupo) => 
        new Date(b.inicioMeta).getTime() - new Date(a.inicioMeta).getTime()
      );
      setMetas(sorted);
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

  const getTrophy = (units: number, meta: MetaGrupo) => {
    if (units >= meta.ouro) return GoldTrophy;
    if (units >= meta.prata) return SilverTrophy;
    if (units >= meta.bronze) return BronzeTrophy;
    return null;
  };

  const getStatus = (units: number, meta: MetaGrupo) => {
    const today = new Date().getTime();
    const start = new Date(meta.inicioMeta).getTime();
    const end = new Date(meta.fimMeta).getTime();
    if (today >= start && today <= end) return { label: 'EM ABERTO', color: THEME.positive };
    if (today < start) return { label: 'PROGRAMADA', color: '#5E5CE6' };
    return { label: 'FINALIZADA', color: THEME.secondaryText };
  };

  return (
    <View style={[styles.container, { backgroundColor: THEME.bg }]}>
      <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} />
      <Stack.Screen options={{ 
        headerShown: true, 
        title: 'Histórico',
        headerLargeTitle: true,
        headerBackTitle: 'Voltar',
        headerTransparent: true,
        headerBlurEffect: isDark ? 'dark' : 'light',
        headerTintColor: THEME.primary,
        headerStyle: { backgroundColor: THEME.bg }
      }} />

      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="small" color={THEME.primary} />
        </View>
      ) : (
        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false} contentInsetAdjustmentBehavior="automatic">
          {metas.length === 0 ? (
            <View style={styles.emptyContainer}>
              <FontAwesome name="history" size={50} color={isDark ? '#2C3641' : '#E5E7EB'} />
              <Text style={[styles.emptyText, { color: THEME.secondaryText }]}>Você ainda não possui histórico de metas.</Text>
            </View>
          ) : (
            metas.map((item) => {
              const status = getStatus(item.totalUnidades, item);
              const trophy = getTrophy(item.totalUnidades, item);
              return (
                <View key={item.grupoId} style={[styles.historyCard, { backgroundColor: THEME.card, borderColor: THEME.border }]}>
                  <View style={styles.cardHeader}>
                    <View style={[styles.statusBadge, { backgroundColor: status.color + '15' }]}>
                      <View style={[styles.statusDot, { backgroundColor: status.color }]} />
                      <Text style={[styles.statusText, { color: status.color }]}>{status.label}</Text>
                    </View>
                    <Text style={[styles.dateText, { color: THEME.secondaryText }]}>{formatDateRange(item.inicioMeta, item.fimMeta)}</Text>
                  </View>

                  <View style={styles.cardMain}>
                    <View style={styles.cardInfo}>
                      <Text style={[styles.campaignTitle, { color: THEME.text }]}>{item.grupoNome}</Text>
                      <View style={styles.metaBadge}>
                          <Text style={[styles.metaBadgeText, { color: THEME.accent }]}>
                            {item.totalUnidades.toLocaleString('pt-BR')} UNIDADES VENDIDAS
                          </Text>
                      </View>
                    </View>
                    {trophy && (
                      <View style={[styles.trophyBg, { backgroundColor: THEME.accent + '10' }]}>
                        <Image source={trophy} style={styles.trophyIcon} />
                      </View>
                    )}
                  </View>

                  <View style={[styles.goalLine, { borderTopColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)' }]}>
                    <View style={styles.goalPill}>
                         <Text style={[styles.goalPillText, { color: THEME.secondaryText }]}>🥉 {item.bronze}</Text>
                    </View>
                    <View style={styles.goalPill}>
                         <Text style={[styles.goalPillText, { color: THEME.secondaryText }]}>🥈 {item.prata}</Text>
                    </View>
                    <View style={styles.goalPill}>
                         <Text style={[styles.goalPillText, { color: THEME.secondaryText }]}>🥇 {item.ouro}</Text>
                    </View>
                  </View>
                </View>
              );
            })
          )}
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  scrollContent: { padding: 16, paddingBottom: 40 },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  emptyContainer: { flex: 1, paddingTop: 100, alignItems: 'center', justifyContent: 'center' },
  emptyText: { fontSize: 16, textAlign: 'center', marginTop: 16 },
  historyCard: { 
    borderRadius: 24, 
    padding: 20, 
    marginBottom: 16, 
    borderWidth: 1, 
    shadowColor: '#000', 
    shadowOffset: { width: 0, height: 4 }, 
    shadowOpacity: 0.04, 
    shadowRadius: 12,
    elevation: 3
  },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  statusBadge: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 10, paddingVertical: 5, borderRadius: 10 },
  statusDot: { width: 6, height: 6, borderRadius: 3, marginRight: 6 },
  statusText: { fontSize: 10, fontWeight: '800', letterSpacing: 0.5 },
  dateText: { fontSize: 11, fontWeight: '600' },
  cardMain: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 },
  cardInfo: { flex: 1 },
  campaignTitle: { fontSize: 20, fontWeight: '900', marginBottom: 8, letterSpacing: -0.5 },
  metaBadge: { alignSelf: 'flex-start', paddingBottom: 2 },
  metaBadgeText: { fontSize: 12, fontWeight: '800' },
  trophyBg: { width: 60, height: 60, borderRadius: 30, justifyContent: 'center', alignItems: 'center' },
  trophyIcon: { width: 36, height: 36, resizeMode: 'contain' },
  goalLine: { flexDirection: 'row', alignItems: 'center', paddingTop: 16, borderTopWidth: 1, gap: 12 },
  goalPill: { backgroundColor: 'rgba(0,0,0,0.03)', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 },
  goalPillText: { fontSize: 12, fontWeight: '700' },
});
