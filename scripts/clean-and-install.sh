#!/bin/bash

set -e

echo "🧹 Cleaning old node_modules and lockfiles..."

rm -rf node_modules
rm -rf project/node_modules
rm -rf agritech-api/node_modules
rm -rf admin-app/node_modules
rm -rf marketplace-frontend/node_modules
rm -rf cms/node_modules
rm -rf docs/node_modules

rm -f package-lock.json
rm -f project/package-lock.json
rm -f agritech-api/package-lock.json
rm -f admin-app/package-lock.json
rm -f marketplace-frontend/package-lock.json
rm -f cms/package-lock.json
rm -f docs/package-lock.json

rm -f yarn.lock
rm -f project/yarn.lock
rm -f agritech-api/yarn.lock
rm -f admin-app/yarn.lock
rm -f marketplace-frontend/yarn.lock
rm -f cms/yarn.lock
rm -f docs/yarn.lock

echo "📦 Installing dependencies with pnpm..."
pnpm install

echo "✅ Done! Monorepo is ready."
echo ""
echo "Available commands:"
echo "  pnpm dev          - Start main frontend"
echo "  pnpm dev:api      - Start NestJS API"
echo "  pnpm build        - Build all packages"
echo "  pnpm test         - Run tests"
