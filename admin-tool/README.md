# AgroGina Pricing Admin Tool

A minimal internal tool for managing AgroGina pricing and syncing with Polar.sh.

## Features

- ✏️ Edit plan pricing (Essential, Professional, Enterprise)
- 🔄 Sync pricing to Polar.sh (sandbox/production)
- 👁️ Preview changes before applying
- 🔒 Simple password authentication
- 💾 Config persisted in JSON file

## Setup

1. **Install dependencies:**
   ```bash
   npm install
   ```

2. **Configure environment:**
   ```bash
   cp .env.example .env
   # Edit .env with your credentials
   ```

3. **Start the server:**
   ```bash
   npm run dev
   ```

4. **Access the tool:**
   - URL: http://localhost:3002
   - Password: Check `ADMIN_PASSWORD` in `.env`

## Environment Variables

```bash
PORT=3002                              # Server port
ADMIN_PASSWORD=your-secure-password    # Authentication password

# Polar.sh Configuration
POLAR_ACCESS_TOKEN=your-token          # Your Polar.sh access token
POLAR_ORGANIZATION_ID=your-org-id      # Your organization ID
POLAR_SERVER=sandbox                   # 'sandbox' or 'production'
```

## Usage

1. **Open the tool** in your browser
2. **Edit pricing** for each plan:
   - Monthly price
   - Display text
   - Polar Product ID
   - Features list
3. **Save** individual plans
4. **Sync to Polar.sh** when ready

## Project Structure

```
admin-tool/
├── src/
│   └── server.ts           # Express server
├── public/
│   └── index.html          # UI (no framework needed!)
├── config.json             # Pricing configuration
├── .env                    # Your credentials (not in git)
└── package.json
```

## Scripts

- `npm run dev` - Start with auto-reload
- `npm run build` - Compile TypeScript
- `npm start` - Start production server

## Security

- Password protected (Basic Auth)
- Never expose to public internet
- Run locally or on VPN only

## Deploy (Optional)

Can be deployed to:
- Railway.app (free tier)
- Render.com
- Your own server (VPS)

**Remember:** This is an internal tool - keep it secure!
