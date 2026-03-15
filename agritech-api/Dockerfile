# Build stage
FROM node:20-alpine AS builder

WORKDIR /app

# Copy only the API package files (not workspace files to avoid workspace context)
COPY agritech-api/package.json ./

# Install all dependencies
RUN npm install

# Copy shared libs (required for prompts imports)
COPY libs/ ./libs/

# Copy source code
COPY agritech-api/ ./

# Build application
RUN npm run build

# Production stage
FROM node:20-alpine AS production

WORKDIR /app

# Copy only the API package files
COPY agritech-api/package.json ./

# Install production dependencies (includes all transitive dependencies)
RUN npm install --production

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
  CMD node -e "require('http').get('http://localhost:3001/api/v1/health', (r) => {process.exit(r.statusCode === 200 ? 0 : 1)})"

# Start application
CMD ["node", "dist/main"]
