import express from 'express'
import swaggerUi from 'swagger-ui-express'
import { specs } from './config/swagger.config'
import accountRoutes from './routes/accountRoutes'
import transactionRoutes from './routes/transactionRoutes'
import llmRoutes from './routes/llmRoutes'

const app = express()
app.use(express.json())

// Swagger UI
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(specs))

// Routes
app.use('/api/accounts', accountRoutes)
app.use('/api/transactions', transactionRoutes)
app.use('/api/llm', llmRoutes)

const PORT = process.env.PORT || 3000
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`)
  console.log(`Swagger UI available at http://localhost:${PORT}/api-docs`)
}) 