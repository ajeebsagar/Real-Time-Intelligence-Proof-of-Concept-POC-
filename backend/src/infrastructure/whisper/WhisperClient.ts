// Whisper Speech-to-Text Client
//
// Supports two providers (selected via WHISPER_PROVIDER env, default "docker"):
//   - "docker": onerahmet/openai-whisper-asr-webservice — POST /asr field "audio_file"
//   - "openai": OpenAI-compatible API           — POST /v1/audio/transcriptions field "file"

import axios, { AxiosInstance } from 'axios';
import FormData from 'form-data';
import fs from 'fs';
import logger from '../../shared/logger';

export interface TranscriptionResult {
  text: string;
  language?: string;
  latencyMs?: number;
}

type WhisperProvider = 'docker' | 'openai';

export class WhisperClient {
  private client: AxiosInstance;
  private apiUrl: string;
  private model: string;
  private provider: WhisperProvider;
  private apiKey?: string;

  constructor() {
    this.apiUrl = process.env.WHISPER_API_URL || 'http://localhost:9000';
    this.model = process.env.WHISPER_MODEL || 'base';
    this.provider = (process.env.WHISPER_PROVIDER as WhisperProvider) || 'docker';
    this.apiKey = process.env.WHISPER_API_KEY || process.env.OPENAI_API_KEY;

    this.client = axios.create({
      baseURL: this.apiUrl,
      timeout: 120000,
    });
  }

  private buildRequest(
    fileSource: fs.ReadStream | Buffer,
    filename?: string
  ): { path: string; form: FormData; headers: Record<string, string> } {
    const form = new FormData();

    if (this.provider === 'openai') {
      if (fileSource instanceof Buffer) {
        form.append('file', fileSource, filename || 'audio.wav');
      } else {
        form.append('file', fileSource);
      }
      form.append('model', this.model === 'base' ? 'whisper-1' : this.model);
      form.append('response_format', 'json');

      const headers: Record<string, string> = { ...form.getHeaders() };
      if (this.apiKey) headers.Authorization = `Bearer ${this.apiKey}`;

      return { path: '/v1/audio/transcriptions', form, headers };
    }

    // docker (onerahmet/openai-whisper-asr-webservice)
    if (fileSource instanceof Buffer) {
      form.append('audio_file', fileSource, filename || 'audio.wav');
    } else {
      form.append('audio_file', fileSource);
    }

    const language = process.env.WHISPER_LANGUAGE || 'en';
    return {
      path: `/asr?task=transcribe&output=json&language=${encodeURIComponent(language)}`,
      form,
      headers: { ...form.getHeaders() },
    };
  }

  async transcribeAudio(audioPath: string): Promise<TranscriptionResult> {
    if (!fs.existsSync(audioPath)) {
      throw new Error(`Audio file not found: ${audioPath}`);
    }

    const startTime = Date.now();

    try {
      const { path, form, headers } = this.buildRequest(fs.createReadStream(audioPath));
      const response = await this.client.post(path, form, { headers });
      const latencyMs = Date.now() - startTime;

      const text = this.extractText(response.data);

      logger.info('Audio transcribed successfully', {
        audioPath,
        latencyMs,
        provider: this.provider,
        textLength: text.length,
      });

      return {
        text,
        language: response.data?.language,
        latencyMs,
      };
    } catch (error: any) {
      logger.error('Whisper transcription error', {
        message: error.message,
        status: error.response?.status,
        audioPath,
        provider: this.provider,
      });

      if (error.code === 'ECONNREFUSED' || error.code === 'ENOTFOUND') {
        throw new Error(
          `Whisper service unreachable at ${this.apiUrl}. Start the whisper container (docker compose up whisper) or set WHISPER_API_URL.`
        );
      }

      throw new Error(`Whisper transcription failed: ${error.message}`);
    }
  }

  async transcribeAudioBuffer(
    audioBuffer: Buffer,
    filename: string = 'audio.wav'
  ): Promise<TranscriptionResult> {
    const startTime = Date.now();

    try {
      const { path, form, headers } = this.buildRequest(audioBuffer, filename);
      const response = await this.client.post(path, form, { headers });
      const latencyMs = Date.now() - startTime;

      const text = this.extractText(response.data);

      return {
        text,
        language: response.data?.language,
        latencyMs,
      };
    } catch (error: any) {
      logger.error('Whisper buffer transcription error', {
        message: error.message,
        status: error.response?.status,
        provider: this.provider,
      });

      if (error.code === 'ECONNREFUSED' || error.code === 'ENOTFOUND') {
        throw new Error(
          `Whisper service unreachable at ${this.apiUrl}. Start the whisper container or set WHISPER_API_URL.`
        );
      }

      throw new Error(`Whisper transcription failed: ${error.message}`);
    }
  }

  private extractText(data: any): string {
    if (!data) return '';
    if (typeof data === 'string') return data.trim();
    if (typeof data.text === 'string') return data.text.trim();
    return '';
  }

  async isHealthy(): Promise<boolean> {
    try {
      const url = this.provider === 'docker' ? '/docs' : '/v1/models';
      await this.client.get(url, { timeout: 5000 });
      return true;
    } catch {
      return false;
    }
  }
}

export default new WhisperClient();
