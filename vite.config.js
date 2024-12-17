import { defineConfig } from 'vite';

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
      buffer: 'buffer'
    }
  },
  define: {
    'process.env': {},
    global: 'globalThis'
  },
  optimizeDeps: {
    esbuildOptions: {
      define: {
        global: 'globalThis'
      }
    }
  }
}); 