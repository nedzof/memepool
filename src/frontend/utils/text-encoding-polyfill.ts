// Use the browser's native TextEncoder and TextDecoder
if (typeof window !== 'undefined') {
    if (typeof globalThis.TextEncoder === 'undefined') {
        (globalThis as any).TextEncoder = window.TextEncoder;
    }

    if (typeof globalThis.TextDecoder === 'undefined') {
        (globalThis as any).TextDecoder = window.TextDecoder;
    }
} 