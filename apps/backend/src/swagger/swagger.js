/**
 * Swagger/OpenAPI Configuration
 *
 * Comprehensive API documentation for FinAI Nexus
 */

const swaggerJSDoc = require('swagger-jsdoc');
const swaggerUi = require('swagger-ui-express');

const options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'FinAI Nexus API',
      version: '1.0.0',
      description: `
        # FinAI Nexus API Documentation
        
        ## Overview
        FinAI Nexus is a cutting-edge AI-powered financial platform that combines traditional finance with DeFi, 
        featuring emotion-aware coaching, synthetic financial avatars, and quantum-powered optimization.
        
        ## Key Features
        - **AI-Powered Financial Coaching**: Emotion-aware financial guidance with synthetic avatars
        - **DeFi Integration**: Cross-chain DeFi protocols with yield optimization
        - **Quantum Optimization**: Hybrid classical-quantum portfolio optimization
        - **Social Trading**: AI-moderated social trading pools and copy-trading
        - **Islamic Finance**: Shari'ah-compliant financial products and services
        - **AR/VR Trading**: Immersive 3D trading floors and AR portfolio visualization
        - **Compliance**: Automated regulatory compliance and fraud detection
        
        ## Authentication
        All API endpoints require authentication using JWT tokens. Include the token in the Authorization header:
        \`Authorization: Bearer <your-jwt-token>\`
        
        ## Rate Limiting
        API requests are rate-limited to prevent abuse:
        - **Standard Users**: 100 requests per 15 minutes
        - **Premium Users**: 500 requests per 15 minutes
        - **Enterprise Users**: 2000 requests per 15 minutes
        
        ## Error Handling
        All errors follow a consistent format:
        \`\`\`json
        {
          "success": false,
          "error": {
            "code": "ERROR_CODE",
            "message": "Human-readable error message",
            "details": "Additional error details"
          }
        }
        \`\`\`
        
        ## WebSocket Support
        Real-time features are available via WebSocket connections:
        - Market data updates
        - Portfolio value changes
        - AI insights and recommendations
        - Social trading notifications
        
        ## SDKs and Libraries
        Official SDKs are available for:
        - JavaScript/Node.js
        - Python
        - Java
        - Go
        - Swift (iOS)
        - Kotlin (Android)
      `,
      contact: {
        name: 'FinAI Nexus API Support',
        email: 'api-support@finnexusai.com',
        url: 'https://finnexusai.com/support'
      },
      license: {
        name: 'MIT',
        url: 'https://opensource.org/licenses/MIT'
      },
      termsOfService: 'https://finnexusai.com/terms'
    },
    servers: [
      {
        url: 'http://localhost:3001',
        description: 'Development server'
      },
      {
        url: 'https://api.finnexusai.com',
        description: 'Production server'
      },
      {
        url: 'https://staging-api.finnexusai.com',
        description: 'Staging server'
      }
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
          description: 'JWT token obtained from authentication endpoints'
        },
        apiKey: {
          type: 'apiKey',
          in: 'header',
          name: 'X-API-Key',
          description: 'API key for programmatic access'
        }
      },
      schemas: {
        User: {
          type: 'object',
          properties: {
            id: {
              type: 'string',
              format: 'uuid',
              description: 'Unique user identifier'
            },
            email: {
              type: 'string',
              format: 'email',
              description: 'User email address'
            },
            firstName: {
              type: 'string',
              description: 'User first name'
            },
            lastName: {
              type: 'string',
              description: 'User last name'
            },
            role: {
              type: 'string',
              enum: ['user', 'premium', 'enterprise', 'admin'],
              description: 'User role and subscription tier'
            },
            isVerified: {
              type: 'boolean',
              description: 'Email verification status'
            },
            createdAt: {
              type: 'string',
              format: 'date-time',
              description: 'Account creation timestamp'
            },
            lastLogin: {
              type: 'string',
              format: 'date-time',
              description: 'Last login timestamp'
            }
          }
        },
        Portfolio: {
          type: 'object',
          properties: {
            id: {
              type: 'string',
              format: 'uuid',
              description: 'Portfolio identifier'
            },
            userId: {
              type: 'string',
              format: 'uuid',
              description: 'Owner user identifier'
            },
            totalValue: {
              type: 'number',
              format: 'double',
              description: 'Total portfolio value in USD'
            },
            assets: {
              type: 'array',
              items: {
                $ref: '#/components/schemas/Asset'
              },
              description: 'Portfolio assets'
            },
            performance: {
              $ref: '#/components/schemas/PerformanceMetrics'
            },
            riskScore: {
              type: 'number',
              minimum: 0,
              maximum: 100,
              description: 'Portfolio risk score (0-100)'
            }
          }
        },
        Asset: {
          type: 'object',
          properties: {
            symbol: {
              type: 'string',
              description: 'Asset symbol (e.g., BTC, ETH)'
            },
            name: {
              type: 'string',
              description: 'Asset full name'
            },
            amount: {
              type: 'number',
              format: 'double',
              description: 'Amount held'
            },
            value: {
              type: 'number',
              format: 'double',
              description: 'Current value in USD'
            },
            change24h: {
              type: 'number',
              format: 'double',
              description: '24-hour price change percentage'
            }
          }
        },
        PerformanceMetrics: {
          type: 'object',
          properties: {
            roi: {
              type: 'number',
              format: 'double',
              description: 'Return on investment percentage'
            },
            volatility: {
              type: 'number',
              format: 'double',
              description: 'Portfolio volatility'
            },
            sharpeRatio: {
              type: 'number',
              format: 'double',
              description: 'Sharpe ratio'
            },
            maxDrawdown: {
              type: 'number',
              format: 'double',
              description: 'Maximum drawdown percentage'
            }
          }
        },
        Trade: {
          type: 'object',
          properties: {
            id: {
              type: 'string',
              format: 'uuid',
              description: 'Trade identifier'
            },
            userId: {
              type: 'string',
              format: 'uuid',
              description: 'Trader identifier'
            },
            asset: {
              type: 'string',
              description: 'Asset symbol'
            },
            type: {
              type: 'string',
              enum: ['buy', 'sell', 'swap'],
              description: 'Trade type'
            },
            amount: {
              type: 'number',
              format: 'double',
              description: 'Trade amount'
            },
            price: {
              type: 'number',
              format: 'double',
              description: 'Execution price'
            },
            status: {
              type: 'string',
              enum: ['pending', 'executed', 'failed', 'cancelled'],
              description: 'Trade status'
            },
            timestamp: {
              type: 'string',
              format: 'date-time',
              description: 'Trade execution timestamp'
            }
          }
        },
        AIInsight: {
          type: 'object',
          properties: {
            id: {
              type: 'string',
              format: 'uuid',
              description: 'Insight identifier'
            },
            type: {
              type: 'string',
              enum: ['market_analysis', 'portfolio_recommendation', 'risk_assessment', 'opportunity_alert'],
              description: 'Insight type'
            },
            title: {
              type: 'string',
              description: 'Insight title'
            },
            content: {
              type: 'string',
              description: 'Detailed insight content'
            },
            confidence: {
              type: 'number',
              minimum: 0,
              maximum: 100,
              description: 'AI confidence score (0-100)'
            },
            actions: {
              type: 'array',
              items: {
                type: 'string'
              },
              description: 'Recommended actions'
            },
            timestamp: {
              type: 'string',
              format: 'date-time',
              description: 'Insight generation timestamp'
            }
          }
        },
        Avatar: {
          type: 'object',
          properties: {
            id: {
              type: 'string',
              format: 'uuid',
              description: 'Avatar identifier'
            },
            name: {
              type: 'string',
              description: 'Avatar name'
            },
            personality: {
              type: 'string',
              enum: ['analytical', 'conservative', 'aggressive', 'balanced', 'educational'],
              description: 'Avatar personality type'
            },
            expertise: {
              type: 'array',
              items: {
                type: 'string'
              },
              description: 'Areas of expertise'
            },
            avatarImage: {
              type: 'string',
              format: 'uri',
              description: 'Avatar image URL'
            },
            isActive: {
              type: 'boolean',
              description: 'Avatar active status'
            }
          }
        },
        Error: {
          type: 'object',
          properties: {
            success: {
              type: 'boolean',
              example: false,
              description: 'Request success status'
            },
            error: {
              type: 'object',
              properties: {
                code: {
                  type: 'string',
                  description: 'Error code'
                },
                message: {
                  type: 'string',
                  description: 'Human-readable error message'
                },
                details: {
                  type: 'string',
                  description: 'Additional error details'
                }
              }
            }
          }
        },
        SuccessResponse: {
          type: 'object',
          properties: {
            success: {
              type: 'boolean',
              example: true,
              description: 'Request success status'
            },
            data: {
              type: 'object',
              description: 'Response data'
            },
            message: {
              type: 'string',
              description: 'Success message'
            }
          }
        }
      },
      responses: {
        UnauthorizedError: {
          description: 'Authentication required',
          content: {
            'application/json': {
              schema: {
                $ref: '#/components/schemas/Error'
              },
              example: {
                success: false,
                error: {
                  code: 'UNAUTHORIZED',
                  message: 'Authentication required',
                  details: 'Please provide a valid JWT token'
                }
              }
            }
          }
        },
        ForbiddenError: {
          description: 'Insufficient permissions',
          content: {
            'application/json': {
              schema: {
                $ref: '#/components/schemas/Error'
              },
              example: {
                success: false,
                error: {
                  code: 'FORBIDDEN',
                  message: 'Insufficient permissions',
                  details: 'You do not have permission to access this resource'
                }
              }
            }
          }
        },
        NotFoundError: {
          description: 'Resource not found',
          content: {
            'application/json': {
              schema: {
                $ref: '#/components/schemas/Error'
              },
              example: {
                success: false,
                error: {
                  code: 'NOT_FOUND',
                  message: 'Resource not found',
                  details: 'The requested resource does not exist'
                }
              }
            }
          }
        },
        ValidationError: {
          description: 'Validation error',
          content: {
            'application/json': {
              schema: {
                $ref: '#/components/schemas/Error'
              },
              example: {
                success: false,
                error: {
                  code: 'VALIDATION_ERROR',
                  message: 'Invalid input data',
                  details: 'Please check the request parameters'
                }
              }
            }
          }
        },
        RateLimitError: {
          description: 'Rate limit exceeded',
          content: {
            'application/json': {
              schema: {
                $ref: '#/components/schemas/Error'
              },
              example: {
                success: false,
                error: {
                  code: 'RATE_LIMIT_EXCEEDED',
                  message: 'Rate limit exceeded',
                  details: 'Please wait before making another request'
                }
              }
            }
          }
        }
      }
    },
    security: [
      {
        bearerAuth: []
      }
    ],
    tags: [
      {
        name: 'Authentication',
        description: 'User authentication and authorization endpoints'
      },
      {
        name: 'Portfolio',
        description: 'Portfolio management and analytics'
      },
      {
        name: 'Trading',
        description: 'Trading operations and order management'
      },
      {
        name: 'AI Services',
        description: 'AI-powered insights, recommendations, and avatars'
      },
      {
        name: 'DeFi',
        description: 'Decentralized finance protocols and yield optimization'
      },
      {
        name: 'Social Trading',
        description: 'Social trading features and copy-trading'
      },
      {
        name: 'Compliance',
        description: 'Regulatory compliance and fraud detection'
      },
      {
        name: 'Notifications',
        description: 'Real-time notifications and alerts'
      },
      {
        name: 'Analytics',
        description: 'Market analytics and performance metrics'
      },
      {
        name: 'Web3',
        description: 'Blockchain and Web3 wallet integration'
      },
      {
        name: 'Gamification',
        description: 'Gamified learning and achievement system'
      },
      {
        name: 'Islamic Finance',
        description: 'Shari\'ah-compliant financial products'
      },
      {
        name: 'AR/VR',
        description: 'Augmented and virtual reality features'
      },
      {
        name: 'Quantum',
        description: 'Quantum-powered optimization algorithms'
      },
      {
        name: 'Monitoring',
        description: 'System monitoring and performance metrics'
      }
    ]
  },
  apis: [
    './src/routes/*.js',
    './src/swagger/paths/*.js',
    './src/swagger/examples/*.js'
  ]
};

const specs = swaggerJSDoc(options);

// Custom CSS for Swagger UI
const customCss = `
  .swagger-ui .topbar { display: none; }
  .swagger-ui .info { margin: 20px 0; }
  .swagger-ui .info .title { color: #4fd1c5; }
  .swagger-ui .scheme-container { background: #1a202c; padding: 10px; border-radius: 4px; }
  .swagger-ui .btn.authorize { background-color: #4fd1c5; border-color: #4fd1c5; }
  .swagger-ui .btn.authorize:hover { background-color: #38b2ac; border-color: #38b2ac; }
  .swagger-ui .opblock.opblock-post { border-color: #4fd1c5; background: rgba(79, 209, 197, 0.1); }
  .swagger-ui .opblock.opblock-get { border-color: #68d391; background: rgba(104, 211, 145, 0.1); }
  .swagger-ui .opblock.opblock-put { border-color: #f6e05e; background: rgba(246, 224, 94, 0.1); }
  .swagger-ui .opblock.opblock-delete { border-color: #fc8181; background: rgba(252, 129, 129, 0.1); }
`;

const swaggerUiOptions = {
  customCss: customCss,
  customSiteTitle: 'FinAI Nexus API Documentation',
  customfavIcon: '/favicon.ico',
  swaggerOptions: {
    persistAuthorization: true,
    displayRequestDuration: true,
    docExpansion: 'none',
    filter: true,
    showExtensions: true,
    showCommonExtensions: true,
    tryItOutEnabled: true
  }
};

module.exports = {
  specs,
  swaggerUi,
  swaggerUiOptions
};
