import React from 'react';
import { 
  Modal, 
  View, 
  Text, 
  TouchableOpacity, 
  TextInput, 
  StyleSheet,
  ActivityIndicator
} from 'react-native';
import { Stage, Theme } from './types';

interface StageEditorProps {
  visible: boolean;
  onClose: () => void;
  onSave: (stage: Partial<Stage>) => void;
  editingStage: Partial<Stage> | null;
  setEditingStage: (stage: Partial<Stage> | null) => void;
  actionLoading?: boolean;
  THEME: Theme;
}

export default function StageEditor({
  visible,
  onClose,
  onSave,
  editingStage,
  setEditingStage,
  actionLoading,
  THEME
}: StageEditorProps) {
  const isDark = THEME.bg === '#000000';
  const styles = createStyles(THEME, isDark);

  const colors = ['#0A84FF', '#34C759', '#FF9500', '#FF3B30', '#AF52DE', '#5856D6', '#FF2D55'];

  return (
    <Modal visible={visible} presentationStyle="pageSheet" animationType="slide">
      <View style={[styles.modalBase, { backgroundColor: THEME.bg }]}>
        <View style={[styles.modalHeader, { borderBottomColor: THEME.border }]}>
          <TouchableOpacity onPress={onClose} style={styles.modalLeftAction}>
            <Text style={{ color: THEME.accent, fontWeight: '400', fontSize: 17 }}>Cancelar</Text>
          </TouchableOpacity>
          <View style={styles.modalHandle} />
          <Text style={[styles.modalTitle, { color: THEME.text }]}>{editingStage?.id ? 'Editar Estágio' : 'Novo Estágio'}</Text>
          <TouchableOpacity 
            onPress={() => onSave(editingStage || {})} 
            style={styles.modalClose}
            disabled={actionLoading}
          >
            {actionLoading ? (
              <ActivityIndicator color={THEME.accent} size="small" />
            ) : (
              <Text style={{ color: THEME.accent, fontWeight: '600', fontSize: 17 }}>Salvar</Text>
            )}
          </TouchableOpacity>
        </View>

        <View style={{ padding: 16 }}>
          <Text style={[styles.label, { color: THEME.secondary, marginTop: 12 }]}>NOME DO ESTÁGIO</Text>
          <View style={[styles.insetGroup, { backgroundColor: THEME.card }]}>
            <TextInput 
              style={[styles.input, { color: THEME.text }]}
              placeholder="Ex: Em Negociação"
              placeholderTextColor={THEME.secondary + '80'}
              value={editingStage?.nome}
              onChangeText={v => setEditingStage({...editingStage!, nome: v})}
              autoFocus
            />
          </View>

          <Text style={[styles.label, { color: THEME.secondary, marginTop: 24 }]}>COR DA FASE</Text>
          <View style={[styles.insetGroup, { backgroundColor: THEME.card, paddingVertical: 12 }]}>
            <View style={styles.colorRow}>
               {colors.map(color => (
                  <TouchableOpacity 
                    key={color}
                    style={[styles.colorOption, editingStage?.cor === color && styles.selectedRing]} 
                    onPress={() => setEditingStage({...editingStage!, cor: color})}
                  >
                    <View style={[styles.colorOrb, { backgroundColor: color }]} />
                  </TouchableOpacity>
               ))}
            </View>
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
  modalLeftAction: { position: 'absolute', left: 16, marginTop: 10 },
  label: { fontSize: 13, fontWeight: '600', marginLeft: 6, marginBottom: 8, textTransform: 'uppercase' },
  insetGroup: { borderRadius: 12, overflow: 'hidden' },
  input: { height: 54, paddingHorizontal: 16, fontSize: 17 },
  colorRow: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', alignItems: 'center', paddingHorizontal: 8 },
  colorOption: { width: 44, height: 44, borderRadius: 22, justifyContent: 'center', alignItems: 'center', margin: 4 },
  colorOrb: { width: 32, height: 32, borderRadius: 16 },
  selectedRing: { borderColor: THEME.accent, borderWidth: 2.5 },
});
