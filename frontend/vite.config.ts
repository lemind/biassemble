import { defineConfig } from 'vite'
import react, { reactCompilerPreset } from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(reactCompilerPreset()),
    tailwindcss(),
  ],
  server: {
    // Dev-only same-origin proxy for /api/* — lets `apiClient` call a relative path (empty
    // VITE_API_URL) during local dev, avoiding a real cross-origin CORS setup that doesn't
    // exist in this backend. Only active for `vite dev`; production builds are unaffected —
    // VITE_API_URL still governs those, baked in at build time as before.
    proxy: {
      '/api': {
        // Separate from VITE_API_URL on purpose — that one controls the client's baseURL
        // (should be empty/relative for the proxy to apply at all); this controls where the
        // proxy actually forwards to.
        target: process.env.DEV_PROXY_TARGET || 'http://localhost:3000',
        changeOrigin: true,
      },
    },
  },
})
