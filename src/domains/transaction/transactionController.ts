import { Request, Response } from 'express'
import { TransactionService } from './transactionService'
import { getClient } from '../../config/xrpl.config'

export class TransactionController {
  private transactionService!: TransactionService

  constructor() {
    this.initializeService()
  }

  private async initializeService() {
    const client = await getClient()
    this.transactionService = new TransactionService(client)
  }

  async sendPayment(req: Request, res: Response) {
    try {
      const txRequest = req.body
      const result = await this.transactionService.sendPayment(txRequest)
      res.json(result)
    } catch (error: unknown) {
      res.status(500).json({
        success: false,
        message: error instanceof Error ? error.message : 'Unknown error occurred'
      })
    }
  }

  async getTransactionHistory(req: Request, res: Response) {
    try {
      const { address } = req.params
      const result = await this.transactionService.getTransactionHistory(address)
      res.json(result)
    } catch (error: unknown) {
      res.status(500).json({
        success: false,
        message: error instanceof Error ? error.message : 'Unknown error occurred'
      })
    }
  }

  async getTransactionDetails(req: Request, res: Response) {
    try {
      const { hash } = req.params
      const result = await this.transactionService.getTransactionDetails(hash)
      res.json(result)
    } catch (error: unknown) {
      res.status(500).json({
        success: false,
        message: error instanceof Error ? error.message : 'Unknown error occurred'
      })
    }
  }
} 