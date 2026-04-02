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
    <Modal visible={visible} transparent animationType="fade">
      <KeyboardAvoidingView 
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'} 
        style={{ flex: 1 }}
      >
        <Pressable style={styles.alertOverlay} onPress={onClose}>
          <Pressable style={[styles.alertBox, { backgroundColor: THEME.card }]}>
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
            <View style={styles.alertActionRow}>
              <TouchableOpacity style={styles.alertBtn} onPress={onClose}>
                <Text style={{ color: THEME.accent }}>Cancelar</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.alertBtn} onPress={() => onSave(editingStage || {})}>
                <Text style={{ color: THEME.accent, fontWeight: '700' }}>Salvar</Text>
              </TouchableOpacity>
            </View>
          </Pressable>
        </Pressable>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const createStyles = (THEME: Theme, isDark: boolean) => StyleSheet.create({
  alertOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center', padding: 20 },
  alertBox: { width: '100%', maxWidth: 300, borderRadius: 14, padding: 20, alignItems: 'center' },
  alertTitle: { fontSize: 17, fontWeight: '700', marginBottom: 16 },
  alertInput: { 
    width: '100%', 
    height: 44, 
    backgroundColor: isDark ? '#2C2C2E' : '#E9E9EB',
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
  colorRow: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', marginBottom: 20, minHeight: 44, width: '100%' },
  colorOption: { width: 44, height: 44, borderRadius: 22, justifyContent: 'center', alignItems: 'center', marginHorizontal: 4 },
  colorOrb: { width: 32, height: 32, borderRadius: 16 },
  selectedRing: { borderColor: THEME.accent, borderWidth: 2.5 },
});
