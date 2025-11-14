import { defineConfig } from 'vite';
import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  base: "/", // IMPORTANT for Vercel to find assets correctly
  build: {
    outDir: "dist", // make sure build output goes to dashboard/dist
    assetsDir: "assets", // optional: where JS/CSS will be placed
  },
});
