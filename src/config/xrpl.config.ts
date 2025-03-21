import { Client } from 'xrpl'
import dotenv from 'dotenv'

dotenv.config()

export const xrplConfig = {
  server: process.env.XRPL_SERVER || 'wss://s.altnet.rippletest.net:51233', // default to testnet if not specified
  // server: 'wss://xrplcluster.com', // mainnet
}

export const getClient = async () => {
  const client = new Client(xrplConfig.server)
  await client.connect()
  return client
} 