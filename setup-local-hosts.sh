#!/bin/bash

# AgriTech Local Development - Hosts File Setup
# This script adds local domain entries to /etc/hosts

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${GREEN}==================================${NC}"
echo -e "${GREEN}AgriTech Local Hosts Setup${NC}"
echo -e "${GREEN}==================================${NC}"
echo ""

# Define the hosts to add
HOSTS=(
    "127.0.0.1 traefik.local.thebzlab.online"
    "127.0.0.1 agritech.local.thebzlab.online"
    "127.0.0.1 supabase.local.thebzlab.online"
    "127.0.0.1 agritech-dashboard.local.thebzlab.online"
    "127.0.0.1 agritech-api.local.thebzlab.online"
    "127.0.0.1 cms.local.thebzlab.online"
    "127.0.0.1 satellite-api.local.thebzlab.online"
    "127.0.0.1 minio.local.thebzlab.online"
    "127.0.0.1 s3.local.thebzlab.online"
    "127.0.0.1 adminer.local.thebzlab.online"
)

# Backup the current hosts file
echo -e "${YELLOW}Creating backup of /etc/hosts...${NC}"
sudo cp /etc/hosts /etc/hosts.backup.$(date +%Y%m%d_%H%M%S)
echo -e "${GREEN}Backup created successfully${NC}"
echo ""

# Check if entries already exist
echo -e "${YELLOW}Checking existing entries...${NC}"
NEEDS_UPDATE=false

for host in "${HOSTS[@]}"; do
    if ! grep -q "$host" /etc/hosts; then
        NEEDS_UPDATE=true
        break
    fi
done

if [ "$NEEDS_UPDATE" = false ]; then
    echo -e "${GREEN}All hosts already configured!${NC}"
    exit 0
fi

# Add AgriTech section marker if not present
if ! grep -q "# AgriTech Local Development" /etc/hosts; then
    echo -e "${YELLOW}Adding AgriTech hosts entries...${NC}"

    # Add the hosts
    {
        echo ""
        echo "# AgriTech Local Development - START"
        for host in "${HOSTS[@]}"; do
            echo "$host"
        done
        echo "# AgriTech Local Development - END"
    } | sudo tee -a /etc/hosts > /dev/null

    echo -e "${GREEN}Hosts file updated successfully!${NC}"
else
    echo -e "${YELLOW}AgriTech section already exists in /etc/hosts${NC}"
    echo -e "${YELLOW}Please update manually if needed${NC}"
fi

echo ""
echo -e "${GREEN}==================================${NC}"
echo -e "${GREEN}Setup Complete!${NC}"
echo -e "${GREEN}==================================${NC}"
echo ""
echo -e "You can now access your services at:"
echo -e "  ${GREEN}Traefik Dashboard:${NC}     http://traefik.local.thebzlab.online:8080"
echo -e "  ${GREEN}Supabase Studio:${NC}       http://supabase.local.thebzlab.online"
echo -e "  ${GREEN}Supabase API:${NC}          http://agritech.local.thebzlab.online"
echo -e "  ${GREEN}AgriTech Dashboard:${NC}    http://agritech-dashboard.local.thebzlab.online"
echo -e "  ${GREEN}AgriTech API:${NC}          http://agritech-api.local.thebzlab.online"
echo -e "  ${GREEN}Strapi CMS:${NC}            http://cms.local.thebzlab.online"
echo -e "  ${GREEN}Satellite API:${NC}         http://satellite-api.local.thebzlab.online"
echo -e "  ${GREEN}MinIO Console:${NC}         http://minio.local.thebzlab.online"
echo -e "  ${GREEN}S3 API:${NC}                http://s3.local.thebzlab.online"
echo -e "  ${GREEN}Adminer:${NC}               http://adminer.local.thebzlab.online"
echo ""
echo -e "${YELLOW}Note: To remove these entries, you can restore from:${NC}"
echo -e "  /etc/hosts.backup.*"
echo ""
