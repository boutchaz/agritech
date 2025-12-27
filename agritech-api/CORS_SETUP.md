# CORS Configuration Guide

## Problem
You're seeing this error:
```
Access to fetch at 'https://agritech-api.thebzlab.online/api/v1/farms...' from origin 'https://agritech-dashboard.thebzlab.online' has been blocked by CORS policy
```

## Solution

The backend CORS configuration has been updated to be more flexible. You now need to set the `CORS_ORIGIN` environment variable on your production server.

### For Production Deployment

Add the following environment variable to your backend server:

```bash
CORS_ORIGIN=https://agritech-dashboard.thebzlab.online,http://localhost:5173
```

**Multiple Origins**: Separate multiple origins with commas (no spaces after commas will be trimmed automatically).

### Environment Variable Examples

#### Development Only
```bash
CORS_ORIGIN=http://localhost:5173
```

#### Production Only
```bash
CORS_ORIGIN=https://agritech-dashboard.thebzlab.online
```

#### Both Development and Production
```bash
CORS_ORIGIN=https://agritech-dashboard.thebzlab.online,http://localhost:5173,http://localhost:3000
```

#### Allow All Origins (NOT RECOMMENDED for production)
```bash
CORS_ORIGIN=*
```

### How to Set Environment Variables

#### Option 1: Using .env file (Local Development)
Create or edit `.env.local` in the `agritech-api` directory:
```bash
# agritech-api/.env.local
CORS_ORIGIN=https://agritech-dashboard.thebzlab.online,http://localhost:5173
```

#### Option 2: Server Environment Variables (Production)
Depending on your hosting platform:

**Vercel/Netlify**:
- Go to your project settings
- Add environment variable: `CORS_ORIGIN` = `https://agritech-dashboard.thebzlab.online`

**Docker**:
```bash
docker run -e CORS_ORIGIN=https://agritech-dashboard.thebzlab.online ...
```

**PM2**:
```bash
pm2 start npm --name "agritech-api" -- start -- --env CORS_ORIGIN=https://agritech-dashboard.thebzlab.online
```

**Systemd**:
Add to your service file:
```ini
Environment="CORS_ORIGIN=https://agritech-dashboard.thebzlab.online"
```

### Updated CORS Configuration Features

The new CORS configuration in `main.ts` now supports:

1. ✅ **Multiple Origins**: Comma-separated list of allowed origins
2. ✅ **Wildcard Support**: Use `*` to allow all origins (development only)
3. ✅ **Auto-trim**: Whitespace is automatically trimmed from origins
4. ✅ **Development Mode**: Automatically allows all localhost URLs in development
5. ✅ **No-Origin Requests**: Allows requests without origin (Postman, curl, mobile apps)
6. ✅ **Explicit Methods**: GET, POST, PUT, PATCH, DELETE, OPTIONS, HEAD
7. ✅ **Credentials Support**: Allows cookies and authentication headers
8. ✅ **Auto-allowed Subdomains**: All `*.thebzlab.online` subdomains are automatically allowed
9. ✅ **Hardcoded Production Origins**: Key production domains are always allowed regardless of env config:
   - `https://agritech-dashboard.thebzlab.online`
   - `https://agritech-marketplace.thebzlab.online`
   - `https://agritech.thebzlab.online`
   - `https://marketplace.thebzlab.online`
   - `https://dashboard.thebzlab.online`

### Testing CORS

After setting the environment variable and restarting your backend:

```bash
# Test from command line
curl -H "Origin: https://agritech-dashboard.thebzlab.online" \
     -H "Access-Control-Request-Method: GET" \
     -H "Access-Control-Request-Headers: Authorization" \
     -X OPTIONS \
     https://agritech-api.thebzlab.online/api/v1/farms

# Should return headers including:
# Access-Control-Allow-Origin: https://agritech-dashboard.thebzlab.online
# Access-Control-Allow-Credentials: true
```

### Restart Required

After setting the environment variable, you MUST restart your backend server:

```bash
# Development
npm run start:dev

# Production
pm2 restart agritech-api
# or
systemctl restart agritech-api
```

### Troubleshooting

**Still seeing CORS errors?**

1. ✅ Verify the environment variable is set:
   ```bash
   echo $CORS_ORIGIN
   ```

2. ✅ Check the backend logs for the CORS configuration:
   - Look for startup logs showing allowed origins

3. ✅ Ensure the origin URL matches EXACTLY:
   - `https://agritech-dashboard.thebzlab.online` ✅
   - `https://agritech-dashboard.thebzlab.online/` ❌ (trailing slash)
   - `http://agritech-dashboard.thebzlab.online` ❌ (http vs https)

4. ✅ Clear browser cache and try again

5. ✅ Check browser console for the exact origin being sent
