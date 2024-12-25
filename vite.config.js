import { defineConfig } from 'vite';
import wasm from 'vite-plugin-wasm';
import topLevelAwait from 'vite-plugin-top-level-await';

export default defineConfig({
  plugins: [
    wasm(),
    topLevelAwait()
  ],
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
      '@unisat/wallet-sdk': '@unisat/wallet-sdk/dist/index.js',
      'crypto': 'crypto-browserify',
      'stream': 'stream-browserify',
      'buffer': 'buffer',
      'bip39': 'bip39'
    }
  },
  optimizeDeps: {
    esbuildOptions: {
      target: 'esnext'
    },
    include: [
      'buffer',
      'crypto-browserify',
      'stream-browserify',
      'bip39'
    ]
  },
  css: {
    devSourcemap: true
  }
}); 