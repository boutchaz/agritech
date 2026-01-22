# Build stage
FROM node:20-alpine AS builder

# Install dependencies for building native modules
RUN apk update && apk add --no-cache \
    build-base \
    gcc \
    autoconf \
    automake \
    zlib-dev \
    libpng-dev \
    vips-dev \
    git

RUN corepack enable && corepack prepare pnpm@latest --activate

# Set working directory
WORKDIR /srv/app

# Copy package files
COPY package.json pnpm-lock.yaml* ./

# Install ALL dependencies (including dev dependencies for build)
RUN pnpm install --frozen-lockfile

# Copy app files
COPY . .

# Build admin panel
ENV NODE_ENV=production
RUN pnpm build

# Production stage
FROM node:20-alpine

# Install runtime dependencies for vips
RUN apk update && apk add --no-cache \
    vips

RUN corepack enable && corepack prepare pnpm@latest --activate

# Set working directory
WORKDIR /srv/app

# Copy package files
COPY package.json pnpm-lock.yaml* ./

# Install only production dependencies + TypeScript (needed for .ts config files)
RUN pnpm install --frozen-lockfile --prod && \
    pnpm add typescript @types/node

# Copy built app from builder
COPY --from=builder /srv/app/dist ./dist
COPY --from=builder /srv/app/public ./public
COPY --from=builder /srv/app/database ./database

# Copy source files (Strapi needs these at runtime)
COPY --from=builder /srv/app/config ./config
COPY --from=builder /srv/app/src ./src
COPY --from=builder /srv/app/tsconfig.json ./tsconfig.json

# Create necessary runtime directories
RUN mkdir -p .strapi .tmp

# Expose port
EXPOSE 1337

# Start Strapi
CMD ["pnpm", "start"]
