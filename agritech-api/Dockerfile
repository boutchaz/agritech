# Build stage
FROM node:20-alpine AS builder

RUN corepack enable && corepack prepare npm@latest --activate

WORKDIR /app

# Copy package files
COPY package.json package-lock.json ./

# Install dependencies
RUN npm ci

# Copy source code
COPY . .

# Build application
RUN npm run build

# Production stage
FROM node:20-alpine AS production

RUN corepack enable && corepack prepare npm@latest --activate

WORKDIR /app

# Copy package files
COPY package.json package-lock.json ./

# Install only production dependencies
RUN npm ci --only=production

# Copy built application from builder
COPY --from=builder /app/dist ./dist

# Copy email templates
COPY --from=builder /app/src/modules/email/templates ./dist/modules/email/templates

# Create non-root user
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nestjs -u 1001

# Change ownership
RUN chown -R nestjs:nodejs /app

# Switch to non-root user
USER nestjs

# Expose port
EXPOSE 3001

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD node -e "require('http').get('http://localhost:3001/health', (r) => {process.exit(r.statusCode === 200 ? 0 : 1)})"

# Start application
CMD ["node", "dist/main"]
