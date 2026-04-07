import React from 'react';
import { Modal, View, Text, TouchableOpacity, TextInput, StyleSheet, ActivityIndicator } from 'react-native';
import ColorPicker, { Panel1, HueSlider, Preview } from 'reanimated-color-picker';
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

export default function StageEditor({ visible, onClose, onSave, editingStage, setEditingStage, actionLoading, THEME }: StageEditorProps) {
  const isDark = THEME.bg === '#000000';
  const styles = createStyles(THEME, isDark);

  return (
    <Modal visible={visible} presentationStyle="pageSheet" animationType="slide">
      <View style={[styles.modalBase, { backgroundColor: THEME.bg }]}>
        <View style={[styles.modalHeader, { borderBottomColor: THEME.border }]}>
          <TouchableOpacity onPress={onClose} style={styles.modalLeftAction}>
            <Text style={{ color: THEME.accent, fontSize: 17 }}>Cancelar</Text>
          </TouchableOpacity>
          <View style={styles.modalHandle} />
          <Text style={[styles.modalTitle, { color: THEME.text }]}>{editingStage?.id ? 'Editar Estágio' : 'Novo Estágio'}</Text>
          <TouchableOpacity onPress={() => onSave(editingStage || {})} style={styles.modalClose} disabled={actionLoading}>
            {actionLoading ? <ActivityIndicator color={THEME.accent} size="small" /> : <Text style={{ color: THEME.accent, fontWeight: '600', fontSize: 17 }}>Salvar</Text>}
          </TouchableOpacity>
        </View>

        <View style={{ padding: 16 }}>
          <Text style={[styles.label, { color: THEME.secondary, marginTop: 12 }]}>NOME DO ESTÁGIO</Text>
          <View style={[styles.insetGroup, { backgroundColor: THEME.card }]}>
            <TextInput style={[styles.input, { color: THEME.text }]} placeholder="Ex: Em Negociação" placeholderTextColor={THEME.secondary + '80'} value={editingStage?.nome} onChangeText={v => setEditingStage({...editingStage!, nome: v})} autoFocus />
          </View>

          <Text style={[styles.label, { color: THEME.secondary, marginTop: 24 }]}>COR DA FASE</Text>
          <View style={[styles.insetGroup, { backgroundColor: THEME.card, padding: 16 }]}>
             <ColorPicker value={editingStage?.cor || '#0A84FF'} onComplete={({ hex }) => setEditingStage({...editingStage!, cor: hex})}>
                <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 20 }}>
                    <Preview style={{ width: 50, height: 50, borderRadius: 25, marginRight: 12 }} hideText />
                    <View>
                        <Text style={{ color: THEME.text, fontSize: 16, fontWeight: '600' }}>Seletor de Cor</Text>
                        <Text style={{ color: THEME.secondary, fontSize: 13 }}>{editingStage?.cor || '#0A84FF'}</Text>
                    </View>
                </View>
                <Panel1 style={{ height: 180, borderRadius: 12, marginBottom: 20 }} />
                <HueSlider style={{ height: 35, borderRadius: 18 }} />
             </ColorPicker>
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
  label: { fontSize: 12, fontWeight: '600', marginLeft: 6, marginBottom: 8 },
  insetGroup: { borderRadius: 12, overflow: 'hidden' },
  input: { height: 54, paddingHorizontal: 16, fontSize: 17 },
});
