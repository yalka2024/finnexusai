/**
 * Authentication API Paths
 *
 * Swagger/OpenAPI paths for authentication endpoints
 */

module.exports = {
  '/api/auth/login': {
    post: {
      tags: ['Authentication'],
      summary: 'User Login',
      description: 'Authenticate user with email and password',
      requestBody: {
        required: true,
        content: {
          'application/json': {
            schema: {
              type: 'object',
              required: ['email', 'password'],
              properties: {
                email: {
                  type: 'string',
                  format: 'email',
                  example: 'user@finnexusai.com',
                  description: 'User email address'
                },
                password: {
                  type: 'string',
                  format: 'password',
                  example: 'SecurePassword123!',
                  description: 'User password'
                },
                rememberMe: {
                  type: 'boolean',
                  example: false,
                  description: 'Remember user session'
                }
              }
            },
            examples: {
              standard: {
                summary: 'Standard Login',
                value: {
                  email: 'user@finnexusai.com',
                  password: 'SecurePassword123!',
                  rememberMe: false
                }
              },
              remember: {
                summary: 'Login with Remember Me',
                value: {
                  email: 'user@finnexusai.com',
                  password: 'SecurePassword123!',
                  rememberMe: true
                }
              }
            }
          }
        }
      },
      responses: {
        200: {
          description: 'Login successful',
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  success: { type: 'boolean', example: true },
                  data: {
                    type: 'object',
                    properties: {
                      token: {
                        type: 'string',
                        example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
                        description: 'JWT access token'
                      },
                      refreshToken: {
                        type: 'string',
                        example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
                        description: 'JWT refresh token'
                      },
                      user: {
                        $ref: '#/components/schemas/User'
                      },
                      expiresIn: {
                        type: 'integer',
                        example: 3600,
                        description: 'Token expiration time in seconds'
                      }
                    }
                  },
                  message: {
                    type: 'string',
                    example: 'Login successful'
                  }
                }
              }
            }
          }
        },
        401: {
          $ref: '#/components/responses/UnauthorizedError'
        },
        429: {
          $ref: '#/components/responses/RateLimitError'
        }
      },
      security: []
    }
  },
  '/api/auth/register': {
    post: {
      tags: ['Authentication'],
      summary: 'User Registration',
      description: 'Register a new user account',
      requestBody: {
        required: true,
        content: {
          'application/json': {
            schema: {
              type: 'object',
              required: ['email', 'password', 'firstName', 'lastName'],
              properties: {
                email: {
                  type: 'string',
                  format: 'email',
                  example: 'newuser@finnexusai.com',
                  description: 'User email address'
                },
                password: {
                  type: 'string',
                  format: 'password',
                  example: 'SecurePassword123!',
                  description: 'User password (minimum 8 characters)'
                },
                firstName: {
                  type: 'string',
                  example: 'John',
                  description: 'User first name'
                },
                lastName: {
                  type: 'string',
                  example: 'Doe',
                  description: 'User last name'
                },
                agreeTerms: {
                  type: 'boolean',
                  example: true,
                  description: 'Agreement to terms of service'
                },
                agreePrivacy: {
                  type: 'boolean',
                  example: true,
                  description: 'Agreement to privacy policy'
                },
                marketingConsent: {
                  type: 'boolean',
                  example: false,
                  description: 'Marketing communications consent'
                }
              }
            }
          }
        }
      },
      responses: {
        201: {
          description: 'Registration successful',
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  success: { type: 'boolean', example: true },
                  data: {
                    type: 'object',
                    properties: {
                      user: {
                        $ref: '#/components/schemas/User'
                      },
                      verificationRequired: {
                        type: 'boolean',
                        example: true,
                        description: 'Email verification required'
                      }
                    }
                  },
                  message: {
                    type: 'string',
                    example: 'Registration successful. Please verify your email.'
                  }
                }
              }
            }
          }
        },
        400: {
          $ref: '#/components/responses/ValidationError'
        },
        409: {
          description: 'Email already exists',
          content: {
            'application/json': {
              schema: {
                $ref: '#/components/schemas/Error'
              },
              example: {
                success: false,
                error: {
                  code: 'EMAIL_EXISTS',
                  message: 'Email address already registered',
                  details: 'Please use a different email address or try logging in'
                }
              }
            }
          }
        }
      },
      security: []
    }
  },
  '/api/auth/verify-email': {
    post: {
      tags: ['Authentication'],
      summary: 'Verify Email Address',
      description: 'Verify user email address with verification token',
      requestBody: {
        required: true,
        content: {
          'application/json': {
            schema: {
              type: 'object',
              required: ['token'],
              properties: {
                token: {
                  type: 'string',
                  example: 'abc123def456ghi789',
                  description: 'Email verification token'
                }
              }
            }
          }
        }
      },
      responses: {
        200: {
          description: 'Email verification successful',
          content: {
            'application/json': {
              schema: {
                $ref: '#/components/schemas/SuccessResponse'
              }
            }
          }
        },
        400: {
          description: 'Invalid or expired token',
          content: {
            'application/json': {
              schema: {
                $ref: '#/components/schemas/Error'
              },
              example: {
                success: false,
                error: {
                  code: 'INVALID_TOKEN',
                  message: 'Invalid or expired verification token',
                  details: 'Please request a new verification email'
                }
              }
            }
          }
        }
      },
      security: []
    }
  },
  '/api/auth/forgot-password': {
    post: {
      tags: ['Authentication'],
      summary: 'Forgot Password',
      description: 'Send password reset email to user',
      requestBody: {
        required: true,
        content: {
          'application/json': {
            schema: {
              type: 'object',
              required: ['email'],
              properties: {
                email: {
                  type: 'string',
                  format: 'email',
                  example: 'user@finnexusai.com',
                  description: 'User email address'
                }
              }
            }
          }
        }
      },
      responses: {
        200: {
          description: 'Password reset email sent',
          content: {
            'application/json': {
              schema: {
                $ref: '#/components/schemas/SuccessResponse'
              }
            }
          }
        },
        404: {
          description: 'Email not found',
          content: {
            'application/json': {
              schema: {
                $ref: '#/components/schemas/Error'
              },
              example: {
                success: false,
                error: {
                  code: 'EMAIL_NOT_FOUND',
                  message: 'Email address not found',
                  details: 'Please check your email address and try again'
                }
              }
            }
          }
        }
      },
      security: []
    }
  },
  '/api/auth/reset-password': {
    post: {
      tags: ['Authentication'],
      summary: 'Reset Password',
      description: 'Reset user password with reset token',
      requestBody: {
        required: true,
        content: {
          'application/json': {
            schema: {
              type: 'object',
              required: ['token', 'newPassword'],
              properties: {
                token: {
                  type: 'string',
                  example: 'abc123def456ghi789',
                  description: 'Password reset token'
                },
                newPassword: {
                  type: 'string',
                  format: 'password',
                  example: 'NewSecurePassword123!',
                  description: 'New password'
                }
              }
            }
          }
        }
      },
      responses: {
        200: {
          description: 'Password reset successful',
          content: {
            'application/json': {
              schema: {
                $ref: '#/components/schemas/SuccessResponse'
              }
            }
          }
        },
        400: {
          description: 'Invalid token or weak password',
          content: {
            'application/json': {
              schema: {
                $ref: '#/components/schemas/Error'
              }
            }
          }
        }
      },
      security: []
    }
  },
  '/api/auth/refresh': {
    post: {
      tags: ['Authentication'],
      summary: 'Refresh Access Token',
      description: 'Refresh JWT access token using refresh token',
      requestBody: {
        required: true,
        content: {
          'application/json': {
            schema: {
              type: 'object',
              required: ['refreshToken'],
              properties: {
                refreshToken: {
                  type: 'string',
                  example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
                  description: 'JWT refresh token'
                }
              }
            }
          }
        }
      },
      responses: {
        200: {
          description: 'Token refresh successful',
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  success: { type: 'boolean', example: true },
                  data: {
                    type: 'object',
                    properties: {
                      token: {
                        type: 'string',
                        example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
                        description: 'New JWT access token'
                      },
                      expiresIn: {
                        type: 'integer',
                        example: 3600,
                        description: 'Token expiration time in seconds'
                      }
                    }
                  }
                }
              }
            }
          }
        },
        401: {
          description: 'Invalid refresh token',
          content: {
            'application/json': {
              schema: {
                $ref: '#/components/schemas/Error'
              },
              example: {
                success: false,
                error: {
                  code: 'INVALID_REFRESH_TOKEN',
                  message: 'Invalid or expired refresh token',
                  details: 'Please log in again'
                }
              }
            }
          }
        }
      },
      security: []
    }
  },
  '/api/auth/logout': {
    post: {
      tags: ['Authentication'],
      summary: 'User Logout',
      description: 'Logout user and invalidate tokens',
      responses: {
        200: {
          description: 'Logout successful',
          content: {
            'application/json': {
              schema: {
                $ref: '#/components/schemas/SuccessResponse'
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
  '/api/auth/me': {
    get: {
      tags: ['Authentication'],
      summary: 'Get Current User',
      description: 'Get current authenticated user information',
      responses: {
        200: {
          description: 'User information retrieved successfully',
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  success: { type: 'boolean', example: true },
                  data: {
                    $ref: '#/components/schemas/User'
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
  }
};
