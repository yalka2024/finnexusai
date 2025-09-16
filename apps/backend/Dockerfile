# Dockerfile for FinAI Nexus Backend (Node.js)
FROM node:18-alpine

# Set working directory
WORKDIR /app

# Copy package files and install dependencies
COPY package*.json ./
RUN npm install --production

# Copy backend source code
COPY . ./

# Expose backend port (adjust if needed)
EXPOSE 3001

# Start the backend server
CMD ["npm", "start"]
