import { Buffer } from 'buffer';

// Make Buffer available globally
window.Buffer = Buffer;

// Ensure global is defined
if (typeof global === 'undefined') {
  (window as any).global = window;
}

// Add Buffer to global
(window as any).global.Buffer = Buffer; 