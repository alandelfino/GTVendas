import React, { useState } from 'react';
import { 
  StyleSheet, 
  TextInput, 
  Pressable, 
  ActivityIndicator, 
  KeyboardAvoidingView, 
  Platform, 
  ScrollView,
  TouchableOpacity,
  useColorScheme,
  StatusBar,
  View,
  Text,
  Dimensions
} from 'react-native';
import { useAuth } from '../context/AuthContext';
import { FontAwesome } from '@expo/vector-icons';

const { width, height } = Dimensions.get('window');

export default function LoginScreen() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const { signIn } = useAuth();
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';

  const THEME = {
    bg: isDark ? '#000000' : '#F2F2F7',
    card: isDark ? '#1C1C1E' : '#FFFFFF',
    text: isDark ? '#FFFFFF' : '#000000',
    secondaryText: isDark ? '#8E8E93' : '#636366',
    primary: isDark ? '#0A84FF' : '#007AFF', // iOS SystemBlue
    accent: '#6C5CE7', // GT Brand Purple
    border: isDark ? '#38383A' : '#C6C6C8',
    inputBg: isDark ? '#1C1C1E' : '#FFFFFF',
    errorText: '#FF453A', // iOS SystemRed
  };

  async function handleLogin() {
    if (!username || !password) {
      setError('Campos obrigatórios vazios');
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      await signIn(username, password);
    } catch (err: any) {
      setError(err.message || 'Credenciais inválidas');
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <KeyboardAvoidingView 
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={[styles.container, { backgroundColor: THEME.bg }]}
    >
      <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} />
      <ScrollView 
        contentContainerStyle={styles.scrollContent} 
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.header}>
          <View style={[styles.logoContainer, { backgroundColor: THEME.accent, shadowColor: THEME.accent }]}>
             <Text style={styles.logoBadgeText}>GT</Text>
          </View>
          <Text style={[styles.title, { color: THEME.text }]}>GT Vendas</Text>
          <Text style={[styles.subtitle, { color: THEME.secondaryText }]}>Plataforma do Representante</Text>
        </View>

        <View style={styles.formContainer}>
          {error && (
            <View style={styles.errorContainer}>
               <FontAwesome name="exclamation-circle" size={14} color={THEME.errorText} />
               <Text style={[styles.errorText, { color: THEME.errorText }]}>{error}</Text>
            </View>
          )}

          {/* Inset Grouped Form Style */}
          <View style={[styles.fieldset, { backgroundColor: THEME.card, borderColor: THEME.border }]}>
            <View style={styles.inputRow}>
              <View style={styles.inputIconWrapper}>
                <FontAwesome name="user" size={16} color={THEME.primary} />
              </View>
              <TextInput
                style={[styles.input, { color: THEME.text }]}
                placeholder="Nome de usuário"
                placeholderTextColor={isDark ? '#48484A' : '#C6C6C8'}
                value={username}
                onChangeText={setUsername}
                autoCapitalize="none"
                autoCorrect={false}
              />
            </View>
            
            <View style={[styles.separator, { backgroundColor: THEME.border }]} />
            
            <View style={styles.inputRow}>
              <View style={styles.inputIconWrapper}>
                <FontAwesome name="lock" size={16} color={THEME.primary} />
              </View>
              <TextInput
                style={[styles.input, { color: THEME.text }]}
                placeholder="Senha de acesso"
                placeholderTextColor={isDark ? '#48484A' : '#C6C6C8'}
                value={password}
                onChangeText={setPassword}
                secureTextEntry
                autoCapitalize="none"
              />
            </View>
          </View>

          <Pressable 
            style={({ pressed }) => [
              styles.loginButton,
              { backgroundColor: THEME.accent, shadowColor: THEME.accent, opacity: pressed || isSubmitting ? 0.8 : 1 }
            ]}
            onPress={handleLogin}
            disabled={isSubmitting}
          >
            {isSubmitting ? (
              <ActivityIndicator color="#FFF" />
            ) : (
              <Text style={styles.loginButtonText}>Acessar Conta</Text>
            )}
          </Pressable>

          <TouchableOpacity style={styles.forgotButton}>
            <Text style={[styles.forgotText, { color: THEME.primary }]}>Esqueceu a senha?</Text>
          </TouchableOpacity>
        </View>

          <View style={styles.footer}>
            <Text style={[styles.footerText, { color: THEME.secondaryText }]}>© 2026 Grupo Titanium</Text>
            <Text style={[styles.footerVersion, { color: THEME.secondaryText }]}>Versão 1.0.0</Text>
          </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    paddingHorizontal: 28,
  },
  header: {
    alignItems: 'center',
    marginBottom: 48,
    marginTop: 20,
  },
  logoContainer: {
    width: 90,
    height: 90,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.35,
    shadowRadius: 18,
    elevation: 10,
  },
  logoBadgeText: {
    color: '#FFFFFF',
    fontSize: 38,
    fontWeight: '900',
    letterSpacing: -2,
  },
  title: {
    fontSize: 34,
    fontWeight: '800',
    letterSpacing: -1,
  },
  subtitle: {
    fontSize: 17,
    fontWeight: '400',
    marginTop: 4,
    letterSpacing: -0.2,
  },
  formContainer: {
    width: '100%',
  },
  fieldset: {
    borderRadius: 14,
    borderWidth: Platform.OS === 'ios' ? 0.5 : 1,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 2,
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 54,
    paddingHorizontal: 16,
  },
  inputIconWrapper: {
    width: 30,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 8,
  },
  input: {
    flex: 1,
    fontSize: 17,
    height: '100%',
    paddingTop: 2, // Fine tune vertical alignment
  },
  separator: {
    height: StyleSheet.hairlineWidth,
    marginLeft: 54, // Align with input text start
  },
  errorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
    gap: 6,
  },
  errorText: {
    fontSize: 13,
    fontWeight: '600',
  },
  loginButton: {
    height: 56,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 24,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 6,
  },
  loginButtonText: {
    color: '#FFFFFF',
    fontSize: 17,
    fontWeight: '700',
    letterSpacing: -0.4,
  },
  forgotButton: {
    marginTop: 20,
    alignItems: 'center',
  },
  forgotText: {
    fontSize: 15,
    fontWeight: '500',
  },
  footer: {
    marginTop: 60,
    paddingBottom: 40,
    alignItems: 'center',
  },
  footerText: {
    fontSize: 12,
    fontWeight: '500',
    letterSpacing: 0.2,
  },
  footerVersion: {
    fontSize: 11,
    marginTop: 4,
    opacity: 0.6,
  },
});
