import * as SecureStore from 'expo-secure-store';
import { useCallback, useEffect, useState } from 'react';
import api from '../api/api';

export interface Meta {
    id: string;
    nomeMetas: string;
    tipoMeta: string;
    unidadeMeta: number;
    valorMeta: number;
    totalUnidadeMeta: number;
    totalValorMeta: number;
    totalUnidadeMetaForecast: number;
    totalValorMetaForecast: number;
}

export interface MetaGrupo {
    id: string;
    grupoId: string;
    inicioMeta: string;
    fimMeta: string;
    totalUnidades: number;
    totalValor: number;
    bronze: number;
    prata: number;
    ouro: number;
    metas: Meta[];
}

export const useMetas = () => {
    const [selectedMeta, setSelectedMeta] = useState<MetaGrupo | null>(null);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [celebration, setCelebration] = useState<{ label: string, icon: any, tint: string, value: number } | null>(null);

    const fetchMetas = useCallback(async () => {
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
                    checkMilestones(active);
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
    }, []);

    const checkMilestones = async (meta: MetaGrupo) => {
        try {
            const key = `celebrated_${meta.grupoId}`;
            const stored = await SecureStore.getItemAsync(key);
            const celebrated = stored ? JSON.parse(stored) : [];
            
            let milestone = null;
            
            // Priority Ouro -> Prata -> Bronze
            if (meta.totalUnidades >= meta.ouro && !celebrated.includes('Ouro')) {
                milestone = { label: 'Ouro', icon: require('../assets/images/gold-trophy.png'), tint: '#FFB300', value: meta.totalUnidades };
                celebrated.push('Ouro');
            } else if (meta.totalUnidades >= meta.prata && !celebrated.includes('Prata')) {
                milestone = { label: 'Prata', icon: require('../assets/images/silver-trophy.png'), tint: '#90A4AE', value: meta.totalUnidades };
                celebrated.push('Prata');
            } else if (meta.totalUnidades >= meta.bronze && !celebrated.includes('Bronze')) {
                milestone = { label: 'Bronze', icon: require('../assets/images/bronze-trophy.png'), tint: '#CD7F32', value: meta.totalUnidades };
                celebrated.push('Bronze');
            }

            if (milestone) {
                await SecureStore.setItemAsync(key, JSON.stringify(celebrated));
                setCelebration(milestone);
            }
        } catch (e) {
            console.error('Erro ao verificar conquistas:', e);
        }
    };

    const calculateForecast = () => {
        if (!selectedMeta) return 0;
        const start = new Date(selectedMeta.inicioMeta).getTime();
        const end = new Date(selectedMeta.fimMeta).getTime();
        const today = new Date().getTime();
        
        const totalDays = Math.ceil((end - start) / (1000 * 60 * 60 * 24));
        const daysPassed = Math.max(1, Math.ceil((today - start) / (1000 * 60 * 60 * 24)));
        
        const dailyPace = selectedMeta.totalUnidades / daysPassed;
        return Math.round(dailyPace * totalDays);
    };

    useEffect(() => {
        fetchMetas();
    }, [fetchMetas]);

    return {
        selectedMeta,
        loading,
        refreshing,
        celebration,
        setCelebration,
        fetchMetas,
        calculateForecast
    };
};
