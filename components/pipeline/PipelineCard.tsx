import React from 'react';
import { TouchableOpacity, View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Pipeline, Theme } from './types';

interface PipelineCardProps {
  item: Pipeline;
  collections: any[];
  THEME: Theme;
  onPress: () => void;
  onLongPress: () => void;
}

export default function PipelineCard({
  item,
  collections,
  THEME,
  onPress,
  onLongPress
}: PipelineCardProps) {
  const collection = collections.find(c => c.idExterno === item.colecaoId);
  
  return (
    <TouchableOpacity 
      style={[styles.pipelineCard, { backgroundColor: THEME.card }]}
      onPress={onPress}
      onLongPress={onLongPress}
    >
      <View style={{ flex: 1 }}>
        <Text style={[styles.pipelineName, { color: THEME.text }]}>{item.nome}</Text>
        <Text style={[styles.pipelineMeta, { color: THEME.secondary }]}>
           Coleção: {collection?.nome || item.colecaoId}
        </Text>
      </View>
      <Ionicons name="chevron-forward" size={18} color={THEME.border} />
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  pipelineCard: { 
    width: '100%', 
    height: 84,
    borderRadius: 12, 
    paddingHorizontal: 16, 
    flexDirection: 'row', 
    alignItems: 'center', 
    shadowColor: '#000', 
    shadowOffset: { width: 0, height: 2 }, 
    shadowOpacity: 0.05, 
    shadowRadius: 8, 
    elevation: 2 
  },
  pipelineName: { fontSize: 17, fontWeight: '700', letterSpacing: -0.3 },
  pipelineMeta: { fontSize: 13, marginTop: 4 },
});
