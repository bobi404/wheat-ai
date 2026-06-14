import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react-swc';
import path from 'path';
import { componentTagger } from 'lovable-tagger';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig(({ mode }) => ({
  server: {
    host: '::',
    port: 8080,
    hmr: {
      overlay: false,
    },
    // headers: {
    //   'Cross-Origin-Opener-Policy': 'same-origin',
    //   'Cross-Origin-Embedder-Policy': 'require-corp',
    // },
  },

  optimizeDeps: {
    exclude: ['onnxruntime-web'],
  },

  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      workbox: {
        maximumFileSizeToCacheInBytes: 50 * 1024 * 1024, // 50 MB
        globPatterns: ['**/*.{js,css,html,ico,png,svg,wasm}'],
        globIgnores: ['**/model_final.onnx', '**/backbone_final.onnx'],
      },
      manifest: {
        name: 'WheatWise AI',
        short_name: 'WheatWise',
        description: 'AI-powered wheat disease detection',
        theme_color: '#16a34a',
        background_color: '#ffffff',
        display: 'standalone',
        start_url: '/',
        icons: [
          { src: '/icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: '/icon-512.png', sizes: '512x512', type: 'image/png' },
        ],
      },
    }),
    mode === 'development' && componentTagger(),
  ].filter(Boolean),

  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
    dedupe: [
      'react',
      'react-dom',
      'react/jsx-runtime',
      'react/jsx-dev-runtime',
      '@tanstack/react-query',
      '@tanstack/query-core',
    ],
  },
}));
