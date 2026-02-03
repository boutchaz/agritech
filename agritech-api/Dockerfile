# Build stage
FROM node:20-alpine AS builder

RUN corepack enable && corepack prepare pnpm@latest --activate

WORKDIR /app

# Copy only the API package files (not workspace files to avoid workspace context)
COPY agritech-api/package.json ./

# Install dependencies without frozen-lockfile since this is a single package build
RUN pnpm install

# Copy source code
COPY agritech-api/ ./

# Build application
RUN pnpm run build

# Production stage
FROM node:20-alpine AS production

RUN corepack enable && corepack prepare pnpm@latest --activate

WORKDIR /app

# Copy only the API package files
COPY agritech-api/package.json ./

# Install only production dependencies
RUN pnpm install --prod

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
