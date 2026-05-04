import { API_V1_URL } from './config';

export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

export interface ChatInput {
  token: string;
  diseaseKey: string;
  diseaseName: string;
  predictedStage?: string;
  confidence?: number;
  conversationHistory: ChatMessage[];
  message: string;
}

export interface ChatResponse {
  reply: string;
  disease_key: string;
}

/**
 * Gửi câu hỏi tới AI Assistant (non-streaming).
 */
export async function chatApi(input: ChatInput): Promise<string> {
  const response = await fetch(`${API_V1_URL}/chat`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${input.token}`,
    },
    body: JSON.stringify({
      disease_key: input.diseaseKey,
      disease_name: input.diseaseName,
      predicted_stage: input.predictedStage || 'unknown',
      confidence: input.confidence || 0,
      conversation_history: input.conversationHistory,
      message: input.message,
    }),
  });

  if (!response.ok) {
    const err = await response.text();
    throw new Error(err || `HTTP ${response.status}`);
  }

  const data: ChatResponse = await response.json();
  return data.reply;
}

/**
 * Stream câu trả lời từ AI Assistant (SSE).
 * Gọi onChunk mỗi khi nhận được một phần text mới.
 */
export async function chatStreamApi(
  input: ChatInput,
  onChunk: (text: string) => void,
): Promise<void> {
  const response = await fetch(`${API_V1_URL}/chat/stream`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${input.token}`,
    },
    body: JSON.stringify({
      disease_key: input.diseaseKey,
      disease_name: input.diseaseName,
      predicted_stage: input.predictedStage || 'unknown',
      confidence: input.confidence || 0,
      conversation_history: input.conversationHistory,
      message: input.message,
    }),
  });

  if (!response.ok) {
    const err = await response.text();
    throw new Error(err || `HTTP ${response.status}`);
  }

  const reader = response.body?.getReader();
  if (!reader) {
    throw new Error('Stream not supported');
  }

  const decoder = new TextDecoder();
  let buffer = '';

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split('\n');
    buffer = lines.pop() || '';

    for (const line of lines) {
      if (!line.startsWith('data: ')) continue;
      const data = line.slice(6);
      if (data === '[DONE]') return;
      if (data.startsWith('[ERROR]')) {
        throw new Error(data);
      }
      onChunk(data);
    }
  }
}
