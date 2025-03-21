import { Client, Wallet, xrpToDrops, Payment, TransactionMetadata } from 'xrpl'
import { Transaction, TransactionRequest, TransactionResponse, TransactionHistoryResponse } from './Transaction'

export class TransactionService {
  private client: Client

  constructor(client: Client) {
    this.client = client
  }

  async sendPayment(txRequest: TransactionRequest): Promise<TransactionResponse> {
    try {
      const wallet = Wallet.fromSeed(txRequest.secret)
      
      // 트랜잭션 준비
      const prepared = await this.client.autofill({
        TransactionType: 'Payment',
        Account: txRequest.fromAddress,
        Amount: xrpToDrops(txRequest.amount),
        Destination: txRequest.toAddress
      })

      // 트랜잭션 서명
      const signed = wallet.sign(prepared)
      
      // 트랜잭션 제출
      const result = await this.client.submitAndWait(signed.tx_blob)

      // 트랜잭션 결과 확인
      const txResult = result.result;
      const meta = txResult.meta as TransactionMetadata;
      const transactionResult = typeof meta === 'string' ? meta : meta?.TransactionResult;
      const isSuccess = transactionResult === 'tesSUCCESS';

      // tec, tel, tem 등으로 시작하는 결과 코드는 실패를 의미
      const status = isSuccess ? 'success' : 'failed';

      return {
        success: isSuccess,
        message: isSuccess ? undefined : `Transaction failed: ${transactionResult || 'Unknown error'}`,
        transaction: {
          hash: txResult.hash,
          amount: txRequest.amount,
          fromAddress: txRequest.fromAddress,
          toAddress: txRequest.toAddress,
          timestamp: new Date().toISOString(),
          status
        }
      }
    } catch (error) {
      return {
        success: false,
        message: error instanceof Error ? error.message : 'Unknown error',
        transaction: null
      }
    }
  }

  async getTransactionHistory(address: string): Promise<TransactionHistoryResponse> {
    try {
      const response = await this.client.request({
        command: 'account_tx',
        account: address,
        limit: 20
      })

      const RIPPLE_EPOCH = 946684800; // 2000년 1월 1일 (초)

      const transactions = response.result.transactions
        .filter(tx => tx.tx && tx.tx.TransactionType === 'Payment')
        .map(tx => {
          if (!tx.tx) return null;
          
          const txObj = tx.tx as any;
          const meta = tx.meta as any;
          const isSuccess = 
            meta?.TransactionResult === 'tesSUCCESS' || 
            (typeof meta === 'string' ? meta === 'tesSUCCESS' : false);
          
          // Ripple 타임스탬프를 JavaScript 타임스탬프로 변환
          const rippleTimestamp = tx.tx.date || Date.now() / 1000;
          const unixTimestamp = (rippleTimestamp + RIPPLE_EPOCH) * 1000;
          
          return {
            hash: txObj.hash || '',
            amount: typeof txObj.Amount === 'string' ? txObj.Amount : '0',
            fromAddress: txObj.Account,
            toAddress: txObj.Destination,
            timestamp: new Date(unixTimestamp).toISOString(),
            status: isSuccess ? 'success' : 'failed'
          } as Transaction;
        })
        .filter((tx): tx is Transaction => tx !== null);

      return {
        success: true,
        transactions
      }
    } catch (error) {
      return {
        success: false,
        message: error instanceof Error ? error.message : 'Unknown error',
        transactions: []
      }
    }
  }

  async getTransactionDetails(txHash: string): Promise<TransactionResponse> {
    try {
      const response = await this.client.request({
        command: 'tx',
        transaction: txHash
      })

      const RIPPLE_EPOCH = 946684800;
      
      const txObj = response.result as any;
      const isSuccess = 
        txObj.meta?.TransactionResult === 'tesSUCCESS' || 
        (typeof txObj.meta === 'string' ? txObj.meta === 'tesSUCCESS' : false);
      
      const rippleTimestamp = txObj.date || Date.now() / 1000;
      const unixTimestamp = (rippleTimestamp + RIPPLE_EPOCH) * 1000;

      return {
        success: isSuccess,
        message: isSuccess ? undefined : `Transaction failed: ${txObj.meta?.TransactionResult || 'Unknown error'}`,
        transaction: {
          hash: txObj.hash,
          amount: typeof txObj.Amount === 'string' ? txObj.Amount : '0',
          fromAddress: txObj.Account,
          toAddress: txObj.Destination,
          timestamp: new Date(unixTimestamp).toISOString(),
          status: isSuccess ? 'success' : 'failed'
        }
      }
    } catch (error) {
      return {
        success: false,
        message: error instanceof Error ? error.message : 'Unknown error',
        transaction: null
      }
    }
  }
}