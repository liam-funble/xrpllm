import axios from 'axios';
import dotenv from 'dotenv';
import {PromptTemplate} from './prompt/prompt-template'; // 새 파일 임포트

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

    if (!this.config.apiKey && this.config.provider !== 'ollama') { // Ollama는 API 키 불필요
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
      default:
        return {
          model,
          prompt,
          stream
        };
    }
  }

  private parseJsonFromLLMResponse(response: string): any {
    try {
      const jsonString = response.replace(/```json\n?/, '').replace(/\n?```/, '');
      const parsed = JSON.parse(jsonString);
  
      // 응답 형식 검증
      if (!parsed.statusInfo || !parsed.data) {
        throw new Error('Invalid response format');
      }
      if (!['success', 'partial', 'fail'].includes(parsed.statusInfo.status)) {
        throw new Error('Invalid status value');
      }
      // if (parsed.data.task && !TASKS.some(t => t.name === parsed.data.task)) {
      //   throw new Error('Invalid task name');
      // }
  
      return parsed;
    } catch (error) {
      console.error('Error parsing JSON from LLM response:', error);
      return {
        statusInfo: {
          status: 'fail',
          description: 'LLM 응답 형식이 잘못됨'
        },
        data: null
      };
    }
  }

  async generateResponse(prompt: string, userId: string, model: string = 'gemma3:27b'): Promise<LLMResponse> {
    try {
      console.log('LLMService.generateResponse - Original prompt:', prompt);
      
      const formattedPrompt = PromptTemplate.generatePrompt(prompt, userId); // 템플릿 사용
      console.log('LLMService.generateResponse - Formatted prompt:', formattedPrompt);

      const requestBody = this.formatRequestBody(formattedPrompt, model, false);
      console.log('Formatted request body:', requestBody);

      const response = await axios.post(
        this.config.apiUrl,
        requestBody,
        {
          headers: this.getHeaders()
        }
      );

      console.log('LLM API Response:', response.data);

      const parsedResponse = this.parseJsonFromLLMResponse(response.data.response);

      return {
        success: true,
        response: parsedResponse || response.data.response
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
}