# Build and run the backend Docker image from project root

docker build -t finnexusai-backend:latest -f apps/backend/Dockerfile .

docker run -d -p 3001:3001 --env-file=apps/backend/.env --name finnexusai-backend finnexusai-backend:latest
