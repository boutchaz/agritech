# Build stage
FROM node:20-alpine as builder

WORKDIR /app

# Accept build arguments
ARG VITE_SUPABASE_URL
ARG VITE_SUPABASE_ANON_KEY
ARG VITE_SATELLITE_SERVICE_URL
ARG VITE_POLAR_ACCESS_TOKEN
ARG VITE_POLAR_ORGANIZATION_ID
ARG VITE_POLAR_SERVER
ARG VITE_POLAR_CHECKOUT_URL
ARG VITE_POLAR_ESSENTIAL_PRODUCT_ID
ARG VITE_POLAR_PROFESSIONAL_PRODUCT_ID
ARG VITE_POLAR_ENTERPRISE_PRODUCT_ID
ARG VITE_APP_URL

# Set environment variables for the build
ENV VITE_SUPABASE_URL=$VITE_SUPABASE_URL
ENV VITE_SUPABASE_ANON_KEY=$VITE_SUPABASE_ANON_KEY
ENV VITE_SATELLITE_SERVICE_URL=$VITE_SATELLITE_SERVICE_URL
ENV VITE_POLAR_ACCESS_TOKEN=$VITE_POLAR_ACCESS_TOKEN
ENV VITE_POLAR_ORGANIZATION_ID=$VITE_POLAR_ORGANIZATION_ID
ENV VITE_POLAR_SERVER=$VITE_POLAR_SERVER
ENV VITE_POLAR_CHECKOUT_URL=$VITE_POLAR_CHECKOUT_URL
ENV VITE_POLAR_ESSENTIAL_PRODUCT_ID=$VITE_POLAR_ESSENTIAL_PRODUCT_ID
ENV VITE_POLAR_PROFESSIONAL_PRODUCT_ID=$VITE_POLAR_PROFESSIONAL_PRODUCT_ID
ENV VITE_POLAR_ENTERPRISE_PRODUCT_ID=$VITE_POLAR_ENTERPRISE_PRODUCT_ID
ENV VITE_APP_URL=$VITE_APP_URL

# Copy package files
COPY package*.json ./
COPY yarn.lock ./

# Install dependencies
RUN yarn install

# Copy all project files
COPY . .

# Build the application
RUN yarn build

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
    
    # Enable gzip compression
    gzip on;
    gzip_vary on;
    gzip_min_length 256;
    gzip_proxied any;
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
    
    # React Router support - redirect all requests to index.html
    location / {
        try_files \$uri \$uri/ /index.html;
    }
    
    # Cache static assets
    location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2|ttf|eot)$ {
        expires 1y;
        add_header Cache-Control "public, immutable";
    }
    
    # Security headers
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;
}
EOF

# Expose port 80
EXPOSE 80

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
    CMD wget --no-verbose --tries=1 --spider http://localhost/ || exit 1

# Start nginx
CMD ["nginx", "-g", "daemon off;"]