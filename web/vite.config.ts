import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

// Mirrors the /api rewrites in nginx.conf, which serves this build in the cluster.
const stripApiPrefix = (path: string) => path.replace(/^\/api/, '');

export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    proxy: {
      '/api/products': {
        target: 'http://127.0.0.1:3000',
        rewrite: stripApiPrefix,
      },
      '/api/orders': {
        target: 'http://127.0.0.1:3001',
        rewrite: stripApiPrefix,
      },
      '/api/auth': {
        target: 'http://127.0.0.1:3001',
        rewrite: stripApiPrefix,
      },
    },
  },
});
