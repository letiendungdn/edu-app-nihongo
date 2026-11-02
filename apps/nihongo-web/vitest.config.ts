import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import fs from 'fs';
import path from 'path';

const rootNodeModules = path.resolve(__dirname, '../../node_modules');
// npm workspaces có thể hoist react lên node_modules gốc — dùng nơi thực sự có react.
const localNodeModules = path.resolve(__dirname, 'node_modules');
const appNodeModules = fs.existsSync(path.join(localNodeModules, 'react')) ? localNodeModules : rootNodeModules;

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./src/test/setup.ts'],
    server: {
      deps: {
        inline: ['@tanstack/react-query', '@testing-library/react'],
      },
    },
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      '@edu/vocab-images': path.resolve(__dirname, '../../packages/vocab-images/src/index.ts'),
      react: path.resolve(appNodeModules, 'react'),
      'react-dom': path.resolve(appNodeModules, 'react-dom'),
      'react/jsx-runtime': path.resolve(appNodeModules, 'react/jsx-runtime'),
      'react/jsx-dev-runtime': path.resolve(appNodeModules, 'react/jsx-dev-runtime'),
      '@tanstack/react-query': path.resolve(rootNodeModules, '@tanstack/react-query'),
    },
    dedupe: ['react', 'react-dom', '@tanstack/react-query'],
  },
});
