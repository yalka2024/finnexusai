# Build and run the frontend Docker image from project root

docker build -t finnexusai-frontend:latest -f apps/web/Dockerfile .

docker run -d -p 3000:3000 --env-file=apps/web/.env --name finnexusai-frontend finnexusai-frontend:latest
