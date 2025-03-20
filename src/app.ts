import express from 'express'
import swaggerUi from 'swagger-ui-express'
import { specs, exportSwaggerDocs } from './config/swagger.config'
import accountRoutes from './domains/account/accountRoutes'
import transactionRoutes from './domains/transaction/transactionRoutes'
import llmRoutes from './domains/llm/llmRoutes'
import nftRoutes from './domains/nft/nftRoutes'

const app = express()
app.use(express.json())

// Swagger UI
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(specs))

// Export swagger documentation
if (process.env.NODE_ENV === 'development') {
  exportSwaggerDocs()
  console.log('Swagger documentation exported to swagger.json')
}

// Routes
app.use('/api/accounts', accountRoutes)
app.use('/api/transactions', transactionRoutes)
app.use('/api/llm', llmRoutes)
app.use('/api/nft', nftRoutes)

const PORT = process.env.PORT || 3000
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`)
  console.log(`Swagger UI available at http://localhost:${PORT}/api-docs`)
}) 