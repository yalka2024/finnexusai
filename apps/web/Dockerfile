# Dockerfile for FinAI Nexus Frontend (Next.js)
FROM node:18-alpine

# Set working directory
WORKDIR /app

# Copy package files and install dependencies
COPY package*.json ./
RUN npm install

# Copy frontend source code
COPY . ./

# Build the Next.js app
RUN npm run build

# Expose frontend port (adjust if needed)
EXPOSE 3000

# Start the frontend server
CMD ["npm", "start"]
