import { Request, Response } from 'express'
import { AccountService } from './accountService'
import { getClient } from '../../config/xrpl.config'

export class AccountController {
  private accountService!: AccountService

  constructor() {
    this.initializeService()
  }

  private async initializeService() {
    const client = await getClient()
    this.accountService = new AccountService(client)
  }

  async createAccount(req: Request, res: Response) {
    try {
      const result = await this.accountService.createAccount()
      res.json(result)
    } catch (error: unknown) {
      res.status(500).json({
        success: false,
        message: error instanceof Error ? error.message : 'Unknown error occurred'
      })
    }
  }

  async getAccountInfo(req: Request, res: Response) {
    try {
      const { address } = req.params
      const result = await this.accountService.getAccountInfo(address)
      res.json(result)
    } catch (error: unknown) {
      res.status(500).json({
        success: false,
        message: error instanceof Error ? error.message : 'Unknown error occurred'
      })
    }
  }
}