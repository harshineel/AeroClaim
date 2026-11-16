import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// In development the UI reaches the Spring Boot backend (or the bundled mock server) through this proxy, so no CORS is needed.
// In Docker, nginx does the same job (see nginx.conf).
export default defineConfig({
  plugins: [react()],
  server: { port: 5173, proxy: { '/api': { target: process.env.VITE_API_PROXY || 'http://localhost:8081', changeOrigin: true } } },
});
