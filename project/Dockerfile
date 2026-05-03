# Build stage
FROM node:20-alpine as builder

RUN corepack enable && corepack prepare pnpm@latest --activate

RUN apk add --no-cache chromium \
    && export CHROME_PATH=/usr/bin/chromium-browser

WORKDIR /app

# Accept build arguments
ARG VITE_SUPABASE_URL
ARG VITE_SUPABASE_ANON_KEY
ARG VITE_SATELLITE_SERVICE_URL
ARG VITE_SATELLITE_PROVIDER
ARG VITE_API_URL
ARG VITE_POLAR_ACCESS_TOKEN
ARG VITE_POLAR_ORGANIZATION_ID
ARG VITE_POLAR_SERVER
ARG VITE_POLAR_CHECKOUT_URL
ARG VITE_POLAR_ESSENTIAL_PRODUCT_ID
ARG VITE_POLAR_PROFESSIONAL_PRODUCT_ID
ARG VITE_POLAR_ENTERPRISE_PRODUCT_ID
ARG VITE_APP_URL
ARG VITE_MARKETPLACE_URL

# Set environment variables for the build
ENV VITE_SUPABASE_URL=$VITE_SUPABASE_URL
ENV VITE_SUPABASE_ANON_KEY=$VITE_SUPABASE_ANON_KEY
ENV VITE_SATELLITE_SERVICE_URL=$VITE_SATELLITE_SERVICE_URL
ENV VITE_SATELLITE_PROVIDER=$VITE_SATELLITE_PROVIDER
ENV VITE_API_URL=$VITE_API_URL
ENV VITE_POLAR_ACCESS_TOKEN=$VITE_POLAR_ACCESS_TOKEN
ENV VITE_POLAR_ORGANIZATION_ID=$VITE_POLAR_ORGANIZATION_ID
ENV VITE_POLAR_SERVER=$VITE_POLAR_SERVER
ENV VITE_POLAR_CHECKOUT_URL=$VITE_POLAR_CHECKOUT_URL
ENV VITE_POLAR_ESSENTIAL_PRODUCT_ID=$VITE_POLAR_ESSENTIAL_PRODUCT_ID
ENV VITE_POLAR_PROFESSIONAL_PRODUCT_ID=$VITE_POLAR_PROFESSIONAL_PRODUCT_ID
ENV VITE_POLAR_ENTERPRISE_PRODUCT_ID=$VITE_POLAR_ENTERPRISE_PRODUCT_ID
ENV VITE_APP_URL=$VITE_APP_URL
ENV VITE_MARKETPLACE_URL=$VITE_MARKETPLACE_URL

# Prevent Playwright from downloading browsers during install to keep builds fast
ENV PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD=1
ENV PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true
ENV CHROMIUM_PATH=/usr/bin/chromium-browser

# Copy package files
COPY package.json ./

# Install dependencies
RUN pnpm install

# Copy all project files
COPY . .

# Build the application
ENV NODE_OPTIONS="--max-old-space-size=4096"
RUN pnpm build

# Production stage
FROM nginx:alpine

RUN apk add --no-cache gettext

# Copy built files from builder stage
COPY --from=builder /app/dist /usr/share/nginx/html

# Nginx config: www → canonical apex (301), SPA + API proxy (from template at container start)
COPY docker/nginx-default.conf.template /etc/nginx/templates/default.conf.template
COPY docker/docker-entrypoint-frontend.sh /docker-entrypoint-frontend.sh
RUN chmod +x /docker-entrypoint-frontend.sh

# Expose port 80
EXPOSE 80

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
    CMD wget --no-verbose --tries=1 --spider http://localhost/ || exit 1

# CANONICAL_PUBLIC_HOST must match DASHBOARD_PUBLIC_HOST in docker-compose (e.g. agrogina.com)
ENTRYPOINT ["/docker-entrypoint-frontend.sh"]