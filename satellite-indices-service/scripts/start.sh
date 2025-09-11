#!/bin/bash

# Start script for production deployment

echo "Starting Satellite Indices Service..."

# Check required environment variables
if [ -z "$GEE_SERVICE_ACCOUNT" ]; then
    echo "Error: GEE_SERVICE_ACCOUNT is not set"
    exit 1
fi

if [ -z "$GEE_PRIVATE_KEY" ]; then
    echo "Error: GEE_PRIVATE_KEY is not set"
    exit 1
fi

# Create temp directory if it doesn't exist
mkdir -p /tmp/satellite-data

# Start the application with production settings
exec uvicorn app.main:app \
    --host 0.0.0.0 \
    --port ${PORT:-8000} \
    --workers ${WORKERS:-4} \
    --log-level ${LOG_LEVEL:-info} \
    --access-log