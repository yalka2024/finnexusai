# Dockerfile
# Backend stage
FROM node:18 AS backend
WORKDIR /app
COPY apps/backend/package*.json ./
RUN npm install
COPY apps/backend .
CMD ["npm", "start"]

# Frontend stage (uncomment for frontend build)
# FROM node:18 AS frontend
# WORKDIR /app
# COPY apps/frontend/package*.json ./
# RUN npm install
# COPY apps/frontend .
# RUN npm run build
# FROM nginx:alpine
# COPY --from=frontend /app/build /usr/share/nginx/html
