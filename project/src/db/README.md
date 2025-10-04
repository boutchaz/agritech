# Drizzle ORM TypeScript Schema

This is the **true declarative schema** approach using TypeScript with Drizzle ORM, similar to Prisma but with better SQL support and type safety.

## 🎯 Benefits Over SQL Migrations

1. **Type Safety**: Full TypeScript support with auto-completion
2. **Schema as Code**: Define your database in TypeScript, not SQL
3. **Auto-generated Types**: No need to manually maintain types
4. **Better DX**: IntelliSense, refactoring, and compile-time checks
5. **Version Control**: See exact changes in Git diffs
6. **No Migration Conflicts**: Drizzle handles SQL generation

## 📁 Structure

```
src/db/
├── schema/           # TypeScript schema definitions
│   ├── enums.ts     # Enum definitions
│   ├── auth.ts      # Auth-related tables
│   ├── organizations.ts # Organization tables
│   ├── farms.ts     # Farm-related tables
│   └── index.ts     # Main exports and types
├── queries/         # Type-safe query functions
│   └── users.ts     # User-related queries
├── client.ts        # Database client setup
└── README.md        # This file
```

## 🚀 Usage

### Define Schema in TypeScript

```typescript
// src/db/schema/example.ts
import { pgTable, uuid, text, timestamp, boolean } from 'drizzle-orm/pg-core';

export const products = pgTable('products', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: text('name').notNull(),
  description: text('description'),
  price: numeric('price', { precision: 10, scale: 2 }),
  isActive: boolean('is_active').default(true),
  createdAt: timestamp('created_at').defaultNow(),
});
```

### Type-Safe Queries

```typescript
// Automatic type inference!
import { db } from '@/db/client';
import { products } from '@/db/schema';
import { eq, gt } from 'drizzle-orm';

// INSERT - Types are inferred
const newProduct = await db.insert(products).values({
  name: 'Tomatoes',        // ✅ Required
  description: 'Fresh',     // ✅ Optional
  price: '9.99',           // ✅ Correct type
  // TypeScript error if you miss required fields!
}).returning();

// SELECT - Full type safety
const activeProducts = await db
  .select()
  .from(products)
  .where(eq(products.isActive, true)); // ✅ Type-checked

// UPDATE with conditions
await db
  .update(products)
  .set({ price: '10.99' })
  .where(gt(products.createdAt, new Date('2024-01-01')));

// DELETE
await db
  .delete(products)
  .where(eq(products.id, productId));
```

### Relations & Joins

```typescript
// Automatic join inference
const usersWithOrgs = await db
  .select({
    userName: userProfiles.firstName,
    orgName: organizations.name,
    role: roles.displayName,
  })
  .from(userProfiles)
  .leftJoin(organizationUsers, eq(organizationUsers.userId, userProfiles.id))
  .leftJoin(organizations, eq(organizations.id, organizationUsers.organizationId))
  .leftJoin(roles, eq(roles.id, organizationUsers.roleId));
```

### Transactions

```typescript
await db.transaction(async (tx) => {
  const user = await tx.insert(userProfiles).values({...}).returning();
  const org = await tx.insert(organizations).values({...}).returning();

  await tx.insert(organizationUsers).values({
    userId: user[0].id,
    organizationId: org[0].id,
  });
});
```

## 📝 Commands

```bash
# Generate SQL migration from TypeScript schema
npm run drizzle:generate

# Push schema directly to database (dev)
npm run drizzle:push

# Pull schema from existing database
npm run drizzle:pull

# Run migrations
npm run drizzle:migrate

# Open Drizzle Studio (visual DB browser)
npm run drizzle:studio

# Check schema for issues
npm run drizzle:check
```

## 🔄 Workflow

### Development Workflow

1. **Define/modify schema** in `src/db/schema/*.ts`
2. **Generate migration**: `npm run drizzle:generate`
3. **Push to local DB**: `npm run drizzle:push`
4. **Use type-safe queries** in your app

### Production Workflow

1. **Define schema** in TypeScript
2. **Generate migrations**: `npm run drizzle:generate`
3. **Review generated SQL** in `drizzle/` folder
4. **Apply to production**: `npm run drizzle:migrate`

## 🆚 Comparison

### Old Way (SQL Migrations)
```sql
-- Write SQL manually
CREATE TABLE products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  price DECIMAL(10,2)
);

-- Hope you don't make typos
-- No type safety
-- Manual type definitions
```

### New Way (Drizzle TypeScript)
```typescript
// Type-safe schema definition
export const products = pgTable('products', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: text('name').notNull(),
  price: numeric('price', { precision: 10, scale: 2 }),
});

// Auto-generated types
type Product = InferSelectModel<typeof products>;
type NewProduct = InferInsertModel<typeof products>;

// Full IntelliSense and type checking!
```

## 🎨 Drizzle Studio

Run `npm run drizzle:studio` to open a visual database browser:
- Browse all tables
- View/edit data
- Run queries
- See relationships

## 🔗 Integration with Supabase

Drizzle works perfectly with Supabase:

```typescript
// Use Supabase for auth
const { user } = await supabase.auth.getUser();

// Use Drizzle for type-safe queries
const profile = await db
  .select()
  .from(userProfiles)
  .where(eq(userProfiles.id, user.id))
  .limit(1);
```

## 📚 Resources

- [Drizzle Documentation](https://orm.drizzle.team)
- [Drizzle with Supabase](https://orm.drizzle.team/docs/get-started-postgresql#supabase)
- [Schema Declaration](https://orm.drizzle.team/docs/sql-schema-declaration)
- [Queries Guide](https://orm.drizzle.team/docs/select)

## 💡 Tips

1. **Use transactions** for multi-table operations
2. **Define relations** for easier joins
3. **Use Zod integration** for runtime validation
4. **Generate types** for frontend/backend sharing
5. **Use prepared statements** for performance

This is the modern, type-safe way to manage your database schema!