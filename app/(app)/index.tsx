import { FontAwesome, Ionicons } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';
import { Stack, useRouter } from 'expo-router';
import * as SecureStore from 'expo-secure-store';
import React, { useEffect, useState } from 'react';
import {
    ActivityIndicator,
    Dimensions,
    Image,
    Pressable,
    RefreshControl,
    ScrollView,
    StatusBar,
    StyleSheet,
    Text,
    TouchableOpacity,
    useColorScheme,
    View
} from 'react-native';
import { LineChart } from 'react-native-chart-kit';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Path } from 'react-native-svg';
import api from '../../api/api';
import { CelebrationModal } from '../../components/dashboard/CelebrationModal';
import { UserMenu } from '../../components/dashboard/UserMenu';
import { LevelDetailSheet } from '../../components/dashboard/LevelDetailSheet';
import { useAuth } from '../../context/AuthContext';
import { styles } from '../../src/styles/index.style';

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
    const insets = useSafeAreaInsets();
    const colorScheme = useColorScheme();
    const isDark = colorScheme === 'dark';

    const [loading, setLoading] = useState(true);
    const [selectedMeta, setSelectedMeta] = useState<MetaGrupo | null>(null);
    const [showUserMenu, setShowUserMenu] = useState(false);
    const [refreshing, setRefreshing] = useState(false);
    const [celebration, setCelebration] = useState<{ visible: boolean, level: string, units: number, icon: any } | null>(null);
    const [selectedLevelInfo, setSelectedLevelInfo] = useState<{
        visible: boolean;
        level: { name: string; target: number; current: number; icon: any; color: string } | null;
    }>({ visible: false, level: null });

    // Interactive Chart State
    const [tooltipData, setTooltipData] = useState<{ value: number, index: number, x: number, y: number } | null>(null);

    const THEME = {
        bg: isDark ? '#1C252E' : '#F2F2F7',
        card: isDark ? '#2C3641' : '#FFFFFF',
        text: isDark ? '#FFFFFF' : '#1C252E',
        secondaryText: isDark ? '#8E9AA9' : '#636366',
        navAction: isDark ? '#2C3641' : '#E5E5EA',
        navText: isDark ? '#F9B252' : '#3D4956', // Azul Titânio Suave no light
        separator: isDark ? '#3D4956' : '#C6C6C8',
        accent: '#F9B252',
        positive: '#32D74B',
        danger: '#FF453A',
    };

    useEffect(() => {
        fetchMetas();
    }, []);

    useEffect(() => {
        if (selectedMeta) {
            checkCelebration();
        }
    }, [selectedMeta]);

    const checkCelebration = async () => {
        if (!selectedMeta) return;

        const levels = [
            { name: 'Bronze', target: selectedMeta.bronze, icon: BronzeTrophy },
            { name: 'Prata', target: selectedMeta.prata, icon: SilverTrophy },
            { name: 'Ouro', target: selectedMeta.ouro, icon: GoldTrophy },
        ];

        // Procurar do mais alto para o mais baixo
        const reachedLevel = [...levels].reverse().find(l => selectedMeta.totalUnidades >= l.target);

        if (reachedLevel) {
            const key = `celebrated_${selectedMeta.grupoId}_${reachedLevel.name}`;
            const alreadyCelebrated = await SecureStore.getItemAsync(key);

            if (!alreadyCelebrated) {
                setCelebration({
                    visible: true,
                    level: reachedLevel.name,
                    units: Math.floor(selectedMeta.totalUnidades),
                    icon: reachedLevel.icon
                });
                await SecureStore.setItemAsync(key, 'true');
            }
        }
    };

    const fetchMetas = async () => {
        try {
            const response = await api.get('/api/rep/metas');
            const allMetas = response.data;

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
            setRefreshing(false);
        }
    };

    const onRefresh = React.useCallback(() => {
        setRefreshing(true);
        fetchMetas();
    }, []);

    const formatDateRange = (start: string, end: string) => {
        const d1 = new Date(start);
        const d2 = new Date(end);
        const months = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez'];
        return `${d1.getDate()} ${months[d1.getMonth()]} — ${d2.getDate()} ${months[d2.getMonth()]} de ${d2.getFullYear()}`;
    };

    const currentLevel = () => {
        if (!selectedMeta) return 0;
        if (selectedMeta.totalUnidades >= selectedMeta.ouro) return selectedMeta.ouro;
        if (selectedMeta.totalUnidades >= selectedMeta.prata) return selectedMeta.prata;
        if (selectedMeta.totalUnidades >= selectedMeta.bronze) return selectedMeta.bronze;
        return 0;
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
        if (size <= 0) return null;
        const strokeWidth = 22;
        const radius = (size - strokeWidth) / 2;
        const circumference = Math.PI * radius;

        // Determine Next Level and Progress
        let nextLevelValue = bronze;
        let nextLevelName = 'Bronze';
        
        if (totalUnits >= prata) {
            nextLevelValue = ouro;
            nextLevelName = 'Ouro';
        } else if (totalUnits >= bronze) {
            nextLevelValue = prata;
            nextLevelName = 'Prata';
        }
        
        const nextLevelProgress = Math.min((totalUnits / nextLevelValue) * 100, 100);
        const strokeDashoffset = circumference - (nextLevelProgress / 100) * circumference;

        // Calc percentages for each level
        const bronzePct = Math.min(Math.round((totalUnits / bronze) * 100), 100);
        const silverPct = Math.min(Math.round((totalUnits / prata) * 100), 100);
        const goldPct = Math.min(Math.round((totalUnits / ouro) * 100), 100);

        const LevelPill = ({ icon, percent, label, tint, value }: { icon: any, percent: number, label: string, tint: string, value: number }) => (
            <TouchableOpacity 
                activeOpacity={0.7}
                onPress={() => setSelectedLevelInfo({
                    visible: true,
                    level: { name: label, target: value, current: totalUnits, icon, color: tint }
                })}
                style={[
                    styles.levelPill, 
                    { 
                        flexDirection: 'column',
                        alignItems: 'center',
                        paddingVertical: 14,
                        paddingHorizontal: 4,
                        backgroundColor: isDark ? '#1C252E' : '#FFFFFF', 
                        borderColor: percent === 100 ? THEME.accent : (isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)'),
                        minHeight: 135,
                        position: 'relative',
                        borderWidth: 1,
                    }
                ]}
            >
                {percent === 100 && (
                    <View style={{ position: 'absolute', top: 6, right: 6 }}>
                        <Ionicons name="checkmark-circle" size={16} color={THEME.accent} />
                    </View>
                )}
                
                <View style={[styles.pillIconBg, { backgroundColor: tint + (isDark ? '20' : '10'), marginBottom: 8, marginRight: 0, width: 40, height: 40, borderRadius: 20 }]}>
                    <Image source={icon} style={[styles.pillIcon, { width: 24, height: 24 }]} />
                </View>

                <Text style={{ fontSize: 10, fontWeight: '800', color: THEME.secondaryText, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 4 }}>
                    {label}
                </Text>
                
                <Text style={[styles.pillPercent, { color: percent === 100 ? THEME.accent : THEME.text, fontSize: 16, marginBottom: 2 }]}>
                    {percent}%
                </Text>
                
                <Text style={[styles.pillLabel, { color: THEME.secondaryText, fontSize: 11, opacity: 0.7 }]}>
                    {value.toLocaleString('pt-BR')} un
                </Text>
            </TouchableOpacity>
        );

        return (
            <View style={styles.gaugeContainer}>
                <View style={{ position: 'relative', alignItems: 'center' }}>
                    <Svg width={size} height={size / 2 + 10} viewBox={`0 0 ${size} ${size / 2 + 10}`}>
                        <Path
                            d={`M ${strokeWidth / 2} ${size / 2} A ${radius} ${radius} 0 0 1 ${size - strokeWidth / 2} ${size / 2}`}
                            fill="none"
                            stroke={isDark ? '#1C1C1E' : '#E5E5EA'}
                            strokeWidth={strokeWidth}
                            strokeLinecap="round"
                        />
                        <Path
                            d={`M ${strokeWidth / 2} ${size / 2} A ${radius} ${radius} 0 0 1 ${size - strokeWidth / 2} ${size / 2}`}
                            fill="none"
                            stroke={THEME.accent}
                            strokeWidth={strokeWidth}
                            strokeDasharray={`${circumference} ${circumference}`}
                            strokeDashoffset={strokeDashoffset}
                            strokeLinecap="round"
                        />
                    </Svg>
                    <View style={styles.gaugeContent}>
                        <Text style={[styles.gaugeUnits, { color: THEME.text }]}>{totalUnits.toLocaleString('pt-BR')}</Text>
                        <Text style={[styles.gaugeSublabel, { color: THEME.secondaryText }]}>unidades vendidas</Text>
                        <View style={[styles.rumoContainer, { backgroundColor: THEME.accent + '15' }]}>
                           <Text style={[styles.rumoAo, { color: THEME.accent }]}>rumo ao {nextLevelName}</Text>
                        </View>
                    </View>
                </View>

                <View style={styles.pillsContainer}>
                    <LevelPill icon={BronzeTrophy} percent={bronzePct} value={bronze} label="Bronze" tint="#CD7F32" />
                    <LevelPill icon={SilverTrophy} percent={silverPct} value={prata} label="Prata" tint="#C0C0C0" />
                    <LevelPill icon={GoldTrophy} percent={goldPct} value={ouro} label="Ouro" tint="#FFD700" />
                </View>
            </View>
        );
    };

    if (loading) {
        return (
            <View style={[styles.loadingContainer, { backgroundColor: THEME.bg }]}>
                <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} translucent backgroundColor="transparent" />
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
            <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} translucent backgroundColor="transparent" />
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

            <ScrollView
                contentContainerStyle={styles.scrollContent}
                showsVerticalScrollIndicator={false}
                refreshControl={
                    <RefreshControl
                        refreshing={refreshing}
                        onRefresh={onRefresh}
                        tintColor={THEME.navText}
                        colors={[THEME.navText]}
                    />
                }
            >
                <View style={styles.headerTitleArea}>
                    <Text style={[styles.userName, { color: THEME.text }]}>Olá, {user?.nomeCompleto?.split(' ')[0] || user?.username || ''}</Text>
                    <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 8 }}>
                        <View style={{ 
                            backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : '#FFFFFF', 
                            paddingHorizontal: 10, 
                            paddingVertical: 3, 
                            borderRadius: 6,
                            borderWidth: 1,
                            borderColor: isDark ? 'rgba(255,255,255,0.1)' : '#E5E5EA',
                            shadowColor: '#000',
                            shadowOffset: { width: 0, height: 1 },
                            shadowOpacity: isDark ? 0 : 0.05,
                            shadowRadius: 2,
                            elevation: 1
                        }}>
                            <Text style={{ 
                                fontSize: 11, 
                                fontWeight: '700', 
                                color: THEME.navText,
                                textTransform: 'uppercase',
                                letterSpacing: 0.6
                            }}>
                                {selectedMeta?.grupoNome || ''}
                            </Text>
                        </View>
                    </View>
                    <Text style={[{ fontSize: 12, marginTop: 8}, { color: THEME.secondaryText }]}>
                        {selectedMeta ? formatDateRange(selectedMeta.inicioMeta, selectedMeta.fimMeta) : '...'}
                    </Text>
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

                <View style={styles.footer}>
                    <Text style={[styles.footerText, { color: THEME.secondaryText }]}>© 2026 - Grupo Titanium </Text>
                </View>
            </ScrollView>

            {/* Fixed Bottom Menu (IOS UI KIT Style) */}
            <View style={[
                styles.fixedBottomNav, 
                { 
                    backgroundColor: 'transparent',
                    paddingBottom: insets.bottom,
                }
            ]}>
                <BlurView 
                    intensity={isDark ? 85 : 95} 
                    tint={isDark ? 'dark' : 'light'} 
                    style={StyleSheet.absoluteFill} 
                />
                <View style={[
                    styles.navInner, 
                    { borderTopColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)' }
                ]}>
                    <TouchableOpacity style={styles.navButtonItem} onPress={() => router.push('/chat')}>
                        <FontAwesome name="commenting-o" size={22} color={THEME.navText} />
                        <Text style={[styles.navButtonLabel, { color: THEME.navText }]}>Assistente</Text>
                    </TouchableOpacity>

                    <TouchableOpacity style={styles.navButtonItem} onPress={() => router.push('/analytics')}>
                        <FontAwesome name="line-chart" size={20} color={THEME.navText} />
                        <Text style={[styles.navButtonLabel, { color: THEME.navText }]}>Analytics</Text>
                    </TouchableOpacity>

                    <TouchableOpacity style={styles.navButtonItem} onPress={() => router.push('/orders')}>
                        <FontAwesome name="shopping-cart" size={20} color={THEME.navText} />
                        <Text style={[styles.navButtonLabel, { color: THEME.navText }]}>Pedidos</Text>
                    </TouchableOpacity>

                    <TouchableOpacity style={styles.navButtonItem} onPress={() => router.push('/customers')}>
                        <FontAwesome name="users" size={20} color={THEME.navText} />
                        <Text style={[styles.navButtonLabel, { color: THEME.navText }]}>Clientes</Text>
                    </TouchableOpacity>

                    <TouchableOpacity style={styles.navButtonItem} onPress={() => router.push('/pipeline')}>
                        <FontAwesome name="sitemap" size={20} color={THEME.navText} />
                        <Text style={[styles.navButtonLabel, { color: THEME.navText }]}>Pipeline</Text>
                    </TouchableOpacity>
                </View>
            </View>

                        {/* iOS Modal Menu */}
            <UserMenu 
                visible={showUserMenu}
                onClose={() => setShowUserMenu(false)}
                isDark={isDark}
                insets={insets}
                user={user}
                THEME={THEME}
                handleLogout={handleLogout}
                router={router}
                styles={styles}
            />

            {/* Celebration Modal */}
            {celebration && (
                <CelebrationModal
                    visible={celebration.visible}
                    onClose={() => setCelebration(null)}
                    level={celebration.level}
                    units={celebration.units}
                    trophyIcon={celebration.icon}
                    isDark={isDark}
                    THEME={THEME}
                />
            )}

            <LevelDetailSheet
                visible={selectedLevelInfo.visible}
                onClose={() => setSelectedLevelInfo({ ...selectedLevelInfo, visible: false })}
                level={selectedLevelInfo.level}
                isDark={isDark}
                THEME={THEME}
                forecastUnits={forecast}
                endDate={selectedMeta?.fimMeta || ''}
            />
        </View>
    );
}

