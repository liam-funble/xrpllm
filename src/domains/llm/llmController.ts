import { Request, Response } from 'express';
import { LLMService } from './llmService';
import { GenerateResponseParams, MyInfo } from './accounts';

export class LLMController {
  private llmService: LLMService;

  constructor() {
    this.llmService = new LLMService();
  }

  async generateResponse(req: Request, res: Response) {
    try {
      const { prompt, model, my, friends, FTs } = req.body as GenerateResponseParams;
      console.log('LLMController.generateResponse - Request body:', req.body);

      if (!prompt) {
        console.log('LLMController.generateResponse - Missing prompt');
        return res.status(400).json({
          success: false,
          message: 'Prompt is required'
        });
      }

      console.log('LLMController.generateResponse - Calling LLM service');
      const result = await this.llmService.generateResponse({
        prompt,
        model,
        friends,
        my,
        FTs
      });
      console.log('LLMController.generateResponse - LLM service response:', result);

      res.json(result);
    } catch (error) {
      console.error('LLMController.generateResponse - Error:', {
        message: error instanceof Error ? error.message : 'Unknown error',
        error
      });

      res.status(500).json({
        success: false,
        message: error instanceof Error ? error.message : 'Unknown error occurred'
      });
    }
  }
} 