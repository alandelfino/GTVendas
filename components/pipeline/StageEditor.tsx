import React from 'react';
import { 
  Modal, 
  View, 
  Text, 
  TouchableOpacity, 
  TextInput, 
  StyleSheet,
  ActivityIndicator,
  ScrollView,
  Platform,
  KeyboardAvoidingView
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
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
  
  // iOS-native colors for grouped background
  const bgColor = isDark ? '#000000' : '#F2F2F7';
  const cardColor = isDark ? '#1C1C1E' : '#FFFFFF';
  const labelColor = isDark ? '#8E8E93' : '#6E6E73';
  const borderColor = isDark ? '#38383A' : '#C6C6C8';

  const styles = createStyles(THEME, isDark, bgColor, cardColor, labelColor, borderColor);

  // Native iOS System Colors Palette
  const colorGrid = [
    '#FF3B30', '#FF9500', '#FFCC00', '#34C759', '#00C7BE', '#007AFF', '#5856D6',
    '#AF52DE', '#FF2D55', '#A2845E', '#0FB9B1', '#2D98DA', '#3867D6', '#8E8E93',
    '#FFD60A', '#30D158', '#64D2FF', '#5AC8FA', '#BF5AF2', '#FF375F', '#48484A'
  ];

  const selectedColor = editingStage?.cor || '#007AFF';

  return (
    <Modal visible={visible} presentationStyle="pageSheet" animationType="slide">
      <KeyboardAvoidingView 
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'} 
        style={[styles.modalBase, { backgroundColor: bgColor }]}
      >
        <View style={[styles.modalHeader, { borderBottomColor: borderColor }]}>
          <TouchableOpacity onPress={onClose} style={styles.modalLeftAction} activeOpacity={0.7}>
            <Text style={styles.headerButtonLabel}>Cancelar</Text>
          </TouchableOpacity>
          
          <View style={styles.modalHandle} />
          
          <Text style={[styles.modalTitle, { color: THEME.text }]}>
            {editingStage?.id ? 'Editar Estágio' : 'Novo Estágio'}
          </Text>
          
          <TouchableOpacity 
            onPress={() => onSave(editingStage || {})} 
            style={styles.modalRightAction}
            disabled={actionLoading}
            activeOpacity={0.7}
          >
            {actionLoading ? (
              <ActivityIndicator color={THEME.accent} size="small" />
            ) : (
              <Text style={[styles.headerButtonLabel, { fontWeight: '600' }]}>Salvar</Text>
            )}
          </TouchableOpacity>
        </View>

        <ScrollView 
          style={{ flex: 1 }} 
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          <View style={styles.scrollContent}>
            {/* --- Section 1: Basic Info --- */}
            <Text style={styles.sectionHeader}>NOME DO ESTÁGIO</Text>
            <View style={styles.insetGroup}>
              <TextInput 
                style={[styles.input, { color: THEME.text }]}
                placeholder="Ex: Em Negociação"
                placeholderTextColor={isDark ? '#48484A' : '#C4C4C6'}
                value={editingStage?.nome}
                onChangeText={v => setEditingStage({...editingStage!, nome: v})}
                autoFocus
                returnKeyType="done"
              />
            </View>
            <Text style={styles.sectionFooter}>Dê um nome claro para identificar esta etapa no funil.</Text>

            {/* --- Section 2: Color Selection --- */}
            <View style={styles.sectionHeaderRow}>
              <Text style={styles.sectionHeader}>COR DO ESTÁGIO</Text>
              <View style={[styles.previewOrb, { backgroundColor: selectedColor }]} />
            </View>
            
            <View style={[styles.insetGroup, { paddingVertical: 14 }]}>
              <View style={styles.colorGridRow}>
                 {colorGrid.map(color => {
                    const isSelected = selectedColor === color;
                    return (
                      <TouchableOpacity 
                        key={color}
                        activeOpacity={0.7}
                        style={styles.colorOption} 
                        onPress={() => setEditingStage({...editingStage!, cor: color})}
                      >
                        <View style={[styles.colorOrb, { backgroundColor: color }]}>
                          {isSelected && (
                            <View style={styles.whiteRing}>
                              <Ionicons name="checkmark" size={16} color="#FFF" />
                            </View>
                          )}
                        </View>
                      </TouchableOpacity>
                    );
                 })}
              </View>
            </View>
            <Text style={styles.sectionFooter}>Esta cor será usada nos cards e nos indicadores visuais do board.</Text>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const createStyles = (THEME: Theme, isDark: boolean, bgColor: string, cardColor: string, labelColor: string, borderColor: string) => StyleSheet.create({
  modalBase: { flex: 1 },
  modalHeader: { 
    height: 56, 
    flexDirection: 'row', 
    alignItems: 'center', 
    justifyContent: 'center', 
    borderBottomWidth: StyleSheet.hairlineWidth,
    backgroundColor: cardColor,
  },
  modalHandle: { 
    position: 'absolute', 
    top: 8, 
    width: 36, 
    height: 5, 
    borderRadius: 2.5, 
    backgroundColor: isDark ? '#3A3A3C' : '#C7C7CC' 
  },
  modalTitle: { 
    fontSize: 17, 
    fontWeight: '600',
    letterSpacing: -0.4,
  },
  modalRightAction: { 
    position: 'absolute', 
    right: 16,
    height: '100%',
    justifyContent: 'center',
    paddingHorizontal: 4
  },
  modalLeftAction: { 
    position: 'absolute', 
    left: 16,
    height: '100%',
    justifyContent: 'center',
    paddingHorizontal: 4
  },
  headerButtonLabel: {
    color: THEME.accent,
    fontSize: 17,
    letterSpacing: -0.4,
  },
  scrollContent: {
    paddingTop: 16,
    paddingBottom: 40,
  },
  sectionHeader: { 
    fontSize: 13, 
    fontWeight: '400', 
    color: labelColor,
    marginLeft: 20,
    marginBottom: 8,
    textTransform: 'uppercase',
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingRight: 20,
    marginTop: 24,
  },
  sectionFooter: {
    fontSize: 13,
    color: labelColor,
    marginLeft: 20,
    marginRight: 20,
    marginTop: 8,
  },
  insetGroup: { 
    backgroundColor: cardColor,
    marginHorizontal: 16,
    borderRadius: 10, 
    overflow: 'hidden',
  },
  input: { 
    height: 44, 
    paddingHorizontal: 16, 
    fontSize: 17,
    letterSpacing: -0.4,
  },
  colorGridRow: { 
    flexDirection: 'row', 
    flexWrap: 'wrap', 
    justifyContent: 'center',
    paddingHorizontal: 4
  },
  colorOption: { 
    width: '14.28%',
    aspectRatio: 1,
    justifyContent: 'center', 
    alignItems: 'center',
    marginVertical: 4
  },
  colorOrb: { 
    width: 38, 
    height: 38, 
    borderRadius: 19,
    justifyContent: 'center',
    alignItems: 'center',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.1,
        shadowRadius: 1,
      },
      android: {
        elevation: 1
      }
    })
  },
  whiteRing: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 1.5,
    borderColor: '#FFF',
    justifyContent: 'center',
    alignItems: 'center'
  },
  previewOrb: { 
    width: 14, 
    height: 14, 
    borderRadius: 7,
    marginBottom: 8,
  },
});


