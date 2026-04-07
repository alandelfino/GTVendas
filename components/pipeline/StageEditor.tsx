import React from 'react';
import { 
  Modal, 
  View, 
  Text, 
  TouchableOpacity, 
  TextInput, 
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  Pressable
} from 'react-native';
import { Stage, Theme } from './types';
import { Ionicons } from '@expo/vector-icons';

interface StageEditorProps {
  visible: boolean;
  onClose: () => void;
  onSave: (stage: Partial<Stage>) => void;
  editingStage: Partial<Stage> | null;
  setEditingStage: (stage: Partial<Stage> | null) => void;
  THEME: Theme;
}

export default function StageEditor({
  visible,
  onClose,
  onSave,
  editingStage,
  setEditingStage,
  THEME
}: StageEditorProps) {
  const isDark = THEME.bg === '#000000'; // Detecção simples de dark mode via tema
  const styles = createStyles(THEME, isDark);

  return (
    <Modal visible={visible} presentationStyle="pageSheet" animationType="slide">
      <View style={[styles.modalBase, { backgroundColor: THEME.bg }]}>
        <View style={[styles.modalHeader, { borderBottomColor: THEME.border }]}>
          <View style={styles.modalHandle} />
          <Text style={[styles.modalTitle, { color: THEME.text }]}>{editingStage?.id ? 'Editar Estágio' : 'Novo Estágio'}</Text>
          <TouchableOpacity onPress={() => onSave(editingStage || {})} style={styles.modalClose}>
            <Text style={{ color: THEME.accent, fontWeight: '500', fontSize: 17 }}>Salvar</Text>
          </TouchableOpacity>
        </View>

        <View style={{ padding: 16 }}>
          <Text style={[styles.label, { color: THEME.secondary, marginTop: 24 }]}>NOME DA FASE</Text>
          <View style={[styles.insetGroup, { backgroundColor: THEME.card }]}>
            <TextInput 
              style={[styles.input, { color: THEME.text }]}
              placeholder="Ex: Em Negociação"
              placeholderTextColor={THEME.secondary}
              value={editingStage?.nome}
              onChangeText={v => setEditingStage({...editingStage, nome: v})}
              autoFocus
            />
          </View>

          <Text style={[styles.label, { color: THEME.secondary, marginTop: 24 }]}>COR DE IDENTIFICAÇÃO</Text>
          <View style={styles.colorRow}>
             <TouchableOpacity style={[styles.colorOption, editingStage?.cor === '#0A84FF' && styles.selectedRing]} onPress={() => setEditingStage({...editingStage, cor: '#0A84FF'})}>
                <View style={[styles.colorOrb, { backgroundColor: '#0A84FF' }]} />
             </TouchableOpacity>
             <TouchableOpacity style={[styles.colorOption, editingStage?.cor === '#34C759' && styles.selectedRing]} onPress={() => setEditingStage({...editingStage, cor: '#34C759'})}>
                <View style={[styles.colorOrb, { backgroundColor: '#34C759' }]} />
             </TouchableOpacity>
             <TouchableOpacity style={[styles.colorOption, editingStage?.cor === '#FF9500' && styles.selectedRing]} onPress={() => setEditingStage({...editingStage, cor: '#FF9500'})}>
                <View style={[styles.colorOrb, { backgroundColor: '#FF9500' }]} />
             </TouchableOpacity>
             <TouchableOpacity style={[styles.colorOption, editingStage?.cor === '#FF3B30' && styles.selectedRing]} onPress={() => setEditingStage({...editingStage, cor: '#FF3B30'})}>
                <View style={[styles.colorOrb, { backgroundColor: '#FF3B30' }]} />
             </TouchableOpacity>
             <TouchableOpacity style={[styles.colorOption, editingStage?.cor === '#AF52DE' && styles.selectedRing]} onPress={() => setEditingStage({...editingStage, cor: '#AF52DE'})}>
                <View style={[styles.colorOrb, { backgroundColor: '#AF52DE' }]} />
             </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const createStyles = (THEME: Theme, isDark: boolean) => StyleSheet.create({
  modalBase: { flex: 1 },
  modalHeader: { height: 60, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', borderBottomWidth: 0.5 },
  modalHandle: { position: 'absolute', top: 8, width: 36, height: 5, borderRadius: 2.5, backgroundColor: '#C7C7CC' },
  modalTitle: { fontSize: 17, fontWeight: '700', marginTop: 10 },
  modalClose: { position: 'absolute', right: 16, marginTop: 10 },
  label: { fontSize: 13, fontWeight: '600', letterSpacing: 0.5, marginBottom: 8 },
  insetGroup: { borderRadius: 10, overflow: 'hidden', marginBottom: 24 },
  input: { height: 44, paddingHorizontal: 14, fontSize: 17 },
  colorRow: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', marginTop: 10, minHeight: 44 },
  colorOption: { width: 44, height: 44, borderRadius: 22, justifyContent: 'center', alignItems: 'center', marginHorizontal: 4 },
  colorOrb: { width: 32, height: 32, borderRadius: 16 },
  selectedRing: { borderColor: THEME.accent, borderWidth: 2.5 },
});
