# Supabase Cloud Database Management

This guide explains how to manage your **Supabase Cloud** database using the CLI.

## 🎯 Your Setup

- **Project**: agritech (mvegjdkkbhlhbjpbhpou)
- **Region**: West EU (Paris)
- **Status**: ● Linked (ready to use)

## 🔄 Sync Workflow: Local ↔ Cloud

### Method 1: Reset Cloud Database (Clean Start)

This is the **easiest way** to start fresh with a clean database:

```bash
cd /Users/boutchaz/Documents/CodeLovers/agritech/project

# Option A: Using the script
npm run db:reset-cloud

# Option B: Using CLI directly
supabase db reset --linked
```

**What this does:**
1. Backs up current cloud schema to `supabase/schema/public.sql`
2. Drops all tables in cloud database
3. Applies all migrations from `supabase/migrations/` to cloud
4. Applies seed data if configured

### Method 2: Push Schema Changes (Incremental)

If you want to push specific changes without resetting:

```bash
# 1. See what will change
supabase db diff --linked

# 2. Push changes to cloud
supabase db push --linked

# 3. Include seed data (optional)
supabase db push --linked --include-seed
```

### Method 3: Pull Cloud Schema to Local

If changes were made in the cloud dashboard:

```bash
# Pull current cloud schema
supabase db pull --schema public

# This updates: supabase/schema/public.sql
```

## 📝 Step-by-Step: Complete Reset

Here's the complete workflow to reset your cloud database:

```bash
cd /Users/boutchaz/Documents/CodeLovers/agritech/project

# 1. Make sure you're on the right project
supabase projects list
# Look for the ● next to "agritech"

# 2. (Optional) Backup current schema
supabase db pull --schema public
git add supabase/schema/public.sql
git commit -m "backup: cloud schema before reset"

# 3. Reset cloud database
supabase db reset --linked

# 4. Generate TypeScript types from cloud
supabase gen types typescript --linked > src/types/database.types.ts

# 5. Test your app
npm run dev
```

## 🗂️ Understanding Your Database Structure

Your project uses both approaches:

### Declarative Schema (Current State)
- File: `supabase/schema/public.sql`
- Contains: Complete current state of database
- Updated by: `supabase db pull`

### Migrations (Change History)
- Folder: `supabase/migrations/`
- Contains: Sequential changes over time
- Files like:
  - `00000000000000_initial_schema.sql`
  - `20251005000001_add_user_creation_trigger.sql`
  - `20251006000001_allow_trial_subscription_creation.sql`

**Important**: `supabase db reset --linked` applies migrations in order, not the schema file.

## 🔧 Common Commands

| Command | What it does |
|---------|-------------|
| `supabase db reset --linked` | Reset cloud DB, apply all migrations |
| `supabase db push --linked` | Push local changes to cloud |
| `supabase db pull --schema public` | Pull cloud schema to local |
| `supabase db diff --linked` | Compare local vs cloud |
| `supabase gen types typescript --linked` | Generate types from cloud |
| `supabase projects list` | Show all your projects |
| `supabase link --project-ref <ref>` | Link to different project |

## 🎯 Which Approach to Use?

### Use `db reset --linked` when:
- ✅ Starting fresh
- ✅ You have clean migrations
- ✅ You want to ensure consistency
- ✅ You're okay losing all data

### Use `db push --linked` when:
- ✅ Making incremental changes
- ✅ You want to preserve data
- ✅ You've edited schema locally

### Use `db pull` when:
- ✅ Someone made changes in dashboard
- ✅ You need to sync cloud → local
- ✅ Creating a backup

## 🚨 Important Notes

### Your Migrations

Looking at your `git status`, you have new migrations staged:
```
supabase/migrations/20251005000001_add_user_creation_trigger.sql
supabase/migrations/20251005000002_configure_user_creation_webhook.sql
supabase/migrations/20251006000001_allow_trial_subscription_creation.sql
```

These will be applied when you run `supabase db reset --linked`.

### Migration vs Schema Priority

Your `config.toml` is set to:
```toml
[db.migrations]
schema_paths = ["./schema/public.sql"]
```

But when using `--linked` (cloud), it uses **migrations**, not the schema file.

## 🔄 Recommended Workflow

### For Development

```bash
# 1. Work locally
npm run db:start                    # Start local Supabase
npm run db:reset                    # Reset local (uses schema file)

# 2. Make changes
# Edit supabase/schema/public.sql or create migrations

# 3. Test locally
npm run dev

# 4. Create migration from changes
supabase db diff --schema public > supabase/migrations/$(date +%Y%m%d%H%M%S)_my_changes.sql

# 5. Push to cloud
supabase db reset --linked          # Apply all migrations to cloud
```

### For Quick Cloud Reset

```bash
# One command to rule them all
npm run db:reset-cloud

# Or manually:
supabase db reset --linked
supabase gen types typescript --linked > src/types/database.types.ts
```

## 🛠️ Troubleshooting

### "Not logged in"
```bash
supabase login
```

### "Project not linked"
```bash
supabase link --project-ref mvegjdkkbhlhbjpbhpou
```

### "Schema drift detected"
```bash
# See differences
supabase db diff --linked

# Force push
supabase db push --linked
```

### Reset failed
```bash
# Check migration files for syntax errors
ls -la supabase/migrations/

# Try pushing without reset
supabase db push --linked
```

## 📊 Best Practices

1. **Always commit migrations to git** before pushing to cloud
2. **Test migrations locally first** with `npm run db:reset`
3. **Use descriptive migration names** like `20251006_add_trial_support.sql`
4. **Generate types after schema changes** to keep TypeScript in sync
5. **Backup before major changes** with `supabase db pull`

## 🎬 Quick Reference

**Clean cloud database and start fresh:**
```bash
npm run db:reset-cloud
```

**Push local changes to cloud:**
```bash
supabase db push --linked
```

**Pull cloud changes to local:**
```bash
supabase db pull --schema public
```

**See what's different:**
```bash
supabase db diff --linked
```

---

**Your cloud project is ready to use!** Just run `npm run db:reset-cloud` to start fresh.

