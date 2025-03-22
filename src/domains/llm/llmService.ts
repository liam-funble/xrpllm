import axios from 'axios';
import dotenv from 'dotenv';
import {PromptTemplate} from './prompt/prompt-template';
import { TASKS } from './prompt/tasks';
import {Friend, GenerateResponseParams, MyInfo} from "./accounts";

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
        if (!parsed.statusInfo || !('data' in parsed)) {
            throw new Error('Invalid response format: statusInfo or data missing');
        }

        // status 값 검증
        const validStatuses = ['success', 'fail'];
        if (!validStatuses.includes(parsed.statusInfo.status)) {
            throw new Error(`Invalid status value: ${parsed.statusInfo.status}`);
        }

        // task 값 검증 (task가 있을 경우 TASKS에 정의된 이름이어야 함)
        if (parsed.data?.task && !TASKS.some(t => t.name === parsed.data.task)) {
            throw new Error(`Invalid task name: ${parsed.data.task}`);
        }

        // message가 문자열인지 확인
        if (typeof parsed.statusInfo.message !== 'string') {
            throw new Error('Message must be a string');
        }

        // parameters가 객체 또는 null인지 확인
        if (parsed.data?.parameters && typeof parsed.data.parameters !== 'object') {
            throw new Error('Parameters must be an object or null');
        }

        return parsed;
    } catch (error) {
        console.error('Error parsing JSON from LLM response:', error);
        return {
            statusInfo: {
                status: 'Failed',
                message: '응답 형식이 잘못되었어요. 다시 시도해 주세요.'
            },
            data: null
        };
    }
}

  async generateResponse({
    prompt, 
    model = 'gemma3:27b', 
    friends = [], 
    my = { userId: '', address: '' },
    FTs = []
  }: GenerateResponseParams): Promise<LLMResponse> {
    try {
      console.log('LLMService.generateResponse - Original prompt:', prompt);
      
      // friends 배열을 문자열로 변환
      const friendsString = friends
        .map(friend => `${friend.nickname}:${friend.address}`)
        .join(', ');
      
      // my 정보를 문자열로 변환
      const myString = `${my.userId}:${my.address}`;
      
      // FTs 배열을 문자열로 변환
      const ftsString = FTs
        .map(ft => `${ft.currency}:${ft.issuerAddress}:${ft.balance}`)
        .join(', ');
      
      // PromptTemplate.generatePrompt 메서드가 FTs를 처리할 수 있도록 수정 필요
      const formattedPrompt = PromptTemplate.generatePrompt(prompt, friendsString, myString, ftsString);
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