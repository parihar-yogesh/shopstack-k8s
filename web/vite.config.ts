import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

// The /api prefix mirrors the ingress rules the cluster will use, so the
// browser talks to a single origin in development and in Kubernetes alike.
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