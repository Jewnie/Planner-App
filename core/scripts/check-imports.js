#!/usr/bin/env node
/**
 * Script to verify all relative imports use .js extensions
 * This ensures compatibility with ESM in both dev and production
 */

import { readFileSync, readdirSync, statSync } from 'fs';
import { join, extname } from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const srcDir = join(__dirname, '..', 'src');

const errors = [];

function checkFile(filePath) {
  const content = readFileSync(filePath, 'utf-8');
  const lines = content.split('\n');
  
  // Match relative imports without .js extension
  // Matches: from "./something" or from "../something" but not "./something.js"
  const importRegex = /from\s+['"](\.\.?\/[^'"]*[^j][^s])['"]/g;
  
  lines.forEach((line, index) => {
    const matches = [...line.matchAll(importRegex)];
    matches.forEach(() => {
      errors.push({
        file: filePath.replace(srcDir, 'src'),
        line: index + 1,
        content: line.trim(),
      });
    });
  });
}

function walkDir(dir) {
  const files = readdirSync(dir);
  
  for (const file of files) {
    const filePath = join(dir, file);
    const stat = statSync(filePath);
    
    if (stat.isDirectory()) {
      walkDir(filePath);
    } else if (extname(file) === '.ts' && !file.endsWith('.d.ts')) {
      checkFile(filePath);
    }
  }
}

walkDir(srcDir);

if (errors.length > 0) {
  console.error('❌ Found imports without .js extensions:\n');
  errors.forEach(({ file, line, content }) => {
    console.error(`  ${file}:${line}`);
    console.error(`    ${content}\n`);
  });
  console.error('💡 All relative imports must use .js extensions (e.g., "./file.js")');
  console.error('   This is required for ESM compatibility in both dev and production.\n');
  process.exit(1);
} else {
  console.log('✅ All imports use .js extensions correctly!');
  process.exit(0);
}

