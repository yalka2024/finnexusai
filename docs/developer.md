# Developer Guide

## Monorepo Structure
- `/apps/web`: Next.js frontend
- `/apps/mobile`: React Native mobile app
- `/apps/backend`: Node.js/GraphQL backend
- `/apps/ai`: AI models and pipelines
- `/apps/contracts`: Smart contracts
- `/libs/ui`: Design system
- `/libs/utils`: Shared utilities
- `/docs`: Documentation
- `/scripts`: CI/CD, deployment

## Local Development
- Use Docker Compose for local services
- Run `npm install` and `npm run dev` in each app folder
- Use Postman collection in `/docs` for API testing

## Testing
- Web: Jest, React Testing Library
- Backend: Jest, Supertest
- Smart Contracts: Hardhat/Foundry
- Mobile: Jest, Detox

## Deployment
- CI/CD via GitHub Actions
- AWS/EKS/ECS for cloud deployment
- Automated tests required for production

## Contribution
- Fork, branch, and submit PRs
- Follow code style and commit guidelines
- See `/docs/api.md` and `/docs/deployment.md` for integration
