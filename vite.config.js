import { defineConfig } from 'vite';

export default defineConfig({
  server: {
    port: 5173,
    strictPort: true,
    fs: {
      strict: true
    },
    middlewareMode: false
  },
  build: {
    target: 'esnext',
    outDir: 'dist',
    assetsDir: 'assets',
    rollupOptions: {
      input: {
        main: './index.html'
      }
    }
  },
  resolve: {
    alias: {
      '@bsv/sdk': '@bsv/sdk/dist/index.js',
      '@unisat/wallet-sdk': '@unisat/wallet-sdk/dist/index.js'
    }
  },
  optimizeDeps: {
    esbuildOptions: {
      target: 'esnext'
    }
  },
  css: {
    devSourcemap: true
  }
}); 