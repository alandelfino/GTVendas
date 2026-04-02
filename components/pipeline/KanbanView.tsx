import React, { useRef } from 'react';
import { 
  Modal, 
  View, 
  Text, 
  TouchableOpacity, 
  FlatList, 
  ScrollView, 
  ActivityIndicator, 
  StyleSheet 
} from 'react-native';
import { Swipeable } from 'react-native-gesture-handler';
import { Ionicons } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';
import { Pipeline, Board, Card, Theme } from './types';

interface KanbanViewProps {
  visible: boolean;
  onClose: () => void;
  selectedPipeline: Pipeline | null;
  boards: Board[];
  activeStageId: number | null;
  setActiveStageId: (id: number) => void;
  kanbanCards: Card[];
  moveCard: (card: Card) => void;
  deleteCard: (id: number) => void;
  kanbanActionLoading: boolean;
  THEME: Theme;
  isDark: boolean;
  insets: { top: number; bottom: number };
}

export default function KanbanView({
  visible,
  onClose,
  selectedPipeline,
  boards,
  activeStageId,
  setActiveStageId,
  kanbanCards,
  moveCard,
  deleteCard,
  kanbanActionLoading,
  THEME,
  isDark,
  insets
}: KanbanViewProps) {
  const styles = createStyles(THEME, insets);
  const board = boards.find(b => b.id === selectedPipeline?.boardId);
  const filteredCards = kanbanCards.filter(c => c.estagioId === activeStageId);

  const swipeableRefs = useRef<Map<string, Swipeable>>(new Map());
  const openRowKey = useRef<string | null>(null);

  const closeOpenRow = () => {
    if (openRowKey.current && swipeableRefs.current.has(openRowKey.current)) {
      swipeableRefs.current.get(openRowKey.current)?.close();
    }
  };

  const renderCardRightActions = (card: Card) => (
    <View style={styles.rightActionsContainer}>
      <TouchableOpacity 
        style={[styles.rightAction, { backgroundColor: THEME.accent }]}
        onPress={() => { closeOpenRow(); moveCard(card); }}
      >
        <Ionicons name="swap-horizontal" size={20} color="#FFF" />
      </TouchableOpacity>
      <TouchableOpacity 
        style={[styles.rightAction, { backgroundColor: THEME.red || '#FF3B30' }]}
        onPress={() => { closeOpenRow(); deleteCard(card.id); }}
      >
        <Ionicons name="trash-outline" size={20} color="#FFF" />
      </TouchableOpacity>
    </View>
  );

  return (
    <Modal visible={visible} presentationStyle="fullScreen" animationType="slide">
      <View style={[styles.modalBase, { backgroundColor: THEME.bg }]}>
        <View style={[
          styles.modalHeader, 
          { borderBottomColor: THEME.border, paddingTop: insets.top, height: 56 + insets.top }
        ]}>
          <TouchableOpacity 
            onPress={onClose}
            style={{ flexDirection: 'row', alignItems: 'center', width: 80 }}
            hitSlop={{ top: 15, bottom: 15, left: 15, right: 15 }}
          >
            <Ionicons name="chevron-back" size={24} color={THEME.accent} />
            <Text style={{ color: THEME.accent, fontSize: 17, marginLeft: 5 }}>Voltar</Text>
          </TouchableOpacity>
          
          <View style={{ flex: 1, alignItems: 'center', paddingHorizontal: 8 }}>
            <Text 
              style={[styles.headerTitle, { color: THEME.text }]} 
              numberOfLines={1}
              ellipsizeMode="tail"
            >
              {selectedPipeline?.nome}
            </Text>
          </View>

          <View style={{ width: 80 }} />
        </View>

        <View style={styles.kanbanTabWrapper}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.kanbanTabList}>
            {board?.estagios.sort((a,b)=>a.ordem-b.ordem).map(s => (
              <TouchableOpacity 
                key={s.id} 
                style={[
                  styles.kanbanTab, 
                  activeStageId === s.id && { borderBottomWidth: 3, borderBottomColor: s.cor || THEME.accent }
                ]}
                onPress={() => setActiveStageId(s.id)}
              >
                 <Ionicons 
                    name="ellipse" 
                    size={10} 
                    color={s.cor || THEME.accent} 
                    style={{ marginRight: 6 }} 
                 />
                 <Text style={[styles.kanbanTabText, { color: activeStageId === s.id ? THEME.text : THEME.secondary }]}>{s.nome}</Text>
                 <View style={[styles.kanbanBadge, { backgroundColor: activeStageId === s.id ? (s.cor || THEME.accent) : THEME.border }]}>
                    <Text style={styles.kanbanBadgeText}>{kanbanCards.filter(c => c.estagioId === s.id).length}</Text>
                 </View>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>

        <FlatList 
           data={filteredCards}
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
             <Swipeable
               key={item.id}
               containerStyle={{ marginBottom: 8 }}
               ref={(ref) => {
                 const key = `card-${item.id}`;
                 if (ref) swipeableRefs.current.set(key, ref);
                 else swipeableRefs.current.delete(key);
               }}
               renderRightActions={() => renderCardRightActions(item)}
               onSwipeableWillOpen={() => {
                 const key = `card-${item.id}`;
                 if (openRowKey.current !== null && openRowKey.current !== key) {
                   swipeableRefs.current.get(openRowKey.current)?.close();
                 }
                 openRowKey.current = key;
               }}
             >
               <TouchableOpacity 
                 style={[styles.insetCard, { backgroundColor: THEME.card }]}
                 onPress={() => { closeOpenRow(); moveCard(item); }}
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
             </Swipeable>
           )}
        />

        {kanbanActionLoading && (
          <BlurView intensity={isDark ? 40 : 80} style={styles.actionLoaderContainer} tint={isDark ? 'dark' : 'light'}>
            <View style={[styles.actionLoaderBox, { backgroundColor: isDark ? 'rgba(44,44,46,0.8)' : 'rgba(255,255,255,0.9)' }]}>
              <ActivityIndicator color={THEME.accent} size="large" />
              <Text style={[styles.actionLoaderText, { color: THEME.text }]}>Atualizando Funil...</Text>
            </View>
          </BlurView>
        )}
      </View>
    </Modal>
  );
}

const createStyles = (THEME: Theme, insets: any) => StyleSheet.create({
  modalBase: { flex: 1 },
  modalHeader: { height: 56, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, borderBottomWidth: 0.5 },
  headerTitle: { fontSize: 17, fontWeight: '700' },
  kanbanTabWrapper: { borderBottomWidth: 0.5, borderBottomColor: 'rgba(0,0,0,0.1)' },
  kanbanTabList: { paddingHorizontal: 16, height: 50, alignItems: 'center' },
  kanbanTab: { paddingHorizontal: 15, height: '100%', flexDirection: 'row', alignItems: 'center', marginRight: 10 },
  kanbanTabText: { fontSize: 15, fontWeight: '600' },
  kanbanBadge: { minWidth: 20, height: 20, borderRadius: 10, paddingHorizontal: 6, justifyContent: 'center', alignItems: 'center', marginLeft: 6 },
  kanbanBadgeText: { color: '#FFF', fontSize: 11, fontWeight: '800' },
  insetCard: { padding: 12, borderRadius: 12, marginBottom: 0, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 4, elevation: 1 },
  initialsCircle: { width: 36, height: 36, borderRadius: 18, justifyContent: 'center', alignItems: 'center', marginRight: 12 },
  initialsText: { color: '#FFF', fontSize: 16, fontWeight: '800' },
  cardTitle: { fontSize: 16, fontWeight: '600' },
  cardSub: { fontSize: 12, marginTop: 1 },
  kanbanEmptyState: { flex: 1, alignItems: 'center', paddingHorizontal: 40 },
  kanbanEmptyTitle: { fontSize: 20, fontWeight: '800', marginTop: 24 },
  kanbanEmptySubtitle: { fontSize: 15, textAlign: 'center', marginTop: 10, lineHeight: 22, opacity: 0.7 },
  actionLoaderContainer: { ...StyleSheet.absoluteFillObject, justifyContent: 'center', alignItems: 'center', zIndex: 999 },
  actionLoaderBox: { padding: 30, borderRadius: 24, alignItems: 'center', shadowColor: '#000', shadowOffset: { width: 0, height: 10 }, shadowOpacity: 0.2, shadowRadius: 20, elevation: 5 },
  actionLoaderText: { marginTop: 15, fontSize: 16, fontWeight: '700', letterSpacing: -0.3 },
  rightActionsContainer: { 
    flexDirection: 'row', 
    height: 60, 
    alignItems: 'center',
    paddingLeft: 10
  },
  rightAction: { 
    justifyContent: 'center', 
    alignItems: 'center',
    width: 60,
    height: 60,
    borderRadius: 12,
    marginLeft: 8
  },
});
