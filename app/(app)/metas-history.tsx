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
  useColorScheme,
  Platform
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
    bg: isDark ? '#000000' : '#F2F2F7',
    card: isDark ? '#1C1C1E' : '#FFFFFF',
    text: isDark ? '#FFFFFF' : '#000000',
    secondaryText: isDark ? '#8E8E93' : '#8E8E93',
    primary: '#0A84FF',
    border: isDark ? '#2C2C2E' : '#E5E5EA',
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
    const months = ['jan.', 'fev.', 'mar.', 'abr.', 'mai.', 'jun.', 'jul.', 'ago.', 'set.', 'out.', 'nov.', 'dez.'];
    return `${d1.getDate()} de ${months[d1.getMonth()]} de ${d1.getFullYear()} — ${d2.getDate()} de ${months[d2.getMonth()]} de ${d2.getFullYear()}`;
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
    if (today >= start && today <= end) return { label: 'EM ABERTO', color: '#32D74B' };
    if (today < start) return { label: 'PROGRAMADA', color: '#5E5CE6' };
    return { label: 'FINALIZADA', color: '#8E8E93' };
  };

  return (
    <View style={[styles.container, { backgroundColor: THEME.bg }]}>
      <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} />
      <Stack.Screen options={{ 
        headerShown: true, 
        title: 'Histórico de Metas',
        headerLargeTitle: true,
        headerBackTitle: 'Voltar',
        headerTransparent: Platform.OS === 'ios',
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
              <FontAwesome name="history" size={50} color={isDark ? '#1C1C1E' : '#E5E7EB'} />
              <Text style={[styles.emptyText, { color: THEME.secondaryText }]}>Você ainda não possui histórico de metas.</Text>
            </View>
          ) : (
            metas.map((item) => {
              const status = getStatus(item.totalUnidades, item);
              const trophy = getTrophy(item.totalUnidades, item);
              return (
                <View key={item.grupoId} style={[styles.historyCard, { backgroundColor: THEME.card, borderColor: THEME.border }]}>
                  <View style={styles.cardHeader}>
                    <View style={[styles.statusBadge, { backgroundColor: status.color + (isDark ? '30' : '15') }]}>
                      <Text style={[styles.statusText, { color: status.color }]}>{status.label}</Text>
                    </View>
                    <Text style={[styles.dateText, { color: THEME.secondaryText }]}>{formatDateRange(item.inicioMeta, item.fimMeta)}</Text>
                  </View>

                  <View style={styles.cardMain}>
                    <View style={styles.cardInfo}>
                      <Text style={[styles.campaignTitle, { color: THEME.text }]}>{item.grupoNome}</Text>
                      <Text style={[styles.unitsText, { color: THEME.secondaryText }]}>
                        {item.totalUnidades.toLocaleString('pt-BR')} unidades vendidas
                      </Text>
                    </View>
                    {trophy && (
                      <Image source={trophy} style={styles.trophyIcon} />
                    )}
                  </View>

                  <View style={[styles.goalLine, { borderTopColor: THEME.border }]}>
                    <Text style={[styles.goalText, { color: THEME.secondaryText }]}>Metas: </Text>
                    <Text style={[styles.goalDetail, { color: THEME.secondaryText }]}>🥉 {item.bronze} | 🥈 {item.prata} | 🥇 {item.ouro}</Text>
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
  historyCard: { borderRadius: 20, padding: 20, marginBottom: 16, borderWidth: 1, ...Platform.select({ ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.03, shadowRadius: 10 }, android: { elevation: 2 } }) },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  statusBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 },
  statusText: { fontSize: 10, fontWeight: '800', letterSpacing: 0.5 },
  dateText: { fontSize: 11 },
  cardMain: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 },
  cardInfo: { flex: 1 },
  campaignTitle: { fontSize: 18, fontWeight: '700', marginBottom: 4 },
  unitsText: { fontSize: 14 },
  trophyIcon: { width: 44, height: 44, resizeMode: 'contain' },
  goalLine: { flexDirection: 'row', alignItems: 'center', paddingTop: 12, borderTopWidth: 0.5 },
  goalText: { fontSize: 12, fontWeight: '600' },
  goalDetail: { fontSize: 12 },
});
