export interface Account {
  address: string
  secret?: string
  balance?: string
}

export interface AccountCreateResponse {
  account: Account | null
  success: boolean
  message?: string
}

export interface AccountInfoResponse {
  account: Account | null
  success: boolean
  message?: string
}