import React, { useState, useEffect } from 'react';
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
  Alert,
  View,
  Text,
  Dimensions,
  Image
} from 'react-native';
import * as LocalAuthentication from 'expo-local-authentication';
import * as SecureStore from 'expo-secure-store';
import { useAuth } from '../context/AuthContext';
import { FontAwesome } from '@expo/vector-icons';

const { width, height } = Dimensions.get('window');

export default function LoginScreen() {
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [biometricSupported, setBiometricSupported] = useState(false);
    const [authType, setAuthType] = useState<LocalAuthentication.AuthenticationType[]>([]);

  const { signIn } = useAuth();
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';

  const THEME = {
    bg: isDark ? '#1C252E' : '#F2F2F7',
    card: isDark ? '#2C3641' : '#FFFFFF',
    text: isDark ? '#FFFFFF' : '#1C252E',
    secondaryText: isDark ? '#8E9AA9' : '#636366',
    primary: '#F9B252', // GT Logo Amber
    accent: '#F9B252',  // GT Logo Amber
    border: isDark ? '#3D4956' : '#C6C6C8',
    inputBg: isDark ? '#2C3641' : '#FFFFFF',
    errorText: '#FF453A',
  };

  useEffect(() => {
    checkBiometrics();
  }, []);

  async function checkBiometrics() {
    const hasHardware = await LocalAuthentication.hasHardwareAsync();
    const isEnrolled = await LocalAuthentication.isEnrolledAsync();
    const types = await LocalAuthentication.supportedAuthenticationTypesAsync();
    
    if (hasHardware && isEnrolled) {
      setBiometricSupported(true);
      setAuthType(types);
      
      // Auto-trigger ONLY if user explicitly enabled it previously
      const isEnabled = await SecureStore.getItemAsync('faceid_enabled');
      if (isEnabled === 'true') {
        handleBiometricAuth();
      }
    }
  }

  async function handleBiometricAuth() {
    try {
      const result = await LocalAuthentication.authenticateAsync({
        promptMessage: 'Acesse o painel do Grupo Titanium',
        fallbackLabel: 'Usar senha',
        disableDeviceFallback: true, // STRICT: FaceID only, no passcode fallback
      });

      if (result.success) {
        const savedUser = await SecureStore.getItemAsync('saved_id');
        const savedPass = await SecureStore.getItemAsync('saved_pass');
        
        if (savedUser && savedPass) {
          setIsSubmitting(true);
          try {
            await signIn(savedUser, savedPass);
          } catch (e: any) {
            setError(e.message || 'Falha na re-autenticação biométrica');
          }
        } else {
          setError('Nenhuma biometria vinculada ainda. Logue manualmente uma vez.');
        }
      }
    } catch (err: any) {
      console.error('Biometric error:', err);
      setError('Falha ao utilizar biometria');
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleLogin() {
    if (!username || !password) {
      setError('Campos obrigatórios vazios');
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      await signIn(username, password);
      
      // After success, check if FaceID should be offered
      const faceIdStatus = await SecureStore.getItemAsync('faceid_enabled');
      
      if (biometricSupported && faceIdStatus !== 'true' && faceIdStatus !== 'declined') {
        Alert.alert(
          'Acesso Rápido',
          'Deseja utilizar o FaceID para seus próximos acessos ao Grupo Titanium?',
          [
            { 
              text: 'Agora Não', 
              style: 'cancel',
              onPress: async () => await SecureStore.setItemAsync('faceid_enabled', 'declined') 
            },
            { 
              text: 'Ativar FaceID', 
              onPress: async () => {
                await SecureStore.setItemAsync('faceid_enabled', 'true');
                await SecureStore.setItemAsync('saved_id', username);
                await SecureStore.setItemAsync('saved_pass', password);
              }
            }
          ]
        );
      }
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
          <View style={styles.logoContainer}>
             <Image 
               source={require('../assets/images/gtvendas500x500.png')} 
               style={styles.logoImage} 
               resizeMode="contain"
             />
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

          <View style={styles.buttonContainer}>
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

          </View>

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
    width: 120,
    height: 120,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },
  logoImage: {
    width: '100%',
    height: '100%',
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
  buttonContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 24,
    gap: 12,
  },
  loginButton: {
    flex: 1,
    height: 56,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
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
  biometricButton: {
    width: 56,
    height: 56,
    borderRadius: 14,
    borderWidth: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'transparent',
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
