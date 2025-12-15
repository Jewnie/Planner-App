import { defineConfig } from 'vite';
import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
// 💡 Import 'path' for resolving file paths
import path from 'path';

export default defineConfig({
  // FIX 1: Set base to include trailing slash so built assets live under /dashboard/
  base: '/',
  plugins: [react(), tailwindcss()],
  server: {
    allowedHosts: ['plnnr-dev-dashboard.johndev.org', 'plnnr-dev-core.johndev.org'],
  },
  resolve: {
    // 💡 FIX 2: Define the '@/' alias for Rollup/Vite
    alias: {
      // This maps '@/' to the absolute path of the 'src' directory
      '@': path.resolve(__dirname, './src'),
    },
  },
  build: {
    outDir: 'dist',
    cssCodeSplit: false,
  },
});
