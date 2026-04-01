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
  useColorScheme,
  View
} from 'react-native';
import Markdown from 'react-native-markdown-display';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { WebView } from 'react-native-webview';
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
        playThroughEarpieceAndroid: false,
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
        isVoice: m.hasAudio || (m.role === 'assistant' && m.hasTts),
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
      const wsUrl = `${wsProtocol}://${wsHost}/ws?token=${wsToken}&sessionId=${activeSessionId}`;
      
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
             accumulatedText += data.content; // Alinhado com a doc da API (content, não text)
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
             if (accumulatedText.trim()) {
               setMessages(prev => [...prev, {
                 id: `bot-${Date.now()}`,
                 role: 'assistant',
                 content: accumulatedText,
                 isVoice: false
               }]);
             }
             ws.close();
             setStreamingText('');
             setStreamPhase('idle');
             accumulatedText = '';
             
             // Aguarda o backend persistir a mensagem antes de sincronizar o histórico
             setTimeout(() => {
               loadMessages(activeSessionId);
               loadSessions();
             }, 800);
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

      if (sound) await sound.stopAsync();
    } catch (err) {
      console.error('Failed to start recording', err);
    }
  };

  const stopRecording = async () => {
    if (!recording) return;
    try {
      setIsRecording(false);
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
      if (uri) transcribeAudio(uri);
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
      if (message.audioUri) return { uri: message.audioUri };
      
      if (message.role === 'user' && message.id) {
        return { 
          uri: `${api.defaults.baseURL}api/rep/chat/messages/${message.id}/audio`,
          headers: api.defaults.headers.common as any
        };
      }

      if (message.role === 'assistant' && message.id) {
        setIsLoading(true);
        try {
          const response = await api.post(`api/rep/chat/messages/${message.id}/tts`, {}, { responseType: 'blob' });
          const reader = new FileReader();
          return new Promise((resolve, reject) => {
            reader.onloadend = () => {
              setIsLoading(false);
              resolve({ uri: reader.result as string });
            };
            reader.onerror = () => { setIsLoading(false); reject(new Error("Erro ao ler o áudio")); };
            reader.readAsDataURL(response.data);
          });
        } catch (err) { setIsLoading(false); throw err; }
      }

      setIsLoading(true);
      try {
        const cleanText = message.content.replace(/[*_#`\[\]()]/g, '').replace(/\n/g, '. ').substring(0, 500);
        const response = await api.post('/api/rep/chat/tts', { text: cleanText }, { responseType: 'arraybuffer' });
        const uint8 = new Uint8Array(response.data);
        let binary = '';
        uint8.forEach(byte => binary += String.fromCharCode(byte));
        const base64 = btoa(binary);
        const path = (FileSystem.cacheDirectory || '') + `tts_${message.id}.mp3`;
        await FileSystem.writeAsStringAsync(path, base64, { encoding: 'base64' as any });
        message.audioUri = path;
        return { uri: path };
      } catch (e) { return null; } finally { setIsLoading(false); }
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
              if (status.didJustFinish) { setIsPlaying(false); setPosition(0); }
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
    const iconColor = isMsgFromUser ? '#FFFFFF' : THEME.primary;
    const barBgColor = isMsgFromUser ? 'rgba(255,255,255,0.2)' : 'rgba(128,128,128,0.1)';
    const progressBarColor = isMsgFromUser ? '#FFFFFF' : THEME.primary;
    const textColor = isMsgFromUser ? 'rgba(255,255,255,0.8)' : THEME.textSecondary;

    return (
      <View style={styles.playerContainer}>
        <Pressable onPress={togglePlayback} style={styles.playButtonCompact}>
          {isLoading ? <ActivityIndicator size="small" color={iconColor} /> : 
          <FontAwesome name={isPlaying ? "pause" : "play"} size={12} color={iconColor} />}
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
        <View style={[styles.messageBubble, isUser ? styles.userBubble : [styles.assistantBubble, { backgroundColor: THEME.assistantBubble }]]}>
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
      <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} />
      <Stack.Screen 
        options={{ 
          headerShown: true,
          headerTitle: () => (
            <View style={styles.headerTitleContainer}>
              <Text style={[styles.headerTitleMain, { color: THEME.textMain }]}>Assistente</Text>
              <View style={styles.statusDot} />
            </View>
          ),
          headerStyle: { backgroundColor: THEME.background },
          headerShadowVisible: false,
          headerLeft: () => (
            <Pressable onPress={() => router.back()} style={{ marginLeft: 16 }}>
              <FontAwesome name="chevron-left" size={18} color={THEME.primary} />
            </Pressable>
          ),
          headerRight: () => (
            <Pressable onPress={handleCreateNewSession} style={{ marginRight: 16 }}>
              <FontAwesome name="plus" size={18} color={THEME.primary} />
            </Pressable>
          )
        }} 
      />

      <FlatList
        ref={flatListRef}
        data={messages}
        keyExtractor={(item, index) => item.id.toString() + index}
        renderItem={renderMessage}
        contentContainerStyle={styles.scrollContent}
        ListFooterComponent={() => (
          <View>
            {streamPhase === 'waiting' && (
              <View style={styles.assistantBubbleWrapper}>
                <View style={[styles.messageBubble, { backgroundColor: THEME.assistantBubble }, styles.loadingBubble]}>
                  <ActivityIndicator size="small" color={THEME.textSecondary} />
                  <Text style={[styles.loadingLabel, { color: THEME.textSecondary }]}>{pendingTool ? getToolLabel(pendingTool) : 'digitando...'}</Text>
                </View>
              </View>
            )}
            {streamPhase === 'streaming' && (
              <View style={styles.assistantBubbleWrapper}>
                <View style={[styles.messageBubble, { backgroundColor: THEME.assistantBubble }]}>
                  <Markdown style={assistantMarkdownStyles}>{streamingText}</Markdown>
                </View>
              </View>
            )}
            <View style={{ height: 120 }} />
          </View>
        )}
        onContentSizeChange={() => flatListRef.current?.scrollToEnd()}
      />

      <KeyboardAvoidingView 
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 10 : 0}
        style={styles.keyboardView}
      >
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
    maxWidth: '82%', 
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
  keyboardView: { position: 'absolute', bottom: 0, left: 0, right: 0 },
  footer: { 
    paddingHorizontal: 16, 
    paddingVertical: 10,
    backgroundColor: 'transparent',
  },
  inputWrapper: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    backgroundColor: '#FFFFFF', 
    borderRadius: 24, 
    paddingHorizontal: 12,
    paddingVertical: 6,
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
    paddingTop: 8, 
    paddingBottom: 8,
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
});
