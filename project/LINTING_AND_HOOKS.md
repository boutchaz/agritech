# Linting and Git Hooks Setup

This project uses ESLint with strict TypeScript rules and Husky for pre-commit hooks to ensure code quality.

## Tools

- **ESLint**: JavaScript/TypeScript linter with strict rules
- **TypeScript**: Type checking with strict mode enabled
- **Husky**: Git hooks manager
- **lint-staged**: Run linters on staged files only

## Available Scripts

```bash
# Lint all files
npm run lint

# Lint and auto-fix issues
npm run lint:fix

# Run TypeScript type checking
npm run type-check

# Build (includes type checking)
npm run build
```

## ESLint Configuration

The ESLint configuration (`eslint.config.js`) includes:

### TypeScript Rules
- `@typescript-eslint/no-explicit-any`: **warn** - Discourages use of `any` types
- `@typescript-eslint/no-unused-vars`: **error** - Catches unused variables (except those prefixed with `_`)
- `@typescript-eslint/no-non-null-assertion`: **warn** - Warns about non-null assertions (`!`)

### Code Quality Rules
- `no-console`: **warn** - Warns about console statements (allows `console.warn` and `console.error`)
- `eqeqeq`: **error** - Requires strict equality (`===`)
- `no-var`: **error** - Disallows `var`, requires `const` or `let`
- `prefer-const`: **error** - Requires `const` when variable is never reassigned
- `no-throw-literal`: **error** - Requires throwing Error objects

### React Rules
- React Hooks rules from `eslint-plugin-react-hooks`
- React Refresh rules for HMR

## Pre-commit Hooks

Husky runs automatically before each commit to ensure code quality. The pre-commit hook runs:

1. **ESLint** with auto-fix on staged `*.ts` and `*.tsx` files
2. **TypeScript type checking** on staged files

### How it works

When you run `git commit`, Husky will:
1. Run `lint-staged` on your staged files
2. Automatically fix any auto-fixable ESLint issues
3. Run TypeScript compiler to check for type errors
4. If any errors remain, the commit will be blocked
5. If everything passes, the commit proceeds

### Bypassing hooks (not recommended)

If you absolutely need to bypass the pre-commit hook (not recommended):

```bash
git commit --no-verify -m "your message"
```

## Ignored Files

The linter ignores:
- `dist/` - Build output
- `node_modules/` - Dependencies
- `build/` - Build artifacts
- `coverage/` - Test coverage reports
- `*.config.js` and `*.config.ts` - Configuration files
- All `.js` files - Only linting TypeScript source
- `scripts/` - Build/setup scripts
- `supabase/` - Supabase functions and migrations

## Fixing Issues

### Auto-fix

Many ESLint issues can be auto-fixed:

```bash
npm run lint:fix
```

### Manual fixes

For issues that can't be auto-fixed:

1. Read the error message carefully
2. Check the ESLint rule documentation
3. Fix the issue manually
4. Run `npm run lint` to verify

### Disabling rules (use sparingly)

If you need to disable a rule for a specific line:

```typescript
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const data: any = getComplexData();
```

For an entire file:

```typescript
/* eslint-disable @typescript-eslint/no-explicit-any */
// ... file content
```

**Note**: Only disable rules when absolutely necessary and add a comment explaining why.

## TypeScript Strict Mode

The project uses TypeScript strict mode (`tsconfig.app.json`):

```json
{
  "compilerOptions": {
    "strict": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "noFallthroughCasesInSwitch": true
  }
}
```

This catches many potential bugs at compile time.

## CI/CD Integration

For CI/CD pipelines, add these checks:

```bash
# In your CI workflow
npm run lint
npm run type-check
npm run build
```

## Troubleshooting

### "ESLint configuration error"

Make sure all dependencies are installed:

```bash
npm install
```

### "Parsing error" for a file

The file might not be included in your `tsconfig.app.json`. Either:
1. Add it to the `include` array in tsconfig
2. Add it to the ESLint `ignores` array if it shouldn't be linted

### Husky hooks not running

Ensure Husky is initialized:

```bash
git config core.hooksPath .husky
```

### Pre-commit hook fails on Windows

Ensure the hook file has Unix line endings (LF, not CRLF).
