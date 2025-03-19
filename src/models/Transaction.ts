export interface Transaction {
  hash: string
  amount: string
  fromAddress: string
  toAddress: string
  timestamp?: string
  status: 'success' | 'failed' | 'pending'
}

export interface TransactionRequest {
  fromAddress: string
  toAddress: string
  amount: string
  secret: string
}

export interface TransactionResponse {
  transaction: Transaction | null 
  success: boolean
  message?: string
}

export interface TransactionHistoryResponse {
  transactions: Transaction[]
  success: boolean
  message?: string
} 