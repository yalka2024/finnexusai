# Dockerfile for FinAI Nexus Frontend (Next.js)
FROM node:18-alpine

# Set working directory
WORKDIR /app

# Copy package files and install dependencies
COPY apps/web/package*.json ./
RUN npm install --production

# Copy frontend source code
COPY apps/web ./

# Expose frontend port (adjust if needed)
EXPOSE 3000

# Start the frontend server
CMD ["npm", "start"]
