import { Client } from 'xrpl'
import dotenv from 'dotenv'

dotenv.config()

export const xrplConfig = {
  server: process.env.XRPL_SERVER || 'wss://xrp-testnet.g.allthatnode.com/full/json_rpc/7624ecf3aa4f4ddb818079fec1cc4104', // default to testnet if not specified
  // server: 'wss://xrplcluster.com', // mainnet
}

export const getClient = async () => {
  const client = new Client(xrplConfig.server)
  await client.connect()
  return client
} 