
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Vercel Deployment Cache Bust: 20260409-01
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, '.', '');
  return {
    server: {
      port: 3000,
      host: '0.0.0.0',
    },
    resolve: {
      alias: {
        '@': path.resolve(__dirname, './src'),
        buffer: 'buffer',
        'node:buffer': 'buffer',
        long: 'long',
        'node:long': 'long',
      },
    },
    build: {
      chunkSizeWarningLimit: 2000,
      rollupOptions: {
        output: {
          manualChunks: {
            'vendor-react': ['react', 'react-dom', 'react-router-dom'],
            'vendor-ui': ['lucide-react', 'framer-motion', 'motion', 'recharts', 'sonner'],
            'vendor-db': ['dexie', 'dexie-react-hooks'],
            'vendor-utils': ['xlsx', 'jspdf', 'papaparse', 'date-fns', 'jszip'],
            'vendor-scanner': ['html5-qrcode', 'qrcode.react'],
            'vendor-ai': ['@google/genai', '@xenova/transformers']
          }
        }
      },
    },
    plugins: [
      react(),
      VitePWA({
        strategies: 'injectManifest',
        srcDir: 'src', 
        filename: 'sw.ts',
        registerType: 'autoUpdate',
        devOptions: {
          enabled: false,
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
          ],
          shortcuts: [
            {
              name: "Recepción",
              short_name: "Recepción",
              description: "Ir a Recepción de Mercadería",
              url: "/#/reception",
              icons: [{ src: "pwa-icon.svg", sizes: "192x192" }]
            },
            {
              name: "Vencimientos",
              short_name: "Vencimientos",
              description: "Ir a Control de Vencimientos",
              url: "/#/expiry",
              icons: [{ src: "pwa-icon.svg", sizes: "192x192" }]
            },
            {
              name: "Conteo a Ciegas",
              short_name: "Conteo",
              description: "Ir a Conteo a Ciegas",
              url: "/#/counting",
              icons: [{ src: "pwa-icon.svg", sizes: "192x192" }]
            }
          ]
        }
      })
    ],
    define: {
      'process.env.API_KEY': JSON.stringify(env.GEMINI_API_KEY || env.VITE_GEMINI_API_KEY || process.env.GEMINI_API_KEY || ""),
      'process.env.GEMINI_API_KEY': JSON.stringify(env.GEMINI_API_KEY || env.VITE_GEMINI_API_KEY || process.env.GEMINI_API_KEY || ""),
      'global': 'window',
      'process.env.NODE_ENV': JSON.stringify(mode)
    }
  };
});
