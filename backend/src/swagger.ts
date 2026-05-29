import swaggerJsdoc from 'swagger-jsdoc';
import swaggerUi from 'swagger-ui-express';
import { Application } from 'express';
import path from 'path';

function buildSwaggerSpec() {
  const options: swaggerJsdoc.Options = {
    definition: {
      openapi: '3.0.0',
      info: {
        title: 'Pharma API',
        version: '1.0.0',
        description: 'Interaktywna dokumentacja API dla systemu zarządzania apteką'
      },
      servers: [
        {
          url: 'http://localhost:3000',
          description: 'Serwer lokalny (Dev)'
        }
      ],
      components: {
        securitySchemes: {
          sessionAuth: {
            type: 'apiKey',
            in: 'cookie',
            name: 'connect.sid'
          }
        }
      },
      security: [{ sessionAuth: [] }]
    },
    // Parsujemy dedykowany plik OpenAPI zamiast komentarzy JSDoc w routach,
    // aby Swagger nie blokował startu API przy błędnych adnotacjach.
    apis: [
      path.join(process.cwd(), 'src/docs/**/*.yaml'),
      path.join(__dirname, './docs/**/*.yaml')
    ]
  };

  return swaggerJsdoc(options);
}

export const setupSwagger = (app: Application) => {
  try {
    const swaggerSpec = buildSwaggerSpec();
    app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));
    console.log('📄 Dokumentacja API dostępna pod adresem: http://localhost:3000/api-docs');
  } catch (error) {
    console.error('Swagger init failed:', error);
  }
};
