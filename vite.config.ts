import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      workbox: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg,json}']
      },
      manifest: {
        name: 'Mirapinos CRM',
        short_name: 'Mirapinos',
        description: 'CRM App for Mirapinos',
        theme_color: '#ffffff',
        icons: [
          {
            src: '/logo1.png', // Assuming this is available, if not we can add it or just ignore for now
            sizes: '192x192',
            type: 'image/png'
          },
          {
            src: '/logo1.png',
            sizes: '512x512',
            type: 'image/png'
          }
        ]
      }
    })
  ],
})
