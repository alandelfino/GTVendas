import { FontAwesome, Ionicons } from '@expo/vector-icons';
import { RecordingOptions, requestRecordingPermissionsAsync, setAudioModeAsync, useAudioPlayer, useAudioPlayerStatus, useAudioRecorder } from 'expo-audio';
import * as FileSystem from 'expo-file-system/legacy';
import { Stack, useRouter } from 'expo-router';
import * as SecureStore from 'expo-secure-store';
import * as Sharing from 'expo-sharing';
import React, { useEffect, useRef, useState } from 'react';
import {
    ActivityIndicator,
    Animated,
    Dimensions,
    Easing,
    FlatList,
    ImageBackground,
    KeyboardAvoidingView,
    Linking,
    Pressable,
    Share,
    StatusBar,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    useColorScheme,
    View,
    Modal,
    ActionSheetIOS,
    Platform,
    Vibration,
    Alert
} from 'react-native';
import * as Clipboard from 'expo-clipboard';
import { Swipeable } from 'react-native-gesture-handler';
import { useIsFocused } from '@react-navigation/native';
import Markdown from 'react-native-markdown-display';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { WebView } from 'react-native-webview';
import { BlurView } from 'expo-blur';
import Svg, { Circle } from 'react-native-svg';
import api from '../../api/api';
import { useAuth } from '../../context/AuthContext';

const { width } = Dimensions.get('window');

interface Message {
  id: number | string;
  role: 'user' | 'assistant';
  content: string;
  events?: any[];
  type?: 'text' | 'pdf' | 'map_embed' | 'html_widget';
  data?: any;
  audioUri?: string;
  isVoice?: boolean;
  hasAudio?: boolean;
  hasTts?: boolean;
  transcricao?: string | null;
  audioMime?: string | null;
  createdAt?: string | number | Date;
}

interface ChatSession {
  id: number;
  titulo: string;
  atualizadoEm: string;
}

export default function ChatScreen() {
  const { user } = useAuth();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';

  const THEME = {
    primary: isDark ? '#F9B252' : '#3D4956',
    background: isDark ? '#1C252E' : '#F2F2F7',
    assistantBubble: isDark ? '#2C3641' : '#FFFFFF',
    userBubble: '#F9B252',
    textMain: isDark ? '#FFFFFF' : '#1C252E',
    textSecondary: isDark ? '#8E9AA9' : '#8E8E93',
    inputBg: isDark ? '#2C3641' : '#FFFFFF',
    border: isDark ? '#3D4956' : '#E5E5EA',
    danger: '#FF453A',
  };

  const userMarkdownStyles = {
    body: { color: '#FFFFFF', fontSize: 16, fontWeight: '400' as const },
    paragraph: { marginVertical: 0 },
  };

  const assistantMarkdownStyles = {
    body: { color: THEME.textMain, fontSize: 16, fontWeight: '400' as const },
    paragraph: { marginVertical: 0 },
  };
   
  // Chat State
  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [activeSessionId, setActiveSessionId] = useState<number | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputText, setInputText] = useState('');
  const [loading, setLoading] = useState(false);
  const [streamingText, setStreamingText] = useState('');
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);
  const [isEditingSessions, setIsEditingSessions] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [loadingMessage, setLoadingMessage] = useState('Aguarde...');
  const [searchSession, setSearchSession] = useState('');
  
  // Audio Configuration (Global Engine)
  const recorder = useAudioRecorder({
    extension: '.m4a',
    sampleRate: 16000,
    numberOfChannels: 1,
    bitRate: 128000,
    ios: {
      extension: '.m4a',
      sampleRate: 16000,
      audioQuality: 1, // HIGH
    },
    android: {
      extension: '.m4a',
      sampleRate: 16000,
      outputFormat: 'mpeg4',
      audioEncoder: 'aac',
    },
    web: {}
  } as RecordingOptions);

  const globalPlayer = useAudioPlayer();
  const playerStatus = useAudioPlayerStatus(globalPlayer);
  const isFocused = useIsFocused();
  const [activePlayingId, setActivePlayingId] = useState<number | string | null>(null);
  const [isAudioLoading, setIsAudioLoading] = useState(false);

  const [isRecording, setIsRecording] = useState(false);
  const [voiceMode, setVoiceMode] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const recordTimerRef = useRef<NodeJS.Timeout | null>(null);
  const slideAnim = useRef(new Animated.Value(0)).current; 
  const pulseAnim = useRef(new Animated.Value(1)).current;

  const flatListRef = useRef<FlatList>(null);
  const swipeableRefs = useRef<Map<string, Swipeable>>(new Map());
  const openRowKey = useRef<string | null>(null);

  const configureAudioMode = async (forRecording: boolean) => {
    try {
      await setAudioModeAsync({
        allowsRecording: forRecording,
        playsInSilentMode: true,
        shouldPlayInBackground: true,
      });
    } catch (e) {
      console.error('Error configuring audio mode:', e);
    }
  };

  const closeOpenRow = () => {
    if (openRowKey.current !== null) {
      swipeableRefs.current.get(openRowKey.current)?.close();
      openRowKey.current = null;
    }
  };

  const handleOpenReport = async (reportId: string, titulo: string) => {
    setLoadingMessage('Abrindo relatório...');
    setActionLoading(true);
    try {
      // Step 1: Gerar token de acesso público via endpoint de compartilhamento
      const shareResponse = await api.post(`/api/rep/chat/reports/${reportId}/share`);
      
      // O backend retorna "token" no JSON conforme log
      const shareToken = shareResponse.data.token || shareResponse.data.shareToken;
      
      if (!shareToken) throw new Error('Falha ao gerar token de compartilhamento');

      // Step 2: Abrir a URL pública no WebView (sem necessidade de headers auth)
      const publicUrl = `${api.defaults.baseURL}/api/public/report/${shareToken}`;
      
      router.push({
        pathname: '/(app)/report-view',
        params: { 
          url: publicUrl,
          title: titulo || 'Relatório'
        }
      });
    } catch (error: any) {
      console.error('Error generating report share token:', error?.response?.data || error.message);
      Alert.alert('Erro', 'Não foi possível autorizar a visualização deste relatório.');
    } finally {
      setActionLoading(false);
    }
  };

  const renderSessionRightActions = (id: number) => (
    <View style={styles.sessionRightActions}>
      <TouchableOpacity 
        style={[styles.sessionDeleteBtn, { backgroundColor: THEME.danger }]}
        onPress={() => { closeOpenRow(); deleteSession(id); }}
        activeOpacity={0.7}
      >
        <Ionicons name="trash-outline" size={22} color="#FFF" />
      </TouchableOpacity>
    </View>
  );

  useEffect(() => {
    loadSessions();
    configureAudioMode(false);

    return () => {
      // Emergency clean up only if we still have references
      try {
        if (globalPlayer && globalPlayer.playing) {
          globalPlayer.pause();
        }
        if (recorder) {
          recorder.stop();
        }
      } catch (e) {}
      
      if (recordTimerRef.current) clearInterval(recordTimerRef.current);
    };
  }, []);

  useEffect(() => {
    if (activeSessionId) {
      loadMessages(activeSessionId);
    } else {
      setMessages([]);
    }
  }, [activeSessionId]);

  // Scroll Automático Inteligente
  useEffect(() => {
    if (messages.length > 0) {
      // Scroll imediato para listas já carregadas
      flatListRef.current?.scrollToEnd({ animated: false });
      
      // Ajuste de precisão para garantir que o layout final foi processado (especialmente para Android)
      const timer = setTimeout(() => {
        flatListRef.current?.scrollToEnd({ animated: true });
      }, 300);
      return () => clearTimeout(timer);
    }
  }, [messages.length, activeSessionId]);

  const loadSessions = async () => {
    setLoading(true);
    try {
      console.log('--- [CHAT DEBUG] Carregando Sessões ---');
      const response = await api.get('/api/rep/chat/sessions');
      console.log(`--- [CHAT DEBUG] Sessões Recebidas: ${response.data.length} ---`);
      setSessions(response.data);
      if (response.data.length > 0 && !activeSessionId) {
        setActiveSessionId(response.data[0].id);
      } else if (response.data.length === 0) {
        createNewSession();
      }
    } catch (error) {
      console.error('--- [CHAT DEBUG ERROR] Erro ao carregar sessões:', error);
    } finally {
      setLoading(false);
    }
  };

  const createNewSession = async () => {
    try {
      const response = await api.post('/api/rep/chat/sessions', {});
      const newSession = response.data;
      setSessions([newSession, ...sessions]);
      setActiveSessionId(newSession.id);
      setMessages([]);
    } catch (error) {
      console.error('Error creating session:', error);
    }
  };

  const deleteSession = async (id: number) => {
    setLoadingMessage('Excluindo conversa...');
    setActionLoading(true);
    try {
      await api.delete(`/api/rep/chat/sessions/${id}`);
      setSessions(prev => prev.filter(s => s.id !== id));
      if (activeSessionId === id) {
        setActiveSessionId(null);
        setMessages([]);
      }
    } catch (e) {
      console.error('Delete session error:', e);
    } finally {
      setActionLoading(false);
    }
  };

  const formatRecordTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins < 10 ? '0' : ''}${mins}:${secs < 10 ? '0' : ''}${secs}`;
  };

  const loadMessages = async (sessionId: number) => {
    try {
      const response = await api.get(`/api/rep/chat/sessions/${sessionId}/messages`);
      
      console.log(`\n--- [DEBUG PROFUNDO SESSÃO ${sessionId}] ---`);
      console.log('RESPOSTA COMPLETA (3 Primeiras):', JSON.stringify(response.data.slice(0, 3), null, 2));
      console.log('--------------------------------------------\n');

      const history: Message[] = response.data.map((m: any) => ({
        ...m,
        id: m.id.toString(),
        createdAt: m.criadoEm || new Date().toISOString(),
      }));
      setMessages(history);
      setTimeout(() => flatListRef.current?.scrollToEnd({ animated: true }), 100);
    } catch (err) {
      console.error('Error loading messages:', err);
    }
  };

  const sendMessage = async (text: string, skipBubble = false) => {
    if (!text.trim() || !activeSessionId) return;

    const userMessageText = text.trim();
    if (!skipBubble) {
      const userMsg = {
        id: `user-${Date.now()}`,
        role: 'user' as const,
        content: userMessageText,
        createdAt: new Date().toISOString(),
      };
      setMessages(prev => [...prev, userMsg]);
    }
    
    setInputText('');
    setLoading(true);
    setTimeout(() => flatListRef.current?.scrollToEnd({ animated: true }), 100);

    try {
      // POST síncrono v2.0
      const response = await api.post('/api/mobile/chat/message', {
        content: userMessageText,
        sessionId: activeSessionId
      });

      const { messageId, content, events } = response.data;

      // Log dos links de relatórios gerados
      if (events && events.length > 0) {
        events.forEach((event: any) => {
          if (event.type === 'pdf' || event.type === 'html_widget') {
            const reportUrl = `${api.defaults.baseURL}/api/rep/chat/reports/${event.reportId || event.widgetId}`;
            console.log(`\n--- [CHAT REPORT LINK] ---\n${reportUrl}\n-------------------------\n`);
          }
        });
      }

      // Adicionar resposta do assistente ao estado
      const assistantMsg = {
        id: messageId.toString(),
        role: 'assistant' as const,
        content: content,
        events: events || [], // Guardar eventos para renderizar botões
        createdAt: new Date().toISOString()
      };

      setMessages(prev => [...prev, assistantMsg]);
      
      // Se a sessão ainda não tinha título, recarregar a lista lateral 
      // (pois o backend gera o título após a primeira mensagem)
      if (sessions.find(s => s.id === activeSessionId)?.titulo === null) {
        const sessRes = await api.get('/api/rep/chat/sessions');
        setSessions(sessRes.data);
      }

    } catch (err: any) {
      console.error('--- [CHAT SEND ERROR] ---', err?.response?.data || err.message);
      Alert.alert('Erro', 'O assistente encontrou um problema ao processar sua solicitação.');
    } finally {
      setLoading(false);
      setTimeout(() => flatListRef.current?.scrollToEnd({ animated: true }), 100);
    }
  };

  const startRecording = async () => {
    if (recorder.isRecording) return; 
    try {
      const permission = await requestRecordingPermissionsAsync();
      if (!permission.granted) return;
      
      await configureAudioMode(true);
      await recorder.prepareToRecordAsync();
      recorder.record();
      
      setIsRecording(true);
      setRecordingTime(0);
      
      Animated.timing(slideAnim, {
        toValue: 1,
        duration: 200,
        useNativeDriver: true,
        easing: Easing.out(Easing.ease),
      }).start();

      Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, { toValue: 1.2, duration: 500, useNativeDriver: true }),
          Animated.timing(pulseAnim, { toValue: 1, duration: 500, useNativeDriver: true }),
        ])
      ).start();

      recordTimerRef.current = setInterval(() => {
        setRecordingTime(prev => prev + 1);
      }, 1000) as any;

      if (globalPlayer.playing) globalPlayer.pause();
    } catch (err) {
      console.error('Failed to start recording', err);
    }
  };

  const stopRecording = async () => {
    if (!recorder.isRecording) return;
    try {
      const isShort = recordingTime < 2;
      
      setIsRecording(false);
      if (recordTimerRef.current) clearInterval(recordTimerRef.current);
      pulseAnim.setValue(1);
      
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 150,
        useNativeDriver: true,
      }).start();

      await recorder.stop();
      const uri = recorder.uri;
      
      if (uri && !isShort) {
        transcribeAudio(uri);
      } else if (isShort) {
        console.log('--- [CHAT DEBUG] Gravação cancelada por ser muito curta (< 2s) ---');
      }
    } catch (e) {
      console.error('Stop recording error:', e);
    }
  };

  const transcribeAudio = async (uri: string) => {
    const tempId = `voice-temp-${Date.now()}`;
    const initialVoiceMsg: Message = {
      id: tempId,
      role: 'user',
      content: 'Transcrevendo áudio...',
      isVoice: true,
      audioUri: uri,
      createdAt: new Date().toISOString()
    };
    setMessages(prev => [...prev, initialVoiceMsg]);
    
    try {
      const fileInfo = await FileSystem.getInfoAsync(uri);
      if (!fileInfo.exists || (fileInfo.size && fileInfo.size < 100)) return;

      let token = (await SecureStore.getItemAsync('accessToken')) || '';
      const baseUrl = api.defaults.baseURL || '';
      const uploadUrl = `${baseUrl.replace(/\/$/, '')}/api/rep/chat/transcribe`;

      const performUpload = async (authToken: string) => {
        return await FileSystem.uploadAsync(uploadUrl, uri, {
          httpMethod: 'POST',
          uploadType: 0, 
          headers: {
            'Content-Type': 'audio/m4a',
            'Authorization': `Bearer ${authToken}`
          },
        });
      };

      let response = await performUpload(token);

      if (response.status === 401) {
        const refreshToken = await SecureStore.getItemAsync('refreshToken');
        if (refreshToken) {
          const refreshRes = await api.post(`${baseUrl.replace(/\/$/, '')}/api/mobile/refresh`, { refreshToken });
          token = refreshRes.data.accessToken || '';
          await SecureStore.setItemAsync('accessToken', token);
          response = await performUpload(token);
        }
      }

      if (response.status >= 200 && response.status < 300) {
        const body = JSON.parse(response.body);
        if (body.text) {
          // Remover mensagem temporária ANTES de enviar a real
          setMessages(prev => prev.filter(m => m.id !== tempId));
          // Enviar para o novo flow síncrono REST v2.0 (que criará a bolha com o texto real)
          await sendMessage(body.text, false);
        } else {
          setMessages(prev => prev.filter(m => m.id !== tempId));
        }
      } else {
        throw new Error(`Servidor retornou status ${response.status}`);
      }
    } catch (error: any) {
      console.error('Transcription upload error:', error.message || error);
      setMessages(prev => [...prev.filter(m => m.id !== tempId), {
        id: `err-${Date.now()}`,
        role: 'assistant',
        content: `Houve um erro ao processar o áudio. Tente novamente.`
      }]);
    }
  };

  const MessageAudioPlayer = ({ message }: { message: Message }) => {
    const isCurrentPlaying = isFocused && activePlayingId === message.id;
    const isPlaying = isCurrentPlaying && playerStatus.playing;
    const currentProgress = isCurrentPlaying ? (playerStatus.currentTime / (playerStatus.duration || 1)) * 100 : 0;
    const displayTime = isCurrentPlaying ? playerStatus.currentTime : 0;
    
    const getAudioSource = async () => {
      if (message.audioUri) return message.audioUri;
      
      if (message.role === 'user' && message.id) {
        return `${api.defaults.baseURL}api/rep/chat/messages/${message.id}/audio`;
      }

      if (message.role === 'assistant' && message.id) {
        setIsAudioLoading(true);
        try {
          const response = await api.post(`api/rep/chat/messages/${message.id}/tts`, {}, { responseType: 'blob' });
          const reader = new FileReader();
          return new Promise<string>((resolve, reject) => {
            reader.onloadend = () => { setIsAudioLoading(false); resolve(reader.result as string); };
            reader.onerror = () => { setIsAudioLoading(false); reject(new Error("Erro ao ler o áudio")); };
            reader.readAsDataURL(response.data);
          });
        } catch (err) { setIsAudioLoading(false); throw err; }
      }

      setIsAudioLoading(true);
      try {
        const cleanText = message.content.replace(/[*_#`\[\]()]/g, '').replace(/\n/g, '. ').substring(0, 500);
        const response = await api.post('/api/rep/chat/tts', { text: cleanText }, { responseType: 'arraybuffer' });
        const uint8 = new Uint8Array(response.data);
        
        let binary = '';
        for (let i = 0; i < uint8.byteLength; i++) {
          binary += String.fromCharCode(uint8[i]);
        }
        
        const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';
        let base64 = '';
        for (let i = 0; i < binary.length; i += 3) {
          let chunk = (binary.charCodeAt(i) << 16) | (binary.charCodeAt(i + 1) << 8) | binary.charCodeAt(i + 2);
          base64 += chars[(chunk & 0xFC0000) >> 18] + chars[(chunk & 0x3F000) >> 12] + chars[(chunk & 0xFC0) >> 6] + chars[chunk & 0x3F];
        }
        
        // Workaround for SDK 54 type shadowing on FileSystem.cacheDirectory
        const cacheDir = (FileSystem as any).cacheDirectory || '';
        const path = cacheDir + `tts_${message.id}.mp3`;
        await FileSystem.writeAsStringAsync(path, base64, { encoding: 'base64' as any });
        message.audioUri = path;
        return path;
      } catch (e) { console.error('TTS Source Error:', e); return null; } finally { setIsAudioLoading(false); }
    };

    const handleToggle = async () => {
      await configureAudioMode(false);
      
      if (isCurrentPlaying) {
        if (globalPlayer.playing) globalPlayer.pause();
        else globalPlayer.play();
        return;
      }

      // Marcar como ativo IMEDIATAMENTE para o loader aparecer enquanto gera o áudio
      setActivePlayingId(message.id);

      // Switching audio
      const source = await getAudioSource();
      if (!source) {
        // Se falhar ao gerar, resetamos a seleção
        if (activePlayingId === message.id) setActivePlayingId(null);
        return;
      }

      globalPlayer.replace(source);
      globalPlayer.play();
    };

    const formatTime = (millis: number) => {
      const seconds = Math.floor(millis / 1000);
      const minutes = Math.floor(seconds / 60);
      const remainingSeconds = seconds % 60;
      return `${minutes}:${remainingSeconds < 10 ? '0' : ''}${remainingSeconds}`;
    };

    const isMsgFromUser = message.role === 'user';
    const iconColor = isMsgFromUser ? '#FFFFFF' : THEME.primary;
    const barBgColor = isMsgFromUser ? 'rgba(255,255,255,0.2)' : 'rgba(128,128,128,0.1)';
    const progressBarColor = isMsgFromUser ? '#FFFFFF' : THEME.primary;
    const textColor = isMsgFromUser ? 'rgba(255,255,255,0.8)' : THEME.textSecondary;

    return (
      <View style={styles.playerContainer}>
        <Pressable onPress={handleToggle} style={styles.playButtonCompact}>
          {(isAudioLoading && isCurrentPlaying) ? <ActivityIndicator size="small" color={iconColor} /> : 
          <FontAwesome name={isPlaying ? "pause" : "play"} size={12} color={iconColor} />}
        </Pressable>
        <View style={[styles.progressBarBg, { backgroundColor: barBgColor }]}>
          <View style={[styles.progressBarFill, { width: `${currentProgress}%`, backgroundColor: progressBarColor }]} />
        </View>
        <Text style={[styles.durationText, { color: textColor }]}>
          {isCurrentPlaying ? formatTime(displayTime * 1000) : (message.id.toString().includes('voice-temp') ? '...' : '0:00')}
        </Text>
      </View>
    );
  };

  const formatMsgTime = (date?: string | number | Date) => {
    try {
      const d = date ? new Date(date) : new Date();
      return d.getHours().toString().padStart(2, '0') + ':' + d.getMinutes().toString().padStart(2, '0');
    } catch (e) {
      return '--:--';
    }
  };

  const renderMessage = ({ item }: { item: Message }) => {
    const isUser = item.role === 'user';

    const handleLongPress = () => {
      if (!item.content) return;
      Vibration.vibrate(Platform.OS === 'ios' ? 1 : 50);
      const options = ['Copiar', 'Cancelar'];
      
      if (Platform.OS === 'ios') {
        ActionSheetIOS.showActionSheetWithOptions(
          { options, cancelButtonIndex: 1, title: 'Opções da Mensagem' },
          async (index) => {
            if (index === 0) {
              await Clipboard.setStringAsync(item.content);
            }
          }
        );
      } else {
        Alert.alert('Opções', undefined, [
          { text: 'Copiar Texto', onPress: async () => await Clipboard.setStringAsync(item.content) },
          { text: 'Cancelar', style: 'cancel' }
        ]);
      }
    };

    return (
      <View style={[styles.bubbleWrapper, isUser ? styles.userBubbleWrapper : styles.assistantBubbleWrapper]}>
        <View style={{ alignItems: isUser ? 'flex-end' : 'flex-start', maxWidth: '85%' }}>
          <TouchableOpacity 
            activeOpacity={0.9}
            delayLongPress={500}
            onLongPress={handleLongPress}
            style={[styles.messageBubble, isUser ? styles.userBubble : [styles.assistantBubble, { backgroundColor: THEME.assistantBubble }]]}
          >
            {isUser && item.content === 'Transcrevendo áudio...' ? (
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <ActivityIndicator size="small" color="#FFFFFF" />
                <Text style={{ color: '#FFFFFF', fontSize: 16 }}>Transcrevendo áudio...</Text>
              </View>
            ) : (
              <Markdown style={isUser ? userMarkdownStyles : assistantMarkdownStyles}>
                {item.content}
              </Markdown>
            )}

            {/* Eventos e Cards do Assistente */}
            {!isUser && (item.events && item.events.length > 0 || item.type === 'pdf' || item.type === 'html_widget') && (
              <View style={styles.eventsContainer}>
                {/* Formato Novo: Array de eventos */}
                {item.events?.map((event, idx) => {
                  if (event.type === 'pdf' || event.type === 'html_widget') {
                    return (
                      <TouchableOpacity 
                        key={`evt-${idx}`}
                        style={styles.eventButton}
                        onPress={() => handleOpenReport(event.reportId || event.widgetId, event.titulo)}
                      >
                        <FontAwesome 
                          name={event.type === 'pdf' ? "file-pdf-o" : "bar-chart"} 
                          size={16} 
                          color={THEME.primary} 
                        />
                        <Text 
                          style={[styles.eventButtonText, { color: THEME.textMain }]}
                          numberOfLines={2}
                          ellipsizeMode="tail"
                        >
                          {event.titulo || event.title || event.caption || 'Ver Relatório'}
                        </Text>
                      </TouchableOpacity>
                    );
                  }
                  if (event.type === 'map_embed') {
                    return (
                      <TouchableOpacity 
                        key={`map-${idx}`}
                        style={styles.eventButton}
                        onPress={() => Linking.openURL(event.mapsUrl)}
                      >
                        <Ionicons name="map-outline" size={16} color={THEME.primary} />
                        <Text style={[styles.eventButtonText, { color: THEME.textMain }]}>Ver no mapa</Text>
                      </TouchableOpacity>
                    );
                  }
                  return null;
                })}

                {/* Agrupar tool_calls em um único chip (Removido por ser redundante em fluxo síncrono) */}


                {/* Formato Legado: Para mensagens de antes da atualização do servidor */}
                {(item.type === 'pdf' || item.type === 'html_widget') && !item.events?.length && (
                  <TouchableOpacity 
                    style={styles.eventButton}
                    onPress={() => {
                      const reportId = item.data?.reportId || item.data?.widgetId || item.id;
                      handleOpenReport(reportId, item.data?.titulo);
                    }}
                  >
                    <FontAwesome name="file-pdf-o" size={16} color={THEME.primary} />
                    <Text 
                      style={[styles.eventButtonText, { color: THEME.textMain }]}
                      numberOfLines={2}
                      ellipsizeMode="tail"
                    >
                      {item.data?.titulo || item.data?.title || item.data?.caption || 'Ver Relatório'}
                    </Text>
                  </TouchableOpacity>
                )}
              </View>
            )}

            {(item.role === 'assistant') && (
              <MessageAudioPlayer message={item} />
            )}
          </TouchableOpacity>
          <Text style={[styles.messageTime, { color: THEME.textSecondary }]}>
            {formatMsgTime(item.createdAt)}
          </Text>
        </View>
      </View>
    );
  };





  const handleCreateNewSession = () => {
    createNewSession();
  };

  return (
    <View style={[styles.container, { backgroundColor: THEME.background }]}>
      <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} translucent backgroundColor="transparent" />
      <Stack.Screen 
        options={{ 
          headerShown: true,
          headerTitleAlign: 'center',
          headerTitle: () => (
            <View style={styles.headerTitleContainer}>
              <Text style={[styles.headerTitleMain, { color: THEME.textMain }]}>Assistente</Text>
              <View style={styles.statusDot} />
            </View>
          ),
          headerStyle: { backgroundColor: THEME.background },
          headerShadowVisible: false,
          headerLeft: () => (
            <TouchableOpacity 
              onPress={() => router.back()} 
              style={{ flexDirection: 'row', alignItems: 'center', marginLeft: 0 }}
              hitSlop={{ top: 15, bottom: 15, left: 20, right: 20 }}
            >
              <Ionicons name="chevron-back" size={28} color="#F9B252" />
              <Text style={{ color: "#F9B252", fontSize: 17, marginLeft: 5 }}>Voltar</Text>
            </TouchableOpacity>
          ),
          headerRight: () => (
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 18, marginRight: 8 }}>
              <Pressable 
                onPress={() => setIsHistoryOpen(true)}
                hitSlop={{ top: 15, bottom: 15, left: 10, right: 10 }}
              >
                <Ionicons name="list-outline" size={26} color="#F9B252" />
              </Pressable>
              <Pressable 
                onPress={handleCreateNewSession}
                hitSlop={{ top: 15, bottom: 15, left: 10, right: 10 }}
              >
                <Ionicons name="add" size={32} color="#F9B252" />
              </Pressable>
            </View>
          )
        }} 
      />

      <KeyboardAvoidingView 
        behavior="padding"
        keyboardVerticalOffset={90}
        style={{ flex: 1 }}
      >
        <ImageBackground 
          source={require('../../assets/images/chat-background.png')}
          style={{ flex: 1 }}
          imageStyle={{ opacity: isDark ? 0.05 : 0.08, tintColor: isDark ? '#FFF' : undefined }}
        >
          <View style={{ flex: 1 }}>
            <FlatList
          ref={flatListRef}
          data={messages}
          keyExtractor={(item, index) => item.id.toString()}
          renderItem={renderMessage}
          contentContainerStyle={styles.scrollContent}
          ListHeaderComponent={() => (
            messages.length === 0 && !loading ? (
               <View style={styles.emptyState}>
                  <View style={[styles.emptyIcon, { backgroundColor: THEME.primary + '10' }]}>
                    <FontAwesome name="star" size={40} color={THEME.primary} />
                  </View>
                  <Text style={[styles.emptyTitle, { color: THEME.textMain }]}>Como posso ajudar?</Text>
                  <Text style={[styles.emptySub, { color: THEME.textSecondary }]}>
                    Faça perguntas sobre suas vendas, clientes e metas. Consulto seus dados em tempo real.
                  </Text>
                  
                <View style={styles.suggestionGrid}>
                   {[
                     { t: 'Minha meta atual?', q: 'Quero informações da minha meta atual?', i: 'bullseye' },
                     { t: 'Clientes sem atendimento?', q: 'Quais clientes ainda não foram atendidos na última coleção?', i: 'users' },
                     { t: 'Top 5 Clientes?', q: 'Quais foram os 5 melhores clientes da coleção anterior?', i: 'line-chart' }
                   ].map((s: any, idx) => (
                     <TouchableOpacity 
                       key={idx} 
                       style={[styles.suggestionBtn, { backgroundColor: THEME.assistantBubble, borderColor: THEME.border }]}
                       onPress={() => sendMessage(s.q)}
                     >
                       <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                         <View style={[styles.suggestionIconWrapper, { backgroundColor: THEME.primary + '15' }]}>
                           <FontAwesome name={s.i} size={16} color={THEME.primary} />
                         </View>
                         <Text style={[styles.suggestionText, { color: THEME.textMain }]}>{s.t}</Text>
                       </View>
                     </TouchableOpacity>
                   ))}
                </View>
               </View>
            ) : null
          )}
          ListFooterComponent={() => (
            <View>
              {loading && (
                <View style={styles.assistantBubbleWrapper}>
                  <View style={[styles.messageBubble, { backgroundColor: THEME.assistantBubble }, styles.loadingBubble]}>
                    <ActivityIndicator size="small" color={THEME.textSecondary} />
                    <Text style={[styles.loadingLabel, { color: THEME.textSecondary }]}>O assistente está processando...</Text>
                  </View>
                </View>
              )}
              <View style={{ height: 40 }} />
            </View>
          )}
        />
          </View>
        </ImageBackground>

        <View style={[
          styles.footer, 
          { paddingBottom: Math.max(insets.bottom, 16) }
        ]}>
          <View style={[styles.inputWrapper, { backgroundColor: THEME.inputBg, borderColor: THEME.border }]}>
            {!isRecording && (
              <TextInput
                style={[styles.input, { color: THEME.textMain }]}
                placeholder="Mensagem"
                placeholderTextColor={isDark ? '#48484A' : '#C6C6C8'}
                value={inputText}
                onChangeText={setInputText}
                multiline
                maxLength={500}
                editable={!loading}
                onFocus={() => {
                  setTimeout(() => flatListRef.current?.scrollToEnd({ animated: true }), 0);
                }}
              />
            )}

            {isRecording && (
              <Animated.View 
                style={[
                  styles.recordingOverlay,
                  { 
                    transform: [{ 
                      translateX: slideAnim.interpolate({
                        inputRange: [0, 1],
                        outputRange: [50, 0]
                      }) 
                    }],
                    opacity: slideAnim
                  }
                ]}
              >
                <View style={styles.recordingLeft}>
                  <Animated.View style={{ transform: [{ scale: pulseAnim }] }}>
                    <View style={styles.recordingDot} />
                  </Animated.View>
                  <Text style={[styles.recordingTimer, { color: THEME.danger }]}>{formatRecordTime(recordingTime)}</Text>
                </View>
                <Text style={[styles.cancelText, { color: THEME.textSecondary }]}>Solte para enviar</Text>
              </Animated.View>
            )}

            <View style={styles.inputActions}>
              {!inputText.trim() ? (
                <Pressable 
                  style={[styles.micButton, isRecording && styles.micButtonActive]}
                  onPressIn={startRecording}
                  onPressOut={stopRecording}
                >
                  <FontAwesome 
                    name="microphone" 
                    size={20} 
                    color={isRecording ? THEME.danger : THEME.primary} 
                  />
                </Pressable>
              ) : (
                <Pressable 
                  style={[styles.sendButton, loading && styles.sendButtonDisabled, { backgroundColor: THEME.primary }]}
                  onPress={() => sendMessage(inputText)} 
                  disabled={loading || !inputText.trim()}
                >
                  <FontAwesome name="arrow-up" size={16} color="#FFF" />
                </Pressable>
              )}
            </View>
          </View>
        </View>
      </KeyboardAvoidingView>

      <Modal
        visible={isHistoryOpen}
        animationType="slide"
        presentationStyle="pageSheet"
        // @ts-ignore
        sheetAllowedDetents={['medium', 'large']}
        onRequestClose={() => setIsHistoryOpen(false)}
      >
        <View style={[styles.historyModalContainer, { backgroundColor: THEME.background }]}>
          <View style={styles.modalHandle} />
          
          <View style={styles.historyHeader}>
            <View>
              <Text style={[styles.historyTitle, { color: THEME.textMain }]}>Histórico</Text>
              <Text style={[styles.historySubtitle, { color: THEME.textSecondary }]}>{sessions.length} conversas salvas</Text>
            </View>
            <TouchableOpacity 
              onPress={() => setIsHistoryOpen(false)}
              style={[styles.closeHistoryBtn, { backgroundColor: isDark ? '#3D4956' : '#E5E5EA' }]}
            >
              <Ionicons name="close" size={20} color={THEME.textMain} />
            </TouchableOpacity>
          </View>

          <View style={styles.historySearchWrapper}>
            <View style={[styles.searchBox, { backgroundColor: isDark ? '#2C3641' : 'rgba(118, 118, 128, 0.12)' }]}>
              <Ionicons name="search" size={18} color={THEME.textSecondary} style={{ marginRight: 8 }} />
              <TextInput
                placeholder="Pesquisar conversas..."
                placeholderTextColor={THEME.textSecondary}
                style={[styles.historySearchInput, { color: THEME.textMain }]}
                value={searchSession}
                onChangeText={setSearchSession}
                autoCorrect={false}
              />
            </View>
          </View>

          <FlatList
            data={sessions.filter(s => (s.titulo || '').toLowerCase().includes(searchSession.toLowerCase()) || s.id.toString().includes(searchSession))}
            keyExtractor={(item) => item.id.toString()}
            contentContainerStyle={{ paddingHorizontal: 16, paddingTop: 10, paddingBottom: 60 }}
            renderItem={({ item }) => (
              <Swipeable
                key={item.id}
                ref={(ref) => {
                  const key = `session-${item.id}`;
                  if (ref) swipeableRefs.current.set(key, ref);
                  else swipeableRefs.current.delete(key);
                }}
                renderRightActions={() => renderSessionRightActions(item.id)}
                onSwipeableWillOpen={() => {
                  const key = `session-${item.id}`;
                  if (openRowKey.current !== null && openRowKey.current !== key) {
                    swipeableRefs.current.get(openRowKey.current)?.close();
                  }
                  openRowKey.current = key;
                }}
              >
                <TouchableOpacity 
                  activeOpacity={0.7}
                  onPress={() => { closeOpenRow(); setActiveSessionId(item.id); setIsHistoryOpen(false); }}
                  style={[
                    styles.sessionCard, 
                    { backgroundColor: isDark ? '#2C3641' : '#FFFFFF' },
                    item.id === activeSessionId && { borderColor: THEME.primary, borderWidth: 1 }
                  ]}
                >
                  <View style={[styles.sessionIconBox, { backgroundColor: item.id === activeSessionId ? THEME.primary + '20' : isDark ? '#3D4956' : '#F2F2F7' }]}>
                    <Ionicons 
                      name={item.id === activeSessionId ? "chatbubble-ellipses" : "chatbubble-outline"} 
                      size={20} 
                      color={item.id === activeSessionId ? THEME.primary : THEME.textSecondary} 
                    />
                  </View>
                  <View style={styles.sessionInfo}>
                    <Text style={[styles.sessionTitle, { color: THEME.textMain }, item.id === activeSessionId && { fontWeight: '700' }]} numberOfLines={1}>
                      {item.titulo || `Conversa #${item.id}`}
                    </Text>
                    <View style={styles.sessionMeta}>
                      <Ionicons name="time-outline" size={12} color={THEME.textSecondary} style={{ marginRight: 4 }} />
                      <Text style={[styles.sessionDate, { color: THEME.textSecondary }]}>
                        {new Date(item.atualizadoEm).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}
                      </Text>
                    </View>
                  </View>
                  <Ionicons name="chevron-forward" size={16} color={THEME.textSecondary} />
                </TouchableOpacity>
              </Swipeable>
            )}
            ListEmptyComponent={
              <View style={styles.emptySessions}>
                <Ionicons name="chatbubbles-outline" size={48} color={THEME.textSecondary} />
                <Text style={[styles.emptySessionsText, { color: THEME.textSecondary }]}>Nenhuma conversa enviada</Text>
              </View>
            }
          />
        </View>
      </Modal>
      {actionLoading && (
        <View style={styles.globalLoader}>
          <View style={[styles.loaderBox, { backgroundColor: isDark ? 'rgba(44,44,46,0.9)' : 'rgba(255,255,255,0.95)' }]}>
            <ActivityIndicator color={THEME.primary} size="large" />
            <Text style={[styles.loaderText, { color: THEME.textMain }]}>{loadingMessage}</Text>
          </View>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  headerTitleContainer: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center' },
  headerTitleMain: { fontSize: 17, fontWeight: '600', color: '#000000' },
  statusDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: '#34C759', marginLeft: 6, marginTop: 2 },
  scrollContent: { padding: 16, paddingTop: 10 },
  bubbleWrapper: { flexDirection: 'row', marginBottom: 12, width: '100%' },
  userBubbleWrapper: { justifyContent: 'flex-end' },
  assistantBubbleWrapper: { justifyContent: 'flex-start' },
  messageBubble: { 
    paddingHorizontal: 16, 
    paddingVertical: 10, 
    borderRadius: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  userBubble: { 
    backgroundColor: '#007AFF', 
    borderBottomRightRadius: 4,
  },
  assistantBubble: { 
    backgroundColor: '#FFFFFF', 
    borderBottomLeftRadius: 4,
  },
  playerContainer: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 0.5,
    borderTopColor: 'rgba(0,0,0,0.05)',
  },
  playButtonCompact: { width: 28, height: 28, justifyContent: 'center', alignItems: 'center' },
  progressBarBg: { flex: 1, height: 3, borderRadius: 1.5, marginHorizontal: 10 },
  progressBarFill: { height: '100%', borderRadius: 1.5 },
  durationText: { fontSize: 11, fontWeight: '500', width: 35, textAlign: 'right' },
  assetCard: { 
    backgroundColor: '#FFFFFF', 
    borderRadius: 16, 
    padding: 16, 
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#E5E5EA',
  },
  assetHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 16 },
  assetTitle: { fontSize: 16, fontWeight: '600', color: '#1C1C1E', marginLeft: 12, flex: 1 },
  assetActions: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  assetButton: { backgroundColor: '#F2F2F7', paddingHorizontal: 16, paddingVertical: 8, borderRadius: 8 },
  assetButtonText: { fontSize: 14, fontWeight: '600', color: '#007AFF' },
  loadingBubble: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  loadingLabel: { fontSize: 13, color: '#8E8E93' },
  keyboardView: { backgroundColor: 'transparent' },
  footer: { 
    paddingHorizontal: 16, 
    paddingVertical: 6,
    backgroundColor: 'transparent',
  },
  emptyState: { alignItems: 'center', paddingVertical: 40, paddingHorizontal: 20 },
  emptyIcon: { width: 80, height: 80, borderRadius: 40, justifyContent: 'center', alignItems: 'center', marginBottom: 20 },
  emptyTitle: { fontSize: 22, fontWeight: '800', marginBottom: 8 },
  emptySub: { fontSize: 15, textAlign: 'center', lineHeight: 22, marginBottom: 30 },
  suggestionGrid: { width: '100%', gap: 10 },
  suggestionBtn: { padding: 12, borderRadius: 16, borderWidth: 1, width: '100%', marginBottom: 8 },
  suggestionIconWrapper: { width: 32, height: 32, borderRadius: 16, justifyContent: 'center', alignItems: 'center' },
  suggestionText: { fontSize: 15, fontWeight: '600' },
  inputWrapper: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    backgroundColor: '#FFFFFF', 
    borderRadius: 24, 
    paddingHorizontal: 12,
    paddingVertical: 2,
    borderWidth: 1,
    borderColor: '#E5E5EA',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 10,
    elevation: 5,
  },
  input: { 
    flex: 1, 
    fontSize: 16, 
    color: '#000000', 
    maxHeight: 120, 
    paddingTop: 2, 
    paddingBottom: 2,
    paddingHorizontal: 8,
  },
  inputActions: { flexDirection: 'row', alignItems: 'center', marginLeft: 8 },
  circularProgressContainer: { justifyContent: 'center', alignItems: 'center' },
  progressCenterIcon: { position: 'absolute' },
  micButton: { width: 36, height: 36, justifyContent: 'center', alignItems: 'center' },
  micButtonActive: { backgroundColor: 'rgba(255, 59, 48, 0.1)', borderRadius: 18 },
  sendButton: { 
    width: 32, 
    height: 32, 
    borderRadius: 16, 
    backgroundColor: '#007AFF', 
    justifyContent: 'center', 
    alignItems: 'center' 
  },
  sendButtonDisabled: { opacity: 0.5 },
  recordingOverlay: { 
    flex: 1, 
    flexDirection: 'row', 
    alignItems: 'center', 
    justifyContent: 'space-between',
    paddingHorizontal: 8,
  },
  recordingLeft: { flexDirection: 'row', alignItems: 'center' },
  recordingDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#FF3B30' },
  recordingTimer: { fontSize: 16, fontWeight: '600', color: '#FF3B30', marginLeft: 8 },
  cancelText: { fontSize: 14, color: '#8E8E93', fontWeight: '500' },
  messageTime: {
    fontSize: 10,
    marginTop: 4,
    marginHorizontal: 8,
    fontWeight: '500',
  },
  historyModalContainer: { flex: 1 },
  modalHandle: { 
    width: 36, 
    height: 5, 
    backgroundColor: '#C6C6C8', 
    borderRadius: 3, 
    alignSelf: 'center', 
    marginTop: 8,
    marginBottom: 10
  },
  historyHeader: { 
    flexDirection: 'row', 
    justifyContent: 'space-between', 
    alignItems: 'center', 
    paddingHorizontal: 20,
    paddingVertical: 15,
  },
  closeModalBtn: { 
    width: 28, 
    height: 28, 
    borderRadius: 14, 
    justifyContent: 'center', 
    alignItems: 'center' 
  },
  historyTitle: { fontSize: 24, fontWeight: '800', letterSpacing: -0.5 },
  historySubtitle: { fontSize: 13, marginTop: 2, fontWeight: '500' },
  closeHistoryBtn: { width: 32, height: 32, borderRadius: 16, justifyContent: 'center', alignItems: 'center' },
  historySearchWrapper: { paddingHorizontal: 16, paddingBottom: 12 },
  searchBox: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, height: 40, borderRadius: 12 },
  historySearchInput: { flex: 1, fontSize: 16 },
  sessionCard: { 
    flexDirection: 'row', 
    alignItems: 'center',
    borderRadius: 16,
    padding: 12,
    marginBottom: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 5,
    elevation: 2,
    borderWidth: 1,
    borderColor: 'transparent'
  },
  sessionIconBox: { 
    width: 44, 
    height: 44, 
    borderRadius: 12, 
    justifyContent: 'center', 
    alignItems: 'center', 
    marginRight: 12 
  },
  sessionInfo: { flex: 1 },
  sessionMeta: { flexDirection: 'row', alignItems: 'center', marginTop: 4 },
  sessionRow: { 
    flexDirection: 'row', 
    alignItems: 'center',
    borderRadius: 12,
    overflow: 'hidden',
    paddingLeft: 16,
    marginHorizontal: 16,
    marginBottom: 1, 
  },
  sessionMainAction: { 
    flex: 1,
    paddingVertical: 14,
    flexDirection: 'row',
    alignItems: 'center',
    paddingRight: 12,
  },
  listSeparator: {
    height: 0.5,
    marginLeft: 16, // Inset separator style
  },
  sessionTitle: { fontSize: 16, fontWeight: '500', marginBottom: 2 },
  sessionDate: { fontSize: 13 },
  btnDeleteRow: {
    padding: 14,
  },
  sessionRightActions: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingLeft: 8,
    paddingRight: 16,
  },
  sessionDeleteBtn: {
    width: 54,
    height: 54,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptySessions: { flex: 1, alignItems: 'center', justifyContent: 'center', marginTop: 100 },
  emptySessionsText: { fontSize: 16, marginTop: 16, fontWeight: '500' },
  globalLoader: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.3)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 99999
  },
  loaderBox: {
    padding: 30,
    borderRadius: 24,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.2,
    shadowRadius: 20,
    elevation: 5
  },
  loaderText: {
    marginTop: 15,
    fontSize: 16,
    fontWeight: '700',
    letterSpacing: -0.3,
  },
  eventsContainer: {
    marginTop: 8,
    gap: 8,
    width: '100%',
  },
  eventButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(249, 178, 82, 0.1)',
    padding: 10,
    borderRadius: 8,
    gap: 10,
  },
  eventButtonText: {
    flex: 1,
    fontSize: 14,
    fontWeight: '500',
  },
  toolCallChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 4,
    opacity: 0.7,
  },
  toolCallText: {
    fontSize: 11,
    color: '#8E9AA9',
    fontWeight: '500',
  },
});
