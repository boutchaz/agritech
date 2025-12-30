#!/bin/bash
# Setup Basic Auth for AgriTech Documentation
# Usage: ./setup-auth.sh [username] [password]

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
HTPASSWD_FILE="$SCRIPT_DIR/.htpasswd"

# Default credentials (override with arguments or environment variables)
USERNAME="${1:-${DOCS_USERNAME:-admin}}"
PASSWORD="${2:-${DOCS_PASSWORD:-}}"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${GREEN}=== AgriTech Docs Authentication Setup ===${NC}"
echo ""

# Check if htpasswd is available (from apache2-utils)
if ! command -v htpasswd &> /dev/null; then
    echo -e "${YELLOW}htpasswd not found. Trying alternative methods...${NC}"
    
    # Try using openssl
    if command -v openssl &> /dev/null; then
        if [ -z "$PASSWORD" ]; then
            echo -e "${YELLOW}Enter password for user '$USERNAME':${NC}"
            read -s PASSWORD
            echo ""
            echo -e "${YELLOW}Confirm password:${NC}"
            read -s PASSWORD_CONFIRM
            echo ""
            
            if [ "$PASSWORD" != "$PASSWORD_CONFIRM" ]; then
                echo -e "${RED}Passwords do not match!${NC}"
                exit 1
            fi
        fi
        
        # Generate password hash using openssl
        HASH=$(openssl passwd -apr1 "$PASSWORD")
        echo "$USERNAME:$HASH" > "$HTPASSWD_FILE"
        echo -e "${GREEN}Created $HTPASSWD_FILE using openssl${NC}"
    else
        echo -e "${RED}Neither htpasswd nor openssl found!${NC}"
        echo "Install apache2-utils: sudo apt-get install apache2-utils"
        echo "Or install openssl: sudo apt-get install openssl"
        exit 1
    fi
else
    # Use htpasswd
    if [ -z "$PASSWORD" ]; then
        echo -e "${YELLOW}Creating password for user '$USERNAME'...${NC}"
        htpasswd -c "$HTPASSWD_FILE" "$USERNAME"
    else
        htpasswd -cb "$HTPASSWD_FILE" "$USERNAME" "$PASSWORD"
        echo -e "${GREEN}Created $HTPASSWD_FILE${NC}"
    fi
fi

# Set proper permissions
chmod 644 "$HTPASSWD_FILE"

echo ""
echo -e "${GREEN}Authentication setup complete!${NC}"
echo ""
echo "To add more users, run:"
echo "  htpasswd $HTPASSWD_FILE <new_username>"
echo ""
echo "To start the docs server:"
echo "  cd $SCRIPT_DIR && docker-compose up -d"
echo ""
echo -e "${YELLOW}WARNING: Keep .htpasswd secure and never commit it to git!${NC}"
