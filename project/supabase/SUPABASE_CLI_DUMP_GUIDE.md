# Using Supabase CLI to Dump Remote Database

## The Issue
Supabase CLI `db dump --linked` tries to use Docker for the dump operation, which may fail if Docker isn't running.

## Solutions

### Option 1: Use --db-url (Bypasses Docker)

This uses a direct connection string instead of Docker:

```bash
# Set your database password
export SUPABASE_DB_PASSWORD='your-database-password'

# Get password from: Supabase Dashboard → Settings → Database → Database Password

# Dump using connection string
supabase db dump \
  --db-url "postgresql://postgres:${SUPABASE_DB_PASSWORD}@db.mvegjdkkbhlhbjpbhpou.supabase.co:5432/postgres" \
  --schema public \
  --data-only=false \
  --file supabase/migrations/00000000000000_consolidated_schema.sql
```

### Option 2: Use --password Flag

```bash
# Dump with password flag
supabase db dump \
  --linked \
  --schema public \
  --data-only=false \
  --password 'your-database-password' \
  --file supabase/migrations/00000000000000_consolidated_schema.sql
```

### Option 3: Update Supabase CLI

Newer versions might not require Docker:

```bash
# macOS
brew upgrade supabase/tap/supabase

# Check version
supabase --version

# Then try dump again
supabase db dump --linked --schema public --data-only=false
```

### Option 4: Use Automated Script

```bash
# Set password
export SUPABASE_DB_PASSWORD='your-password'

# Run script
chmod +x supabase/dump_with_supabase_cli.sh
./supabase/dump_with_supabase_cli.sh
```

## Quick One-Liner

```bash
export SUPABASE_DB_PASSWORD='your-password' && \
supabase db dump \
  --db-url "postgresql://postgres:${SUPABASE_DB_PASSWORD}@db.mvegjdkkbhlhbjpbhpou.supabase.co:5432/postgres" \
  --schema public \
  --data-only=false \
  --file supabase/migrations/00000000000000_consolidated_schema.sql
```

## Verify the Dump

```bash
# Check file exists
ls -lh supabase/migrations/00000000000000_consolidated_schema.sql

# View first few lines
head -50 supabase/migrations/00000000000000_consolidated_schema.sql

# Count objects
grep -c "CREATE TABLE" supabase/migrations/00000000000000_consolidated_schema.sql
grep -c "CREATE.*FUNCTION" supabase/migrations/00000000000000_consolidated_schema.sql
```

## Troubleshooting

### Error: "Cannot connect to Docker"
Use `--db-url` method instead (Option 1 above)

### Error: "Password authentication failed"
- Verify password in Supabase Dashboard
- Make sure you're using the Database Password (not API keys)

### Error: "Connection refused"
- Check your IP is allowed in Supabase Dashboard
- Settings → Database → Connection Pooling
- Or disable connection pooling temporarily

### Error: "Project not linked"
```bash
# Link to project
supabase link --project-ref mvegjdkkbhlhbjpbhpou
```

