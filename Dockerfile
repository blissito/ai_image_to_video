# syntax = docker/dockerfile:1

# Adjust NODE_VERSION as desired
ARG NODE_VERSION=22.16.0
FROM node:${NODE_VERSION}-slim AS builder

# Install build dependencies
RUN apt-get update -qq && \
    apt-get install --no-install-recommends -y build-essential python3 make g++

WORKDIR /app

# Copy package files first for better caching
COPY package*.json ./
COPY tsconfig.json ./

# Install all dependencies including devDependencies
RUN npm ci

# Copy source files
COPY src/ ./src/

# Build the application
RUN npm run build

# Verify the build output
RUN ls -la dist/

# Production image
FROM node:${NODE_VERSION}-slim

WORKDIR /app

# Set production environment
ENV NODE_ENV=production

# Copy package files
COPY package*.json ./

# Install only production dependencies
RUN npm ci --only=production

# Copy built files from builder
COPY --from=builder /app/dist ./dist

# Copy other necessary files
COPY public/ ./public/
COPY src/templates/ ./dist/templates/
COPY .env* ./
COPY data/ ./data/

# Create necessary directories
RUN mkdir -p uploads output temp

# Verify the final file structure
RUN ls -la /app/dist/

# Expose the port the app runs on
EXPOSE 3000

# Start the application
CMD ["node", "dist/index.js"]
