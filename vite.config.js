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
      '@bsv/sdk': '@bsv/sdk',
      '@unisat/wallet-sdk': '@unisat/wallet-sdk/dist/index.js',
      'crypto': 'crypto-browserify',
      'stream': 'stream-browserify',
      'buffer': 'buffer',
      'bip39': 'bip39',
      'process': 'process/browser',
      'util': 'util',
      'assert': 'assert'
    },
    extensions: ['.ts', '.js']
  },
  optimizeDeps: {
    esbuildOptions: {
      target: 'esnext',
      define: {
        global: 'globalThis',
        'process.env.NODE_DEBUG': 'false'
      }
    },
    include: [
      'buffer',
      'crypto-browserify',
      'stream-browserify',
      'bip39',
      '@bsv/sdk',
      'process',
      'util',
      'assert'
    ]
  },
  define: {
    'process.env': {},
    'process.browser': true,
    'process.version': '"v16.0.0"'
  },
  css: {
    devSourcemap: true
  }
}); 