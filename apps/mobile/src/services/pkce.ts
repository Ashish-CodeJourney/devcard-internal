// A hash function is bit-twiddling by definition; the no-bitwise rule does not
// apply to this file.
/* eslint-disable no-bitwise */

// ─── PKCE (RFC 7636) ──────────────────────────────────────────────────────────
// Discord requires PKCE for custom-scheme redirects and its `code_verifier` must
// be at least 43 characters (it is stricter than most providers here).
//
// The React Native runtime ships neither SHA-256 nor a CSPRNG, so this module
// carries a small pure-JS SHA-256 and relies on `crypto.getRandomValues`, which
// `react-native-get-random-values` installs from index.js.

/** 48 bytes → 64 base64url chars, comfortably over Discord's 43-char minimum. */
const VERIFIER_BYTES = 48;
const STATE_BYTES = 32;

type CryptoLike = { getRandomValues?: (array: Uint8Array) => Uint8Array };

/**
 * Cryptographically secure random bytes. Deliberately throws rather than
 * falling back to Math.random — a predictable verifier would quietly defeat the
 * whole point of PKCE.
 */
export function randomBytes(length: number): Uint8Array {
  const webcrypto = (globalThis as unknown as { crypto?: CryptoLike }).crypto;
  if (!webcrypto?.getRandomValues) {
    throw new Error(
      'No secure random source is available. react-native-get-random-values must be imported before use.',
    );
  }
  const bytes = new Uint8Array(length);
  webcrypto.getRandomValues(bytes);
  return bytes;
}

const B64URL = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_';

/** Unpadded base64url — no btoa dependency, which RN does not reliably provide. */
export function base64UrlEncode(bytes: Uint8Array): string {
  let out = '';
  for (let i = 0; i < bytes.length; i += 3) {
    const b0 = bytes[i];
    const b1 = i + 1 < bytes.length ? bytes[i + 1] : 0;
    const b2 = i + 2 < bytes.length ? bytes[i + 2] : 0;

    out += B64URL[b0 >> 2];
    out += B64URL[((b0 & 0x03) << 4) | (b1 >> 4)];
    if (i + 1 < bytes.length) out += B64URL[((b1 & 0x0f) << 2) | (b2 >> 6)];
    if (i + 2 < bytes.length) out += B64URL[b2 & 0x3f];
  }
  return out;
}

/** ASCII → bytes. Avoids TextEncoder, which is absent in Hermes. */
function asciiBytes(value: string): Uint8Array {
  const out = new Uint8Array(value.length);
  for (let i = 0; i < value.length; i++) out[i] = value.charCodeAt(i) & 0xff;
  return out;
}

const K = new Uint32Array([
  0x428a2f98, 0x71374491, 0xb5c0fbcf, 0xe9b5dba5, 0x3956c25b, 0x59f111f1, 0x923f82a4, 0xab1c5ed5,
  0xd807aa98, 0x12835b01, 0x243185be, 0x550c7dc3, 0x72be5d74, 0x80deb1fe, 0x9bdc06a7, 0xc19bf174,
  0xe49b69c1, 0xefbe4786, 0x0fc19dc6, 0x240ca1cc, 0x2de92c6f, 0x4a7484aa, 0x5cb0a9dc, 0x76f988da,
  0x983e5152, 0xa831c66d, 0xb00327c8, 0xbf597fc7, 0xc6e00bf3, 0xd5a79147, 0x06ca6351, 0x14292967,
  0x27b70a85, 0x2e1b2138, 0x4d2c6dfc, 0x53380d13, 0x650a7354, 0x766a0abb, 0x81c2c92e, 0x92722c85,
  0xa2bfe8a1, 0xa81a664b, 0xc24b8b70, 0xc76c51a3, 0xd192e819, 0xd6990624, 0xf40e3585, 0x106aa070,
  0x19a4c116, 0x1e376c08, 0x2748774c, 0x34b0bcb5, 0x391c0cb3, 0x4ed8aa4a, 0x5b9cca4f, 0x682e6ff3,
  0x748f82ee, 0x78a5636f, 0x84c87814, 0x8cc70208, 0x90befffa, 0xa4506ceb, 0xbef9a3f7, 0xc67178f2,
]);

function rotr(value: number, shift: number): number {
  return ((value >>> shift) | (value << (32 - shift))) >>> 0;
}

/** SHA-256 over bytes. Returns the 32-byte digest. */
export function sha256(message: Uint8Array): Uint8Array {
  const h = new Uint32Array([
    0x6a09e667, 0xbb67ae85, 0x3c6ef372, 0xa54ff53a,
    0x510e527f, 0x9b05688c, 0x1f83d9ab, 0x5be0cd19,
  ]);

  // Pad: 0x80, then zeros, then the 64-bit big-endian bit length.
  const length = message.length;
  const remainder = (length + 1) % 64;
  const zeroPad = ((56 - remainder) + 64) % 64;
  const total = length + 1 + zeroPad + 8;

  const padded = new Uint8Array(total);
  padded.set(message);
  padded[length] = 0x80;

  const view = new DataView(padded.buffer);
  const bitLengthHigh = Math.floor((length * 8) / 0x100000000);
  const bitLengthLow = (length * 8) >>> 0;
  view.setUint32(total - 8, bitLengthHigh);
  view.setUint32(total - 4, bitLengthLow);

  const w = new Uint32Array(64);

  for (let offset = 0; offset < total; offset += 64) {
    for (let i = 0; i < 16; i++) w[i] = view.getUint32(offset + i * 4);

    for (let i = 16; i < 64; i++) {
      const x = w[i - 15];
      const y = w[i - 2];
      const s0 = (rotr(x, 7) ^ rotr(x, 18) ^ (x >>> 3)) >>> 0;
      const s1 = (rotr(y, 17) ^ rotr(y, 19) ^ (y >>> 10)) >>> 0;
      w[i] = (w[i - 16] + s0 + w[i - 7] + s1) >>> 0;
    }

    let a = h[0], b = h[1], c = h[2], d = h[3];
    let e = h[4], f = h[5], g = h[6], hh = h[7];

    for (let i = 0; i < 64; i++) {
      const S1 = (rotr(e, 6) ^ rotr(e, 11) ^ rotr(e, 25)) >>> 0;
      const ch = ((e & f) ^ (~e & g)) >>> 0;
      const temp1 = (hh + S1 + ch + K[i] + w[i]) >>> 0;
      const S0 = (rotr(a, 2) ^ rotr(a, 13) ^ rotr(a, 22)) >>> 0;
      const maj = ((a & b) ^ (a & c) ^ (b & c)) >>> 0;
      const temp2 = (S0 + maj) >>> 0;

      hh = g; g = f; f = e;
      e = (d + temp1) >>> 0;
      d = c; c = b; b = a;
      a = (temp1 + temp2) >>> 0;
    }

    h[0] = (h[0] + a) >>> 0; h[1] = (h[1] + b) >>> 0;
    h[2] = (h[2] + c) >>> 0; h[3] = (h[3] + d) >>> 0;
    h[4] = (h[4] + e) >>> 0; h[5] = (h[5] + f) >>> 0;
    h[6] = (h[6] + g) >>> 0; h[7] = (h[7] + hh) >>> 0;
  }

  const digest = new Uint8Array(32);
  const digestView = new DataView(digest.buffer);
  for (let i = 0; i < 8; i++) digestView.setUint32(i * 4, h[i]);
  return digest;
}

/** A fresh PKCE code verifier. */
export function createCodeVerifier(): string {
  return base64UrlEncode(randomBytes(VERIFIER_BYTES));
}

/** The S256 challenge for a verifier. */
export function createCodeChallenge(verifier: string): string {
  return base64UrlEncode(sha256(asciiBytes(verifier)));
}

/** An opaque anti-CSRF state, echoed back through the redirect. */
export function createState(): string {
  return base64UrlEncode(randomBytes(STATE_BYTES));
}
