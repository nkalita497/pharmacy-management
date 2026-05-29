"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.setupSwagger = void 0;
const swagger_jsdoc_1 = __importDefault(require("swagger-jsdoc"));
const swagger_ui_express_1 = __importDefault(require("swagger-ui-express"));
const path_1 = __importDefault(require("path"));
function buildSwaggerSpec() {
    const options = {
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
            path_1.default.join(process.cwd(), 'src/docs/**/*.yaml'),
            path_1.default.join(__dirname, './docs/**/*.yaml')
        ]
    };
    return (0, swagger_jsdoc_1.default)(options);
}
const setupSwagger = (app) => {
    try {
        const swaggerSpec = buildSwaggerSpec();
        app.use('/api-docs', swagger_ui_express_1.default.serve, swagger_ui_express_1.default.setup(swaggerSpec));
        console.log('📄 Dokumentacja API dostępna pod adresem: http://localhost:3000/api-docs');
    }
    catch (error) {
        console.error('Swagger init failed:', error);
    }
};
exports.setupSwagger = setupSwagger;
//# sourceMappingURL=swagger.js.map