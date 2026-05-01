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

# Copy built files from builder stage
COPY --from=builder /app/dist /usr/share/nginx/html

# Add custom nginx configuration for React Router
RUN cat > /etc/nginx/conf.d/default.conf <<EOF
server {
    listen 80;
    listen [::]:80;
    server_name localhost;
    
    root /usr/share/nginx/html;
    index index.html;
    
    # Serve pre-compressed .gz files (built by vite-plugin-compression2)
    # This avoids CPU overhead — nginx serves static .gz files directly
    gzip_static on;
    
    # Fallback: on-the-fly gzip for files without .gz pre-built
    gzip on;
    gzip_vary on;
    gzip_min_length 256;
    gzip_proxied any;
    gzip_comp_level 4;
    gzip_types
        text/plain
        text/css
        text/javascript
        application/javascript
        application/x-javascript
        application/json
        application/ld+json
        application/xml
        application/rss+xml
        application/atom+xml
        image/svg+xml
        font/truetype
        font/opentype
        font/woff
        font/woff2;
    
    # Blog SSR routes - proxy to NestJS backend
    location /blog {
        proxy_pass http://agritech-api:3001/blog;
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_read_timeout 30s;
    }

    # Sitemap and RSS - proxy to NestJS backend
    location = /sitemap.xml {
        proxy_pass http://agritech-api:3001/sitemap.xml;
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
    }

    location = /rss.xml {
        proxy_pass http://agritech-api:3001/rss.xml;
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
    }

    # Service Worker files — NEVER cache (critical for PWA updates)
    location ~ ^/(sw\.js|workbox-.*\.js)$ {
        expires -1;
        add_header Cache-Control "no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0" always;
        add_header X-Content-Type-Options "nosniff" always;
    }

    # Web manifest — short cache for fast PWA install checks
    location = /site.webmanifest {
        expires 1h;
        add_header Cache-Control "public, max-age=3600";
        add_header X-Content-Type-Options "nosniff" always;
    }

    # React Router support - redirect all requests to index.html
    location / {
        try_files \$uri \$uri/ /index.html;
    }
    
    # Cache static assets with immutable (hashed filenames from Vite)
    location /assets/ {
        expires 1y;
        add_header Cache-Control "public, immutable";
        
        # Security headers (must repeat in location blocks)
        add_header X-Frame-Options "SAMEORIGIN" always;
        add_header X-Content-Type-Options "nosniff" always;
    }
    
    # Cache other static files (images, fonts, etc.)
    location ~* \.(png|jpg|jpeg|gif|ico|svg|woff|woff2|ttf|eot)$ {
        expires 1y;
        add_header Cache-Control "public, immutable";
    }
    
    # Security headers
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header Referrer-Policy "strict-origin-when-cross-origin" always;
}
EOF

# Expose port 80
EXPOSE 80

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
    CMD wget --no-verbose --tries=1 --spider http://localhost/ || exit 1

# Start nginx
CMD ["nginx", "-g", "daemon off;"]