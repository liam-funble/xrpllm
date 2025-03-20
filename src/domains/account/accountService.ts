import { Client, Wallet } from 'xrpl'
import { Account, AccountCreateResponse, AccountInfoResponse } from './Account'
import { getClient } from '../../config/xrpl.config'

export class AccountService {
  private client: Client

  constructor(client: Client) {
    this.client = client
  }

  async createAccount(): Promise<AccountCreateResponse> {
    try {
      const wallet = await Wallet.generate()
      
      // Fund the account on testnet
      const result = await this.client.fundWallet(wallet)
      
      return {
        success: true,
        account: {
          address: wallet.address,
          secret: wallet.seed,
          balance: result.balance.toString()
        }
      }
    } catch (error) {
      return {
        success: false,
        message: error instanceof Error ? error.message : 'Unknown error',
        account: null
      }
    }
  }

  async getAccountInfo(address: string): Promise<AccountInfoResponse> {
    try {
      const response = await this.client.request({
        command: 'account_info',
        account: address,
        ledger_index: 'validated'
      })

      return {
        success: true,
        account: {
          address: response.result.account_data.Account,
          balance: response.result.account_data.Balance
        }
      }
    } catch (error) {
      return {
        success: false,
        message: error instanceof Error ? error.message : 'Unknown error',
        account: null
      }
    }
  }
}