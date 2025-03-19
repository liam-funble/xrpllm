import swaggerJsdoc from 'swagger-jsdoc'

const options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'XRPL API Documentation',
      version: '1.0.0',
      description: 'API documentation for XRPL integration',
    },
    servers: [
      {
        url: 'http://localhost:3000',
        description: 'Development server',
      },
    ],
  },
  apis: ['./src/routes/*.ts'], // routes 폴더의 모든 ts 파일을 스캔
}

export const specs = swaggerJsdoc(options) 