/**
 * Portfolio API Paths
 *
 * Swagger/OpenAPI paths for portfolio management endpoints
 */

module.exports = {
  '/api/v1/portfolio': {
    get: {
      tags: ['Portfolio'],
      summary: 'Get User Portfolio',
      description: 'Retrieve current user portfolio with assets and performance metrics',
      parameters: [
        {
          name: 'includeAssets',
          in: 'query',
          schema: {
            type: 'boolean',
            default: true
          },
          description: 'Include detailed asset information'
        },
        {
          name: 'includePerformance',
          in: 'query',
          schema: {
            type: 'boolean',
            default: true
          },
          description: 'Include performance metrics'
        },
        {
          name: 'timeRange',
          in: 'query',
          schema: {
            type: 'string',
            enum: ['1d', '7d', '30d', '90d', '1y', 'all'],
            default: '30d'
          },
          description: 'Performance data time range'
        }
      ],
      responses: {
        200: {
          description: 'Portfolio retrieved successfully',
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  success: { type: 'boolean', example: true },
                  data: {
                    $ref: '#/components/schemas/Portfolio'
                  }
                }
              },
              examples: {
                full: {
                  summary: 'Complete Portfolio',
                  value: {
                    success: true,
                    data: {
                      id: '550e8400-e29b-41d4-a716-446655440000',
                      userId: '550e8400-e29b-41d4-a716-446655440001',
                      totalValue: 125000.50,
                      assets: [
                        {
                          symbol: 'BTC',
                          name: 'Bitcoin',
                          amount: 0.5,
                          value: 25000.00,
                          change24h: 2.5
                        },
                        {
                          symbol: 'ETH',
                          name: 'Ethereum',
                          amount: 10.0,
                          value: 35000.00,
                          change24h: -1.2
                        }
                      ],
                      performance: {
                        roi: 15.5,
                        volatility: 0.25,
                        sharpeRatio: 1.8,
                        maxDrawdown: -8.2
                      },
                      riskScore: 65
                    }
                  }
                }
              }
            }
          }
        },
        401: {
          $ref: '#/components/responses/UnauthorizedError'
        }
      },
      security: [
        {
          bearerAuth: []
        }
      ]
    }
  },
  '/api/v1/portfolio/assets': {
    get: {
      tags: ['Portfolio'],
      summary: 'Get Portfolio Assets',
      description: 'Retrieve detailed asset information for user portfolio',
      parameters: [
        {
          name: 'limit',
          in: 'query',
          schema: {
            type: 'integer',
            minimum: 1,
            maximum: 100,
            default: 20
          },
          description: 'Maximum number of assets to return'
        },
        {
          name: 'offset',
          in: 'query',
          schema: {
            type: 'integer',
            minimum: 0,
            default: 0
          },
          description: 'Number of assets to skip'
        },
        {
          name: 'sortBy',
          in: 'query',
          schema: {
            type: 'string',
            enum: ['value', 'change24h', 'symbol', 'amount'],
            default: 'value'
          },
          description: 'Sort assets by field'
        },
        {
          name: 'sortOrder',
          in: 'query',
          schema: {
            type: 'string',
            enum: ['asc', 'desc'],
            default: 'desc'
          },
          description: 'Sort order'
        }
      ],
      responses: {
        200: {
          description: 'Assets retrieved successfully',
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  success: { type: 'boolean', example: true },
                  data: {
                    type: 'object',
                    properties: {
                      assets: {
                        type: 'array',
                        items: {
                          $ref: '#/components/schemas/Asset'
                        }
                      },
                      total: {
                        type: 'integer',
                        example: 25,
                        description: 'Total number of assets'
                      },
                      pagination: {
                        type: 'object',
                        properties: {
                          limit: { type: 'integer', example: 20 },
                          offset: { type: 'integer', example: 0 },
                          hasMore: { type: 'boolean', example: true }
                        }
                      }
                    }
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
      ]
    }
  },
  '/api/v1/portfolio/performance': {
    get: {
      tags: ['Portfolio'],
      summary: 'Get Portfolio Performance',
      description: 'Retrieve portfolio performance metrics and historical data',
      parameters: [
        {
          name: 'timeRange',
          in: 'query',
          schema: {
            type: 'string',
            enum: ['1d', '7d', '30d', '90d', '1y', 'all'],
            default: '30d'
          },
          description: 'Performance data time range'
        },
        {
          name: 'granularity',
          in: 'query',
          schema: {
            type: 'string',
            enum: ['hourly', 'daily', 'weekly', 'monthly'],
            default: 'daily'
          },
          description: 'Data granularity'
        }
      ],
      responses: {
        200: {
          description: 'Performance data retrieved successfully',
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  success: { type: 'boolean', example: true },
                  data: {
                    type: 'object',
                    properties: {
                      metrics: {
                        $ref: '#/components/schemas/PerformanceMetrics'
                      },
                      historicalData: {
                        type: 'array',
                        items: {
                          type: 'object',
                          properties: {
                            date: {
                              type: 'string',
                              format: 'date-time'
                            },
                            value: {
                              type: 'number',
                              format: 'double'
                            },
                            change: {
                              type: 'number',
                              format: 'double'
                            },
                            changePercent: {
                              type: 'number',
                              format: 'double'
                            }
                          }
                        }
                      },
                      benchmarks: {
                        type: 'object',
                        properties: {
                          sp500: {
                            type: 'number',
                            format: 'double',
                            description: 'S&P 500 performance'
                          },
                          btc: {
                            type: 'number',
                            format: 'double',
                            description: 'Bitcoin performance'
                          },
                          eth: {
                            type: 'number',
                            format: 'double',
                            description: 'Ethereum performance'
                          }
                        }
                      }
                    }
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
      ]
    }
  },
  '/api/v1/portfolio/rebalance': {
    post: {
      tags: ['Portfolio'],
      summary: 'Rebalance Portfolio',
      description: 'Execute portfolio rebalancing based on target allocation',
      requestBody: {
        required: true,
        content: {
          'application/json': {
            schema: {
              type: 'object',
              required: ['targetAllocation'],
              properties: {
                targetAllocation: {
                  type: 'object',
                  additionalProperties: {
                    type: 'number',
                    minimum: 0,
                    maximum: 100
                  },
                  example: {
                    'BTC': 40,
                    'ETH': 30,
                    'USDC': 20,
                    'Other': 10
                  },
                  description: 'Target allocation percentages for each asset'
                },
                rebalanceThreshold: {
                  type: 'number',
                  minimum: 0,
                  maximum: 50,
                  default: 5,
                  description: 'Minimum deviation to trigger rebalancing (%)'
                },
                executeTrades: {
                  type: 'boolean',
                  default: false,
                  description: 'Whether to execute actual trades or just simulate'
                }
              }
            }
          }
        }
      },
      responses: {
        200: {
          description: 'Rebalancing plan generated successfully',
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  success: { type: 'boolean', example: true },
                  data: {
                    type: 'object',
                    properties: {
                      rebalancePlan: {
                        type: 'array',
                        items: {
                          type: 'object',
                          properties: {
                            asset: { type: 'string', example: 'BTC' },
                            currentAllocation: { type: 'number', example: 35.5 },
                            targetAllocation: { type: 'number', example: 40.0 },
                            deviation: { type: 'number', example: -4.5 },
                            action: {
                              type: 'string',
                              enum: ['buy', 'sell', 'hold']
                            },
                            amount: { type: 'number', format: 'double' },
                            value: { type: 'number', format: 'double' }
                          }
                        }
                      },
                      estimatedFees: {
                        type: 'number',
                        format: 'double',
                        description: 'Estimated trading fees'
                      },
                      riskImpact: {
                        type: 'object',
                        properties: {
                          newRiskScore: { type: 'number', minimum: 0, maximum: 100 },
                          riskChange: { type: 'number', format: 'double' }
                        }
                      }
                    }
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
      ]
    }
  },
  '/api/v1/portfolio/allocation': {
    get: {
      tags: ['Portfolio'],
      summary: 'Get Asset Allocation',
      description: 'Get current asset allocation breakdown',
      parameters: [
        {
          name: 'groupBy',
          in: 'query',
          schema: {
            type: 'string',
            enum: ['asset', 'category', 'risk_level'],
            default: 'asset'
          },
          description: 'Group allocation by field'
        }
      ],
      responses: {
        200: {
          description: 'Allocation data retrieved successfully',
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  success: { type: 'boolean', example: true },
                  data: {
                    type: 'object',
                    properties: {
                      totalValue: { type: 'number', format: 'double' },
                      allocation: {
                        type: 'array',
                        items: {
                          type: 'object',
                          properties: {
                            category: { type: 'string', example: 'Cryptocurrency' },
                            assets: {
                              type: 'array',
                              items: {
                                type: 'object',
                                properties: {
                                  symbol: { type: 'string', example: 'BTC' },
                                  name: { type: 'string', example: 'Bitcoin' },
                                  value: { type: 'number', format: 'double' },
                                  percentage: { type: 'number', format: 'double' }
                                }
                              }
                            },
                            totalValue: { type: 'number', format: 'double' },
                            totalPercentage: { type: 'number', format: 'double' }
                          }
                        }
                      }
                    }
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
      ]
    }
  },
  '/api/v1/portfolio/risk-analysis': {
    get: {
      tags: ['Portfolio'],
      summary: 'Get Risk Analysis',
      description: 'Get comprehensive risk analysis for portfolio',
      responses: {
        200: {
          description: 'Risk analysis retrieved successfully',
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  success: { type: 'boolean', example: true },
                  data: {
                    type: 'object',
                    properties: {
                      overallRiskScore: {
                        type: 'number',
                        minimum: 0,
                        maximum: 100,
                        example: 65
                      },
                      riskFactors: {
                        type: 'array',
                        items: {
                          type: 'object',
                          properties: {
                            factor: { type: 'string', example: 'High Volatility' },
                            impact: { type: 'number', format: 'double', example: 0.25 },
                            description: { type: 'string', example: 'Portfolio contains high-volatility assets' }
                          }
                        }
                      },
                      var95: {
                        type: 'number',
                        format: 'double',
                        description: '95% Value at Risk'
                      },
                      var99: {
                        type: 'number',
                        format: 'double',
                        description: '99% Value at Risk'
                      },
                      stressTestResults: {
                        type: 'object',
                        properties: {
                          marketCrash: { type: 'number', format: 'double' },
                          interestRateShock: { type: 'number', format: 'double' },
                          inflationSpike: { type: 'number', format: 'double' }
                        }
                      },
                      recommendations: {
                        type: 'array',
                        items: {
                          type: 'string',
                          example: 'Consider reducing exposure to high-volatility assets'
                        }
                      }
                    }
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
      ]
    }
  }
};
