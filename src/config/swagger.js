const swaggerJsdoc = require('swagger-jsdoc');
const config = require('./env');

const options = {
    definition: {
        openapi: '3.0.0',
        info: {
            title: 'Resource Service API',
            version: '1.0.0',
            description: 'Resource microservice API documentation',
            contact: {
                name: 'API Support',
            },
        },
        servers: [
            {
                url: `http://localhost:${config.port}/api/resources`,
                description: 'Development server',
            },
        ],
        components: {
            securitySchemes: {
                ApiKeyAuth: {
                    type: 'apiKey',
                    in: 'header',
                    name: 'x-api-key',
                    description: 'API key for service authentication',
                },
                BearerAuth: {
                    type: 'http',
                    scheme: 'bearer',
                    bearerFormat: 'JWT',
                    description: 'JWT token for user authentication',
                },
            },
        },
        security: [
            {
                ApiKeyAuth: [],
                BearerAuth: [],
            },
        ],
    },
    apis: ['./src/api/routes/*.js', './src/api/controllers/*.js'],
};

const swaggerSpec = swaggerJsdoc(options);

module.exports = swaggerSpec;
