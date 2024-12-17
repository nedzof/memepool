import { defineConfig } from 'vite';
import { Buffer } from 'buffer';

export default defineConfig({
  // Enable .env file loading
  envDir: '.',
  // Other Vite config options...
  server: {
    fs: {
      // Allow serving files from one level up to the project root
      allow: ['..']
    }
  },
  assetsInclude: ['**/*.html'],
  resolve: {
    alias: {
      buffer: 'buffer',
      stream: 'stream-browserify',
      crypto: 'crypto-browserify'
    }
  },
  define: {
    'process.env': {},
    global: 'globalThis',
    'global.Buffer': Buffer,
    Buffer: ['buffer', 'Buffer']
  },
  build: {
    rollupOptions: {
      external: ['buffer'],
      output: {
        globals: {
          buffer: 'Buffer'
        }
      }
    }
  },
  optimizeDeps: {
    esbuildOptions: {
      define: {
        global: 'globalThis'
      }
    },
    include: ['buffer', 'bitcoinjs-lib']
  }
}); 