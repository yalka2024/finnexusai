# FinNexusAI Backend

Enterprise-grade backend API for the FinNexusAI platform, providing comprehensive financial services including trading, portfolio management, AI-powered analytics, and blockchain integration.

## 🚀 Features

### Core Functionality
- **Authentication & Authorization**: JWT-based auth with RBAC, 2FA support
- **Trading Engine**: Multi-asset trading with real-time execution
- **Portfolio Management**: Advanced portfolio analytics and optimization
- **AI Analytics**: Machine learning-powered market analysis and predictions
- **Blockchain Integration**: Multi-chain DeFi and tokenization support
- **Compliance**: GDPR, PCI-DSS, SOX compliance automation

### Security & Monitoring
- **Comprehensive Security**: Rate limiting, input validation, audit logging
- **Real-time Monitoring**: Prometheus metrics, Grafana dashboards
- **Error Tracking**: Sentry integration with detailed error reporting
- **Performance Monitoring**: APM with distributed tracing

### Infrastructure
- **Multi-Database**: PostgreSQL, MongoDB, Redis integration
- **Docker Ready**: Production-ready containerization
- **CI/CD Pipeline**: Automated testing, security scanning, deployment
- **Environment Management**: Development, staging, production configs

## 📋 Prerequisites

- Node.js 18+ 
- PostgreSQL 15+
- MongoDB 6.0+
- Redis 7+
- Docker & Docker Compose (optional)

## 🛠️ Installation

### Local Development Setup

1. **Clone the repository**
```bash
git clone https://github.com/finnexusai/finnexusai-backend.git
cd finnexusai-backend
```

2. **Install dependencies**
```bash
npm install
```

3. **Set up environment variables**
```bash
cp .env.example .env
# Edit .env with your configuration
```

4. **Set up databases**
```bash
# Start PostgreSQL, MongoDB, and Redis
# Create databases: finnexusai_dev, finnexusai_test
```

5. **Run database migrations**
```bash
npm run migrate
```

6. **Seed the database**
```bash
npm run seed
```

7. **Start the development server**
```bash
npm run dev
```

### Docker Setup

1. **Build and start all services**
```bash
docker-compose -f docker-compose.production.yml up -d
```

2. **Run migrations**
```bash
docker-compose exec backend npm run migrate
```

3. **Seed the database**
```bash
docker-compose exec backend npm run seed
```

## 🔧 Configuration

### Environment Variables

Create a `.env` file with the following variables:

```env
# Application
NODE_ENV=development
PORT=4000

# Database
POSTGRES_HOST=localhost
POSTGRES_PORT=5432
POSTGRES_DB=finnexusai_dev
POSTGRES_USER=postgres
POSTGRES_PASSWORD=your_password

MONGODB_URI=mongodb://localhost:27017/finnexusai_dev

REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=your_redis_password

# Authentication
JWT_SECRET=your_super_secure_jwt_secret
JWT_REFRESH_SECRET=your_super_secure_refresh_secret

# External APIs
MARKET_DATA_API_KEY=your_market_data_api_key
SENDGRID_API_KEY=your_sendgrid_api_key
TWILIO_ACCOUNT_SID=your_twilio_account_sid
TWILIO_AUTH_TOKEN=your_twilio_auth_token

# Monitoring
SENTRY_DSN=your_sentry_dsn
DATADOG_API_KEY=your_datadog_api_key

# Security
ADMIN_EMAIL=admin@finnexusai.com
ADMIN_PASSWORD=Admin123!@#
```

### Environment-Specific Configs

- **Development**: `config/environments/development.js`
- **Staging**: `config/environments/staging.js`
- **Production**: `config/environments/production.js`

## 📊 API Documentation

### Base URL
- Development: `http://localhost:4000`
- Production: `https://api.finnexusai.com`

### Authentication
All protected endpoints require a JWT token in the Authorization header:
```
Authorization: Bearer <your_jwt_token>
```

### Key Endpoints

#### Authentication
- `POST /api/v1/auth/login` - User login
- `POST /api/v1/auth/register` - User registration
- `POST /api/v1/auth/refresh` - Refresh token
- `POST /api/v1/auth/logout` - User logout

#### Trading
- `POST /api/v1/trade` - Execute trade
- `GET /api/v1/trades` - Get user trades
- `GET /api/v1/orders` - Get open orders
- `DELETE /api/v1/orders/:id` - Cancel order

#### Portfolio
- `GET /api/v1/portfolio/:userId` - Get portfolio
- `POST /api/v1/portfolio` - Create portfolio
- `PUT /api/v1/portfolio/:id` - Update portfolio
- `DELETE /api/v1/portfolio/:id` - Delete portfolio

#### Analytics
- `GET /api/v1/analytics/market` - Market analytics
- `GET /api/v1/analytics/portfolio/:id` - Portfolio analytics
- `GET /api/v1/analytics/predictions` - AI predictions

### GraphQL
GraphQL endpoint available at `/graphql` with playground at `/graphql-playground` (development only).

## 🧪 Testing

### Run All Tests
```bash
npm test
```

### Run Specific Test Suites
```bash
npm run test:unit          # Unit tests
npm run test:integration   # Integration tests
npm run test:e2e          # End-to-end tests
npm run test:security     # Security tests
npm run test:performance  # Performance tests
```

### Test Coverage
```bash
npm run test:coverage
```

## 🚀 Deployment

### Production Deployment

1. **Build Docker image**
```bash
docker build -t finnexusai/backend:latest .
```

2. **Deploy with Docker Compose**
```bash
docker-compose -f docker-compose.production.yml up -d
```

3. **Run migrations**
```bash
docker-compose exec backend npm run migrate
```

### Kubernetes Deployment

1. **Apply Kubernetes manifests**
```bash
kubectl apply -f k8s/
```

2. **Check deployment status**
```bash
kubectl get pods -n finnexusai
```

### CI/CD Pipeline

The project includes GitHub Actions workflows for:
- Code quality checks (ESLint, Prettier, SonarCloud)
- Security scanning (Snyk, Trivy, OWASP ZAP)
- Automated testing (unit, integration, e2e)
- Performance testing
- Docker image building and pushing
- Automated deployment to staging/production

## 📈 Monitoring

### Health Checks
- Health endpoint: `GET /api/v1/health`
- Metrics endpoint: `GET /metrics`

### Prometheus Metrics
Available at `http://localhost:9090/metrics` (if Prometheus is running)

### Grafana Dashboards
Access Grafana at `http://localhost:3000` (if Grafana is running)

### Logging
- Application logs: `logs/`
- Structured logging with correlation IDs
- Log aggregation with ELK stack

## 🔒 Security

### Security Features
- JWT authentication with refresh tokens
- Role-based access control (RBAC)
- Rate limiting and DDoS protection
- Input validation and sanitization
- SQL injection prevention
- XSS protection
- CSRF protection
- Audit logging for compliance

### Security Best Practices
- All passwords are hashed with bcrypt (12 rounds)
- JWT secrets are environment-specific
- Database connections use SSL in production
- Sensitive data is encrypted at rest
- Regular security audits and penetration testing

## 📚 Development

### Code Structure
```
src/
├── config/           # Configuration files
├── controllers/      # Route controllers
├── middleware/       # Express middleware
├── models/          # Database models
├── routes/          # API routes
├── services/        # Business logic
├── utils/           # Utility functions
├── tests/           # Test files
└── validation/      # Input validation schemas
```

### Adding New Features

1. **Create feature branch**
```bash
git checkout -b feature/new-feature
```

2. **Implement feature**
   - Add routes in `src/routes/`
   - Add controllers in `src/controllers/`
   - Add services in `src/services/`
   - Add validation schemas in `src/validation/`

3. **Write tests**
```bash
npm run test:unit -- --grep "new feature"
```

4. **Update documentation**
   - Update API documentation
   - Update README if needed

5. **Submit pull request**

### Database Migrations

1. **Create new migration**
```bash
npm run migrate:create "add_new_table"
```

2. **Edit migration file**
```bash
# Edit src/database/migrations/XXX_add_new_table.sql
```

3. **Run migration**
```bash
npm run migrate
```

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests for new functionality
5. Ensure all tests pass
6. Submit a pull request

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🆘 Support

- **Documentation**: [docs.finnexusai.com](https://docs.finnexusai.com)
- **Issues**: [GitHub Issues](https://github.com/finnexusai/finnexusai-backend/issues)
- **Discord**: [FinNexusAI Discord](https://discord.gg/finnexusai)
- **Email**: support@finnexusai.com

## 🏗️ Architecture

### High-Level Architecture
```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Frontend      │    │   Load Balancer │    │   Backend API   │
│   (React/Next)  │◄──►│   (Nginx)       │◄──►│   (Node.js)     │
└─────────────────┘    └─────────────────┘    └─────────────────┘
                                                        │
                       ┌─────────────────┐             │
                       │   PostgreSQL    │◄────────────┤
                       │   (Primary DB)  │             │
                       └─────────────────┘             │
                                                        │
                       ┌─────────────────┐             │
                       │   MongoDB       │◄────────────┤
                       │   (Documents)   │             │
                       └─────────────────┘             │
                                                        │
                       ┌─────────────────┐             │
                       │   Redis         │◄────────────┘
                       │   (Cache)       │
                       └─────────────────┘
```

### Technology Stack
- **Runtime**: Node.js 18+
- **Framework**: Express.js
- **GraphQL**: Apollo Server
- **Database**: PostgreSQL, MongoDB, Redis
- **Authentication**: JWT with bcrypt
- **Monitoring**: Prometheus, Grafana, Sentry
- **Testing**: Jest, Supertest
- **Containerization**: Docker, Docker Compose
- **CI/CD**: GitHub Actions
- **Documentation**: Swagger/OpenAPI

---

**Built with ❤️ by the FinNexusAI Team**
