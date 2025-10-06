# Agritech Database & Setup Scripts

Complete automation for database management and project setup.

## 🚀 Quick Start - One Command Setup

Run this **once** when setting up a new development environment:

```bash
npm run setup
```

## 📜 Key Commands

### Database Migrations
- `npm run db:migrate` - Apply migrations (interactive: local or remote)
- `npm run db:push` - Push to remote database
- `npm run db:pull` - Pull from remote database

### Database Sync
- `npm run db:sync` - Interactive sync tool (5 options)

### Database Management  
- `npm run db:start` - Start local Supabase
- `npm run db:stop` - Stop local Supabase
- `npm run db:reset` - Reset local database
- `npm run db:diff` - Show schema differences

## 🎯 Common Workflows

### Apply Migrations to Production
```bash
npm run db:migrate
# Choose [R]emote
```

### Sync with Remote Changes
```bash
npm run db:sync
# Choose option [1]
```

For full documentation, see the scripts themselves.
