import express from 'express'
import swaggerUi from 'swagger-ui-express'
import cors from 'cors'
import { specs, exportSwaggerDocs } from './config/swagger.config'
import accountRoutes from './domains/account/accountRoutes'
import transactionRoutes from './domains/transaction/transactionRoutes'
import llmRoutes from './domains/llm/llmRoutes'
import nftRoutes from './domains/nft/nftRoutes'
import corsOptions from './config/cors.config'
import ftRoutes from './domains/ft/ftRoutes'
import { Client } from 'xrpl'
import { DEXRoutes } from './domains/dex/dexRoutes'

const app = express()
app.use(cors(corsOptions))
app.use(express.json())

// Swagger UI
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(specs))

// Export swagger documentation
if (process.env.NODE_ENV === 'development') {
  exportSwaggerDocs()
  console.log('Swagger documentation exported to swagger.json')
}

// XRPL 클라이언트 초기화
const client = new Client(process.env.XRPL_NODE || 'wss://s.altnet.rippletest.net:51233')

// Routes
app.use('/api/accounts', accountRoutes)
app.use('/api/transactions', transactionRoutes)
app.use('/api/llm', llmRoutes)
app.use('/api/nft', nftRoutes)
app.use('/api/ft', ftRoutes(client))

// DEX 라우터 설정
const dexRoutes = new DEXRoutes(client)
app.use('/api/dex', dexRoutes.getRouter())

const PORT = process.env.PORT || 3000
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`)
  console.log(`Swagger UI available at http://localhost:${PORT}/api-docs`)
}) 