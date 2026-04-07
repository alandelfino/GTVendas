import { Ionicons } from '@expo/vector-icons';
import React, { useMemo, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    FlatList,
    Modal,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View
} from 'react-native';
import { Board, Pipeline, Theme } from './types';

interface PipelineEditorProps {
  visible: boolean;
  onClose: () => void;
  onSave: (pipeline: Partial<Pipeline>) => void;
  editingPipeline: Partial<Pipeline> | null;
  setEditingPipeline: (pipeline: Partial<Pipeline> | null) => void;
  boards: Board[];
  collections: any[];
  actionLoading: boolean;
  THEME: Theme;
}

export default function PipelineEditor({
  visible,
  onClose,
  onSave,
  editingPipeline,
  setEditingPipeline,
  boards,
  collections,
  actionLoading,
  THEME
}: PipelineEditorProps) {
  const [colModalVisible, setColModalVisible] = useState(false);
  const [searchText, setSearchText] = useState('');
  
  const styles = createStyles(THEME);

  const selectedCollection = collections.find(c => c.idExterno === editingPipeline?.colecaoId);

  const filteredCollections = useMemo(() => {
    if (!searchText) return collections;
    return collections.filter(c => 
      c.nome.toLowerCase().includes(searchText.toLowerCase())
    );
  }, [searchText, collections]);

  return (
    <Modal visible={visible} presentationStyle="pageSheet" animationType="slide">
      <View style={[styles.modalBase, { backgroundColor: THEME.bg }]}>
        <View style={[styles.modalHeader, { borderBottomColor: THEME.border }]}>
          <TouchableOpacity onPress={onClose} style={styles.modalLeftAction}>
            <Text style={{ color: THEME.accent, fontSize: 17, fontWeight: '400' }}>Cancelar</Text>
          </TouchableOpacity>
          
          <View style={styles.modalHandle} />
          <Text style={[styles.headerTitle, { color: THEME.text }]}>Novo Pipeline</Text>
          
          <TouchableOpacity 
            onPress={() => onSave(editingPipeline || {})} 
            style={styles.modalClose}
            disabled={actionLoading}
          >
            {actionLoading ? (
               <ActivityIndicator color={THEME.accent} size="small" />
            ) : (
               <Text style={{ color: THEME.accent, fontSize: 17, fontWeight: '600', opacity: actionLoading ? 0.3 : 1 }}>Salvar</Text>
            )}
          </TouchableOpacity>
        </View>

        <ScrollView style={{ flex: 1 }} contentContainerStyle={{ paddingBottom: 40 }}>
          <View style={{ padding: 16 }}>
            <Text style={[styles.label, { color: THEME.secondary }]}>NOME DO FUNIL</Text>
            <View style={[styles.insetGroup, { backgroundColor: THEME.card }]}>
              <TextInput 
                style={[styles.input, { color: THEME.text }]}
                placeholder="Ex: Prospecção Verão 2026"
                placeholderTextColor={THEME.secondary + '80'}
                value={editingPipeline?.nome}
                onChangeText={v => setEditingPipeline({...editingPipeline!, nome: v})}
              />
            </View>

            <Text style={[styles.label, { color: THEME.secondary, marginTop: 24 }]}>COLEÇÃO ALVO</Text>
            <TouchableOpacity 
              activeOpacity={0.7}
              style={[styles.insetGroup, { backgroundColor: THEME.card, padding: 14, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }]}
              onPress={() => setColModalVisible(true)}
            >
              <Text 
                style={{ color: selectedCollection ? THEME.text : THEME.secondary, fontSize: 17, flex: 1, marginRight: 8 }}
                numberOfLines={1}
                ellipsizeMode="tail"
              >
                {selectedCollection ? selectedCollection.nome : 'Selecionar Coleção...'}
              </Text>
              <Ionicons name="chevron-forward" size={18} color={THEME.secondary} />
            </TouchableOpacity>

            <Text style={[styles.label, { color: THEME.secondary, marginTop: 32 }]}>QUADRO DE TRABALHO</Text>
            <View style={[styles.insetGroup, { backgroundColor: THEME.card }]}>
              {boards.map((b, idx) => (
                <TouchableOpacity 
                  key={b.id} 
                  style={[styles.selectorRow, idx !== boards.length-1 && { borderBottomWidth: 0.5, borderBottomColor: THEME.border }]}
                  onPress={() => setEditingPipeline({...editingPipeline!, boardId: b.id})}
                >
                  <Text style={{ color: THEME.text, fontSize: 17 }}>{b.nome}</Text>
                  {editingPipeline?.boardId === b.id && <Ionicons name="checkmark" size={20} color={THEME.accent} style={{ marginRight: 10 }} />}
                </TouchableOpacity>
              ))}
            </View>
          </View>
        </ScrollView>

        <Modal visible={colModalVisible} presentationStyle="pageSheet" animationType="slide">
          <View style={[styles.modalBase, { backgroundColor: THEME.bg }]}>
            <View style={[styles.modalHeader, { borderBottomColor: THEME.border }]}>
              <TouchableOpacity onPress={() => setColModalVisible(false)} style={styles.modalLeftAction}>
                <Text style={{ color: THEME.accent, fontSize: 17, fontWeight: '400' }}>Cancelar</Text>
              </TouchableOpacity>
              <View style={styles.modalHandle} />
              <Text style={[styles.headerTitle, { color: THEME.text }]}>Coleções</Text>
            </View>

            <View style={styles.searchArea}>
              <View style={[styles.searchBox, { backgroundColor: THEME.card }]}>
                <Ionicons name="search" size={18} color={THEME.secondary} />
                <TextInput 
                  style={[styles.searchInput, { color: THEME.text }]}
                  placeholder="Buscar"
                  placeholderTextColor={THEME.secondary}
                  value={searchText}
                  onChangeText={setSearchText}
                  autoCorrect={false}
                  autoCapitalize="sentences"
                />
                {searchText.length > 0 && (
                  <TouchableOpacity onPress={() => setSearchText('')}>
                    <Ionicons name="close-circle" size={18} color={THEME.secondary} />
                  </TouchableOpacity>
                )}
              </View>
            </View>

            <FlatList 
              data={filteredCollections}
              keyExtractor={item => item.idExterno}
              keyboardShouldPersistTaps="handled"
              contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 40 }}
              renderItem={({ item, index }) => (
                <View style={[
                  styles.iosListItem, 
                  { backgroundColor: THEME.card },
                  index === 0 && { borderTopLeftRadius: 12, borderTopRightRadius: 12 },
                  index === filteredCollections.length - 1 && { borderBottomLeftRadius: 12, borderBottomRightRadius: 12 }
                ]}>
                  <TouchableOpacity 
                    style={[styles.iosListRow]}
                    onPress={() => {
                      setEditingPipeline({...editingPipeline!, colecaoId: item.idExterno});
                      setColModalVisible(false);
                      setSearchText('');
                    }}
                    onLongPress={() => Alert.alert('Nome Completo', item.nome)}
                    delayLongPress={500}
                  >
                    <Text 
                      style={[styles.iosListText, { color: THEME.text, flex: 1, marginRight: 8 }]}
                      numberOfLines={1}
                      ellipsizeMode="tail"
                    >
                      {item.nome}
                    </Text>
                    {editingPipeline?.colecaoId === item.idExterno && (
                      <Ionicons name="checkmark" size={20} color={THEME.accent} style={{ marginRight: 10 }} />
                    )}
                  </TouchableOpacity>
                  {index !== filteredCollections.length - 1 && (
                    <View style={[styles.iosSeparator, { backgroundColor: THEME.border }]} />
                  )}
                </View>
              )}
            />
          </View>
        </Modal>
      </View>
    </Modal>
  );
}

const createStyles = (THEME: Theme) => StyleSheet.create({
  modalBase: { flex: 1 },
  modalHeader: { height: 60, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', borderBottomWidth: 0.5 },
  modalHandle: { position: 'absolute', top: 8, width: 36, height: 5, borderRadius: 2.5, backgroundColor: '#C7C7CC' },
  headerTitle: { fontSize: 17, fontWeight: '700', marginTop: 10 },
  modalClose: { position: 'absolute', right: 16, marginTop: 10 },
  modalLeftAction: { position: 'absolute', left: 16, marginTop: 10 },
  insetGroup: { borderRadius: 12, overflow: 'hidden' },
  label: { fontSize: 13, fontWeight: '500', marginLeft: 16, marginBottom: 8, textTransform: 'uppercase' },
  input: { height: 54, paddingHorizontal: 16, fontSize: 17 },
  selectorRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 16 },
  searchArea: { paddingHorizontal: 16, paddingTop: 16, paddingBottom: 16 },
  searchBox: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    height: 40, 
    borderRadius: 10, 
    paddingHorizontal: 10,
    backgroundColor: 'rgba(118, 118, 128, 0.12)' 
  },
  searchInput: { flex: 1, fontSize: 17, marginLeft: 8, height: '100%' },
  iosListItem: { marginHorizontal: 0 },
  iosListRow: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    justifyContent: 'space-between', 
    padding: 16,
    height: 54
  },
  iosListText: { fontSize: 17 },
  iosSeparator: { height: StyleSheet.hairlineWidth, marginLeft: 16 }
});
