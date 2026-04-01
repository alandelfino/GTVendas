import React from 'react';
import { View, Text, StyleSheet, useColorScheme } from 'react-native';
import { Stack } from 'expo-router';

export default function OrdersScreen() {
  const isDark = useColorScheme() === 'dark';
  return (
    <View style={[styles.container, { backgroundColor: isDark ? '#000' : '#F2F2F7' }]}>
      <Stack.Screen options={{ headerShown: true, title: 'Pedidos', headerLargeTitle: true }} />
      <Text style={[styles.text, { color: isDark ? '#FFF' : '#000' }]}>Gerenciador de Pedidos GT</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  text: { fontSize: 18, fontWeight: '600' }
});
