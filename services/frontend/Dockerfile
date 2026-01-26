# Multi-stage build for optimized production image
FROM node:20-alpine AS builder

# Set working directory
WORKDIR /app
ARG VITE_API_URL
ARG VITE_NETWORK

ENV VITE_API_URL=$VITE_API_URL
ENV VITE_NETWORK=$VITE_NETWORK

# Copy package files
COPY package*.json ./

# Install dependencies (including devDependencies for build)
RUN npm ci --only=production=false

# Copy application source
COPY . .

# Build the application
RUN npm run build

# Production stage
FROM node:20-alpine AS production

# Install dumb-init to handle signals properly
RUN apk add --no-cache dumb-init

# Create non-root user
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nodejs -u 1001

# Set working directory
WORKDIR /app

# Copy built assets from builder stage
COPY --chown=nodejs:nodejs --from=builder /app/dist ./dist
COPY --chown=nodejs:nodejs --from=builder /app/package*.json ./

# Install only production dependencies
RUN npm ci --only=production && \
    npm cache clean --force

# Switch to non-root user
USER nodejs

# Expose port (change to your production port, typically 3000 or 8080)
EXPOSE 5173

# Use dumb-init to handle signals
ENTRYPOINT ["dumb-init", "--"]

# Serve the built application
# You'll need a serve package or use a proper web server
CMD ["npx", "serve", "-s", "dist", "-l", "5173"]