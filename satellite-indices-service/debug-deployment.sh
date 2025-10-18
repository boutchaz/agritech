#!/bin/bash

echo "=== Dokploy/Traefik Debugging Script ==="
echo ""

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${YELLOW}1. Checking Docker Networks:${NC}"
docker network ls | grep -E "dokploy|traefik"
echo ""

echo -e "${YELLOW}2. Checking if container is running:${NC}"
docker ps | grep satellite-indices-service
echo ""

echo -e "${YELLOW}3. Checking container logs (last 20 lines):${NC}"
docker logs satellite-indices-service --tail 20 2>&1
echo ""

echo -e "${YELLOW}4. Testing internal health endpoint:${NC}"
docker exec satellite-indices-service curl -s http://localhost:8000/api/health || echo "Health check failed"
echo ""

echo -e "${YELLOW}5. Checking Traefik labels on container:${NC}"
docker inspect satellite-indices-service | grep -A 50 "Labels" | grep "traefik"
echo ""

echo -e "${YELLOW}6. Testing HTTP connection (should redirect):${NC}"
curl -I http://agritech-sattelite-mwlyas-415549-5-75-154-125.traefik.me 2>&1 | head -10
echo ""

echo -e "${YELLOW}7. Testing HTTPS connection:${NC}"
curl -I https://agritech-sattelite-mwlyas-415549-5-75-154-125.traefik.me/api/health 2>&1 | head -10
echo ""

echo -e "${YELLOW}8. Checking DNS resolution:${NC}"
nslookup agritech-sattelite-mwlyas-415549-5-75-154-125.traefik.me
echo ""

echo -e "${YELLOW}9. Checking if Traefik container exists:${NC}"
docker ps | grep -E "traefik|proxy"
echo ""

echo -e "${YELLOW}10. Network connectivity test:${NC}"
docker exec satellite-indices-service ping -c 2 google.com || echo "Network connectivity issue"
echo ""

echo -e "${GREEN}=== Debugging Complete ===${NC}"
echo ""
echo -e "${YELLOW}Common Issues:${NC}"
echo "1. If container is not running: docker-compose up -d"
echo "2. If network 'dokploy-network' doesn't exist: docker network create dokploy-network"
echo "3. If Traefik is not running: Check your Dokploy installation"
echo "4. If DNS doesn't resolve: Check your domain configuration"
echo "5. If health check fails internally: Check the application logs"