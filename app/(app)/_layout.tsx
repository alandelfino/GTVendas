import { Stack } from 'expo-router';

export default function AppLayout() {
  return (
    <Stack>
      <Stack.Screen 
        name="index" 
        options={{ 
          title: 'Dashboard',
          headerShown: true,
          headerStyle: { backgroundColor: '#6C5CE7' },
          headerTintColor: '#FFF',
          headerTitleStyle: { fontWeight: 'bold' },
        }} 
      />
    </Stack>
  );
}
