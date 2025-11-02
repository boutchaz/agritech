# Quick Backup Commands

## One-Line Commands

### Backup Remote Schema (Structure Only)
```bash
supabase db dump --linked --schema public --data-only=false > schema_$(date +%Y%m%d_%H%M%S).sql
```

### Backup Remote Schema (Structure + Data)
```bash
supabase db dump --linked --schema public --data-only=true > schema_with_data_$(date +%Y%m%d_%H%M%S).sql
```

### Backup and Create Consolidated Schema
```bash
supabase db dump --linked --schema public --data-only=false | \
  grep -v '^--' | \
  sed '/^$/N;/^\n$/d' > \
  supabase/migrations/00000000000000_consolidated_schema.sql
```

## Using the Script

```bash
# Run automated backup and consolidation
cd /Users/boutchaz/Documents/CodeLovers/agritech/project
./supabase/backup_and_consolidate.sh
```

## Check if Linked

```bash
# Check current project link
supabase projects list

# Or check .git/config or supabase/.temp/project-ref
cat supabase/.temp/project-ref 2>/dev/null || echo "Not linked"
```

## Link if Not Linked

```bash
# Link to your remote project
supabase link --project-ref YOUR_PROJECT_REF

# Find your project ref in Supabase dashboard:
# Settings → General → Reference ID
```

