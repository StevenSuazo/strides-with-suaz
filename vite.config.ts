import react from '@vitejs/plugin-react'
import { defineConfig } from 'vitest/config'
import races from './api/races.ts'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    {
      // `vite` does not run Vercel functions, so serve the race search here
      // too, with the very same handler the deployed site uses.
      name: 'dev-api-races',
      configureServer(server) {
        server.middlewares.use('/api/races', (request, response) => {
          void races(request, response)
        })
      },
    },
  ],
  test: {
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.ts'],
  },
})
