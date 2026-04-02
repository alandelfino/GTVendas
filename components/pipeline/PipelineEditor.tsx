import React from 'react';
import { 
  Modal, 
  View, 
  Text, 
  TouchableOpacity, 
  TextInput, 
  ScrollView, 
  StyleSheet 
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Pipeline, Board, Theme } from './types';

interface PipelineEditorProps {
  visible: boolean;
  onClose: () => void;
  onSave: (pipeline: Partial<Pipeline>) => void;
  editingPipeline: Partial<Pipeline> | null;
  setEditingPipeline: (pipeline: Partial<Pipeline> | null) => void;
  boards: Board[];
  collections: any[];
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
  THEME
}: PipelineEditorProps) {
  const styles = createStyles(THEME);

  return (
    <Modal visible={visible} presentationStyle="pageSheet" animationType="slide">
      <View style={[styles.modalBase, { backgroundColor: THEME.bg }]}>
        <View style={[styles.modalHeader, { borderBottomColor: THEME.border }]}>
          <TouchableOpacity onPress={onClose}>
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
        <TouchableOpacity style={[styles.primaryActionBtn, { backgroundColor: THEME.accent }]} onPress={() => onSave(editingPipeline || {})}>
          <Text style={styles.primaryActionText}>Começar Funil</Text>
        </TouchableOpacity>
      </View>
    </Modal>
  );
}

const createStyles = (THEME: Theme) => StyleSheet.create({
  modalBase: { flex: 1 },
  modalHeader: { height: 56, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, borderBottomWidth: 0.5 },
  headerTitle: { fontSize: 17, fontWeight: '700' },
  insetGroup: { borderRadius: 10, overflow: 'hidden' },
  label: { fontSize: 13, fontWeight: '600', letterSpacing: 0.5, marginBottom: 8 },
  input: { height: 44, paddingHorizontal: 14, fontSize: 17 },
  selectorRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 14 },
  primaryActionBtn: { margin: 16, height: 50, borderRadius: 12, justifyContent: 'center', alignItems: 'center' },
  primaryActionText: { color: '#FFF', fontSize: 17, fontWeight: '700' },
});
