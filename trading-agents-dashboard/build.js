#!/usr/bin/env node
import { build } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

await build({
  plugins: [react(), tailwindcss()],
  build: {
    outDir: 'dist',
    minify: 'esbuild',
    sourcemap: false,
  },
});

console.log('✅ Build completed');
