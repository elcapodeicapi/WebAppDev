import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react-swc'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      // Proxy the swagger UI and JSON from the backend so you can open
      // http://localhost:5173/swagger and see the API docs served by the API.
      '/swagger': {
        target: 'http://localhost:5000',
        changeOrigin: true,
        secure: false,
        // keep the path as-is so /swagger and /swagger/v1/swagger.json map correctly
        rewrite: (path) => path.replace(/^\/swagger/, '/swagger')
      }
    }
  }
})
