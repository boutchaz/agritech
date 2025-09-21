# MCP Configuration Options

## Option 1: Official Supabase MCP Server (Current)

**Requires**: Personal Access Token (PAT)

```json
{
  "mcpServers": {
    "supabase": {
      "command": "npx",
      "args": ["-y", "@supabase/mcp-server-supabase"],
      "env": {
        "SUPABASE_URL": "http://agritech-supabase-652186-5-75-154-125.traefik.me",
        "SUPABASE_ACCESS_TOKEN": "YOUR_PAT_HERE"
      }
    }
  }
}
```

**Steps**:
1. Get PAT from Supabase Dashboard → Settings → Access Tokens
2. Replace `YOUR_PAT_HERE` with your token
3. Restart Cursor

## Option 2: Self-Hosted MCP Server (Alternative)

**Uses**: Your existing anon key and service role key

```json
{
  "mcpServers": {
    "supabase-self-hosted": {
      "command": "node",
      "args": ["/Users/boutchaz/Documents/CodeLovers/agritech/mcp-supabase-self-hosted/dist/server.js"],
      "env": {
        "SUPABASE_URL": "http://agritech-supabase-652186-5-75-154-125.traefik.me",
        "SUPABASE_ANON_KEY": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpYXQiOjE3NTc1ODQ0NzksImV4cCI6MTg5MzQ1NjAwMCwiaXNzIjoiZG9rcGxveSJ9.fLPJqpGkPZDoJGQEp31ivplmoMF1mD2sSaeSAc_mscQ",
        "SUPABASE_SERVICE_ROLE_KEY": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpYXQiOjE3NTc1ODQ0NzksImV4cCI6MTg5MzQ1NjAwMCwiaXNzIjoiZG9rcGxveSJ9.fLPJqpGkPZDoJGQEp31ivplmoMF1mD2sSaeSAc_mscQ",
        "SUPABASE_JWT_SECRET": "jntqlukb8xafiwbxdhwpeyqrzrss0bx2"
      }
    }
  }
}
```

**Advantages**:
- ✅ Uses your existing keys
- ✅ No need for PAT
- ✅ Already tested and working
- ✅ Full control over functionality

## Recommendation

**Use Option 2 (Self-hosted)** since:
1. Your database is already working perfectly
2. You don't need to get a new PAT
3. We've already tested this configuration
4. It provides all the functionality you need

Would you like me to switch back to the self-hosted version?
