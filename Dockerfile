# Multi-stage build for SportPool application

# Stage 1: Build stage
FROM node:18-alpine AS builder

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci --only=production

# Copy source code
COPY . .

# Build the application
RUN npm run build

# Stage 2: Production stage
FROM node:18-alpine AS production

# Install PM2 globally
RUN npm install -g pm2

WORKDIR /app

# Copy package.json for production dependencies
COPY package*.json ./

# Install only production dependencies
RUN npm ci --only=production && npm cache clean --force

# Copy built application from builder stage
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/client/dist ./client/dist

# Copy PM2 ecosystem file
COPY ecosystem.config.cjs ./

# Copy uploads directory structure
RUN mkdir -p uploads

# Create non-root user
RUN addgroup -g 1001 -S nodejs && \
    adduser -S sportpool -u 1001

# Change ownership of the app directory
RUN chown -R sportpool:nodejs /app

# Switch to non-root user
USER sportpool

# Expose port
EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
    CMD node -e "require('http').get('http://localhost:3000/api/health', (res) => { process.exit(res.statusCode === 200 ? 0 : 1) })"

# Start the application with PM2
CMD ["pm2-runtime", "start", "ecosystem.config.cjs"]