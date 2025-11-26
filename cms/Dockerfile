FROM node:20-alpine

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

# Install dependencies
# Use npm install instead of npm ci to handle lock file mismatches
RUN npm install --only=production

# Copy app files
COPY . .

# Build admin panel
ENV NODE_ENV=production
RUN npm run build

# Expose port
EXPOSE 1337

# Start Strapi
CMD ["npm", "start"]
