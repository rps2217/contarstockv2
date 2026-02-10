
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig(({ mode }) => {
    const env = loadEnv(mode, '.', '');
    return {
      server: {
        port: 3000,
        host: '0.0.0.0',
      },
      resolve: {
        alias: {
          // Using aliases to ensure Vite doesn't try to find these in a missing node_modules folder
          'buffer': 'https://esm.sh/buffer@6.0.3',
          'long': 'https://esm.sh/long@5.2.3'
        },
      },
      optimizeDeps: {
        // Exclude modules that we want to resolve via importmap or external URLs
        exclude: ['buffer', 'long'],
      },
      build: {
        rollupOptions: {
          // Mark these as external to prevent build failure when node_modules is incomplete
          external: ['buffer', 'long'],
        },
      },
      plugins: [
        react(),
        VitePWA({
          strategies: 'injectManifest',
          srcDir: '.', 
          filename: 'sw.ts',
          registerType: 'autoUpdate',
          devOptions: {
            enabled: true,
            type: 'module',
          },
          includeAssets: ['favicon.ico', 'pwa-icon.svg'],
          manifest: {
            name: 'LogiCount Pro',
            short_name: 'LogiCount',
            description: 'Sistema de gestión de inventario local-first',
            theme_color: '#0f172a',
            background_color: '#0f172a',
            display: 'standalone',
            orientation: 'portrait',
            start_url: '/',
            icons: [
              {
                src: 'pwa-icon.svg',
                sizes: '192x192',
                type: 'image/svg+xml',
                purpose: 'any maskable'
              },
              {
                src: 'pwa-icon.svg',
                sizes: '512x512',
                type: 'image/svg+xml',
                purpose: 'any maskable'
              }
            ]
          }
        })
      ],
      define: {
        'process.env.API_KEY': JSON.stringify(env.GEMINI_API_KEY),
        'process.env.GEMINI_API_KEY': JSON.stringify(env.GEMINI_API_KEY),
        // Polyfill global for libraries that expect a Node-like environment
        'global': 'window',
      }
    };
});
