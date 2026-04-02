import { FontAwesome, Ionicons } from '@expo/vector-icons';
import { RecordingOptions, requestRecordingPermissionsAsync, setAudioModeAsync, useAudioPlayer, useAudioPlayerStatus, useAudioRecorder } from 'expo-audio';
import * as FileSystem from 'expo-file-system/legacy';
import { Stack, useRouter } from 'expo-router';
import * as SecureStore from 'expo-secure-store';
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
    Modal
} from 'react-native';
import { useIsFocused } from '@react-navigation/native';
import Markdown from 'react-native-markdown-display';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { WebView } from 'react-native-webview';
import { BlurView } from 'expo-blur';
import api from '../../api/api';
import { useAuth } from '../../context/AuthContext';

const { width } = Dimensions.get('window');

interface Message {
  id: number | string;
  role: 'user' | 'assistant';
  content: string;
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
    primary: '#007AFF',
    background: isDark ? '#000000' : '#F2F2F7',
    assistantBubble: isDark ? '#1C1C1E' : '#FFFFFF',
    userBubble: '#007AFF',
    textMain: isDark ? '#FFFFFF' : '#000000',
    textSecondary: isDark ? '#8E8E93' : '#8E8E93',
    inputBg: isDark ? '#1C1C1E' : '#FFFFFF',
    border: isDark ? '#38383A' : '#E5E5EA',
    danger: '#FF453A', // iOS SystemRed (Vibrant for Dark)
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
  const [streamPhase, setStreamPhase] = useState<'idle' | 'waiting' | 'streaming'>('idle');
  const [streamingText, setStreamingText] = useState('');
  const [pendingTool, setPendingTool] = useState<string | null>(null);
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);
  const [isEditingSessions, setIsEditingSessions] = useState(false);
  
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
  const wsRef = useRef<WebSocket | null>(null);

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
  }, [messages.length, activeSessionId, streamPhase === 'streaming']);

  const loadSessions = async () => {
    setLoading(true);
    try {
      console.log('--- [CHAT DEBUG] Carregando Sessões ---');
      const response = await api.get('/api/rep/chat/sessions');
      console.log(`--- [CHAT DEBUG] Sessões Recebidas: ${response.data.length} ---`);
      setSessions(response.data);
      if (response.data.length > 0 && !activeSessionId) {
        console.log(`--- [CHAT DEBUG] Ativando Sessão Inicial: ${response.data[0].id} ---`);
        setActiveSessionId(response.data[0].id);
      } else if (response.data.length === 0) {
        console.log('--- [CHAT DEBUG] Nenhuma sessão encontrada, criando nova ---');
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
      const response = await api.post('/api/rep/chat/sessions');
      const newSession = response.data;
      setSessions([newSession, ...sessions]);
      setActiveSessionId(newSession.id);
      setMessages([]);
    } catch (error) {
      console.error('Error creating session:', error);
    }
  };

  const deleteSession = async (id: number) => {
    try {
      await api.delete(`/api/rep/chat/sessions/${id}`);
      setSessions(prev => prev.filter(s => s.id !== id));
      if (activeSessionId === id) {
        setActiveSessionId(null);
        setMessages([]);
      }
    } catch (e) {
      console.error('Delete session error:', e);
    }
  };

  const formatRecordTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins < 10 ? '0' : ''}${mins}:${secs < 10 ? '0' : ''}${secs}`;
  };

  const loadMessages = async (sessionId: number) => {
    setLoading(true);
    try {
      console.log(`--- [CHAT DEBUG] Carregando Mensagens para Sessão: ${sessionId} ---`);
      const response = await api.get(`/api/rep/chat/sessions/${sessionId}/messages`);
      const formattedMessages = response.data.map((m: any) => ({
        ...m,
        id: m.id,
        role: m.role,
        content: m.content,
        isVoice: m.hasAudio || (m.role === 'assistant' && m.hasTts),
        createdAt: m.criadoEm || m.createdAt || new Date().toISOString(),
      }));
      console.log(`--- [CHAT DEBUG] Sincronizando Mensagens: ${formattedMessages.length} do Banco ---`);
      setMessages(formattedMessages);
      setTimeout(() => flatListRef.current?.scrollToEnd({ animated: true }), 200);
    } catch (error) {
      console.error('--- [CHAT DEBUG ERROR] Erro ao carregar mensagens:', error);
    } finally {
      setLoading(false);
    }
  };

  const sendMessage = async (textOverride?: string, fromVoice: boolean = false, voiceMessageId?: number) => {
    const textToSend = textOverride || inputText;
    if (!textToSend.trim() || !activeSessionId || streamPhase !== 'idle') return;

    if (globalPlayer && globalPlayer.playing) {
      try {
        globalPlayer.pause();
      } catch (e) {}
    }

    if (!fromVoice) {
      const userMessage: Message = {
        id: `user-${Date.now()}`,
        role: 'user',
        content: textToSend.trim(),
        isVoice: false,
        createdAt: new Date().toISOString()
      };
      setMessages(prev => [...prev, userMessage]);
    }
    
    setInputText('');
    setStreamPhase('waiting');
    setPendingTool(null);

    let accumulatedText = '';

    try {
      const token = await SecureStore.getItemAsync('accessToken');
      const baseUrl = api.defaults.baseURL || '';
      const streamUrl = `${baseUrl.replace(/\/$/, '')}/api/mobile/chat/stream`;

      console.log('--- [SSE DEBUG] Iniciando via XHR ---');

      const xhr = new XMLHttpRequest();
      xhr.open('POST', streamUrl);
      xhr.setRequestHeader('Authorization', `Bearer ${token}`);
      xhr.setRequestHeader('Content-Type', 'application/json');

      let lastIndex = 0;

      xhr.onreadystatechange = () => {
        // Status 3 = LOADING (dados chegando), Status 4 = DONE
        if (xhr.readyState === 3 || xhr.readyState === 4) {
          const responseText = xhr.responseText;
          const newChunk = responseText.substring(lastIndex);
          lastIndex = responseText.length;

          // Eventos SSE são separados por \n\n
          const parts = newChunk.split('\n\n');
          
          for (const part of parts) {
            const line = part.trim();
            if (!line || line.startsWith(':')) continue;

            if (line.startsWith('data: ')) {
              const json = line.slice(6);
              try {
                const data = JSON.parse(json);
                console.log(`--- [SSE DEBUG] Evento: ${data.type} ---`);

                switch (data.type) {
                  case 'tool_call':
                    setPendingTool(data.tool);
                    break;

                  case 'chunk':
                    setStreamPhase('streaming');
                    setPendingTool(null);
                    accumulatedText += data.text;
                    
                    setMessages(prev => {
                      const newMsgs = [...prev];
                      const lastMsg = newMsgs[newMsgs.length - 1];
                      if (lastMsg && lastMsg.id === 'streaming-bot') {
                        newMsgs[newMsgs.length - 1] = { ...lastMsg, content: accumulatedText };
                        return newMsgs;
                      } else {
                        return [...newMsgs, {
                          id: 'streaming-bot',
                          role: 'assistant',
                          content: accumulatedText,
                          isVoice: false,
                          createdAt: new Date().toISOString()
                        }];
                      }
                    });
                    break;

                  case 'pdf':
                  case 'map_embed':
                  case 'html_widget':
                    setMessages(prev => [...prev.filter(m => m.id !== 'streaming-bot'), {
                      id: `asset-${Date.now()}-${Math.random()}`,
                      role: 'assistant',
                      content: '',
                      type: data.type,
                      data: data,
                      createdAt: new Date().toISOString()
                    }]);
                    break;

                  case 'done':
                    console.log('--- [SSE DEBUG] DONE Recebido ---');
                    setMessages(prev => {
                      const newMsgs = [...prev];
                      const streamIdx = newMsgs.findIndex(m => m.id === 'streaming-bot');
                      if (streamIdx > -1) {
                        newMsgs[streamIdx] = { 
                          ...newMsgs[streamIdx], 
                          id: data.messageId || `bot-${Date.now()}`,
                          content: accumulatedText.trim() || newMsgs[streamIdx].content 
                        };
                        return newMsgs;
                      }
                      return newMsgs;
                    });
                    setStreamPhase('idle');
                    setTimeout(() => loadSessions(), 500);
                    break;

                  case 'error':
                    console.error('--- [SSE DEBUG ERROR] ---', data.message);
                    setStreamPhase('idle');
                    break;
                }
              } catch (e) {
                // Fragmento JSON incompleto, esperar o próximo chunk
              }
            }
          }
        }
      };

      xhr.onerror = (err) => {
        console.error('XHR Error:', err);
        setStreamPhase('idle');
      };

      xhr.send(JSON.stringify({ 
        content: textToSend.trim(), 
        sessionId: activeSessionId,
        voiceMessageId: voiceMessageId 
      }));

    } catch (error) {
      console.error('Error in sendMessage flow:', error);
      setStreamPhase('idle');
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
    // Adiciona o balão do usuário IMEDIATAMENTE com loader de transcrição
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
    setStreamPhase('waiting');
    setPendingTool('whisper_stt'); // Marcador interno para saber que é transcrição
    
    try {
      const fileInfo = await FileSystem.getInfoAsync(uri);
      if (!fileInfo.exists || (fileInfo.size && fileInfo.size < 100)) {
        setStreamPhase('idle');
        return;
      }

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
          setVoiceMode(true);
          setMessages(prev => prev.map(m => 
            m.id === tempId ? { ...m, content: body.text } : m
          ));
          sendMessage(body.text, true, body.messageId); 
        } else {
          setMessages(prev => prev.filter(m => m.id !== tempId));
          setStreamPhase('idle');
        }
      } else {
        console.error('--- [TRANSCRIBE DEBUG] Servidor Erro Body:', response.body);
        throw new Error(`Servidor retornou status ${response.status}`);
      }
    } catch (error: any) {
      console.error('Transcription upload error:', error.message || error);
      setMessages(prev => [...prev, {
        id: `err-${Date.now()}`,
        role: 'assistant',
        content: `Houve um erro ao processar o áudio. Tente novamente.`
      }]);
      setStreamPhase('idle');
    }
  };

  const getToolLabel = (tool: string) => {
    const labels: any = {
      pesquisar_clientes: 'Buscando clientes...',
      get_resumo_vendas: 'Analisando vendas...',
      get_clientes_sem_pedido: 'Verificando carteira...',
      get_metas_rep: 'Consultando metas...',
      get_pedidos_rep: 'Carregando pedidos...',
      plan_rota_visitas: 'Planejando rota no Maps...',
      gerar_relatorio_pdf: 'Gerando relatório PDF...',
      exibir_relatorio_html: 'Montando dashboard...',
      criar_pipeline: 'Criando pipeline...',
      get_titulos_rep: 'Buscando títulos financeiros...',
      get_mix_produtos: 'Analisando mix de produtos...',
      whisper_stt: 'Transcrevendo áudio...',
    };
    return labels[tool] || 'Processando dados...';
  };

  const MessageAudioPlayer = ({ message }: { message: Message }) => {
    // Only access player status if the screen is focused to avoid SharedObject errors on unmount
    const isCurrentPlaying = isFocused && activePlayingId === message.id;
    const isPlaying = isCurrentPlaying && playerStatus.playing;
    const currentProgress = isCurrentPlaying ? (playerStatus.currentTime / (playerStatus.duration || 1)) * 100 : 0;
    const displayTime = isCurrentPlaying ? playerStatus.currentTime : 0;
    
    // We only show duration if it's not the current playing one or if we have it
    const duration = isCurrentPlaying ? playerStatus.duration : 0;

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

      // Switching audio
      const source = await getAudioSource();
      if (!source) return;

      setActivePlayingId(message.id);
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
    
    // Restoration of assets cards support
    if ((item as any).type === 'pdf') return renderPdfCard((item as any).data);
    if ((item as any).type === 'map_embed') return renderMapCard((item as any).data);
    if ((item as any).type === 'html_widget') return renderHtmlCard((item as any).data);

    const isStreaming = item.id === 'streaming-bot';

    return (
      <View style={[styles.bubbleWrapper, isUser ? styles.userBubbleWrapper : styles.assistantBubbleWrapper]}>
        <View style={{ alignItems: isUser ? 'flex-end' : 'flex-start', maxWidth: '85%' }}>
          <View style={[styles.messageBubble, isUser ? styles.userBubble : [styles.assistantBubble, { backgroundColor: THEME.assistantBubble }]]}>
            {isUser && item.content === 'Transcrevendo áudio...' ? (
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <ActivityIndicator size="small" color="#FFFFFF" />
                <Text style={{ color: '#FFFFFF', fontSize: 16 }}>Transcrevendo áudio...</Text>
              </View>
            ) : (
              <Markdown style={isUser ? userMarkdownStyles : assistantMarkdownStyles}>
                {item.content + (isStreaming ? ' ▌' : '')}
              </Markdown>
            )}
            {(item.role === 'assistant' && !isStreaming) && (
              <MessageAudioPlayer message={item} />
            )}
          </View>
          <Text style={[styles.messageTime, { color: THEME.textSecondary }]}>
            {formatMsgTime(item.createdAt)}
          </Text>
        </View>
      </View>
    );
  };

  const renderPdfCard = (data: any) => (
    <View style={[styles.assetCard, { backgroundColor: THEME.assistantBubble, borderColor: THEME.border }]}>
      <View style={styles.assetHeader}>
        <FontAwesome name="file-pdf-o" size={20} color="#FF453A" />
        <Text style={[styles.assetTitle, { color: THEME.textMain }]}>{data.titulo}</Text>
      </View>
      <View style={styles.assetActions}>
        <Pressable style={[styles.assetButton, { backgroundColor: isDark ? '#2C2C2E' : '#F2F2F7' }]} onPress={() => Linking.openURL(`${api.defaults.baseURL}${data.url}`)}>
          <Text style={[styles.assetButtonText, { color: THEME.primary }]}>Visualizar</Text>
        </Pressable>
        <Pressable style={[styles.assetButton, { backgroundColor: isDark ? '#2C2C2E' : '#F2F2F7' }]} onPress={() => Share.share({ url: `${api.defaults.baseURL}${data.url}` })}>
          <FontAwesome name="share" size={14} color={THEME.primary} />
        </Pressable>
      </View>
    </View>
  );

  const renderMapCard = (data: any) => (
    <View style={[styles.assetCard, { backgroundColor: THEME.assistantBubble, borderColor: THEME.border }]}>
      <View style={styles.assetHeader}>
        <FontAwesome name="map-marker" size={20} color="#32D74B" />
        <Text style={[styles.assetTitle, { color: THEME.textMain }]}>Rota Sugerida</Text>
      </View>
      <Pressable style={[styles.assetButton, { marginTop: 10, backgroundColor: isDark ? '#2C2C2E' : '#F2F2F7' }]} onPress={() => Linking.openURL(data.mapsUrl)}>
        <Text style={[styles.assetButtonText, { color: THEME.primary }]}>Abrir no Apple Maps</Text>
      </Pressable>
    </View>
  );

  const renderHtmlCard = (data: any) => (
    <View style={[styles.assetCard, { height: 350, backgroundColor: THEME.assistantBubble, borderColor: THEME.border }]}>
      <Text style={[styles.assetTitle, { marginBottom: 10, color: THEME.textMain }]}>{data.titulo}</Text>
      <WebView 
        originWhitelist={['*']}
        source={{ html: data.html }}
        style={{ flex: 1, backgroundColor: 'transparent' }}
        javaScriptEnabled={true}
      />
    </View>
  );

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
              <Ionicons name="chevron-back" size={28} color={THEME.primary} />
              <Text style={{ color: THEME.primary, fontSize: 17, marginLeft: 5 }}>Voltar</Text>
            </TouchableOpacity>
          ),
          headerRight: () => (
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 18, marginRight: 8 }}>
              <Pressable 
                onPress={() => setIsHistoryOpen(true)}
                hitSlop={{ top: 15, bottom: 15, left: 10, right: 10 }}
              >
                <Ionicons name="list-outline" size={26} color={THEME.primary} />
              </Pressable>
              <Pressable 
                onPress={handleCreateNewSession}
                hitSlop={{ top: 15, bottom: 15, left: 10, right: 10 }}
              >
                <Ionicons name="add" size={32} color={THEME.primary} />
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
              {streamPhase === 'waiting' && 
               !messages.some(m => m.id === 'streaming-bot') && 
               pendingTool !== 'whisper_stt' && (
                <View style={styles.assistantBubbleWrapper}>
                  <View style={[styles.messageBubble, { backgroundColor: THEME.assistantBubble }, styles.loadingBubble]}>
                    <ActivityIndicator size="small" color={THEME.textSecondary} />
                    <Text style={[styles.loadingLabel, { color: THEME.textSecondary }]}>{pendingTool ? getToolLabel(pendingTool) : 'digitando...'}</Text>
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
                editable={streamPhase === 'idle'}
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
                  style={[styles.sendButton, streamPhase !== 'idle' && styles.sendButtonDisabled, { backgroundColor: THEME.primary }]}
                  onPress={() => sendMessage()}
                  disabled={streamPhase !== 'idle'}
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
        onRequestClose={() => setIsHistoryOpen(false)}
      >
        <View style={[styles.historyModalContainer, { backgroundColor: THEME.background }]}>
          <View style={styles.modalHandle} />
          
          <View style={styles.historyHeader}>
            <Text style={[styles.historyTitle, { color: THEME.textMain }]}>Conversas Recentes</Text>
            <TouchableOpacity 
              onPress={() => setIsEditingSessions(!isEditingSessions)}
              hitSlop={{ top: 15, bottom: 15, left: 20, right: 20 }}
            >
              <Text style={{ color: THEME.primary, fontSize: 17, fontWeight: '500' }}>
                {isEditingSessions ? 'OK' : 'Editar'}
              </Text>
            </TouchableOpacity>
          </View>

          <FlatList
            data={sessions}
            keyExtractor={(item) => item.id.toString()}
            contentContainerStyle={{ paddingHorizontal: 16, paddingTop: 10, paddingBottom: 60 }}
            ItemSeparatorComponent={() => <View style={[styles.listSeparator, { backgroundColor: THEME.border }]} />}
            renderItem={({ item }) => (
              <View style={[styles.sessionRow, { backgroundColor: isDark ? '#1C1C1E' : '#FFFFFF' }]}>
                {isEditingSessions && (
                  <TouchableOpacity 
                    style={{ paddingRight: 10 }}
                    onPress={() => deleteSession(item.id)}
                    hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                  >
                    <Ionicons name="remove-circle" size={22} color={THEME.danger} />
                  </TouchableOpacity>
                )}
                <TouchableOpacity 
                  style={styles.sessionMainAction}
                  onPress={() => {
                    setActiveSessionId(item.id);
                    setIsHistoryOpen(false);
                  }}
                >
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.sessionTitle, { color: THEME.textMain }]} numberOfLines={1}>
                      {item.titulo || `Conversa #${item.id}`}
                    </Text>
                    <Text style={[styles.sessionDate, { color: THEME.textSecondary }]}>
                      {new Date(item.atualizadoEm).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}
                    </Text>
                  </View>
                  <Ionicons name="chevron-forward" size={16} color="#C4C4C6" />
                </TouchableOpacity>
              </View>
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
  historyTitle: { fontSize: 20, fontWeight: '700' },
  sessionRow: { 
    flexDirection: 'row', 
    alignItems: 'center',
    borderRadius: 12,
    overflow: 'hidden',
    paddingLeft: 16,
    marginHorizontal: 16,
    marginBottom: 1, // Simulates hairline separator in a cleaner way for inset rows
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
  emptySessions: { flex: 1, alignItems: 'center', justifyContent: 'center', marginTop: 100 },
  emptySessionsText: { fontSize: 16, marginTop: 16, fontWeight: '500' }
});
