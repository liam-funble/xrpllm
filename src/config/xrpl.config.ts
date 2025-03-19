import { Client } from 'xrpl'

export const xrplConfig = {
  server: 'wss://s.altnet.rippletest.net:51233', // testnet
  // server: 'wss://xrplcluster.com', // mainnet
}

export const getClient = async () => {
  const client = new Client(xrplConfig.server)
  await client.connect()
  return client
} 