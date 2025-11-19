// dashboard/vite.config.ts
import { defineConfig } from 'vite';
import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
// 💡 Import 'path' for resolving file paths
import path from 'path'; 

export default defineConfig({
  // FIX 1: Set base to include trailing slash so built assets live under /dashboard/
  base: '/', 
  plugins: [react(), tailwindcss()],
  resolve: {
    // 💡 FIX 2: Define the '@/' alias for Rollup/Vite
    alias: {
      // This maps '@/' to the absolute path of the 'src' directory
      '@': path.resolve(__dirname, './src'), 
    },
  },
  build: {
    // Ensure this matches your vercel.json 'distDir'
    outDir: 'dist',
    // Ensure CSS is properly extracted and not code-split
    // This helps with class detection in production
    cssCodeSplit: false,
  }
});