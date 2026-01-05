import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react-swc'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    // Frontend dev server runs on port 5173 so the app is served at
    // http://localhost:5173; API is proxied to the backend on 5001.
    port: 5173,
    host: true, // Allow external connections
    strictPort: true, // Don't increment port if 5173 is taken
    proxy: {
      '/swagger': {
        target: 'http://localhost:5001',
        changeOrigin: true,
        secure: false,
        rewrite: (path) => path.replace(/^\/swagger/, '/swagger')
      },
      // Proxy API calls under /api (if you use that pattern). Example:
      '/api': {
        target: 'http://localhost:5001',
        changeOrigin: true,
        secure: false,
        rewrite: (path) => path.replace(/^\/api/, '/api')
      }
    }
  }
})
