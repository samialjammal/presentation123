# Use Node.js 18 Alpine for smaller image size
FROM node:18-alpine

# Set working directory
WORKDIR /app

# Copy package files
COPY package*.json ./
COPY client/package*.json ./client/

# Install dependencies
RUN npm run install:all

# Copy source code
COPY . .

# Build the React app
RUN npm run build

# Expose port
EXPOSE 3001

# Start the application
CMD ["npm", "start"]
