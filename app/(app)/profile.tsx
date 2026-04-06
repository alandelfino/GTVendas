import React from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  ScrollView, 
  TouchableOpacity, 
  useColorScheme, 
  Image,
  Alert
} from 'react-native';
import { FontAwesome } from '@expo/vector-icons';
import { useAuth } from '../../context/AuthContext';
import { Stack } from 'expo-router';

export default function ProfileScreen() {
  const { user, signOut } = useAuth();
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';

  const THEME = {
    bg: isDark ? '#1C252E' : '#F2F2F7',
    card: isDark ? '#2C3641' : '#FFFFFF',
    text: isDark ? '#FFFFFF' : '#1C252E',
    secondaryText: isDark ? '#8E9AA9' : '#636366',
    border: isDark ? '#3D4956' : '#C6C6C8',
    danger: '#FF453A',
    accent: '#F9B252',
  };

  const ProfileItem = ({ icon, label, value, color }: { icon: string, label: string, value: string, color?: string }) => (
    <View style={[styles.profileItem, { borderBottomColor: THEME.border }]}>
      <View style={[styles.iconBox, { backgroundColor: (color || THEME.accent) + '15' }]}>
        <FontAwesome name={icon as any} size={16} color={color || THEME.accent} />
      </View>
      <View style={styles.itemContent}>
        <Text style={[styles.itemLabel, { color: THEME.secondaryText }]}>{label}</Text>
        <Text style={[styles.itemValue, { color: THEME.text }]}>{value}</Text>
      </View>
    </View>
  );

  return (
    <View style={[styles.container, { backgroundColor: THEME.bg }]}>
      <Stack.Screen options={{ 
        headerShown: true, 
        title: 'Meu Perfil',
        headerLargeTitle: true,
        headerStyle: { backgroundColor: THEME.bg },
        headerTitleStyle: { color: THEME.text },
      }} />
      
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <View style={styles.headerArea}>
          <View style={[styles.avatarLarge, { backgroundColor: THEME.accent }]}>
             <Text style={styles.avatarLabelLarge}>
               {(user?.nomeCompleto || user?.username || 'U').charAt(0)}
             </Text>
          </View>
          <Text style={[styles.userName, { color: THEME.text }]}>{user?.nomeCompleto || user?.username}</Text>
          <Text style={[styles.userRole, { color: THEME.secondaryText }]}>{user?.role || 'Representante Comercial'}</Text>
        </View>

        <View style={[styles.section, { backgroundColor: THEME.card }]}>
          <Text style={[styles.sectionTitle, { color: THEME.secondaryText }]}>INFORMAÇÕES COMERCIAIS</Text>
          <ProfileItem icon="id-badge" label="Código do Representante" value={user?.representanteId || 'GT-00123'} />
          <ProfileItem icon="user" label="Usuário de Acesso" value={user?.username || 'user'} />
        </View>

        <View style={[styles.section, { backgroundColor: THEME.card }]}>
          <Text style={[styles.sectionTitle, { color: THEME.secondaryText }]}>SEGURANÇA</Text>
          <TouchableOpacity 
            style={styles.actionItem}
            onPress={() => Alert.alert('Segurança', 'A funcionalidade de troca de senha estará disponível em breve.')}
          >
            <View style={[styles.iconBox, { backgroundColor: '#FFD60A15' }]}>
              <FontAwesome name="lock" size={16} color="#FFD60A" />
            </View>
            <Text style={[styles.actionText, { color: THEME.text }]}>Atualizar Minha Senha</Text>
            <FontAwesome name="chevron-right" size={14} color={THEME.border} />
          </TouchableOpacity>
        </View>

        <TouchableOpacity 
          style={[styles.logoutButton, { backgroundColor: THEME.card }]}
          onPress={signOut}
        >
          <Text style={styles.logoutText}>Sair da Conta</Text>
        </TouchableOpacity>

        <Text style={[styles.versionText, { color: THEME.secondaryText }]}>Versão 1.0.0 (GT-2026)</Text>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    padding: 20,
    paddingTop: 10,
    paddingBottom: 120,
  },
  headerArea: {
    alignItems: 'center',
    marginBottom: 30,
    marginTop: 20,
  },
  avatarLarge: {
    width: 100,
    height: 100,
    borderRadius: 50,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.2,
    shadowRadius: 12,
    elevation: 8,
  },
  avatarLabelLarge: {
    color: '#FFFFFF',
    fontSize: 42,
    fontWeight: '800',
  },
  userName: {
    fontSize: 24,
    fontWeight: '700',
    letterSpacing: -0.5,
  },
  userRole: {
    fontSize: 16,
    marginTop: 4,
  },
  section: {
    borderRadius: 16,
    marginBottom: 24,
    overflow: 'hidden',
    padding: 4,
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0.5,
    marginVertical: 12,
    marginLeft: 16,
  },
  profileItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  iconBox: {
    width: 32,
    height: 32,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  itemContent: {
    flex: 1,
  },
  itemLabel: {
    fontSize: 12,
    marginBottom: 2,
  },
  itemValue: {
    fontSize: 16,
    fontWeight: '600',
  },
  actionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    paddingHorizontal: 16,
  },
  actionText: {
    flex: 1,
    fontSize: 16,
    fontWeight: '500',
  },
  logoutButton: {
    height: 56,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 10,
  },
  logoutText: {
    color: '#FF453A',
    fontSize: 17,
    fontWeight: '600',
  },
  versionText: {
    textAlign: 'center',
    marginTop: 24,
    fontSize: 12,
  },
});
