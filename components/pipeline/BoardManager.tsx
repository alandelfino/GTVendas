import React, { useRef } from 'react';
import { 
  Modal, 
  View, 
  Text, 
  TouchableOpacity, 
  TextInput, 
  ScrollView, 
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
           <TouchableOpacity onPress={onClose}>
             <Text style={{ color: THEME.accent, fontSize: 17 }}>Voltar</Text>
           </TouchableOpacity>
           <Text style={[styles.headerTitle, { color: THEME.text }]}>Quadros de Trabalho</Text>
           <TouchableOpacity onPress={() => { closeOpenRow(); setEditingBoard({}); }}>
             <Ionicons name="add" size={24} color={THEME.accent} />
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
                <TouchableOpacity onPress={() => setSelectedBoard(null)}>
                  <Text style={{ color: THEME.accent, fontSize: 17 }}>Concluído</Text>
                </TouchableOpacity>
                <Text style={[styles.headerTitle, { color: THEME.text }]}>{selectedBoard?.nome}</Text>
                <TouchableOpacity onPress={() => { setEditingStage({}); setStageEditorVisible(true); }}>
                  <Ionicons name="add" size={24} color={THEME.accent} />
                </TouchableOpacity>
              </View>
              
              <View style={{ flex: 1 }}>
                 <Text style={[styles.sectionLabel, { color: THEME.secondary, paddingHorizontal: 16 }]}>ESTÁGIOS DO KANBAN (ARRASTE PARA REORDENAR)</Text>
                 <DraggableFlatList
                    data={[...(selectedBoard?.estagios || [])].sort((a, b) => (Number(a.ordem) || 0) - (Number(b.ordem) || 0))}
                    onDragEnd={onStageDragEnd}
                    keyExtractor={(item) => item.id.toString()}
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
                            style={[
                              styles.stageEditRow,
                              { backgroundColor: isActive ? (isDark ? '#2C2C2E' : '#E5E5EA') : THEME.card },
                              { marginHorizontal: 16, borderRadius: 10, marginBottom: 12 }
                            ]}
                          >
                            <Ionicons name="ellipse" size={14} color={item.cor} style={{ marginRight: 12 }} />
                            <Text 
                               style={{ flex: 1, fontSize: 17, color: THEME.text }}
                               onPress={() => { closeOpenRow(); setEditingStage(item); setStageEditorVisible(true); }}
                            >
                              {item.nome}
                            </Text>
                            <Ionicons name="reorder-three" size={24} color={THEME.secondary} style={{ padding: 4 }} />
                          </TouchableOpacity>
                        </Swipeable>
                      </ScaleDecorator>
                    )}
                 />
              </View>
           </View>
        )}

        <Modal visible={!!editingBoard} transparent animationType="fade">
           <KeyboardAvoidingView 
             behavior={Platform.OS === 'ios' ? 'padding' : 'height'} 
             style={{ flex: 1 }}
           >
             <Pressable style={styles.alertOverlay} onPress={() => setEditingBoard(null)}>
                <Pressable style={[styles.alertBox, { backgroundColor: THEME.card }]}>
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
                </Pressable>
             </Pressable>
           </KeyboardAvoidingView>
        </Modal>

        <StageEditor 
           visible={stageEditorVisible}
           onClose={() => setStageEditorVisible(false)}
           onSave={saveStage}
           editingStage={editingStage}
           setEditingStage={setEditingStage}
           THEME={THEME}
        />
      </View>
    </Modal>
  );
}

const createStyles = (THEME: Theme, isDark: boolean) => StyleSheet.create({
  modalBase: { flex: 1 },
  modalHeader: { height: 56, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, borderBottomWidth: 0.5 },
  headerTitle: { fontSize: 17, fontWeight: '700' },
  insetGroup: { borderRadius: 10, overflow: 'hidden' },
  boardRow: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 14, height: 54 },
  sectionLabel: { fontSize: 13, fontWeight: '600', marginLeft: 8, marginBottom: 8, marginTop: 24, textTransform: 'uppercase' },
  stageEditRow: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 14, height: 54 },
  stageColorDot: { width: 10, height: 10, borderRadius: 5, marginRight: 12 },
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
});
