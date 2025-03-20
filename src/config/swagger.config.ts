import swaggerJsdoc from 'swagger-jsdoc'
import { writeFileSync } from 'fs'
import { resolve } from 'path'

const options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'XRPL Integration with LLM Service',
      version: '1.0.0',
      description: 'API documentation for XRPL and LLM integration',
    },
    servers: [
      {
        url: 'http://localhost:3000',
        description: 'Development server',
      },
    ],
  },
  apis: ['./src/domains/**/*Routes.ts'], //  *.routes.js 파일을 찾도록 설정
}

export const specs = swaggerJsdoc(options)

// Export swagger documentation
const exportSwaggerDocs = () => {
  try {
    // JSON 형식으로 export
    writeFileSync(
      resolve(__dirname, '../../docs/swagger.json'),
      JSON.stringify(specs, null, 2)
    )
    console.log('Swagger JSON exported to: docs/swagger.json')

    // YAML 형식으로 export
    const YAML = require('yaml')
    writeFileSync(
      resolve(__dirname, '../../docs/swagger.yaml'),
      YAML.stringify(specs)
    )
    console.log('Swagger YAML exported to: docs/swagger.yaml')
  } catch (error) {
    console.error('Error exporting swagger docs:', error)
  }
}

// 파일이 직접 실행될 때만 export 실행
if (require.main === module) {
  exportSwaggerDocs()
}

export { exportSwaggerDocs } 