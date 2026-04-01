import React from 'react';
import { useColorScheme } from 'react-native';
import { Stack } from 'expo-router';

export default function AppLayout() {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';

  return (
    <Stack screenOptions={{ 
      headerShown: false,
      contentStyle: { backgroundColor: isDark ? '#000000' : '#F2F2F7' },
      animation: 'slide_from_right',
    }}>
      <Stack.Screen name="index" />
      <Stack.Screen name="chat" options={{ headerShown: true, title: 'Assistente IA' }} />
      <Stack.Screen name="profile" options={{ headerShown: true, title: 'Meu Perfil' }} />
      <Stack.Screen name="metas-history" options={{ headerShown: true, title: 'Histórico de Metas' }} />
      <Stack.Screen name="analytics" options={{ headerShown: true, title: 'Analytics' }} />
      <Stack.Screen name="orders" options={{ headerShown: true, title: 'Pedidos' }} />
      <Stack.Screen name="customers" options={{ headerShown: true, title: 'Clientes' }} />
      <Stack.Screen name="pipeline" options={{ headerShown: true, title: 'Pipeline' }} />
    </Stack>
  );
}
