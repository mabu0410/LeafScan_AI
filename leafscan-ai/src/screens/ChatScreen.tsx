  import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { StackNavigationProp } from '@react-navigation/stack';
import { RouteProp } from '@react-navigation/native';
import { RootStackParamList } from '../types';
import { useAuthStore } from '../stores/authStore';
import { chatApi, chatStreamApi, ChatMessage } from '../api/chat';
import { theme } from '../theme/theme';

type Props = {
  navigation: StackNavigationProp<RootStackParamList, 'Chat'>;
  route: RouteProp<RootStackParamList, 'Chat'>;
};

interface DisplayMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
}

const SUGGESTED_QUESTIONS = [
  'Bệnh này nguy hiểm không?',
  'Cách điều trị hiệu quả nhất?',
  'Làm sao phòng ngừa tái phát?',
  'Thuốc nào nên dùng?',
];

export default function ChatScreen({ navigation, route }: Props) {
  const { disease } = route.params;
  const accessToken = useAuthStore((s) => s.accessToken);

  const [messages, setMessages] = useState<DisplayMessage[]>([
    {
      id: '0',
      role: 'assistant',
      content: `Xin chào! Tôi là LeafScan AI Assistant.\n\nTôi đã phân tích kết quả chẩn đoán bệnh "${disease.name}" trên cây của bạn (độ tin cậy ${disease.confidence}%).\n\nBạn có câu hỏi gì về bệnh này không? Tôi sẵn sàng tư vấn!`,
    },
  ]);
  const [inputText, setInputText] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const flatListRef = useRef<FlatList>(null);

  useEffect(() => {
    setTimeout(() => flatListRef.current?.scrollToEnd({ animated: true }), 100);
  }, [messages]);

  const sendMessage = async (text?: string) => {
    const messageText = (text || inputText).trim();
    if (!messageText || isLoading) return;
    if (!accessToken) {
      return;
    }

    const userMsg: DisplayMessage = {
      id: Date.now().toString(),
      role: 'user',
      content: messageText,
    };
    const assistantMessageId = `${userMsg.id}-assistant`;

    setMessages((prev) => [...prev, userMsg, { id: assistantMessageId, role: 'assistant', content: '' }]);
    setInputText('');
    setIsLoading(true);

    // Build conversation history (exclude first greeting)
    const history: ChatMessage[] = messages
      .slice(1)
      .map((m) => ({ role: m.role, content: m.content }));

    try {
      await chatStreamApi(
        {
          token: accessToken,
          diseaseKey: disease.id,
          diseaseName: disease.name,
          predictedStage: disease.predictedStage,
          confidence: disease.confidence,
          conversationHistory: history,
          message: messageText,
        },
        (chunk) => {
          if (!chunk) return;
          setMessages((prev) =>
            prev.map((message) =>
              message.id === assistantMessageId
                ? { ...message, content: message.content + chunk }
                : message
            )
          );
        }
      );
    } catch {
      try {
        const reply = await chatApi({
          token: accessToken,
          diseaseKey: disease.id,
          diseaseName: disease.name,
          predictedStage: disease.predictedStage,
          confidence: disease.confidence,
          conversationHistory: history,
          message: messageText,
        });

        setMessages((prev) =>
          prev.map((message) =>
            message.id === assistantMessageId ? { ...message, content: reply } : message
          )
        );
      } catch (err: any) {
        const errorText = `Xin lỗi, đã xảy ra lỗi: ${err.message || 'Không thể kết nối'}. Vui lòng thử lại.`;
        setMessages((prev) =>
          prev.map((message) =>
            message.id === assistantMessageId ? { ...message, content: errorText } : message
          )
        );
      }
    } finally {
      setIsLoading(false);
    }
  };

  const renderMessage = ({ item }: { item: DisplayMessage }) => {
    const isUser = item.role === 'user';
    return (
      <View style={[styles.messageBubble, isUser ? styles.userBubble : styles.assistantBubble]}>
        {!isUser && (
          <View style={styles.avatarRow}>
            <View style={styles.avatar}>
              <Ionicons name="leaf" size={14} color={theme.colors.white} />
            </View>
            <Text style={styles.avatarLabel}>LeafScan AI</Text>
          </View>
        )}
        <Text style={[styles.messageText, isUser && styles.userMessageText]}>
          {item.content}
        </Text>
      </View>
    );
  };

  const showSuggestions = messages.length <= 1 && !isLoading;

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={0}
    >
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Ionicons name="chevron-back" size={24} color={theme.colors.textPrimary} />
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <Text style={styles.headerTitle}>AI Assistant</Text>
          <Text style={styles.headerSubtitle}>{disease.name}</Text>
        </View>
        <View style={styles.backButton} />
      </View>

      {/* Messages */}
      <FlatList
        ref={flatListRef}
        data={messages}
        keyExtractor={(item) => item.id}
        renderItem={renderMessage}
        contentContainerStyle={styles.messageList}
        onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: true })}
        ListFooterComponent={
          <>
            {isLoading && (
              <View style={[styles.messageBubble, styles.assistantBubble]}>
                <View style={styles.avatarRow}>
                  <View style={styles.avatar}>
                    <Ionicons name="leaf" size={14} color={theme.colors.white} />
                  </View>
                  <Text style={styles.avatarLabel}>LeafScan AI</Text>
                </View>
                <View style={styles.typingRow}>
                  <ActivityIndicator size="small" color={theme.colors.primary} />
                  <Text style={styles.typingText}>Đang suy nghĩ...</Text>
                </View>
              </View>
            )}

            {/* Suggested questions */}
            {showSuggestions && (
              <View style={styles.suggestionsContainer}>
                <Text style={styles.suggestionsTitle}>Gợi ý câu hỏi:</Text>
                {SUGGESTED_QUESTIONS.map((q, i) => (
                  <TouchableOpacity
                    key={i}
                    style={styles.suggestionChip}
                    onPress={() => sendMessage(q)}
                  >
                    <Ionicons name="chatbubble-ellipses-outline" size={14} color={theme.colors.primary} />
                    <Text style={styles.suggestionText}>{q}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            )}
          </>
        }
      />

      {/* Input */}
      <View style={styles.inputContainer}>
        <TextInput
          style={styles.textInput}
          placeholder="Hỏi về bệnh cây..."
          placeholderTextColor={theme.colors.textMuted}
          value={inputText}
          onChangeText={setInputText}
          multiline
          maxLength={500}
          editable={!isLoading}
          onSubmitEditing={() => sendMessage()}
          blurOnSubmit={false}
        />
        <TouchableOpacity
          style={[styles.sendButton, (!inputText.trim() || isLoading) && styles.sendButtonDisabled]}
          onPress={() => sendMessage()}
          disabled={!inputText.trim() || isLoading}
        >
          <Ionicons
            name="send"
            size={20}
            color={inputText.trim() && !isLoading ? theme.colors.white : theme.colors.textMuted}
          />
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.bg,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 60,
    paddingHorizontal: 20,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
    backgroundColor: theme.colors.bgCard,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: theme.colors.bgMuted,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerCenter: {
    alignItems: 'center',
    flex: 1,
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: '600',
    color: theme.colors.textPrimary,
  },
  headerSubtitle: {
    fontSize: 12,
    color: theme.colors.primary,
    fontWeight: '500',
    marginTop: 2,
  },
  messageList: {
    padding: 16,
    paddingBottom: 8,
  },
  messageBubble: {
    maxWidth: '85%',
    borderRadius: 18,
    padding: 14,
    marginBottom: 10,
  },
  userBubble: {
    alignSelf: 'flex-end',
    backgroundColor: theme.colors.primary,
    borderBottomRightRadius: 4,
  },
  assistantBubble: {
    alignSelf: 'flex-start',
    backgroundColor: theme.colors.bgCard,
    borderBottomLeftRadius: 4,
    borderWidth: 0.5,
    borderColor: theme.colors.border,
    ...theme.shadows.card,
  },
  avatarRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 8,
  },
  avatar: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: theme.colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: theme.colors.primary,
  },
  messageText: {
    fontSize: 14,
    color: theme.colors.textPrimary,
    lineHeight: 21,
  },
  userMessageText: {
    color: theme.colors.white,
  },
  typingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  typingText: {
    fontSize: 13,
    color: theme.colors.textMuted,
    fontStyle: 'italic',
  },
  suggestionsContainer: {
    marginTop: 8,
    gap: 8,
  },
  suggestionsTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: theme.colors.textSecondary,
    marginBottom: 4,
  },
  suggestionChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: theme.colors.primaryPale,
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: theme.colors.primary + '30',
  },
  suggestionText: {
    fontSize: 13,
    color: theme.colors.primary,
    fontWeight: '500',
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    padding: 12,
    paddingBottom: Platform.OS === 'ios' ? 32 : 12,
    backgroundColor: theme.colors.bgCard,
    borderTopWidth: 1,
    borderTopColor: theme.colors.border,
    gap: 10,
  },
  textInput: {
    flex: 1,
    backgroundColor: theme.colors.bgMuted,
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingTop: 10,
    paddingBottom: 10,
    fontSize: 14,
    color: theme.colors.textPrimary,
    maxHeight: 100,
  },
  sendButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: theme.colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  sendButtonDisabled: {
    backgroundColor: theme.colors.bgMuted,
  },
});
