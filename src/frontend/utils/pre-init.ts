// Import fast-text-encoding polyfill
import 'fast-text-encoding';

// Set up Buffer for WASM
import { Buffer } from 'buffer';
if (typeof window !== 'undefined') {
    window.Buffer = Buffer;
}