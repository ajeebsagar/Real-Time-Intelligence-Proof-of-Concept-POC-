// OpenRouter API Client

import axios, { AxiosInstance } from 'axios';
import logger from '../../shared/logger';

export interface OpenRouterMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface OpenRouterResponse {
  id: string;
  model: string;
  choices: Array<{
    message: {
      role: string;
      content: string;
    };
    finish_reason: string;
  }>;
  usage: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
}

export class OpenRouterClient {
  private client: AxiosInstance;
  private apiKey: string;
  private baseURL: string;

  constructor() {
    this.apiKey = process.env.OPENROUTER_API_KEY || '';
    this.baseURL = process.env.OPENROUTER_BASE_URL || 'https://openrouter.ai/api/v1';

    if (!this.apiKey) {
      logger.warn('OpenRouter API key not configured');
    }

    this.client = axios.create({
      baseURL: this.baseURL,
      headers: {
        'Authorization': `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': process.env.FRONTEND_URL || 'http://localhost:3000',
        'X-Title': 'Real-Time Intelligence Co-pilot',
      },
      timeout: 60000,
    });
  }

  async generateCompletion(
    messages: OpenRouterMessage[],
    model: string = 'openai/gpt-4o-mini',
    temperature: number = 0.7,
    maxTokens: number = 500
  ): Promise<OpenRouterResponse> {
    try {
      const startTime = Date.now();

      const response = await this.client.post('/chat/completions', {
        model,
        messages,
        temperature,
        max_tokens: maxTokens,
      });

      const latency = Date.now() - startTime;

      logger.info('OpenRouter completion generated', {
        model,
        latency,
        tokens: response.data.usage?.total_tokens,
      });

      return response.data;
    } catch (error: any) {
      logger.error('OpenRouter API error:', {
        message: error.message,
        response: error.response?.data,
      });
      throw new Error(`OpenRouter API error: ${error.message}`);
    }
  }

  async generateStreamCompletion(
    messages: OpenRouterMessage[],
    model: string = 'openai/gpt-4o-mini',
    onChunk: (chunk: string) => void
  ): Promise<void> {
    try {
      const response = await this.client.post(
        '/chat/completions',
        {
          model,
          messages,
          stream: true,
        },
        {
          responseType: 'stream',
        }
      );

      return new Promise((resolve, reject) => {
        response.data.on('data', (chunk: Buffer) => {
          const lines = chunk.toString().split('\n').filter((line) => line.trim());

          for (const line of lines) {
            if (line.startsWith('data: ')) {
              const data = line.slice(6);
              if (data === '[DONE]') {
                resolve();
                return;
              }

              try {
                const parsed = JSON.parse(data);
                const content = parsed.choices?.[0]?.delta?.content;
                if (content) {
                  onChunk(content);
                }
              } catch (e) {
                // Skip invalid JSON
              }
            }
          }
        });

        response.data.on('error', reject);
        response.data.on('end', resolve);
      });
    } catch (error: any) {
      logger.error('OpenRouter streaming error:', error);
      throw error;
    }
  }
}

export default new OpenRouterClient();
