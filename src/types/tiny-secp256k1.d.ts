declare module 'tiny-secp256k1' {
  export function isPoint(p: Uint8Array): boolean;
  export function isPrivate(d: Uint8Array): boolean;
  export function pointFromScalar(d: Uint8Array, compressed?: boolean): Uint8Array | null;
  export function pointAddScalar(p: Uint8Array, tweak: Uint8Array, compressed?: boolean): Uint8Array | null;
  export function privateAdd(d: Uint8Array, tweak: Uint8Array): Uint8Array | null;
  export function sign(h: Uint8Array, d: Uint8Array, e?: Uint8Array): Uint8Array;
  export function verify(h: Uint8Array, Q: Uint8Array, signature: Uint8Array, strict?: boolean): boolean;
} 