import { Request, Response } from 'express';
import { NFTService } from './nftService';
import { getClient } from '../../config/xrpl.config';

export class NFTController {
  private nftService!: NFTService;
  
  constructor() {
    this.initService();
  }

  private async initService() {
    this.nftService = new NFTService(await getClient());
  }

  async mintNFT(req: Request, res: Response) {
    try {
      const mintRequest = req.body;
      console.log('NFTController.mintNFT - Request:', mintRequest);

      if (!mintRequest.issuerAddress || !mintRequest.secret || !mintRequest.uri) {
        return res.status(400).json({
          success: false,
          message: 'Required parameters missing: issuerAddress, secret, and uri are required'
        });
      }

      const result = await this.nftService.mintNFT(mintRequest);
      res.json(result);
    } catch (error) {
      console.error('NFTController.mintNFT - Error:', error);
      res.status(500).json({
        success: false,
        message: error instanceof Error ? error.message : 'Unknown error occurred'
      });
    }
  }
} 