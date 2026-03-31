import React, { useState, useEffect, useRef } from 'react';
import { 
  StyleSheet, 
  TextInput, 
  Pressable, 
  ActivityIndicator, 
  KeyboardAvoidingView, 
  Platform, 
  FlatList,
  Dimensions,
  Linking,
  Share,
  StatusBar,
  Text,
  View
} from 'react-native';
import { Stack, useRouter } from 'expo-router';
import { FontAwesome } from '@expo/vector-icons';
import Markdown from 'react-native-markdown-display';
import { WebView } from 'react-native-webview';
import { Audio } from 'expo-av';
import * as FileSystem from 'expo-file-system/legacy';
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
}

interface ChatSession {
  id: number;
  titulo: string;
  atualizadoEm: string;
}

export default function ChatScreen() {
  const { user } = useAuth();
  const router = useRouter();
  
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

  const flatListRef = useRef<FlatList>(null);
  const wsRef = useRef<WebSocket | null>(null);

  useEffect(() => {
    loadSessions();
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

  const loadMessages = async (sessionId: number) => {
    try {
      const response = await api.get(`/api/rep/chat/sessions/${sessionId}/messages`);
      const formattedMessages = response.data.map((m: any) => ({
        id: m.id,
        role: m.role,
        content: m.content
      }));
      setMessages(formattedMessages);
      setTimeout(() => flatListRef.current?.scrollToEnd(), 200);
    } catch (error) {
      console.error('Error loading messages:', error);
    }
  };

  const sendMessage = async (textOverride?: string) => {
    const textToSend = textOverride || inputText;
    if (!textToSend.trim() || !activeSessionId || streamPhase !== 'idle') return;

    if (sound) {
      try { await sound.stopAsync(); } catch (e) {}
    }

    const userMessage: Message = {
      id: Date.now(),
      role: 'user',
      content: textToSend.trim()
    };

    setMessages(prev => [...prev, userMessage]);
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
          message: textToSend,
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
            ws.close();
            setStreamPhase('idle');
            loadMessages(activeSessionId);
            loadSessions();
            if (voiceMode && accumulatedText) {
              playTTS(accumulatedText);
            }
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
    if (recording) return; // FIX: impede múltiplas instâncias
    try {
      await Audio.requestPermissionsAsync();
      await Audio.setAudioModeAsync({
        allowsRecordingIOS: true,
        playsInSilentModeIOS: true,
      });

      const { recording } = await Audio.Recording.createAsync(
        Audio.RecordingOptionsPresets.HIGH_QUALITY
      );
      setRecording(recording);
      setIsRecording(true);
      if (sound) await sound.stopAsync();
    } catch (err) {
      console.error('Failed to start recording', err);
    }
  };

  const stopRecording = async () => {
    if (!recording) return;
    try {
      setIsRecording(false);
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
        console.error('Audio file too small or missing:', fileInfo);
        setStreamPhase('idle');
        return;
      }

      // IMPORTANTE: Obter o token JWT manualmente, já que não usaremos o Axios
      const __SecureStore = require('expo-secure-store');
      const token = await __SecureStore.getItemAsync('accessToken');
      
      const headers: Record<string, string> = {
        'Content-Type': 'application/octet-stream',
      };
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }

      let baseUrl = api.defaults.baseURL || '';
      if (baseUrl.endsWith('/')) {
        baseUrl = baseUrl.slice(0, -1);
      }
      const uploadUrl = `${baseUrl}/api/rep/chat/transcribe`;

      // Usa API nativa de upload do Expo em modo BINARY (corpo direto do áudio, sem form-data)
      const response = await FileSystem.uploadAsync(uploadUrl, uri, {
        httpMethod: 'POST',
        uploadType: 0, // 0 = FileSystemUploadType.BINARY
        headers,
      });

      if (response.status >= 200 && response.status < 300) {
        const body = JSON.parse(response.body);
        if (body.text) {
          setVoiceMode(true);
          sendMessage(body.text);
        } else {
          setStreamPhase('idle');
        }
      } else {
        throw new Error(`Servidor retornou status ${response.status}: ${response.body}`);
      }
    } catch (error: any) {
      console.error('Transcription upload error:', error.message || error);
      setMessages(prev => [...prev, {
        id: `err-${Date.now()}`,
        role: 'assistant',
        content: `Desculpe, houve um erro ao enviar seu áudio para transcrição. Tente novamente.`
      }]);
      setStreamPhase('idle');
    }
  };

  // Audio Logic: Playback (TTS)
  const playTTS = async (text: string) => {
    const cleanText = text.replace(/[*_#`\[\]()]/g, '').replace(/\n/g, '. ').substring(0, 500); // Limit to avoid long processing
    
    try {
      setIsSpeaking(true);
      const response = await api.post('/api/rep/chat/tts', { text: cleanText }, {
        responseType: 'arraybuffer'
      });
      
      const uint8 = new Uint8Array(response.data);
      let binary = '';
      uint8.forEach(byte => binary += String.fromCharCode(byte));
      const base64 = btoa(binary);

      const path = (FileSystem.cacheDirectory || '') + 'tts_response.mp3';
      await FileSystem.writeAsStringAsync(path, base64, { 
        encoding: (FileSystem.EncodingType?.Base64 || 'base64') as any 
      });

      const { sound: newSound } = await Audio.Sound.createAsync({ uri: path });
      setSound(newSound);
      
      await newSound.playAsync();
      newSound.setOnPlaybackStatusUpdate((status: any) => {
        if (status.didJustFinish) {
          setIsSpeaking(false);
        }
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
      'Transcrevendo áudio...': 'Transcrevendo áudio...',
    };
    return labels[tool] || 'Consultando dados...';
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
              <View style={styles.headerIconCircle}>
                <FontAwesome name="magic" size={16} color="#FFF" />
              </View>
              <View style={{ marginLeft: 12, backgroundColor: 'transparent' }}>
                <Text style={styles.headerTitleText}>Assistente GT</Text>
                <Text style={styles.headerSubtitleText}>Online</Text>
              </View>
            </View>
          ),
          headerStyle: { backgroundColor: '#FFFFFF' },
          headerTintColor: COLORS.textMain,
          headerShadowVisible: false,
          headerLeft: () => (
            <Pressable onPress={() => router.back()} style={{ marginLeft: 10 }}>
              <FontAwesome name="angle-left" size={24} color={COLORS.textMain} />
            </Pressable>
          ),
          headerRight: () => (
            <View style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: 'transparent', marginRight: 10 }}>
               <FontAwesome name="moon-o" size={20} color={COLORS.textSecondary} />
            </View>
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
          <View style={{ backgroundColor: '#FFFFFF' }}>
            {streamPhase === 'waiting' && (
              <View style={styles.assistantBubbleWrapper}>
                <View style={styles.botIconWrapper}>
                  <FontAwesome name="android" size={12} color="#FFF" />
                </View>
                <View style={[styles.messageBubble, styles.assistantBubble, styles.loadingBubble]}>
                  <ActivityIndicator size="small" color={COLORS.primary} />
                  <Text style={styles.loadingLabel}>
                    {pendingTool ? getToolLabel(pendingTool) : 'Trabalhando...'}
                  </Text>
                </View>
              </View>
            )}
            {streamPhase === 'streaming' && (
              <View style={styles.assistantBubbleWrapper}>
                <View style={styles.botIconWrapper}>
                  <FontAwesome name="android" size={12} color="#FFF" />
                </View>
                <View style={[styles.messageBubble, styles.assistantBubble]}>
                  <Markdown style={assistantMarkdownStyles}>
                    {streamingText}
                  </Markdown>
                </View>
              </View>
            )}
            <View style={{ height: 20, backgroundColor: 'transparent' }} />
          </View>
        )}
        onContentSizeChange={() => flatListRef.current?.scrollToEnd()}
      />

      <KeyboardAvoidingView 
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
      >
        <View style={styles.footer}>
          <View style={styles.inputPill}>
            <TextInput
              style={styles.input}
              placeholder={isRecording ? 'Gravando...' : 'Ola'}
              placeholderTextColor={COLORS.textSecondary}
              value={inputText}
              onChangeText={setInputText}
              multiline
              maxLength={500}
              editable={!isRecording}
            />
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
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  headerTitleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'transparent',
  },
  headerIconCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: COLORS.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitleText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1C1E21',
  },
  headerSubtitleText: {
    fontSize: 12,
    color: '#65676B',
    fontWeight: '400',
  },
  scrollContent: {
    padding: 20,
    backgroundColor: '#FFFFFF',
  },
  bubbleWrapper: {
    flexDirection: 'row',
    marginBottom: 16,
    width: '100%',
    backgroundColor: 'transparent',
  },
  userBubbleWrapper: {
    justifyContent: 'flex-end',
  },
  assistantBubbleWrapper: {
    justifyContent: 'flex-start',
  },
  botIconWrapper: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: COLORS.primary,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 8,
    marginTop: 4,
  },
  messageBubble: {
    maxWidth: '85%',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 18,
  },
  userBubble: {
    backgroundColor: COLORS.userBubble,
    borderBottomRightRadius: 4,
  },
  assistantBubble: {
    backgroundColor: COLORS.assistantBubble,
    borderBottomLeftRadius: 4,
  },
  loadingBubble: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  loadingLabel: {
    fontSize: 14,
    color: COLORS.textSecondary,
    fontStyle: 'italic',
  },
  footer: {
    backgroundColor: '#FFF',
    paddingHorizontal: 20,
    paddingVertical: 15,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
  },
  inputPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.inputBg,
    borderRadius: 30,
    paddingHorizontal: 16,
    minHeight: 56,
  },
  input: {
    flex: 1,
    fontSize: 16,
    color: COLORS.textMain,
    paddingVertical: 10,
  },
  inputActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: 'transparent',
  },
  micButton: {
    padding: 8,
  },
  micButtonActive: {
    backgroundColor: '#FFE3E3',
    borderRadius: 20,
  },
  sendButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: COLORS.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  sendButtonDisabled: {
    backgroundColor: '#B2BEC3',
  },
  assetCard: {
    backgroundColor: '#F8F9FA',
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
    width: '90%',
  },
  assetHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'transparent',
  },
  assetTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: COLORS.textMain,
    marginLeft: 10,
    flex: 1,
  },
  assetActions: {
    flexDirection: 'row',
    marginTop: 12,
    gap: 8,
    backgroundColor: 'transparent',
  },
  assetButton: {
    flex: 1,
    backgroundColor: '#FFF',
    padding: 10,
    borderRadius: 8,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  assetButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.primary,
  }
});

const userMarkdownStyles = {
  body: { color: '#FFFFFF', fontSize: 16 },
  paragraph: { marginVertical: 0 },
};

const assistantMarkdownStyles: any = {
  body: { color: COLORS.textMain, fontSize: 16, lineHeight: 24, fontWeight: '400' },
  paragraph: { marginVertical: 4 },
  bullet_list: { marginVertical: 8 },
  list_item: { marginVertical: 4 },
  table: { marginVertical: 10, borderWidth: 1, borderColor: '#DDD' },
  th: { backgroundColor: '#F0F2F5', fontWeight: 'bold' },
  td: { padding: 5 },
};
