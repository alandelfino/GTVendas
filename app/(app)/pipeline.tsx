import React, { useState, useEffect, useCallback } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  FlatList, 
  TouchableOpacity, 
  useColorScheme, 
  ActivityIndicator,
  Alert,
  Modal,
  TextInput,
  ScrollView,
  ActionSheetIOS,
  RefreshControl,
  Dimensions,
  Platform
} from 'react-native';
import { Stack } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { BlurView } from 'expo-blur';
import api from '../../api/api';

const { width } = Dimensions.get('window');

interface Stage {
  id: number;
  nome: string;
  cor: string;
  ordem: number;
}

interface Board {
  id: number;
  nome: string;
  estagios: Stage[];
}

interface Pipeline {
  id: number;
  nome: string;
  boardId: number;
  colecaoId: string;
  criadoEm?: string;
}

interface Card {
  id: number;
  clienteId: string;
  estagioId: number;
  notas: string | null;
  cliente?: {
    fantasia: string | null;
    nome: string | null;
    cidade?: string | null;
    uf?: string | null;
  };
}

export default function PipelineScreen() {
  const isDark = useColorScheme() === 'dark';
  const insets = useSafeAreaInsets();
  const THEME = {
    bg: isDark ? '#000000' : '#F2F2F7',
    card: isDark ? '#1C1C1E' : '#FFFFFF',
    text: isDark ? '#FFFFFF' : '#000000',
    secondary: isDark ? '#8E8E93' : '#636366',
    border: isDark ? '#2C2C2E' : '#E5E5EA',
    accent: '#0A84FF',
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
  const [kanbanActionLoading, setKanbanActionLoading] = useState(false);

  const init = async (isRefresh = false) => {
    if (!isRefresh) setLoading(true);
    try {
      const [bRes, pRes, cRes] = await Promise.all([
        api.get('/api/rep/pipeline-boards'),
        api.get('/api/rep/pipelines'),
        api.get('/api/erp/colecoes')
      ]);
      setBoards(bRes.data);
      setPipelines(pRes.data);
      setCollections(cRes.data.data || []);
    } catch (err) {
      console.error('Pipeline Init Error:', err);
    } finally {
      setLoading(false);
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
        setActiveStageId(b.estagios[0].id);
      }
    } catch (err) {
      console.error('Fetch Kanban Data Error:', err);
    }
  };

  const savePipeline = async () => {
    if (!editingPipeline?.nome || !editingPipeline?.colecaoId || !editingPipeline?.boardId) {
      return Alert.alert('Aviso', 'Preencha todos os campos.');
    }
    try {
      await api.post('/api/rep/pipelines', editingPipeline);
      setPipelineEditorVisible(false);
      init();
    } catch (err) {
      Alert.alert('Erro', 'Não foi possível salvar o funil.');
    }
  };

  const saveBoard = async () => {
    if (!editingBoard?.nome) return Alert.alert('Aviso', 'O Board precisa de um nome.');
    try {
      if (editingBoard.id) {
        await api.put(`/api/rep/pipeline-boards/${editingBoard.id}`, { nome: editingBoard.nome });
      } else {
        const res = await api.post('/api/rep/pipeline-boards', { nome: editingBoard.nome });
        await api.post(`/api/rep/pipeline-boards/${res.data.id}/estagios`, { nome: 'Leads', cor: '#0A84FF', ordem: 1 });
        await api.post(`/api/rep/pipeline-boards/${res.data.id}/estagios`, { nome: 'Fechado', cor: '#34C759', ordem: 2 });
      }
      setEditingBoard(null);
      init();
    } catch (err) {
      Alert.alert('Erro', 'Não foi possível salvar o quadro.');
    }
  };

  const saveStage = async () => {
    if (!editingStage?.nome || !selectedBoard) return;
    try {
      if (editingStage.id) {
        await api.put(`/api/rep/pipeline-boards/estagios/${editingStage.id}`, editingStage);
      } else {
        await api.post(`/api/rep/pipeline-boards/${selectedBoard.id}/estagios`, { 
          nome: editingStage.nome, 
          cor: editingStage.cor || '#0A84FF', 
          ordem: (selectedBoard.estagios?.length || 0) + 1 
        });
      }
      setStageEditorVisible(false);
      init();
      const bRes = await api.get('/api/rep/pipeline-boards');
      const updatedBoard = bRes.data.find((b: Board) => b.id === selectedBoard.id);
      setSelectedBoard(updatedBoard);
    } catch (err) {
      Alert.alert('Erro', 'Falha ao salvar estágio.');
    }
  };

  const deletePipeline = (id: number) => {
    Alert.alert('Excluir Funil', 'Tem certeza? Isso apagará todos os leads deste funil.', [
      { text: 'Cancelar', style: 'cancel' },
      { text: 'Excluir', style: 'destructive', onPress: async () => {
          await api.delete(`/api/rep/pipelines/${id}`);
          init();
      }}
    ]);
  };

  const moveCard = (card: Card) => {
    const board = boards.find(b => b.id === selectedPipeline?.boardId);
    if (!board) return;
    const options = board.estagios.map(s => s.nome);
    options.push('Cancelar');
    ActionSheetIOS.showActionSheetWithOptions(
      { options, cancelButtonIndex: options.length - 1, title: 'Mover Lead' },
      async (index) => {
        if (index < options.length - 1) {
          const newStage = board.estagios[index];
          setKanbanActionLoading(true);
          try {
            await api.put(`/api/rep/pipeline-cards/${card.id}`, { estagioId: newStage.id });
            if (selectedPipeline) await fetchKanbanData(selectedPipeline.id);
          } catch (err) {
            Alert.alert('Erro', 'Não foi possível mover o card.');
          } finally {
            setKanbanActionLoading(false);
          }
        }
      }
    );
  };

  useEffect(() => { init(); }, []);

  if (loading) {
    return (
      <View style={[styles.centered, { backgroundColor: THEME.bg }]}>
        <ActivityIndicator color={THEME.accent} size="large" />
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: THEME.bg }]}>
      <Stack.Screen options={{ 
        title: 'Funis de Vendas', 
        headerLargeTitle: true,
        headerBackTitle: 'Voltar',
        headerRight: () => (
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 18 }}>
            <TouchableOpacity onPress={() => setBoardManagerVisible(true)} hitSlop={{ top: 15, bottom: 15, left: 10, right: 5 }}>
              <Ionicons name="layers-outline" size={24} color={THEME.accent} />
            </TouchableOpacity>
            <TouchableOpacity 
              onPress={() => { setEditingPipeline({ boardId: boards[0]?.id }); setPipelineEditorVisible(true); }} 
              hitSlop={{ top: 15, bottom: 15, left: 5, right: 10 }}
            >
              <Ionicons name="add" size={28} color={THEME.accent} />
            </TouchableOpacity>
          </View>
        )
      }} />

      <FlatList 
        data={pipelines}
        keyExtractor={item => item.id.toString()}
        contentContainerStyle={styles.listContent}
        contentInsetAdjustmentBehavior="automatic"
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => init(true)} tintColor={THEME.accent} />}
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <View style={{ height: 100 }} />
            <Ionicons name="filter" size={80} color={THEME.border} />
            <Text style={[styles.emptyTitle, { color: THEME.text }]}>Sem Funis Ativos</Text>
            <Text style={[styles.emptySubtitle, { color: THEME.secondary }]}>
              Crie um novo funil para organizar sua prospecção de vendas por coleção.
            </Text>
          </View>
        }
        renderItem={({ item }) => {
          const collection = collections.find(c => c.idExterno === item.colecaoId);
          return (
            <TouchableOpacity 
              style={[styles.pipelineCard, { backgroundColor: THEME.card }]}
              onPress={() => {
                setSelectedPipeline(item);
                setKanbanVisible(true);
                fetchKanbanData(item.id);
              }}
              onLongPress={() => deletePipeline(item.id)}
            >
              <View style={{ flex: 1 }}>
                <Text style={[styles.pipelineName, { color: THEME.text }]}>{item.nome}</Text>
                <Text style={[styles.pipelineMeta, { color: THEME.secondary }]}>
                   Coleção: {collection?.nome || item.colecaoId}
                </Text>
              </View>
              <Ionicons name="chevron-forward" size={18} color={THEME.border} />
            </TouchableOpacity>
          );
        }}
      />

      <Modal visible={boardManagerVisible} presentationStyle="pageSheet" animationType="slide">
        <View style={[styles.modalBase, { backgroundColor: THEME.bg }]}>
          <View style={[styles.modalHeader, { borderBottomColor: THEME.border }]}>
             <TouchableOpacity onPress={() => setBoardManagerVisible(false)}>
               <Text style={{ color: THEME.accent, fontSize: 17 }}>Voltar</Text>
             </TouchableOpacity>
             <Text style={[styles.headerTitle, { color: THEME.text }]}>Quadros de Trabalho</Text>
             <TouchableOpacity onPress={() => setEditingBoard({})}>
               <Ionicons name="add" size={24} color={THEME.accent} />
             </TouchableOpacity>
          </View>
          
          <ScrollView style={{ flex: 1 }}>
            {boards.map(board => (
              <View key={board.id} style={[styles.insetGroup, { backgroundColor: THEME.card, marginHorizontal: 16, marginTop: 20 }]}>
                <TouchableOpacity 
                  style={[styles.boardRow, { borderBottomWidth: 0.5, borderBottomColor: THEME.border }]}
                  onPress={() => setSelectedBoard(board)}
                >
                   <Ionicons name="list" size={20} color={THEME.accent} style={{ marginRight: 12 }} />
                   <Text style={{ flex: 1, fontSize: 17, color: THEME.text }}>{board.nome}</Text>
                   <Text style={{ color: THEME.secondary, fontSize: 13, marginRight: 8 }}>{board.estagios.length} estágios</Text>
                   <Ionicons name="chevron-forward" size={16} color={THEME.border} />
                </TouchableOpacity>
                <TouchableOpacity 
                  style={styles.boardActionRow}
                  onPress={() => setEditingBoard(board)}
                >
                  <Text style={{ color: THEME.accent, fontSize: 15 }}>Renomear Quadro</Text>
                </TouchableOpacity>
              </View>
            ))}
          </ScrollView>

          <Modal visible={!!selectedBoard} presentationStyle="pageSheet" animationType="slide">
             <View style={[styles.modalBase, { backgroundColor: THEME.bg }]}>
                <View style={[styles.modalHeader, { borderBottomColor: THEME.border }]}>
                  <TouchableOpacity onPress={() => setSelectedBoard(null)}>
                    <Text style={{ color: THEME.accent, fontSize: 17 }}>Concluído</Text>
                  </TouchableOpacity>
                  <Text style={[styles.headerTitle, { color: THEME.text }]}>{selectedBoard?.nome}</Text>
                  <TouchableOpacity onPress={() => setEditingStage({})}>
                    <Ionicons name="add" size={24} color={THEME.accent} />
                  </TouchableOpacity>
                </View>
                <ScrollView contentContainerStyle={{ padding: 16 }}>
                   <Text style={[styles.sectionLabel, { color: THEME.secondary }]}>ESTÁGIOS DO KANBAN</Text>
                   <View style={[styles.insetGroup, { backgroundColor: THEME.card }]}>
                      {selectedBoard?.estagios.sort((a,b)=>a.ordem-b.ordem).map((s, idx) => (
                        <TouchableOpacity 
                          key={s.id} 
                          style={[styles.stageEditRow, idx !== selectedBoard.estagios.length-1 && { borderBottomWidth: 0.5, borderBottomColor: THEME.border }]}
                          onPress={() => setEditingStage(s)}
                        >
                          <View style={[styles.stageColorDot, { backgroundColor: s.cor }]} />
                          <Text style={{ flex: 1, fontSize: 17, color: THEME.text }}>{s.nome}</Text>
                          <Ionicons name="create-outline" size={18} color={THEME.secondary} />
                        </TouchableOpacity>
                      ))}
                   </View>
                </ScrollView>
             </View>
          </Modal>

          <Modal visible={!!editingBoard} transparent animationType="fade">
             <View style={styles.alertOverlay}>
                <View style={[styles.alertBox, { backgroundColor: THEME.card }]}>
                  <Text style={[styles.alertTitle, { color: THEME.text }]}>{editingBoard?.id ? 'Renomear Quadro' : 'Novo Quadro'}</Text>
                  <TextInput 
                    style={[styles.alertInput, { color: THEME.text, borderColor: THEME.border }]}
                    value={editingBoard?.nome}
                    onChangeText={v => setEditingBoard({...editingBoard, nome: v})}
                    autoFocus
                  />
                  <View style={styles.alertActionRow}>
                     <TouchableOpacity style={styles.alertBtn} onPress={() => setEditingBoard(null)}>
                        <Text style={{ color: THEME.accent }}>Cancelar</Text>
                     </TouchableOpacity>
                     <TouchableOpacity style={styles.alertBtn} onPress={saveBoard}>
                        <Text style={{ color: THEME.accent, fontWeight: '700' }}>Salvar</Text>
                     </TouchableOpacity>
                  </View>
                </View>
             </View>
          </Modal>
        </View>
      </Modal>

      <Modal visible={pipelineEditorVisible} presentationStyle="pageSheet" animationType="slide">
         <View style={[styles.modalBase, { backgroundColor: THEME.bg }]}>
            <View style={[styles.modalHeader, { borderBottomColor: THEME.border }]}>
               <TouchableOpacity onPress={() => setPipelineEditorVisible(false)}>
                 <Text style={{ color: THEME.accent, fontSize: 17 }}>Cancelar</Text>
               </TouchableOpacity>
               <Text style={[styles.headerTitle, { color: THEME.text }]}>Novo Funil</Text>
               <View style={{ width: 60 }} />
            </View>
            <ScrollView style={{ paddingHorizontal: 16 }}>
               <Text style={[styles.label, { color: THEME.secondary, marginTop: 24 }]}>NOME DO FUNIL</Text>
               <View style={[styles.insetGroup, { backgroundColor: THEME.card }]}>
                  <TextInput 
                    style={[styles.input, { color: THEME.text }]}
                    placeholder="Ex: Novos Leads 2026"
                    placeholderTextColor={THEME.secondary}
                    value={editingPipeline?.nome}
                    onChangeText={v => setEditingPipeline({...editingPipeline, nome: v})}
                  />
               </View>

               <Text style={[styles.label, { color: THEME.secondary, marginTop: 24 }]}>QUADRO DE TRABALHO</Text>
               <View style={[styles.insetGroup, { backgroundColor: THEME.card }]}>
                  {boards.map((b, idx) => (
                    <TouchableOpacity 
                      key={b.id} 
                      style={[styles.selectorRow, idx !== boards.length-1 && { borderBottomWidth: 0.5, borderBottomColor: THEME.border }]}
                      onPress={() => setEditingPipeline({...editingPipeline, boardId: b.id})}
                    >
                       <Text style={{ color: THEME.text, fontSize: 17 }}>{b.nome}</Text>
                       {editingPipeline?.boardId === b.id && <Ionicons name="checkmark" size={20} color={THEME.accent} />}
                    </TouchableOpacity>
                  ))}
               </View>

               <Text style={[styles.label, { color: THEME.secondary, marginTop: 24 }]}>COLEÇÃO ALVO</Text>
               <View style={[styles.insetGroup, { backgroundColor: THEME.card }]}>
                  {collections.map((c, idx) => (
                    <TouchableOpacity 
                      key={c.idExterno} 
                      style={[styles.selectorRow, idx !== collections.length-1 && { borderBottomWidth: 0.5, borderBottomColor: THEME.border }]}
                      onPress={() => setEditingPipeline({...editingPipeline, colecaoId: c.idExterno})}
                    >
                       <Text style={{ color: THEME.text, fontSize: 17 }}>{c.nome}</Text>
                       {editingPipeline?.colecaoId === c.idExterno && <Ionicons name="checkmark" size={20} color={THEME.accent} />}
                    </TouchableOpacity>
                  ))}
               </View>
            </ScrollView>
            <TouchableOpacity style={[styles.primaryActionBtn, { backgroundColor: THEME.accent }]} onPress={savePipeline}>
               <Text style={styles.primaryActionText}>Começar Funil</Text>
            </TouchableOpacity>
         </View>
      </Modal>

      <Modal visible={kanbanVisible} presentationStyle="fullScreen" animationType="slide">
        <View style={[styles.modalBase, { backgroundColor: THEME.bg }]}>
           <View style={[
             styles.modalHeader, 
             { borderBottomColor: THEME.border, paddingTop: insets.top, height: 56 + insets.top }
           ]}>
             <TouchableOpacity 
               onPress={() => setKanbanVisible(false)}
               style={{ flexDirection: 'row', alignItems: 'center' }}
               hitSlop={{ top: 15, bottom: 15, left: 15, right: 15 }}
             >
               <Ionicons name="chevron-back" size={24} color={THEME.accent} />
               <Text style={{ color: THEME.accent, fontSize: 17, marginLeft: 5 }}>Voltar</Text>
             </TouchableOpacity>
             <Text style={[styles.headerTitle, { color: THEME.text }]} numberOfLines={1}>{selectedPipeline?.nome}</Text>
             <View style={{ width: 60 }} />
           </View>

           <View style={styles.kanbanTabWrapper}>
             <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.kanbanTabList}>
               {boards.find(b=>b.id===selectedPipeline?.boardId)?.estagios.sort((a,b)=>a.ordem-b.ordem).map(s => (
                 <TouchableOpacity 
                   key={s.id} 
                   style={[styles.kanbanTab, activeStageId === s.id && { borderBottomWidth: 3, borderBottomColor: THEME.accent }]}
                   onPress={() => setActiveStageId(s.id)}
                 >
                    <Text style={[styles.kanbanTabText, { color: activeStageId === s.id ? THEME.text : THEME.secondary }]}>{s.nome}</Text>
                    <View style={[styles.kanbanBadge, { backgroundColor: activeStageId === s.id ? THEME.accent : THEME.border }]}>
                       <Text style={styles.kanbanBadgeText}>{kanbanCards.filter(c => c.estagioId === s.id).length}</Text>
                    </View>
                 </TouchableOpacity>
               ))}
             </ScrollView>
           </View>

           <FlatList 
              data={kanbanCards.filter(c => c.estagioId === activeStageId)}
              keyExtractor={item => item.id.toString()}
              contentContainerStyle={{ padding: 16, paddingBottom: 100 }}
              ListEmptyComponent={
                <View style={styles.kanbanEmptyState}>
                  <View style={{ height: 100 }} />
                  <Ionicons name="people-outline" size={60} color={THEME.border} />
                  <Text style={[styles.kanbanEmptyTitle, { color: THEME.text }]}>Nenhum cliente</Text>
                  <Text style={[styles.kanbanEmptySubtitle, { color: THEME.secondary }]}>
                    Nenhum cliente está nesta fase do funil no momento.
                  </Text>
                </View>
              }
              renderItem={({ item }) => (
                <TouchableOpacity 
                  style={[styles.insetCard, { backgroundColor: THEME.card }]}
                  onPress={() => moveCard(item)}
                >
                   <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                      <View style={[styles.initialsCircle, { backgroundColor: THEME.accent }]}>
                         <Text style={styles.initialsText}>{(item.cliente?.fantasia || item.cliente?.nome || '?').charAt(0)}</Text>
                      </View>
                      <View style={{ flex: 1 }}>
                         <Text style={[styles.cardTitle, { color: THEME.text }]}>{item.cliente?.fantasia || item.cliente?.nome || 'Carregando...'}</Text>
                         <Text style={[styles.cardSub, { color: THEME.secondary }]}>
                           {item.cliente?.cidade ? `${item.cliente?.cidade} - ${item.cliente?.uf}` : 'Local não informado'}
                         </Text>
                      </View>
                      <Ionicons name="ellipsis-vertical" size={18} color={THEME.border} />
                   </View>
                </TouchableOpacity>
              )}
           />

           {kanbanActionLoading && (
             <BlurView intensity={isDark ? 40 : 80} style={styles.actionLoaderContainer} tint={isDark ? 'dark' : 'light'}>
               <View style={[styles.actionLoaderBox, { backgroundColor: isDark ? 'rgba(44,44,46,0.8)' : 'rgba(255,255,255,0.9)' }]}>
                 <ActivityIndicator color={THEME.accent} size="large" />
                 <Text style={[styles.actionLoaderText, { color: THEME.text }]}>Sincronizando Lead...</Text>
               </View>
             </BlurView>
           )}
        </View>
      </Modal>

      <Modal visible={stageEditorVisible} transparent animationType="fade">
         <View style={styles.alertOverlay}>
            <View style={[styles.alertBox, { backgroundColor: THEME.card }]}>
              <Text style={[styles.alertTitle, { color: THEME.text }]}>{editingStage?.id ? 'Editar Estágio' : 'Novo Estágio'}</Text>
              <TextInput 
                style={[styles.alertInput, { color: THEME.text, borderColor: THEME.border }]}
                placeholder="Nome do Estágio (Fase)"
                placeholderTextColor={THEME.secondary}
                value={editingStage?.nome}
                onChangeText={v => setEditingStage({...editingStage, nome: v})}
                autoFocus
              />
              <View style={styles.colorRow}>
                 {['#0A84FF', '#34C759', '#FF9500', '#FF3B30', '#AF52DE'].map(c => (
                   <TouchableOpacity 
                     key={c} 
                     style={[styles.colorOption, { backgroundColor: c }, editingStage?.cor === c && { borderWidth: 2, borderColor: THEME.text }]} 
                     onPress={() => setEditingStage({...editingStage, cor: c})}
                   />
                 ))}
              </View>
              <View style={styles.alertActionRow}>
                 <TouchableOpacity style={styles.alertBtn} onPress={() => setStageEditorVisible(false)}>
                    <Text style={{ color: THEME.accent }}>Cancelar</Text>
                 </TouchableOpacity>
                 <TouchableOpacity style={styles.alertBtn} onPress={saveStage}>
                    <Text style={{ color: THEME.accent, fontWeight: '700' }}>Salvar</Text>
                 </TouchableOpacity>
              </View>
            </View>
         </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  listContent: { paddingHorizontal: 16, paddingTop: 20, paddingBottom: 100 },
  pipelineCard: { width: '100%', marginBottom: 10, borderRadius: 12, padding: 16, flexDirection: 'row', alignItems: 'center', shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 8, elevation: 2 },
  pipelineName: { fontSize: 17, fontWeight: '700', letterSpacing: -0.3 },
  pipelineMeta: { fontSize: 13, marginTop: 4 },
  emptyState: { flex: 1, justifyContent: 'center', alignItems: 'center', marginTop: 100, paddingHorizontal: 40 },
  emptyTitle: { fontSize: 24, fontWeight: '800', marginTop: 24 },
  emptySubtitle: { fontSize: 16, textAlign: 'center', marginTop: 12, lineHeight: 22, opacity: 0.7 },
  modalBase: { flex: 1 },
  modalHeader: { height: 56, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, borderBottomWidth: 0.5 },
  headerTitle: { fontSize: 17, fontWeight: '700' },
  insetGroup: { borderRadius: 10, overflow: 'hidden' },
  boardRow: { flexDirection: 'row', alignItems: 'center', padding: 14 },
  boardActionRow: { padding: 14, alignItems: 'center', borderTopWidth: 0.5, borderTopColor: 'rgba(0,0,0,0.05)' },
  sectionLabel: { fontSize: 13, fontWeight: '600', marginLeft: 8, marginBottom: 8, marginTop: 24, textTransform: 'uppercase' },
  stageEditRow: { flexDirection: 'row', alignItems: 'center', padding: 14 },
  stageColorDot: { width: 10, height: 10, borderRadius: 5, marginRight: 12 },
  alertOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center', padding: 20 },
  alertBox: { width: '100%', maxWidth: 300, borderRadius: 14, padding: 20, alignItems: 'center' },
  alertTitle: { fontSize: 17, fontWeight: '700', marginBottom: 16 },
  alertInput: { width: '100%', height: 40, borderBottomWidth: 1, marginBottom: 20, textAlign: 'center', fontSize: 17 },
  alertActionRow: { flexDirection: 'row', width: '100%', borderTopWidth: 0.5, borderTopColor: 'rgba(120,120,128,0.2)', marginTop: 10 },
  alertBtn: { flex: 1, height: 44, justifyContent: 'center', alignItems: 'center' },
  colorRow: { flexDirection: 'row', gap: 12, marginBottom: 20 },
  colorOption: { width: 30, height: 30, borderRadius: 15 },
  label: { fontSize: 13, fontWeight: '600', letterSpacing: 0.5, marginBottom: 8 },
  input: { height: 44, paddingHorizontal: 14, fontSize: 17 },
  selectorRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 14 },
  primaryActionBtn: { margin: 16, height: 50, borderRadius: 12, justifyContent: 'center', alignItems: 'center' },
  primaryActionText: { color: '#FFF', fontSize: 17, fontWeight: '700' },
  kanbanTabWrapper: { borderBottomWidth: 0.5, borderBottomColor: 'rgba(0,0,0,0.1)' },
  kanbanTabList: { paddingHorizontal: 16, height: 50, alignItems: 'center' },
  kanbanTab: { paddingHorizontal: 15, height: '100%', flexDirection: 'row', alignItems: 'center', marginRight: 10 },
  kanbanTabText: { fontSize: 15, fontWeight: '600' },
  kanbanBadge: { minWidth: 20, height: 20, borderRadius: 10, paddingHorizontal: 6, justifyContent: 'center', alignItems: 'center', marginLeft: 6 },
  kanbanBadgeText: { color: '#FFF', fontSize: 11, fontWeight: '800' },
  insetCard: { padding: 12, borderRadius: 12, marginBottom: 8, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 4, elevation: 1 },
  initialsCircle: { width: 36, height: 36, borderRadius: 18, justifyContent: 'center', alignItems: 'center', marginRight: 12 },
  initialsText: { color: '#FFF', fontSize: 16, fontWeight: '800' },
  cardTitle: { fontSize: 16, fontWeight: '600' },
  cardSub: { fontSize: 12, marginTop: 1 },
  kanbanEmptyState: { flex: 1, alignItems: 'center', paddingHorizontal: 40 },
  kanbanEmptyTitle: { fontSize: 20, fontWeight: '800', marginTop: 24 },
  kanbanEmptySubtitle: { fontSize: 15, textAlign: 'center', marginTop: 10, lineHeight: 22, opacity: 0.7 },
  actionLoaderContainer: { ...StyleSheet.absoluteFillObject, justifyContent: 'center', alignItems: 'center', zIndex: 999 },
  actionLoaderBox: { padding: 30, borderRadius: 24, alignItems: 'center', shadowColor: '#000', shadowOffset: { width: 0, height: 10 }, shadowOpacity: 0.2, shadowRadius: 20, elevation: 5 },
  actionLoaderText: { marginTop: 15, fontSize: 16, fontWeight: '700', letterSpacing: -0.3 }
});
