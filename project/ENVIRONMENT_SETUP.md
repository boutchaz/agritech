# Environment Setup Guide

## Supabase Configuration

The frontend needs these environment variables to connect to your self-hosted Supabase instance:

### Required Environment Variables

Create a `.env.local` file in the project root with:

```env
VITE_SUPABASE_URL=http://agritech-supabase-652186-5-75-154-125.traefik.me
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpYXQiOjE3NTc1ODQ0NzksImV4cCI6MTg5MzQ1NjAwMCwiaXNzIjoiZG9rcGxveSJ9.fLPJqpGkPZDoJGQEp31ivplmoMF1mD2sSaeSAc_mscQ
```

### Docker Configuration

If using Docker, the environment variables are already configured in `docker-compose.yml`.

### Development Setup

For local development:

1. Create `.env.local` file in the project root
2. Copy the environment variables above
3. Restart your development server

### Current Issue

The frontend was trying to connect to the wrong Supabase instance:
- ❌ `https://najvfshknxkwzorlozre.supabase.co` (cloud)
- ✅ `http://agritech-supabase-652186-5-75-154-125.traefik.me` (your self-hosted)

After setting up the environment variables, the frontend will connect to the correct instance and all database functions will work properly.
