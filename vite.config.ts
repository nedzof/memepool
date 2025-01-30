import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  define: {
    'process.env': {
      NODE_ENV: JSON.stringify(process.env.NODE_ENV),
      VITE_BSV_NETWORK: JSON.stringify(process.env.VITE_BSV_NETWORK || 'testnet'),
    },
    global: 'globalThis',
    'global.Buffer': ['buffer', 'Buffer'],
  },
  css: {
    postcss: './postcss.config.js',
    modules: {
      localsConvention: 'camelCase',
    },
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      stream: 'stream-browserify',
      crypto: 'crypto-browserify',
      assert: 'assert',
      http: 'stream-http',
      https: 'https-browserify',
      os: 'os-browserify',
      url: 'url',
      buffer: 'buffer',
      process: 'process/browser',
      path: 'path-browserify',
      fs: path.resolve(__dirname, './src/frontend/utils/empty-module.ts'),
      net: path.resolve(__dirname, './src/frontend/utils/empty-module.ts'),
      tls: path.resolve(__dirname, './src/frontend/utils/empty-module.ts'),
      child_process: path.resolve(__dirname, './src/frontend/utils/empty-module.ts'),
    },
  },
  optimizeDeps: {
    exclude: ['scrypt-ord', '@bsv/sdk', 'aerospike'],
    esbuildOptions: {
      define: {
        global: 'globalThis'
      }
    }
  },
  server: {
    port: 3000,
    strictPort: true,
    open: true,
    proxy: {
      '/api': {
        target: 'http://localhost:4000',
        changeOrigin: true,
        secure: false,
      },
    }
  },
  build: {
    outDir: 'dist',
    sourcemap: true,
    rollupOptions: {
      external: ['scrypt-ord', '@bsv/sdk', 'aerospike'],
    }
  },
}) 