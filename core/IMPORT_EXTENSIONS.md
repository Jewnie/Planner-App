# Import Extensions Guide

## Overview

This project uses **ESM (ES Modules)** with TypeScript. To ensure compatibility in both development and production, **all relative imports must use `.js` extensions**, even though the source files are `.ts`.

> **Why `.js` and not `.ts`?** See [WHY_JS_EXTENSIONS.md](./WHY_JS_EXTENSIONS.md) for a detailed explanation. TL;DR: TypeScript doesn't rewrite import paths, and Node.js ESM requires actual file extensions at runtime.

## Why `.js` Extensions?

1. **TypeScript doesn't rewrite import paths** - When TypeScript compiles `.ts` to `.js`, it leaves import paths unchanged
2. **Node.js ESM requires extensions** - At runtime, Node.js needs the actual file extension (`.js`)
3. **Tools like Drizzle Kit** read the compiled `.js` files, which must have correct `.js` extensions

## Configuration

The `tsconfig.json` is configured with:

- `"module": "Node16"` - Uses Node.js 16+ ESM module system
- `"moduleResolution": "node16"` - Understands `.js` extensions in `.ts` files
- `"verbatimModuleSyntax": true` - Prevents TypeScript from rewriting import paths

## Rules

✅ **DO:**

```typescript
import { db } from './db.js';
import { schema } from '../db/schema.js';
```

❌ **DON'T:**

```typescript
import { db } from './db'; // Missing extension
import { schema } from './schema'; // Missing extension
```

## Verification

Run the check script before building:

```bash
npm run check-imports
```

This script automatically runs before `npm run build` (via `prebuild` hook).

## How It Works

- **Development**: `tsx` handles `.ts` files with `.js` imports correctly
- **Production**: Compiled `.js` files have `.js` imports, which Node.js ESM requires
- **Drizzle Kit**: Reads compiled files and sees correct `.js` extensions

## Troubleshooting

If you see import errors:

1. Ensure all relative imports use `.js` extensions
2. Run `npm run check-imports` to find any issues
3. Verify `tsconfig.json` has the correct module settings
4. Rebuild: `npm run build`
