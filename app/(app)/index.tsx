import React from 'react';
import { StyleSheet, Pressable } from 'react-native';
import { Text, View } from '@/components/Themed';
import { useAuth } from '../../context/AuthContext';
import { FontAwesome } from '@expo/vector-icons';
import { Link } from 'expo-router';

export default function DashboardScreen() {
  const { user, signOut } = useAuth();

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View style={styles.welcomeContainer}>
          <Text style={styles.greeting}>Bem-vindo,</Text>
          <Text style={styles.userName}>{user?.nomeCompleto || user?.username || 'Usuário'}</Text>
        </View>
        <Pressable 
          style={({ pressed }) => [
            styles.logoutButton,
            { opacity: pressed ? 0.7 : 1 }
          ]} 
          onPress={signOut}
        >
          <FontAwesome name="sign-out" size={24} color="#6C5CE7" />
        </Pressable>
      </View>

      <View style={styles.content}>
        <View style={styles.welcomeCard}>
          <View style={[styles.iconCircle, { backgroundColor: '#E0DBFF' }]}>
            <FontAwesome name="rocket" size={30} color="#6C5CE7" />
          </View>
          <Text style={styles.welcomeTitle}>Prepare-se para vender!</Text>
          <Text style={styles.welcomeDescription}>
            Acesse seus clientes, pedidos e produtos de forma nativa e rápida.
          </Text>
        </View>

        <Text style={styles.sectionTitle}>Próximos Passos</Text>
        <Link href="/chat" asChild>
          <Pressable style={styles.actionCard}>
            <View style={[styles.iconCircle, { backgroundColor: '#A29BFE', width: 50, height: 50 }]}>
              <FontAwesome name="commenting" size={24} color="#6C5CE7" />
            </View>
            <View style={styles.actionCardText}>
              <Text style={styles.actionTitle}>Assistente GT</Text>
              <Text style={styles.actionSubtitle}>Fale com a IA sobre suas vendas</Text>
            </View>
            <FontAwesome name="chevron-right" size={16} color="#B2BEC3" />
          </Pressable>
        </Link>
        
        <View style={styles.infoRow}>
          <View style={styles.infoIcon}>
            <FontAwesome name="check-circle" size={20} color="#00B894" />
          </View>
          <Text style={styles.infoText}>Sincronização com ERP em tempo real</Text>
        </View>
        <View style={styles.infoRow}>
          <View style={styles.infoIcon}>
            <FontAwesome name="check-circle" size={20} color="#00B894" />
          </View>
          <Text style={styles.infoText}>Gestão de clientes e carteira</Text>
        </View>
        <View style={styles.infoRow}>
          <View style={styles.infoIcon}>
            <FontAwesome name="check-circle" size={20} color="#00B894" />
          </View>
          <Text style={styles.infoText}>Assistente GT integrado</Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8F9FD',
    padding: 20,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 20,
    marginBottom: 30,
    backgroundColor: 'transparent',
  },
  welcomeContainer: {
    backgroundColor: 'transparent',
  },
  greeting: {
    fontSize: 18,
    color: '#636E72',
    fontWeight: '500',
  },
  userName: {
    fontSize: 28,
    fontWeight: '800',
    color: '#2D3436',
  },
  logoutButton: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#FFF',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  content: {
    backgroundColor: 'transparent',
  },
  welcomeCard: {
    backgroundColor: '#FFF',
    borderRadius: 30,
    padding: 30,
    alignItems: 'center',
    marginBottom: 30,
    shadowColor: '#6C5CE7',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.05,
    shadowRadius: 20,
    elevation: 5,
  },
  iconCircle: {
    width: 70,
    height: 70,
    borderRadius: 35,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },
  welcomeTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: '#2D3436',
    marginBottom: 10,
    textAlign: 'center',
  },
  welcomeDescription: {
    fontSize: 16,
    color: '#636E72',
    textAlign: 'center',
    lineHeight: 24,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#2D3436',
    marginBottom: 15,
    marginTop: 10,
  },
  actionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF',
    padding: 15,
    borderRadius: 20,
    marginBottom: 15,
    shadowColor: '#6C5CE7',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 3,
  },
  actionCardText: {
    flex: 1,
    marginLeft: 15,
  },
  actionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#2D3436',
  },
  actionSubtitle: {
    fontSize: 12,
    color: '#636E72',
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF',
    padding: 15,
    borderRadius: 15,
    marginBottom: 10,
  },
  infoIcon: {
    marginRight: 15,
  },
  infoText: {
    fontSize: 16,
    color: '#2D3436',
    fontWeight: '600',
  },
});
