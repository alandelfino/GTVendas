import React, { useRef } from 'react';
import { 
  Modal, 
  View, 
  Text, 
  TouchableOpacity, 
  TextInput, 
  ScrollView, 
  ActivityIndicator,
  StyleSheet,
  Pressable,
  KeyboardAvoidingView,
  Platform
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import DraggableFlatList, { ScaleDecorator, RenderItemParams } from 'react-native-draggable-flatlist';
import { Swipeable } from 'react-native-gesture-handler';
import { Stage, Board, Theme } from './types';
import StageEditor from './StageEditor';

interface BoardManagerProps {
  visible: boolean;
  onClose: () => void;
  boards: Board[];
  selectedBoard: Board | null;
  setSelectedBoard: (board: Board | null) => void;
  editingBoard: Partial<Board> | null;
  setEditingBoard: (board: Partial<Board> | null) => void;
  saveBoard: () => void;
  deleteBoard: (id: number) => void;
  editingStage: Partial<Stage> | null;
  setEditingStage: (stage: Partial<Stage> | null) => void;
  stageEditorVisible: boolean;
  setStageEditorVisible: (visible: boolean) => void;
  saveStage: () => void;
  onStageDragEnd: (params: { data: Stage[] }) => void;
  deleteStage: (id: number) => void;
  actionLoading: boolean;
  THEME: Theme;
  isDark: boolean;
}

export default function BoardManager({
  visible,
  onClose,
  boards,
  selectedBoard,
  setSelectedBoard,
  editingBoard,
  setEditingBoard,
  saveBoard,
  deleteBoard,
  editingStage,
  setEditingStage,
  stageEditorVisible,
  setStageEditorVisible,
  saveStage,
  onStageDragEnd,
  deleteStage,
  actionLoading,
  THEME,
  isDark
}: BoardManagerProps) {
  const styles = createStyles(THEME, isDark);
  const swipeableRefs = useRef<Map<string, Swipeable>>(new Map());
  const openRowKey = useRef<string | null>(null);

  const closeOpenRow = () => {
    if (openRowKey.current !== null) {
      swipeableRefs.current.get(openRowKey.current)?.close();
      openRowKey.current = null;
    }
  };

  const renderRightActions = (board: Board) => (
    <View style={styles.rightActionsContainer}>
      <TouchableOpacity 
        style={[styles.rightAction, { backgroundColor: THEME.accent }]}
        onPress={() => { closeOpenRow(); setEditingBoard(board); }}
      >
        <Ionicons name="pencil" size={20} color="#FFF" />
      </TouchableOpacity>
      <TouchableOpacity 
        style={[styles.rightAction, { backgroundColor: THEME.red }]}
        onPress={() => { closeOpenRow(); deleteBoard(board.id); }}
      >
        <Ionicons name="trash-outline" size={20} color="#FFF" />
      </TouchableOpacity>
    </View>
  );

  const renderStageRightActions = (stage: Stage) => (
    <View style={styles.rightActionsContainer}>
      <TouchableOpacity 
        style={[styles.rightAction, { backgroundColor: THEME.accent }]}
        onPress={() => { closeOpenRow(); setEditingStage(stage); setStageEditorVisible(true); }}
      >
        <Ionicons name="pencil" size={20} color="#FFF" />
      </TouchableOpacity>
      <TouchableOpacity 
        style={[styles.rightAction, { backgroundColor: THEME.red }]}
        onPress={() => { closeOpenRow(); deleteStage(stage.id); }}
      >
        <Ionicons name="trash-outline" size={20} color="#FFF" />
      </TouchableOpacity>
    </View>
  );

  return (
    <Modal visible={visible} presentationStyle="pageSheet" animationType="slide">
      <View style={[styles.modalBase, { backgroundColor: THEME.bg }]}>
        <View style={[styles.modalHeader, { borderBottomColor: THEME.border }]}>
           <TouchableOpacity onPress={onClose} style={styles.modalLeftAction}>
             <Text style={{ color: THEME.accent, fontSize: 17, fontWeight: '400' }}>Fechar</Text>
           </TouchableOpacity>
           <View style={styles.modalHandle} />
           <Text style={[styles.headerTitle, { color: THEME.text }]}>Quadros de Trabalho</Text>
           <TouchableOpacity onPress={() => setEditingBoard({ nome: '' })} style={styles.modalClose}>
             <Text style={{ color: THEME.accent, fontSize: 17, fontWeight: '500' }}>Novo</Text>
           </TouchableOpacity>
        </View>
        
        <ScrollView style={{ flex: 1 }} keyboardShouldPersistTaps="handled">
          <Pressable onPress={closeOpenRow} style={{ flex: 1 }}>
            {boards.map(board => (
              <Swipeable 
                key={board.id}
                ref={(ref) => {
                  const key = `board-${board.id}`;
                  if (ref) swipeableRefs.current.set(key, ref);
                  else swipeableRefs.current.delete(key);
                }}
                renderRightActions={() => renderRightActions(board)}
                onSwipeableWillOpen={() => {
                   const key = `board-${board.id}`;
                   if (openRowKey.current !== null && openRowKey.current !== key) {
                     swipeableRefs.current.get(openRowKey.current)?.close();
                   }
                   openRowKey.current = key;
                }}
                containerStyle={{ marginTop: 20 }}
              >
                <View style={[styles.insetGroup, { backgroundColor: THEME.card, marginHorizontal: 16 }]}>
                  <TouchableOpacity 
                    style={styles.boardRow}
                    onPress={() => { closeOpenRow(); setSelectedBoard(board); }}
                  >
                     <Ionicons name="list" size={20} color={THEME.accent} style={{ marginRight: 12 }} />
                     <Text style={{ flex: 1, fontSize: 17, color: THEME.text }}>{board.nome}</Text>
                     <Text style={{ color: THEME.secondary, fontSize: 13, marginRight: 8 }}>{board.estagios.length} estágios</Text>
                     <Ionicons name="chevron-forward" size={16} color={THEME.border} />
                  </TouchableOpacity>
                </View>
              </Swipeable>
            ))}
            <View style={{ height: 100 }} />
          </Pressable>
        </ScrollView>

        {!!selectedBoard && (
           <View style={[StyleSheet.absoluteFill, { backgroundColor: THEME.bg, zIndex: 100 }]}>
              <View style={[styles.modalHeader, { borderBottomColor: THEME.border }]}>
                <TouchableOpacity onPress={() => setSelectedBoard(null)} style={styles.modalLeftAction}>
                  <Text style={{ color: THEME.accent, fontSize: 17, fontWeight: '400' }}>Voltar</Text>
                </TouchableOpacity>
                <View style={styles.modalHandle} />
                <Text style={[styles.headerTitle, { color: THEME.text }]}>{selectedBoard?.nome}</Text>
                <TouchableOpacity 
                  onPress={() => { setEditingStage({ boardId: selectedBoard.id, cor: '#0A84FF', ordem: (selectedBoard.estagios.length + 1) }); setStageEditorVisible(true); }} 
                  style={styles.modalClose}
                >
                  <Text style={{ color: THEME.accent, fontSize: 17, fontWeight: '600' }}>Adicionar</Text>
                </TouchableOpacity>
              </View>
              
              <ScrollView style={{ flex: 1 }}>
                <Text style={[styles.sectionLabel, { color: THEME.secondary, paddingHorizontal: 16, marginTop: 12 }]}>ESTÁGIOS</Text>
                
                <View style={{ padding: 16 }}>
                  <View style={[styles.insetGroup, { backgroundColor: THEME.card }]}>
                    <DraggableFlatList
                      data={[...(selectedBoard?.estagios || [])].sort((a, b) => (Number(a.ordem) || 0) - (Number(b.ordem) || 0))}
                      onDragEnd={onStageDragEnd}
                      keyExtractor={(item) => item.id.toString()}
                      scrollEnabled={false}
                      renderItem={({ item, drag, isActive }: RenderItemParams<Stage>) => (
                        <ScaleDecorator>
                          <Swipeable
                            ref={(ref) => {
                              const key = `stage-${item.id}`;
                              if (ref) swipeableRefs.current.set(key, ref);
                              else swipeableRefs.current.delete(key);
                            }}
                            renderRightActions={() => renderStageRightActions(item)}
                            onSwipeableWillOpen={() => {
                               const key = `stage-${item.id}`;
                               if (openRowKey.current !== null && openRowKey.current !== key) {
                                 swipeableRefs.current.get(openRowKey.current)?.close();
                               }
                               openRowKey.current = key;
                            }}
                          >
                            <TouchableOpacity
                              onLongPress={drag}
                              disabled={isActive}
                              activeOpacity={1}
                              onPress={() => { closeOpenRow(); setEditingStage(item); setStageEditorVisible(true); }}
                              style={[
                                styles.stageRow,
                                isActive && { backgroundColor: THEME.border + '50' }
                              ]}
                            >
                              <View style={[styles.stageOrb, { backgroundColor: item.cor }]} />
                              <Text style={{ flex: 1, fontSize: 17, color: THEME.text }}>
                                {item.nome}
                              </Text>
                              <View onTouchStart={drag} style={styles.dragHandle}>
                                <Ionicons name="reorder-three-outline" size={24} color={THEME.secondary} />
                              </View>
                            </TouchableOpacity>
                            <View style={[styles.iosSeparator, { backgroundColor: THEME.border }]} />
                          </Swipeable>
                        </ScaleDecorator>
                      )}
                    />
                  </View>
                </View>
              </ScrollView>
           </View>
        )}

        <Modal visible={!!editingBoard} presentationStyle="pageSheet" animationType="slide">
           <View style={[styles.modalBase, { backgroundColor: THEME.bg }]}>
             <View style={[styles.modalHeader, { borderBottomColor: THEME.border }]}>
               <TouchableOpacity onPress={() => setEditingBoard(null)} style={styles.modalLeftAction}>
                 <Text style={{ color: THEME.accent, fontSize: 17, fontWeight: '400' }}>Cancelar</Text>
               </TouchableOpacity>
               <View style={styles.modalHandle} />
               <Text style={[styles.headerTitle, { color: THEME.text }]}>
                 {editingBoard?.id ? 'Renomear Quadro' : 'Novo Quadro'}
               </Text>
               <TouchableOpacity 
                 onPress={saveBoard} 
                 style={styles.modalClose}
                 disabled={actionLoading}
               >
                 {actionLoading ? (
                   <ActivityIndicator color={THEME.accent} size="small" />
                 ) : (
                   <Text style={{ color: THEME.accent, fontSize: 17, fontWeight: '600' }}>Salvar</Text>
                 )}
               </TouchableOpacity>
             </View>

             <View style={{ padding: 16 }}>
                <Text style={{ fontSize: 13, fontWeight: '600', color: THEME.secondary, marginLeft: 4, marginBottom: 8, textTransform: 'uppercase' }}>Nome do Quadro</Text>
                <View style={{ backgroundColor: THEME.card, borderRadius: 10, overflow: 'hidden' }}>
                    <TextInput 
                      style={[styles.sheetInput, { color: THEME.text, marginBottom: 0 }]}
                      placeholder="Ex: Vendas coleção inverno 26"
                      placeholderTextColor={THEME.secondary + '80'}
                      value={editingBoard?.nome}
                      onChangeText={v => setEditingBoard({...editingBoard!, nome: v})}
                      autoFocus
                    />
                </View>
             </View>
           </View>
        </Modal>

        <StageEditor 
           visible={stageEditorVisible}
           onClose={() => setStageEditorVisible(false)}
           onSave={saveStage}
           editingStage={editingStage}
           setEditingStage={setEditingStage}
           actionLoading={actionLoading}
           THEME={THEME}
        />

        {actionLoading && (
          <View style={styles.actionLoaderContainer}>
            <View style={[styles.actionLoaderBox, { backgroundColor: isDark ? 'rgba(44,44,46,0.9)' : 'rgba(255,255,255,0.95)' }]}>
              <ActivityIndicator color={THEME.accent} size="large" />
              <Text style={[styles.actionLoaderText, { color: THEME.text }]}>Sincronizando...</Text>
            </View>
          </View>
        )}
      </View>
    </Modal>
  );
}

const createStyles = (THEME: Theme, isDark: boolean) => StyleSheet.create({
  modalBase: { flex: 1 },
  modalHeader: { height: 60, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingHorizontal: 16, borderBottomWidth: 0.5 },
  modalHandle: { position: 'absolute', top: 8, width: 36, height: 5, borderRadius: 2.5, backgroundColor: '#C7C7CC' },
  headerTitle: { fontSize: 17, fontWeight: '700', marginTop: 10 },
  modalClose: { position: 'absolute', right: 16, marginTop: 10 },
  modalLeftAction: { position: 'absolute', left: 16, marginTop: 10 },
  insetGroup: { borderRadius: 10, overflow: 'hidden' },
  boardRow: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 14, height: 54 },
  sectionLabel: { fontSize: 13, fontWeight: '600', marginLeft: 8, marginBottom: 8, marginTop: 24, textTransform: 'uppercase' },
  stageRow: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    paddingLeft: 16,
    height: 54
  },
  stageOrb: { width: 12, height: 12, borderRadius: 6, marginRight: 12 },
  dragHandle: { paddingHorizontal: 16, height: '100%', justifyContent: 'center' },
  iosSeparator: { height: StyleSheet.hairlineWidth, marginLeft: 44 },
  alertOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center', padding: 20 },
  alertBox: { width: '100%', maxWidth: 300, borderRadius: 14, padding: 20, alignItems: 'center' },
  alertTitle: { fontSize: 17, fontWeight: '700', marginBottom: 16 },
  alertInput: { 
    width: '100%', 
    height: 44, 
    backgroundColor: isDark ? '#2C2B2E' : '#E9E9EB',
    borderRadius: 10,
    marginBottom: 20, 
    textAlign: 'center', 
    fontSize: 17,
    paddingHorizontal: 16
  },
  alertActionRow: { 
    flexDirection: 'row', 
    width: '100%', 
    borderTopWidth: 0.5, 
    borderTopColor: 'rgba(120,120,128,0.2)', 
    marginTop: 8 
  },
  alertBtn: { flex: 1, height: 44, justifyContent: 'center', alignItems: 'center' },
  rightActionsContainer: { 
    flexDirection: 'row', 
    paddingLeft: 10,
    height: 54,
    alignItems: 'center',
    marginRight: 16
  },
  rightAction: { 
    justifyContent: 'center', 
    alignItems: 'center',
    width: 60,
    height: 54,
    borderRadius: 12,
    marginLeft: 8
  },
  sheetInput: {
    height: 54,
    borderRadius: 12,
    paddingHorizontal: 16,
    fontSize: 17,
    marginBottom: 20
  },
  primaryBtn: {
    height: 54,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 10
  },
  primaryBtnText: {
    color: '#FFF',
    fontSize: 17,
    fontWeight: '700'
  },
  actionLoaderContainer: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.3)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 9999
  },
  actionLoaderBox: {
    padding: 30,
    borderRadius: 24,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.2,
    shadowRadius: 20,
    elevation: 10
  },
  actionLoaderText: {
    marginTop: 15,
    fontSize: 16,
    fontWeight: '700',
    letterSpacing: -0.3
  }
});
