import { Stack } from 'expo-router';
import { useColorScheme } from 'react-native';

export default function AppLayout() {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';

  return (
    <Stack screenOptions={{ 
      headerShown: false,
      contentStyle: { backgroundColor: isDark ? '#000000' : '#F2F2F7' }
    }}>
      <Stack.Screen name="index" />
      <Stack.Screen name="chat" />
      <Stack.Screen name="metas-history" />
    </Stack>
  );
}
