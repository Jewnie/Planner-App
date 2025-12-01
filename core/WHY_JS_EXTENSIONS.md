# Why `.js` Extensions (Not `.ts`)?

## The Core Problem

When you write:

```typescript
import { db } from './db.ts'; // ❌ Looks logical, but...
```

TypeScript compiles it to:

```javascript
import { db } from './db.ts'; // Still has .ts!
```

But at runtime, Node.js looks for `db.ts` which **doesn't exist** - only `db.js` exists!

## Why TypeScript Doesn't Rewrite Imports

TypeScript's philosophy: **"What you write is what you get"** in the compiled output. It doesn't rewrite import paths because:

1. It doesn't know your runtime environment
2. It preserves your intent
3. It's a type checker, not a bundler

## The Solution: Write `.js` in Source

When you write:

```typescript
import { db } from './db.js'; // ✅ Write .js even in .ts files
```

TypeScript understands:

- During type checking: `"./db.js"` refers to `db.ts` (the source)
- In compiled output: `"./db.js"` stays as `"./db.js"`
- At runtime: Node.js finds `db.js` ✅

## Why Not Use a Bundler?

You _could_ use a bundler (like esbuild, rollup, etc.) to rewrite `.ts` → `.js` imports, but:

1. **Adds complexity** - Another build step, configuration, etc.
2. **Drizzle Kit issue** - Drizzle Kit reads source/compiled files directly, not bundled output
3. **Vercel complexity** - Need to configure bundler for Vercel builds
4. **Standard practice** - The TypeScript team recommends `.js` extensions for ESM

## The TypeScript Team's Recommendation

From TypeScript's own documentation:

> "When writing TypeScript for Node.js with ESM, use `.js` extensions in import statements, even though the source files are `.ts`."

This is the **official, recommended approach** for TypeScript + Node.js ESM.

## Your Current Setup

✅ **Works perfectly:**

- Dev: `tsx` handles `.js` imports in `.ts` files
- Build: TypeScript compiles, keeps `.js` extensions
- Production: Node.js finds `.js` files
- Drizzle Kit: Reads files with correct extensions

## Alternative (Not Recommended)

If you _really_ want `.ts` extensions, you'd need:

1. A bundler (esbuild/rollup) to rewrite imports
2. Custom build configuration
3. Potential issues with Drizzle Kit
4. More complex Vercel setup

**But why?** `.js` extensions work perfectly and are the standard. The slight "weirdness" of writing `.js` in `.ts` files is outweighed by reliability and simplicity.
