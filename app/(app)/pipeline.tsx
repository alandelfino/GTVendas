import React, { useState, useEffect, useRef } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  FlatList, 
  TouchableOpacity, 
  useColorScheme, 
  ActivityIndicator,
  Alert,
  RefreshControl,
  ActionSheetIOS,
  Pressable
} from 'react-native';
import { Swipeable } from 'react-native-gesture-handler';
import { Stack } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import api from '../../api/api';

// Componentes Titanium Modularizados
import { Stage, Board, Pipeline, Card, Theme } from '../../components/pipeline/types';
import PipelineCard from '../../components/pipeline/PipelineCard';
import PipelineEditor from '../../components/pipeline/PipelineEditor';
import BoardManager from '../../components/pipeline/BoardManager';
import KanbanView from '../../components/pipeline/KanbanView';

export default function PipelineScreen() {
  const isDark = useColorScheme() === 'dark';
  const insets = useSafeAreaInsets();
  
  const THEME: Theme = {
    bg: isDark ? '#1C252E' : '#F2F2F7',
    card: isDark ? '#2C3641' : '#FFFFFF',
    text: isDark ? '#FFFFFF' : '#1C252E',
    secondary: isDark ? '#8E9AA9' : '#636366',
    border: isDark ? '#3D4956' : '#E5E5EA',
    accent: '#F9B252',
    red: '#FF3B30',
    green: '#34C759',
  };

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [boards, setBoards] = useState<Board[]>([]);
  const [pipelines, setPipelines] = useState<Pipeline[]>([]);
  const [collections, setCollections] = useState<any[]>([]);

  // Modals visibility
  const [boardManagerVisible, setBoardManagerVisible] = useState(false);
  const [pipelineEditorVisible, setPipelineEditorVisible] = useState(false);
  const [kanbanVisible, setKanbanVisible] = useState(false);
  const [stageEditorVisible, setStageEditorVisible] = useState(false);

  // Focus states
  const [selectedPipeline, setSelectedPipeline] = useState<Pipeline | null>(null);
  const [editingPipeline, setEditingPipeline] = useState<Partial<Pipeline> | null>(null);
  const [selectedBoard, setSelectedBoard] = useState<Board | null>(null);
  const [editingBoard, setEditingBoard] = useState<Partial<Board> | null>(null);
  const [editingStage, setEditingStage] = useState<Partial<Stage> | null>(null);

  // Kanban View States
  const [kanbanCards, setKanbanCards] = useState<Card[]>([]);
  const [activeStageId, setActiveStageId] = useState<number | null>(null);
  const [actionLoading, setActionLoading] = useState(false);

  const init = async (isRefresh = false, isSilent = false) => {
    if (!isRefresh && !isSilent) setLoading(true);
    try {
      const [bRes, pRes, cRes] = await Promise.all([
        api.get('/api/rep/pipeline-boards'),
        api.get('/api/rep/pipelines'),
        api.get('/api/erp/colecoes')
      ]);
      setBoards(bRes.data);
      setPipelines(pRes.data);
      setCollections(cRes.data.data || []);
      
      if (selectedBoard) {
        const updated = bRes.data.find((b: Board) => b.id === selectedBoard.id);
        if (updated) setSelectedBoard(updated);
      }
    } catch (err) {
      console.error('Pipeline Init Error:', err);
    } finally {
      if (!isSilent) setLoading(false);
      setRefreshing(false);
    }
  };

  const fetchKanbanData = async (pipelineId: number) => {
    try {
      const p = pipelines.find(x => x.id === pipelineId);
      if (!p) return;
      const res = await api.get(`/api/rep/pipelines/${pipelineId}/cards`);
      setKanbanCards(res.data);
      
      const b = boards.find(board => board.id === p.boardId);
      if (b && b.estagios.length > 0 && !activeStageId) {
        setActiveStageId(b.estagios.sort((a,b)=>a.ordem-b.ordem)[0].id);
      }
    } catch (err) {
      console.error('Fetch Kanban Data Error:', err);
    }
  };

  const swipeableRefs = useRef<Map<string, Swipeable>>(new Map());
  const openRowKey = useRef<string | null>(null);

  const closeOpenRow = () => {
    if (openRowKey.current !== null) {
      swipeableRefs.current.get(openRowKey.current)?.close();
      openRowKey.current = null;
    }
  };

  const savePipeline = async (data: Partial<Pipeline>) => {
    if (!data?.nome || !data?.colecaoId || !data?.boardId) {
      return Alert.alert('Aviso', 'Preencha todos os campos.');
    }
    try {
      setActionLoading(true);
      if (data.id) {
        await api.put(`/api/rep/pipelines/${data.id}`, data);
      } else {
        await api.post('/api/rep/pipelines', data);
      }
      setPipelineEditorVisible(false);
      setEditingPipeline(null);
      init();
    } catch (err) {
      Alert.alert('Erro', 'Não foi possível salvar o funil.');
    } finally {
      setActionLoading(false);
    }
  };

  const saveBoard = async () => {
    if (!editingBoard?.nome) return Alert.alert('Aviso', 'O Board precisa de um nome.');
    try {
      setActionLoading(true);
      if (editingBoard.id) {
        await api.put(`/api/rep/pipeline-boards/${editingBoard.id}`, { nome: editingBoard.nome });
      } else {
        const res = await api.post('/api/rep/pipeline-boards', { nome: editingBoard.nome });
        await api.post(`/api/rep/pipeline-boards/${res.data.id}/estagios`, { nome: 'Leads', cor: '#0A84FF', ordem: 1 });
        await api.post(`/api/rep/pipeline-boards/${res.data.id}/estagios`, { nome: 'Fechado', cor: '#34C759', ordem: 2 });
      }
      setEditingBoard(null);
      await init(false, true);
    } catch (err) {
      Alert.alert('Erro', 'Não foi possível salvar o quadro.');
    } finally {
      setActionLoading(false);
    }
  };

  const deleteBoard = (id: number) => {
    Alert.alert('Excluir Quadro', 'Atenção: Isso apagará permanentemente todos os estágios e funis vinculados a este quadro. Deseja continuar?', [
      { text: 'Cancelar', style: 'cancel' },
      { text: 'Excluir Quadro', style: 'destructive', onPress: async () => {
          try {
            setActionLoading(true);
            await api.delete(`/api/rep/pipeline-boards/${id}`);
            await init(false, true);
          } catch (err) {
            Alert.alert('Erro', 'Não foi possível excluir o quadro.');
          } finally {
            setActionLoading(false);
          }
      }}
    ]);
  };

  const saveStage = async () => {
    if (!editingStage?.nome || !selectedBoard) return;
    try {
      setActionLoading(true);
      const payload = {
        nome: editingStage.nome,
        cor: editingStage.cor || '#0A84FF',
        ordem: editingStage.ordem || (selectedBoard.estagios?.length || 0) + 1
      };

      if (editingStage.id) {
        await api.put(`/api/rep/pipeline-boards/estagios/${editingStage.id}`, payload);
      } else {
        await api.post(`/api/rep/pipeline-boards/${selectedBoard.id}/estagios`, payload);
      }
      setStageEditorVisible(false);
      setEditingStage(null);
      await init(false, true);
    } catch (err) {
      Alert.alert('Erro', 'Falha ao salvar estágio.');
    } finally {
      setActionLoading(false);
    }
  };

  const onStageDragEnd = async ({ data }: { data: Stage[] }) => {
    if (!selectedBoard) return;
    try {
      const updatedStages = data.map((s, idx) => ({ ...s, ordem: idx + 1 }));
      setSelectedBoard({ ...selectedBoard, estagios: updatedStages });
      
      // Using new optimized reorder endpoint
      const movedStage = updatedStages.find((s, idx) => s.id !== selectedBoard.estagios[idx]?.id);
      if (movedStage) {
        setActionLoading(true);
        await api.patch(`/api/rep/pipeline-boards/estagios/${movedStage.id}/reorder`, { 
          ordem: movedStage.ordem 
        });
        await init(false, true);
      }
    } catch (err) {
      console.error('Drag End Sync Error:', err);
      init(false, true);
    } finally {
      setActionLoading(false);
    }
  };

  const deleteStage = (id: number) => {
    Alert.alert('Excluir Estágio', 'Tem certeza? Isso pode afetar os leads vinculados.', [
      { text: 'Cancelar', style: 'cancel' },
      { text: 'Excluir', style: 'destructive', onPress: async () => {
          try {
            setActionLoading(true);
            await api.delete(`/api/rep/pipeline-boards/estagios/${id}`);
            await init(false, true);
          } catch (err) {
            Alert.alert('Erro', 'Não foi possível excluir.');
          } finally {
            setActionLoading(false);
          }
      }}
    ]);
  };

  const deletePipeline = (id: number) => {
    Alert.alert('Excluir Funil', 'Tem certeza?', [
      { text: 'Cancelar', style: 'cancel' },
      { text: 'Excluir', style: 'destructive', onPress: async () => {
          try {
            setActionLoading(true);
            await api.delete(`/api/rep/pipelines/${id}`);
            await init();
          } catch (err) {
            Alert.alert('Erro', 'Não foi possível excluir o funil.');
          } finally {
            setActionLoading(false);
          }
      }}
    ]);
  };

  const moveCard = (card: Card) => {
    const board = boards.find(b => b.id === selectedPipeline?.boardId);
    if (!board) return;
    const options = board.estagios.sort((a,b)=>a.ordem-b.ordem).map(s => s.nome);
    options.push('Cancelar');
    ActionSheetIOS.showActionSheetWithOptions(
      { options, cancelButtonIndex: options.length - 1, title: 'Mover Lead' },
      async (index) => {
        if (index < options.length - 1) {
          const newStage = board.estagios.sort((a,b)=>a.ordem-b.ordem)[index];
          setActionLoading(true);
          try {
            await api.put(`/api/rep/pipeline-cards/${card.id}`, { estagioId: newStage.id });
            if (selectedPipeline) await fetchKanbanData(selectedPipeline.id);
          } catch (err) {
            Alert.alert('Erro', 'Não foi possível mover o card.');
          } finally {
            setActionLoading(false);
          }
        }
      }
    );
  };

  const deleteCard = (id: number) => {
    Alert.alert('Remover do Funil', 'Atenção: Este cliente será removido apenas deste funil de vendas. Continuar?', [
      { text: 'Cancelar', style: 'cancel' },
      { text: 'Remover', style: 'destructive', onPress: async () => {
          setActionLoading(true);
          try {
            await api.delete(`/api/rep/pipeline-cards/${id}`);
            if (selectedPipeline) await fetchKanbanData(selectedPipeline.id);
          } catch (err) {
            Alert.alert('Erro', 'Não foi possível remover o card.');
          } finally {
            setActionLoading(false);
          }
      }}
    ]);
  };

  useEffect(() => { init(); }, []);
  
  function HeaderComponent() {
    return (
      <Stack.Screen options={{ 
        title: 'Pipeline',
        headerLargeTitle: true,
        headerTransparent: true,
        headerBackTitle: 'Voltar',
        headerBlurEffect: isDark ? 'dark' : 'light',
        headerTintColor: '#F9B252',
        headerRight: () => (
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 18 }}>
            <TouchableOpacity onPress={() => { closeOpenRow(); setBoardManagerVisible(true); }} hitSlop={{ top: 15, bottom: 15, left: 10, right: 5 }}>
              <Ionicons name="layers-outline" size={24} color={THEME.accent} />
            </TouchableOpacity>
            <TouchableOpacity 
              onPress={() => { 
                closeOpenRow(); 
                if (boards.length === 0) {
                  Alert.alert('Aviso', 'Você precisa cadastrar pelo menos um Quadro (Board) com estágios antes de criar um novo Funil de Vendas.', [
                    { text: 'Cancelar', style: 'cancel' },
                    { text: 'OK, Criar Quadro', onPress: () => setBoardManagerVisible(true) }
                  ]);
                  return;
                }
                setEditingPipeline({ boardId: boards[0]?.id }); 
                setPipelineEditorVisible(true); 
              }} 
              hitSlop={{ top: 15, bottom: 15, left: 5, right: 10 }}
            >
              <Ionicons name="add" size={28} color={THEME.accent} />
            </TouchableOpacity>
          </View>
        )
      }} />
    );
  }
  
  if (loading) {
    return (
      <View style={[styles.centered, { backgroundColor: THEME.bg }]}>
        <HeaderComponent />
        <ActivityIndicator color={THEME.accent} size="large" />
      </View>
    );
  }

  const renderPipelineRightActions = (pipeline: Pipeline) => (
    <View style={styles.rightActionsContainer}>
      <TouchableOpacity 
        style={[styles.rightAction, { backgroundColor: THEME.accent }]}
        onPress={() => { closeOpenRow(); setEditingPipeline(pipeline); setPipelineEditorVisible(true); }}
      >
        <Ionicons name="pencil" size={20} color="#FFF" />
      </TouchableOpacity>
      <TouchableOpacity 
        style={[styles.rightAction, { backgroundColor: THEME.red }]}
        onPress={() => { closeOpenRow(); deletePipeline(pipeline.id); }}
      >
        <Ionicons name="trash-outline" size={20} color="#FFF" />
      </TouchableOpacity>
    </View>
  );

  return (
    <View style={[styles.container, { backgroundColor: THEME.bg }]}>
      <HeaderComponent />

      <FlatList 
        data={pipelines}
        keyExtractor={item => item.id.toString()}
        contentContainerStyle={styles.listContent}
        contentInsetAdjustmentBehavior="automatic"
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => init(true)} tintColor={THEME.accent} />}
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <View style={{ height: 100 }} />
            <Ionicons name={boards.length === 0 ? "layers-outline" : "filter"} size={80} color={THEME.border} />
            <Text style={[styles.emptyTitle, { color: THEME.text }]}>
              {boards.length === 0 ? 'Comece por um Quadro' : 'Sem Pipelines Ativos'}
            </Text>
            <Text style={[styles.emptySubtitle, { color: THEME.secondary }]}>
              {boards.length === 0 
                ? 'Para organizar suas vendas, você deve primeiro criar um Quadro e definir seus estágios (Ex: Prospecção, Negociação).' 
                : 'Crie um novo pipeline para organizar sua prospecção de vendas por coleção.'}
            </Text>
            {boards.length === 0 && (
              <TouchableOpacity 
                style={[styles.emptyBtn, { backgroundColor: THEME.accent }]}
                onPress={() => setBoardManagerVisible(true)}
              >
                <Text style={styles.emptyBtnText}>Criar Primeiro Quadro</Text>
              </TouchableOpacity>
            )}
          </View>
        }
        renderItem={({ item }) => (
          <Swipeable
            key={item.id}
            containerStyle={{ marginBottom: 12 }}
            ref={(ref) => {
              const key = `pipe-${item.id}`;
              if (ref) swipeableRefs.current.set(key, ref);
              else swipeableRefs.current.delete(key);
            }}
            renderRightActions={() => renderPipelineRightActions(item)}
            onSwipeableWillOpen={() => {
              const key = `pipe-${item.id}`;
              if (openRowKey.current !== null && openRowKey.current !== key) {
                swipeableRefs.current.get(openRowKey.current)?.close();
              }
              openRowKey.current = key;
            }}
          >
            <PipelineCard 
              item={item}
              collections={collections}
              THEME={THEME}
              onPress={() => {
                closeOpenRow();
                setSelectedPipeline(item);
                setKanbanVisible(true);
                fetchKanbanData(item.id);
              }}
              onLongPress={() => { closeOpenRow(); deletePipeline(item.id); }}
            />
          </Swipeable>
        )}
      />

      <BoardManager 
        visible={boardManagerVisible}
        onClose={() => setBoardManagerVisible(false)}
        boards={boards}
        selectedBoard={selectedBoard}
        setSelectedBoard={setSelectedBoard}
        editingBoard={editingBoard}
        setEditingBoard={setEditingBoard}
        saveBoard={saveBoard}
        editingStage={editingStage}
        setEditingStage={setEditingStage}
        stageEditorVisible={stageEditorVisible}
        setStageEditorVisible={setStageEditorVisible}
        saveStage={saveStage}
        onStageDragEnd={onStageDragEnd}
        deleteStage={deleteStage}
        deleteBoard={deleteBoard}
        actionLoading={actionLoading}
        THEME={THEME}
        isDark={isDark}
      />

      <PipelineEditor 
        visible={pipelineEditorVisible}
        onClose={() => setPipelineEditorVisible(false)}
        onSave={savePipeline}
        editingPipeline={editingPipeline}
        setEditingPipeline={setEditingPipeline}
        boards={boards}
        collections={collections}
        actionLoading={actionLoading}
        THEME={THEME}
      />

      <KanbanView 
        visible={kanbanVisible}
        onClose={() => setKanbanVisible(false)}
        selectedPipeline={selectedPipeline}
        boards={boards}
        activeStageId={activeStageId}
        setActiveStageId={setActiveStageId}
        kanbanCards={kanbanCards}
        moveCard={moveCard}
        deleteCard={deleteCard}
        kanbanActionLoading={actionLoading}
        THEME={THEME}
        isDark={isDark}
        insets={insets}
      />
      
      {actionLoading && (
        <View style={styles.globalLoader}>
          <View style={[styles.loaderBox, { backgroundColor: isDark ? 'rgba(44,44,46,0.8)' : 'rgba(255,255,255,0.9)' }]}>
            <ActivityIndicator color={THEME.accent} size="large" />
            <Text style={[styles.loaderText, { color: THEME.text }]}>Atualizando Pipeline...</Text>
          </View>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  listContent: { paddingHorizontal: 16, paddingTop: 20, paddingBottom: 100 },
  emptyState: { flex: 1, justifyContent: 'center', alignItems: 'center', marginTop: 100, paddingHorizontal: 40 },
  emptyTitle: { fontSize: 24, fontWeight: '800', marginTop: 24 },
  emptySubtitle: { fontSize: 16, textAlign: 'center', marginTop: 12, lineHeight: 22, opacity: 0.7 },
  emptyBtn: { marginTop: 24, paddingVertical: 12, paddingHorizontal: 24, borderRadius: 12 },
  emptyBtnText: { color: '#FFF', fontSize: 16, fontWeight: '700' },
  rightActionsContainer: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    paddingRight: 16,
    paddingLeft: 4,
    height: 84
  },
  rightAction: { 
    justifyContent: 'center', 
    alignItems: 'center',
    width: 64,
    height: 84, 
    borderRadius: 16,
    marginLeft: 10
  },
  globalLoader: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.3)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 9999
  },
  loaderBox: {
    padding: 30,
    borderRadius: 24,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.2,
    shadowRadius: 20,
    elevation: 5
  },
  loaderText: {
    marginTop: 15,
    fontSize: 16,
    fontWeight: '700',
    letterSpacing: -0.3
  }
});
