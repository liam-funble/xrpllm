import axios from 'axios';
import dotenv from 'dotenv';

dotenv.config();

export interface LLMResponse {
  success: boolean;
  message?: string;
  response?: string;
}

export interface LLMConfig {
  provider: string;
  apiKey: string;
  apiUrl: string;
}

export class LLMService {
  private config: LLMConfig;

  constructor() {
    this.config = {
      provider: process.env.LLM_PROVIDER || 'ollama',
      apiKey: process.env.LLM_API_KEY || '',
      apiUrl: process.env.LLM_API_URL || 'http://localhost:11434/api/generate'
    };

    if (!this.config.apiKey) {
      throw new Error('LLM_API_KEY is not defined in environment variables');
    }
  }

  private getHeaders() {
    return {
      'Authorization': `Bearer ${this.config.apiKey}`,
      'Content-Type': 'application/json'
    };
  }

  private formatRequestBody(prompt: string, model: string, stream: boolean) {
    switch (this.config.provider) {
      case 'ollama':
        return {
          model,
          prompt,
          stream
        };
      // 다른 LLM 제공자를 위한 포맷팅 추가 가능
      default:
        return {
          model,
          prompt,
          stream
        };
    }
  }

  async generateResponse(prompt: string, model: string = 'gemma3:27b'): Promise<LLMResponse> {
    try {
      console.log('LLMService.generateResponse - Request:', {
        url: this.config.apiUrl,
        model,
        prompt,
        provider: this.config.provider
      });

      const requestBody = this.formatRequestBody(prompt, model, false);
      console.log('Formatted request body:', requestBody);

      const response = await axios.post(
        this.config.apiUrl,
        requestBody,
        {
          headers: this.getHeaders()
        }
      );

      console.log('LLM API Response:', response.data);

      return {
        success: true,
        response: response.data.response
      };
    } catch (error) {
      console.error('LLMService.generateResponse - Error:', {
        message: error instanceof Error ? error.message : 'Unknown error',
        error
      });

      if (axios.isAxiosError(error)) {
        console.error('API Error Details:', {
          status: error.response?.status,
          statusText: error.response?.statusText,
          data: error.response?.data
        });
      }

      return {
        success: false,
        message: error instanceof Error ? error.message : 'Unknown error occurred'
      };
    }
  }

  async streamResponse(
    prompt: string, 
    model: string = 'gemma3:27b',
    onToken: (token: string) => void
  ): Promise<LLMResponse> {
    try {
      const response = await axios.post(
        this.config.apiUrl,
        this.formatRequestBody(prompt, model, true),
        {
          headers: this.getHeaders(),
          responseType: 'stream'
        }
      );

      let fullResponse = '';

      response.data.on('data', (chunk: Buffer) => {
        const text = chunk.toString();
        try {
          const json = JSON.parse(text);
          if (json.response) {
            fullResponse += json.response;
            onToken(json.response);
          }
        } catch (e) {
          // 잘못된 JSON 형식 무시
        }
      });

      return new Promise((resolve) => {
        response.data.on('end', () => {
          resolve({
            success: true,
            response: fullResponse
          });
        });
      });
    } catch (error) {
      return {
        success: false,
        message: error instanceof Error ? error.message : 'Unknown error occurred'
      };
    }
  }
} 