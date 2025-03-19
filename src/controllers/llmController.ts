import { Request, Response } from 'express';
import { LLMService } from '../services/llmService';

export class LLMController {
  private llmService: LLMService;

  constructor() {
    this.llmService = new LLMService();
  }

  async generateResponse(req: Request, res: Response) {
    try {
      const { prompt, model } = req.body;
      console.log('LLMController.generateResponse - Request body:', req.body);

      if (!prompt) {
        console.log('LLMController.generateResponse - Missing prompt');
        return res.status(400).json({
          success: false,
          message: 'Prompt is required'
        });
      }

      console.log('LLMController.generateResponse - Calling LLM service');
      const result = await this.llmService.generateResponse(prompt, model);
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

  async streamResponse(req: Request, res: Response) {
    try {
      const { prompt, model } = req.body;

      if (!prompt) {
        return res.status(400).json({
          success: false,
          message: 'Prompt is required'
        });
      }

      res.setHeader('Content-Type', 'text/event-stream');
      res.setHeader('Cache-Control', 'no-cache');
      res.setHeader('Connection', 'keep-alive');

      await this.llmService.streamResponse(
        prompt,
        model,
        (token) => {
          res.write(`data: ${JSON.stringify({ token })}\n\n`);
        }
      );

      res.end();
    } catch (error) {
      res.status(500).json({
        success: false,
        message: error instanceof Error ? error.message : 'Unknown error occurred'
      });
    }
  }
} 