FROM node:20-alpine AS builder

WORKDIR /app

COPY package*.json yarn.lock* ./
RUN npm ci --legacy-peer-deps

COPY . .
RUN npm run build

FROM nginx:alpine

RUN apk add --no-cache apache2-utils

COPY --from=builder /app/build /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf

ARG DOCS_USERNAME=admin
ARG DOCS_PASSWORD=changeme

RUN htpasswd -cb /etc/nginx/.htpasswd ${DOCS_USERNAME} ${DOCS_PASSWORD}

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
