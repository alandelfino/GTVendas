import { FontAwesome, Ionicons } from '@expo/vector-icons';
import React from 'react';
import { Modal, Platform, StyleSheet, Text, TouchableOpacity, View, ScrollView, Image } from 'react-native';

interface LevelDetailSheetProps {
    visible: boolean;
    onClose: () => void;
    level: {
        name: string;
        target: number;
        current: number;
        icon: any;
        color: string;
    } | null;
    isDark: boolean;
    THEME: any;
    forecastUnits: number;
    endDate: string;
}

export const LevelDetailSheet = ({ 
    visible, 
    onClose, 
    level, 
    isDark, 
    THEME, 
    forecastUnits,
    endDate
}: LevelDetailSheetProps) => {
    if (!level) return null;

    const percentage = Math.min((level.current / level.target) * 100, 100);
    const missing = Math.max(level.target - level.current, 0);
    const reached = level.current >= level.target;
    const willReach = forecastUnits >= level.target;

    return (
        <Modal 
            visible={visible} 
            transparent={Platform.OS !== 'ios'}
            animationType="slide"
            presentationStyle={Platform.OS === 'ios' ? 'pageSheet' : 'overFullScreen'}
            onRequestClose={onClose}
        >
            <View style={[styles.container, { backgroundColor: THEME.bg }]}>
                {/* Header Estilo Titanium */}
                <View style={[styles.modalHeader, { borderBottomColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)' }]}>
                    <View style={styles.modalHandle} />
                    <Text style={[styles.modalTitle, { color: THEME.text }]}>Métricas do Nível</Text>
                    <TouchableOpacity onPress={onClose} style={styles.modalClose}>
                        <Text style={{ color: THEME.accent, fontWeight: '700', fontSize: 17 }}>OK</Text>
                    </TouchableOpacity>
                </View>

                <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
                    {/* Hero com Troféu Real */}
                    <View style={styles.heroSection}>
                        <View style={[styles.trophyContainer, { backgroundColor: level.color + '10' }]}>
                             <Image 
                                source={level.icon} 
                                style={styles.trophyImage}
                                resizeMode="contain"
                             />
                        </View>
                        <View style={styles.levelBadge}>
                             <Text style={[styles.levelName, { color: THEME.text }]}>{level.name}</Text>
                        </View>
                        <View style={[styles.statusTag, { backgroundColor: reached ? THEME.positive + '15' : THEME.accent + '10' }]}>
                            <View style={[styles.statusDot, { backgroundColor: reached ? THEME.positive : THEME.accent }]} />
                            <Text style={[styles.statusText, { color: reached ? THEME.positive : THEME.accent }]}>
                                {reached ? 'CONQUISTADO' : 'EM EVOLUÇÃO'}
                            </Text>
                        </View>
                    </View>

                    {/* Cards de Métricas Estilo GGT */}
                    <View style={styles.metricsRow}>
                        <View style={[styles.metricCard, { backgroundColor: THEME.card }]}>
                            <Text style={[styles.metricLabel, { color: THEME.secondaryText }]}>ATUAL</Text>
                            <Text style={[styles.metricMainValue, { color: THEME.text }]}>{level.current.toLocaleString('pt-BR')}</Text>
                            <Text style={[styles.metricUnit, { color: THEME.secondaryText }]}>unidades</Text>
                        </View>

                        <View style={[styles.metricCard, { backgroundColor: THEME.card }]}>
                            <Text style={[styles.metricLabel, { color: THEME.secondaryText }]}>OBJETIVO</Text>
                            <Text style={[styles.metricMainValue, { color: level.color }]}>{level.target.toLocaleString('pt-BR')}</Text>
                            <Text style={[styles.metricUnit, { color: THEME.secondaryText }]}>unidades</Text>
                        </View>
                    </View>

                    {/* Barra de Progresso Titanium */}
                    <View style={[styles.progressCard, { backgroundColor: THEME.card }]}>
                        <View style={styles.progressHeader}>
                            <Text style={[styles.progressLabel, { color: THEME.secondaryText }]}>PROGRESSO ATUAL</Text>
                            <Text style={[styles.progressPct, { color: level.color }]}>{percentage.toFixed(1)}%</Text>
                        </View>
                        <View style={[styles.progressTrack, { backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : '#F2F2F7' }]}>
                            <View style={[styles.progressBar, { width: `${percentage}%`, backgroundColor: level.color }]} />
                        </View>
                        {!reached && (
                            <View style={styles.missingContainer}>
                                <Ionicons name="arrow-up-circle-outline" size={14} color={THEME.secondaryText} />
                                <Text style={[styles.missingText, { color: THEME.secondaryText }]}>
                                    Faltam <Text style={{fontWeight: '800', color: THEME.text}}>{missing.toLocaleString('pt-BR')}</Text> un para o troféu.
                                </Text>
                            </View>
                        )}
                    </View>

                    {/* Previsão de Performance */}
                    <View style={[styles.forecastBox, { 
                        backgroundColor: reached ? THEME.positive + '08' : (willReach ? THEME.accent + '08' : THEME.danger + '08'),
                        borderColor: reached ? THEME.positive + '20' : (willReach ? THEME.accent + '20' : THEME.danger + '20')
                    }]}>
                        <View style={styles.forecastHeader}>
                            <View style={[styles.forecastIcon, { backgroundColor: reached ? THEME.positive : (willReach ? THEME.accent : THEME.danger) }]}>
                                <Ionicons name={reached ? "star" : (willReach ? "trending-up" : "warning")} size={16} color="#FFF" />
                            </View>
                            <Text style={[styles.forecastTitle, { color: reached ? THEME.positive : (willReach ? THEME.accent : THEME.danger) }]}>
                                ANÁLISE DE PROJEÇÃO
                            </Text>
                        </View>
                        <Text style={[styles.forecastText, { color: THEME.text }]}>
                            {reached 
                                ? `Excelente desempenho! O nível ${level.name} já foi superado. Continue mantendo o ritmo para o próximo desafio.` 
                                : (willReach 
                                    ? `Sua performance atual é sólida! Mantendo este volume, a previsão é que você atinja ${level.name} antes de ${new Date(endDate).toLocaleDateString('pt-BR')}.`
                                    : `Alerta: Seu volume médio atual não é suficiente para atingir o troféu de ${level.name}. É necessário aumentar o fechamento de pedidos até o fim da campanha.`
                                )
                            }
                        </Text>
                    </View>
                </ScrollView>
            </View>
        </Modal>
    );
};

const styles = StyleSheet.create({
    container: { flex: 1 },
    modalHeader: { height: 60, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', borderBottomWidth: 1, paddingHorizontal: 16 },
    modalHandle: { position: 'absolute', top: 8, width: 36, height: 5, borderRadius: 2.5, backgroundColor: '#C7C7CC' },
    modalTitle: { fontSize: 16, fontWeight: '800', textTransform: 'uppercase', letterSpacing: 0.5, marginTop: 10 },
    modalClose: { position: 'absolute', right: 16, marginTop: 10 },
    scrollContent: { padding: 20, paddingBottom: 60 },
    heroSection: { alignItems: 'center', marginBottom: 32 },
    trophyContainer: { width: 140, height: 140, borderRadius: 70, justifyContent: 'center', alignItems: 'center', marginBottom: 16 },
    trophyImage: { width: 90, height: 90 },
    levelBadge: { marginBottom: 10 },
    levelName: { fontSize: 32, fontWeight: '900', letterSpacing: -1 },
    statusTag: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20 },
    statusDot: { width: 8, height: 8, borderRadius: 4, marginRight: 8 },
    statusText: { fontSize: 12, fontWeight: '800', letterSpacing: 0.5 },
    metricsRow: { flexDirection: 'row', gap: 12, marginBottom: 12 },
    metricCard: { flex: 1, borderRadius: 16, padding: 20, alignItems: 'center' },
    metricLabel: { fontSize: 10, fontWeight: '700', letterSpacing: 1.2, marginBottom: 8 },
    metricMainValue: { fontSize: 22, fontWeight: '900' },
    metricUnit: { fontSize: 12, fontWeight: '500', marginTop: 4 },
    progressCard: { borderRadius: 16, padding: 20, marginBottom: 20 },
    progressHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
    progressLabel: { fontSize: 11, fontWeight: '700', letterSpacing: 0.5 },
    progressPct: { fontSize: 18, fontWeight: '900' },
    progressTrack: { height: 10, borderRadius: 5, overflow: 'hidden' },
    progressBar: { height: '100%', borderRadius: 5 },
    missingContainer: { flexDirection: 'row', alignItems: 'center', marginTop: 12, gap: 6 },
    missingText: { fontSize: 12, fontWeight: '500' },
    forecastBox: { padding: 20, borderRadius: 16, borderWidth: 1 },
    forecastHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 12, gap: 10 },
    forecastIcon: { width: 28, height: 28, borderRadius: 14, justifyContent: 'center', alignItems: 'center' },
    forecastTitle: { fontSize: 13, fontWeight: '900', letterSpacing: 0.5 },
    forecastText: { fontSize: 14, lineHeight: 22, fontWeight: '500' }
});
