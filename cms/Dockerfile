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

# Set working directory
WORKDIR /srv/app

# Copy package files
COPY package*.json ./

# Install ALL dependencies (including dev dependencies for build)
RUN npm install

# Copy app files
COPY . .

# Build admin panel
ENV NODE_ENV=production
RUN npm run build

# Production stage
FROM node:20-alpine

# Install runtime dependencies for vips
RUN apk update && apk add --no-cache \
    vips

# Set working directory
WORKDIR /srv/app

# Copy package files
COPY package*.json ./

# Install only production dependencies + TypeScript (needed for .ts config files)
RUN npm install --only=production && \
    npm install typescript @types/node

# Copy built app from builder
COPY --from=builder /srv/app/dist ./dist
COPY --from=builder /srv/app/.cache ./.cache
COPY --from=builder /srv/app/public ./public
COPY --from=builder /srv/app/database ./database

# Copy source files (Strapi needs these at runtime)
COPY --from=builder /srv/app/config ./config
COPY --from=builder /srv/app/src ./src
COPY --from=builder /srv/app/tsconfig.json ./tsconfig.json

# Expose port
EXPOSE 1337

# Start Strapi
CMD ["npm", "start"]
