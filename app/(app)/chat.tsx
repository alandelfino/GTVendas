import { FontAwesome } from '@expo/vector-icons';
import { Audio } from 'expo-av';
import * as FileSystem from 'expo-file-system/legacy';
import { Stack, useRouter } from 'expo-router';
import React, { useEffect, useRef, useState } from 'react';
import {
    ActivityIndicator,
    Animated,
    Dimensions,
    Easing,
    FlatList,
    KeyboardAvoidingView,
    Linking,
    Platform,
    Pressable,
    Share,
    StatusBar,
    StyleSheet,
    Text,
    TextInput,
    View
} from 'react-native';
import Markdown from 'react-native-markdown-display';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { WebView } from 'react-native-webview';
import api from '../../api/api';
import { useAuth } from '../../context/AuthContext';

const { width } = Dimensions.get('window');

const COLORS = {
  primary: '#0066CC',
  background: '#FFFFFF',
  assistantBubble: '#E9ECEF',
  userBubble: '#0066CC',
  textMain: '#1C1E21',
  textSecondary: '#65676B',
  inputBg: '#F0F2F5',
  border: '#E4E6EB',
  danger: '#FF4757',
};

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
  
  // Chat State
  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [activeSessionId, setActiveSessionId] = useState<number | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputText, setInputText] = useState('');
  const [streamPhase, setStreamPhase] = useState<'idle' | 'waiting' | 'streaming'>('idle');
  const [streamingText, setStreamingText] = useState('');
  const [pendingTool, setPendingTool] = useState<string | null>(null);
  
  // Audio State
  const [recording, setRecording] = useState<Audio.Recording | null>(null);
  const [isRecording, setIsRecording] = useState(false);
  const [voiceMode, setVoiceMode] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [sound, setSound] = useState<Audio.Sound | null>(null);
  const [recordingTime, setRecordingTime] = useState(0);
  const recordTimerRef = useRef<NodeJS.Timeout | null>(null);
  const slideAnim = useRef(new Animated.Value(0)).current; 
  const pulseAnim = useRef(new Animated.Value(1)).current;

  const flatListRef = useRef<FlatList>(null);
  const wsRef = useRef<WebSocket | null>(null);

  const configureAudioMode = async (forRecording: boolean) => {
    try {
      await Audio.setAudioModeAsync({
        allowsRecordingIOS: forRecording,
        playsInSilentModeIOS: true,
        playThroughEarpieceAndroid: false, // Força alto-falante no Android
        staysActiveInBackground: true,
      });
    } catch (e) {
      console.error('Error configuring audio mode:', e);
    }
  };

  useEffect(() => {
    loadSessions();
    configureAudioMode(false);
    return () => {
      if (sound) sound.unloadAsync();
      if (recording) recording.stopAndUnloadAsync();
    };
  }, []);

  useEffect(() => {
    if (activeSessionId) {
      loadMessages(activeSessionId);
    } else {
      setMessages([]);
    }
  }, [activeSessionId]);

  const loadSessions = async () => {
    try {
      const response = await api.get('/api/rep/chat/sessions');
      setSessions(response.data);
      if (response.data.length > 0 && !activeSessionId) {
        setActiveSessionId(response.data[0].id);
      } else if (response.data.length === 0) {
        createNewSession();
      }
    } catch (error) {
      console.error('Error loading sessions:', error);
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

  const formatRecordTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins < 10 ? '0' : ''}${mins}:${secs < 10 ? '0' : ''}${secs}`;
  };

  const loadMessages = async (sessionId: number) => {
    try {
      const response = await api.get(`/api/rep/chat/sessions/${sessionId}/messages`);
      const formattedMessages = response.data.map((m: any) => ({
        ...m,
        id: m.id,
        role: m.role,
        content: m.content,
        isVoice: m.hasAudio || (m.role === 'assistant' && m.hasTts), // Se o bot já tem TTS em cache, tratamos como voz
      }));
      setMessages(formattedMessages);
      setTimeout(() => flatListRef.current?.scrollToEnd(), 200);
    } catch (error) {
      console.error('Error loading messages:', error);
    }
  };

  const sendMessage = async (textOverride?: string, fromVoice: boolean = false) => {
    const textToSend = textOverride || inputText;
    if (!textToSend.trim() || !activeSessionId || streamPhase !== 'idle') return;

    if (sound) {
      try { await sound.stopAsync(); } catch (e) {}
    }

    if (!fromVoice) {
      const userMessage: Message = {
        id: Date.now(),
        role: 'user',
        content: textToSend.trim(),
        isVoice: false
      };
      setMessages(prev => [...prev, userMessage]);
    }
    
    setInputText('');
    setStreamPhase('waiting');
    setStreamingText('');
    setPendingTool(null);

    let accumulatedText = '';

    try {
      const tokenResponse = await api.post('/api/rep/chat/ws-token');
      const wsToken = tokenResponse.data.token;

      const baseUrl = api.defaults.baseURL || '';
      const wsProtocol = baseUrl.startsWith('https') ? 'wss' : 'ws';
      const wsHost = baseUrl.replace(/^https?:\/\//, '').replace(/\/$/, '');
      const wsUrl = `${wsProtocol}://${wsHost}/ws/chat?token=${wsToken}&sessionId=${activeSessionId}`;
      
      const ws = new WebSocket(wsUrl);
      wsRef.current = ws;

      ws.onopen = () => {
        ws.send(JSON.stringify({ 
          type: 'message',
          content: textToSend,
          sessionId: activeSessionId 
        }));
      };

      ws.onmessage = async (e) => {
        const data = JSON.parse(e.data);
        switch (data.type) {
          case 'tool_call':
            setPendingTool(data.tool || 'Consultando dados...');
            break;
          case 'chunk':
            setStreamPhase('streaming');
            setPendingTool(null);
            accumulatedText += data.text;
            setStreamingText(accumulatedText);
            break;
          case 'pdf':
          case 'map_embed':
          case 'html_widget':
            setMessages(prev => [...prev, {
              id: `asset-${Date.now()}`,
              role: 'assistant',
              content: '',
              type: data.type,
              data: data
            }]);
            break;
          case 'done':
            // 1. Adiciona a mensagem final localmente para evitar que suma enquanto recarrega
            if (accumulatedText.trim()) {
              setMessages(prev => [...prev, {
                id: `temp-${Date.now()}`,
                role: 'assistant',
                content: accumulatedText,
                isVoice: false // O loadMessages vai atualizar se tem TTS depois
              }]);
            }
            
            // 2. Limpa o estado de streaming
            ws.close();
            setStreamingText('');
            setStreamPhase('idle');
            accumulatedText = '';
            
            // 3. Sincroniza com o servidor
            loadMessages(activeSessionId);
            loadSessions();
            break;
          case 'error':
            setStreamPhase('idle');
            ws.close();
            break;
        }
      };

      ws.onclose = () => {
        setStreamPhase('idle');
        wsRef.current = null;
      };
    } catch (error) {
      console.error('Error in sendMessage flow:', error);
      setStreamPhase('idle');
    }
  };

  // Audio Logic: Recording (STT)
  const startRecording = async () => {
    if (recording) return; 
    try {
      await Audio.requestPermissionsAsync();
      await configureAudioMode(true);

      const { recording } = await Audio.Recording.createAsync(
        Audio.RecordingOptionsPresets.HIGH_QUALITY
      );
      setRecording(recording);
      setIsRecording(true);
      setRecordingTime(0);
      
      // Animação de entrada (Slide)
      Animated.timing(slideAnim, {
        toValue: 1,
        duration: 200,
        useNativeDriver: true,
        easing: Easing.out(Easing.ease),
      }).start();

      // Animação de pulsar do mic
      Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, { toValue: 1.2, duration: 500, useNativeDriver: true }),
          Animated.timing(pulseAnim, { toValue: 1, duration: 500, useNativeDriver: true }),
        ])
      ).start();

      // Timer do áudio
      recordTimerRef.current = setInterval(() => {
        setRecordingTime(prev => prev + 1);
      }, 1000);

      if (sound) await sound.stopAsync();
    } catch (err) {
      console.error('Failed to start recording', err);
    }
  };

  const stopRecording = async () => {
    if (!recording) return;
    try {
      setIsRecording(false);
      // Limpa timer e animações
      if (recordTimerRef.current) clearInterval(recordTimerRef.current);
      pulseAnim.setValue(1);
      
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 150,
        useNativeDriver: true,
      }).start();

      await recording.stopAndUnloadAsync();
      const uri = recording.getURI();
      setRecording(null);
      if (uri) {
        transcribeAudio(uri);
      }
    } catch (e) {
      console.error('Stop recording error:', e);
    }
  };

  const transcribeAudio = async (uri: string) => {
    setStreamPhase('waiting');
    setPendingTool('Processando áudio...');
    
    try {
      const fileInfo = await FileSystem.getInfoAsync(uri);
      if (!fileInfo.exists || (fileInfo.size && fileInfo.size < 100)) {
        setStreamPhase('idle');
        return;
      }

      const __SecureStore = require('expo-secure-store');
      let token = await __SecureStore.getItemAsync('accessToken');
      
      const baseUrl = api.defaults.baseURL || '';
      const uploadUrl = `${baseUrl.replace(/\/$/, '')}/api/rep/chat/transcribe`;

      const performUpload = async (authToken: string) => {
        return await FileSystem.uploadAsync(uploadUrl, uri, {
          httpMethod: 'POST',
          uploadType: 0, 
          headers: {
            'Content-Type': 'application/octet-stream',
            'Authorization': `Bearer ${authToken}`
          },
        });
      };

      let response = await performUpload(token);

      if (response.status === 401) {
        const refreshToken = await __SecureStore.getItemAsync('refreshToken');
        if (refreshToken) {
          const refreshRes = await api.post(`${baseUrl.replace(/\/$/, '')}/api/mobile/refresh`, { refreshToken });
          token = refreshRes.data.accessToken;
          await __SecureStore.setItemAsync('accessToken', token);
          response = await performUpload(token);
        }
      }

      if (response.status >= 200 && response.status < 300) {
        const body = JSON.parse(response.body);
        if (body.text) {
          setVoiceMode(true);
          const userMessage: Message = {
            id: Date.now(),
            role: 'user',
            content: body.text,
            isVoice: true,
            audioUri: uri
          };
          setMessages(prev => [...prev, userMessage]);
          sendMessage(body.text, true); 
        } else {
          setStreamPhase('idle');
        }
      } else {
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

  // Audio Logic: Playback (TTS)
  const playTTS = async (text: string) => {
    const cleanText = text.replace(/[*_#`\[\]()]/g, '').replace(/\n/g, '. ').substring(0, 500);
    try {
      await configureAudioMode(false);
      setIsSpeaking(true);
      const response = await api.post('/api/rep/chat/tts', { text: cleanText }, {
        responseType: 'arraybuffer'
      });
      
      const uint8 = new Uint8Array(response.data);
      let binary = '';
      uint8.forEach(byte => binary += String.fromCharCode(byte));
      const base64 = btoa(binary);

      const path = (FileSystem.cacheDirectory || '') + 'tts_response.mp3';
      await FileSystem.writeAsStringAsync(path, base64, { encoding: 'base64' as any });

      const { sound: newSound } = await Audio.Sound.createAsync({ uri: path });
      setSound(newSound);
      await newSound.playAsync();
      newSound.setOnPlaybackStatusUpdate((status: any) => {
        if (status.didJustFinish) setIsSpeaking(false);
      });
    } catch (error) {
      console.error('TTS error:', error);
      setIsSpeaking(false);
    }
  };

  const getToolLabel = (tool: string) => {
    const labels: any = {
      get_resumo_vendas: 'Consultando resumo de vendas...',
      get_top_clientes: 'Buscando melhores clientes...',
      gerar_relatorio_pdf: 'Gerando relatório PDF...',
    };
    return labels[tool] || 'Consultando dados...';
  };

  const MessageAudioPlayer = ({ message }: { message: Message }) => {
    const [msgSound, setMsgSound] = useState<Audio.Sound | null>(null);
    const [isPlaying, setIsPlaying] = useState(false);
    const [position, setPosition] = useState(0);
    const [duration, setDuration] = useState(1);
    const [isLoading, setIsLoading] = useState(false);

    const getAudioSource = async () => {
      // 1. Áudio local (acabou de gravar)
      if (message.audioUri) return { uri: message.audioUri };
      
      // 2. Áudio do Usuário (remoto GET)
      if (message.role === 'user' && message.id) {
        return { 
          uri: `${api.defaults.baseURL}api/rep/chat/messages/${message.id}/audio`,
          headers: api.defaults.headers.common as any
        };
      }

      // 3. Áudio do Assistente (POST / tts)
      if (message.role === 'assistant' && message.id) {
        setIsLoading(true);
        try {
          // Como o endpoint de TTS é um POST, precisamos baixar o blob primeiro
          // ou tentar um GET se o servidor permitir (vou tentar o POST primeiro)
          const response = await api.post(`api/rep/chat/messages/${message.id}/tts`, {}, {
            responseType: 'blob'
          });
          
          // No ambiente mobile (React Native/Expo), precisamos converter o blob para um arquivo local
          // ou usar um data URI (mais simples para mpeg pequeno)
          const reader = new FileReader();
          return new Promise((resolve, reject) => {
            reader.onloadend = () => {
              setIsLoading(false);
              resolve({ uri: reader.result as string });
            };
            reader.onerror = () => {
              setIsLoading(false);
              reject(new Error("Erro ao ler o áudio do assistente"));
            };
            reader.readAsDataURL(response.data);
          });
        } catch (err) {
          console.error("Erro ao buscar TTS via POST:", err);
          // Fallback para o endpoint antigo ou apenas erro
          setIsLoading(false);
          throw err;
        }
      }

      // 4. Fallback: Gerar TTS sob demanda (Assistant ou User s/ áudio salvo)
      setIsLoading(true);
      try {
        const cleanText = message.content.replace(/[*_#`\[\]()]/g, '').replace(/\n/g, '. ').substring(0, 500);
        const response = await api.post('/api/rep/chat/tts', { text: cleanText }, {
          responseType: 'arraybuffer'
        });
        const uint8 = new Uint8Array(response.data);
        let binary = '';
        uint8.forEach(byte => binary += String.fromCharCode(byte));
        const base64 = btoa(binary);
        const path = (FileSystem.cacheDirectory || '') + `tts_${message.id}.mp3`;
        await FileSystem.writeAsStringAsync(path, base64, { encoding: 'base64' as any });
        message.audioUri = path;
        return { uri: path };
      } catch (e) {
        return null;
      } finally {
        setIsLoading(false);
      }
    };

    const togglePlayback = async () => {
      await configureAudioMode(false);
      if (msgSound) {
        if (isPlaying) await msgSound.pauseAsync();
        else await msgSound.playAsync();
        return;
      }
      const source = await getAudioSource();
      if (!source) return;
      try {
        const { sound: newSound } = await Audio.Sound.createAsync(
          source as any,
          { shouldPlay: true },
          (status: any) => {
            if (status.isLoaded) {
              setIsPlaying(status.isPlaying);
              setPosition(status.positionMillis || 0);
              setDuration(status.durationMillis || 1);
              if (status.didJustFinish) {
                setIsPlaying(false);
                setPosition(0);
              }
            }
          }
        );
        setMsgSound(newSound);
      } catch (e) {}
    };

    useEffect(() => {
      return () => { if (msgSound) msgSound.unloadAsync(); };
    }, [msgSound]);

    const formatTime = (millis: number) => {
      const minutes = Math.floor(millis / 60000);
      const seconds = ((millis % 60000) / 1000).toFixed(0);
      return `${minutes}:${Number(seconds) < 10 ? '0' : ''}${seconds}`;
    };

    const progress = (position / duration) * 100;
    const isMsgFromUser = message.role === 'user';
    const iconColor = isMsgFromUser ? '#FFFFFF' : COLORS.primary;
    const barBgColor = isMsgFromUser ? 'rgba(255,255,255,0.3)' : 'rgba(0,0,0,0.1)';
    const progressBarColor = isMsgFromUser ? '#FFFFFF' : COLORS.primary;
    const textColor = isMsgFromUser ? '#FFFFFF' : COLORS.textSecondary;

    return (
      <View style={styles.playerContainer}>
        <Pressable onPress={togglePlayback} style={styles.playButtonCompact}>
          {isLoading ? <ActivityIndicator size="small" color={iconColor} /> : 
          <FontAwesome name={isPlaying ? "pause" : "play"} size={14} color={iconColor} />}
        </Pressable>
        <View style={[styles.progressBarBg, { backgroundColor: barBgColor }]}>
          <View style={[styles.progressBarFill, { width: `${progress}%`, backgroundColor: progressBarColor }]} />
        </View>
        <Text style={[styles.durationText, { color: textColor }]}>
          {isPlaying || position > 0 ? formatTime(position) : formatTime(duration > 1 ? duration : 0)}
        </Text>
      </View>
    );
  };

  const renderMessage = ({ item }: { item: Message }) => {
    const isUser = item.role === 'user';
    if (item.type === 'pdf') return renderPdfCard(item.data);
    if (item.type === 'map_embed') return renderMapCard(item.data);
    if (item.type === 'html_widget') return renderHtmlCard(item.data);

    return (
      <View style={[styles.bubbleWrapper, isUser ? styles.userBubbleWrapper : styles.assistantBubbleWrapper]}>
        {!isUser && (
          <View style={styles.botIconWrapper}>
            <FontAwesome name="android" size={12} color="#FFF" />
          </View>
        )}
        <View style={[styles.messageBubble, isUser ? styles.userBubble : styles.assistantBubble]}>
          <Markdown style={isUser ? userMarkdownStyles : assistantMarkdownStyles}>
            {item.content}
          </Markdown>
          {(item.role === 'assistant' || item.hasAudio || item.isVoice) && (
            <MessageAudioPlayer message={item} />
          )}
        </View>
      </View>
    );
  };

  const renderPdfCard = (data: any) => (
    <View style={styles.assetCard}>
      <View style={styles.assetHeader}>
        <FontAwesome name="file-pdf-o" size={20} color="#FF7675" />
        <Text style={styles.assetTitle}>{data.titulo}</Text>
      </View>
      <View style={styles.assetActions}>
        <Pressable style={styles.assetButton} onPress={() => Linking.openURL(`${api.defaults.baseURL}${data.url}`)}>
          <Text style={styles.assetButtonText}>Abrir</Text>
        </Pressable>
        <Pressable style={styles.assetButton} onPress={() => Share.share({ url: `${api.defaults.baseURL}${data.url}` })}>
          <Text style={styles.assetButtonText}>Compartilhar</Text>
        </Pressable>
      </View>
    </View>
  );

  const renderMapCard = (data: any) => (
    <View style={styles.assetCard}>
      <View style={styles.assetHeader}>
        <FontAwesome name="map-marker" size={20} color="#00B894" />
        <Text style={styles.assetTitle}>Rota no Google Maps</Text>
      </View>
      <Pressable style={[styles.assetButton, { marginTop: 10 }]} onPress={() => Linking.openURL(data.mapsUrl)}>
        <Text style={styles.assetButtonText}>Abrir no Maps</Text>
      </Pressable>
    </View>
  );

  const renderHtmlCard = (data: any) => (
    <View style={[styles.assetCard, { height: 350 }]}>
      <Text style={[styles.assetTitle, { marginBottom: 10 }]}>{data.titulo}</Text>
      <WebView 
        originWhitelist={['*']}
        source={{ html: data.html }}
        style={{ flex: 1, backgroundColor: 'transparent' }}
        javaScriptEnabled={true}
      />
    </View>
  );

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />
      <Stack.Screen 
        options={{ 
          headerTitle: () => (
            <View style={styles.headerTitleContainer}>
              <View style={styles.headerIconCircle}><FontAwesome name="magic" size={16} color="#FFF" /></View>
              <View style={{ marginLeft: 12 }}>
                <Text style={styles.headerTitleText}>Assistente GT</Text>
                <Text style={styles.headerSubtitleText}>Online</Text>
              </View>
            </View>
          ),
          headerStyle: { backgroundColor: '#FFFFFF' },
          headerShadowVisible: false,
          headerLeft: () => (
            <Pressable onPress={() => router.back()} style={{ marginLeft: 10 }}>
              <FontAwesome name="angle-left" size={24} color={COLORS.textMain} />
            </Pressable>
          ),
        }} 
      />

      <FlatList
        ref={flatListRef}
        data={messages}
        keyExtractor={(item, index) => item.id.toString() + index}
        renderItem={renderMessage}
        contentContainerStyle={styles.scrollContent}
        ListFooterComponent={() => (
          <View style={{ backgroundColor: '#FFFFFF' }}>
            {streamPhase === 'waiting' && (
              <View style={styles.assistantBubbleWrapper}>
                <View style={styles.botIconWrapper}><FontAwesome name="android" size={12} color="#FFF" /></View>
                <View style={[styles.messageBubble, styles.assistantBubble, styles.loadingBubble]}>
                  <ActivityIndicator size="small" color={COLORS.primary} />
                  <Text style={styles.loadingLabel}>{pendingTool ? getToolLabel(pendingTool) : 'Trabalhando...'}</Text>
                </View>
              </View>
            )}
            {streamPhase === 'streaming' && (
              <View style={styles.assistantBubbleWrapper}>
                <View style={styles.botIconWrapper}><FontAwesome name="android" size={12} color="#FFF" /></View>
                <View style={[styles.messageBubble, styles.assistantBubble]}>
                  <Markdown style={assistantMarkdownStyles}>{streamingText}</Markdown>
                </View>
              </View>
            )}
            <View style={{ height: 20 }} />
          </View>
        )}
        onContentSizeChange={() => flatListRef.current?.scrollToEnd()}
      />

      <KeyboardAvoidingView 
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 100 : 80}
      >
        <View style={[
          styles.footer, 
          { paddingBottom: Math.max(insets.bottom, 16) + 30 }
        ]}>
          <View style={styles.inputWrapper}>
            {!isRecording && (
              <TextInput
                style={styles.input}
                placeholder=""
                placeholderTextColor={COLORS.textSecondary}
                value={inputText}
                onChangeText={setInputText}
                multiline
                maxLength={500}
                editable={!isRecording}
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
                    <FontAwesome name="microphone" size={16} color="#FF4757" />
                  </Animated.View>
                  <Text style={styles.recordingTimer}>{formatRecordTime(recordingTime)}</Text>
                </View>
                <Text style={styles.cancelText}>solte para cancelar</Text>
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
                    name={isSpeaking ? "volume-up" : "microphone"} 
                    size={18} 
                    color={isRecording ? COLORS.danger : isSpeaking ? COLORS.primary : COLORS.textSecondary} 
                  />
                </Pressable>
              ) : (
                <Pressable 
                  style={[styles.sendButton, streamPhase !== 'idle' && styles.sendButtonDisabled]}
                  onPress={() => sendMessage()}
                  disabled={streamPhase !== 'idle'}
                >
                  <FontAwesome name="paper-plane" size={16} color="#FFF" />
                </Pressable>
              )}
            </View>
          </View>
        </View>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FFFFFF' },
  headerTitleContainer: { flexDirection: 'row', alignItems: 'center' },
  headerIconCircle: { width: 36, height: 36, borderRadius: 18, backgroundColor: COLORS.primary, justifyContent: 'center', alignItems: 'center' },
  headerTitleText: { fontSize: 16, fontWeight: '700', color: '#1C1E21' },
  headerSubtitleText: { fontSize: 12, color: '#65676B' },
  scrollContent: { padding: 20, backgroundColor: '#FFFFFF' },
  bubbleWrapper: { flexDirection: 'row', marginBottom: 16, width: '100%' },
  userBubbleWrapper: { justifyContent: 'flex-end' },
  assistantBubbleWrapper: { justifyContent: 'flex-start' },
  botIconWrapper: { width: 24, height: 24, borderRadius: 12, backgroundColor: COLORS.primary, justifyContent: 'center', alignItems: 'center', marginRight: 8, marginTop: 4 },
  messageBubble: { maxWidth: '85%', paddingHorizontal: 16, paddingVertical: 12, borderRadius: 18 },
  userBubble: { backgroundColor: COLORS.userBubble, borderBottomRightRadius: 4 },
  assistantBubble: { backgroundColor: COLORS.assistantBubble, borderBottomLeftRadius: 4 },
  loadingBubble: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  loadingLabel: { fontSize: 14, color: COLORS.textSecondary, fontStyle: 'italic' },
  footer: { backgroundColor: '#FFF', paddingHorizontal: 20, paddingVertical: 15, borderTopWidth: 1, borderTopColor: COLORS.border },
  inputPill: { flexDirection: 'row', alignItems: 'center', backgroundColor: COLORS.inputBg, borderRadius: 30, paddingHorizontal: 16, minHeight: 40, marginBottom: 16 },
  inputWrapper: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    backgroundColor: COLORS.inputBg, 
    borderRadius: 30, 
    paddingHorizontal: 16, 
    minHeight: 40, 
    marginBottom: 16,
    flex: 1
  },
  input: { flex: 1, fontSize: 16, color: COLORS.textMain, paddingVertical: 10 },
  inputActions: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  micButton: { padding: 8 },
  micButtonActive: { backgroundColor: '#FFE3E3', borderRadius: 20 },
  sendButton: { width: 30, height: 30, marginEnd: -10, borderRadius: 20, backgroundColor: COLORS.primary, justifyContent: 'center', alignItems: 'center' },
  sendButtonDisabled: { backgroundColor: '#B2BEC3' },
  assetCard: { backgroundColor: '#F8F9FA', borderRadius: 16, padding: 16, marginBottom: 16, borderWidth: 1, borderColor: COLORS.border, width: '90%' },
  assetHeader: { flexDirection: 'row', alignItems: 'center' },
  assetTitle: { fontSize: 15, fontWeight: '700', color: COLORS.textMain, marginLeft: 10, flex: 1 },
  assetActions: { flexDirection: 'row', marginTop: 12, gap: 8 },
  assetButton: { flex: 1, backgroundColor: '#FFF', padding: 10, borderRadius: 8, alignItems: 'center', borderWidth: 1, borderColor: COLORS.border },
  assetButtonText: { fontSize: 14, fontWeight: '600', color: COLORS.primary },
  playerContainer: { flexDirection: 'row', alignItems: 'center', marginTop: 8, gap: 12, width: '100%' },
  playButtonCompact: { width: 28, height: 28, borderRadius: 14, justifyContent: 'center', alignItems: 'center' },
  progressBarBg: { flex: 1, height: 4, borderRadius: 2, overflow: 'hidden' },
  progressBarFill: { height: '100%', borderRadius: 2 },
  durationText: { fontSize: 10, marginLeft: 8, minWidth: 25 },
  recordingOverlay: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingRight: 10,
  },
  recordingLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  recordingTimer: {
    fontSize: 16,
    color: COLORS.textMain,
    fontWeight: '600',
  },
  cancelText: {
    fontSize: 14,
    color: '#65676B',
    fontStyle: 'italic',
  }
});

const userMarkdownStyles = { body: { color: '#FFFFFF', fontSize: 16 }, paragraph: { marginVertical: 0 } };
const assistantMarkdownStyles: any = { body: { color: COLORS.textMain, fontSize: 16, lineHeight: 24 }, paragraph: { marginVertical: 4 } };
