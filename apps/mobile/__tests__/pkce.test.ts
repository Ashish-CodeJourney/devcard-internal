import { base64UrlEncode, createCodeChallenge, createCodeVerifier, createState, sha256 } from '../src/services/pkce';

function hex(bytes: Uint8Array): string {
  let out = '';
  for (let i = 0; i < bytes.length; i++) out += bytes[i].toString(16).padStart(2, '0');
  return out;
}

function ascii(value: string): Uint8Array {
  const out = new Uint8Array(value.length);
  for (let i = 0; i < value.length; i++) out[i] = value.charCodeAt(i);
  return out;
}

describe('sha256', () => {
  // Published NIST vectors — these prove the pure-JS implementation is correct,
  // which matters because a wrong digest means Discord rejects every exchange.
  it('matches the empty-string vector', () => {
    expect(hex(sha256(new Uint8Array(0)))).toBe(
      'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855',
    );
  });

  it('matches the "abc" vector', () => {
    expect(hex(sha256(ascii('abc')))).toBe(
      'ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad',
    );
  });

  it('matches the multi-block vector', () => {
    const input = 'abcdbcdecdefdefgefghfghighijhijkijkljklmklmnlmnomnopnopq';
    expect(hex(sha256(ascii(input)))).toBe(
      '248d6a61d20638b8e5c026930c3e6039a33ce45964ff2167f6ecedd419db06c1',
    );
  });

  it('handles a message that forces two length words', () => {
    expect(hex(sha256(ascii('a'.repeat(1000))))).toBe(
      '41edece42d63e8d9bf515a9ba6932e1c20cbc9f5a5d134645adb5db1b9737ea3',
    );
  });
});

describe('base64UrlEncode', () => {
  it('uses url-safe characters and no padding', () => {
    const encoded = base64UrlEncode(new Uint8Array([0xfb, 0xff, 0xbf]));
    expect(encoded).not.toMatch(/[+/=]/);
  });

  it('encodes each remainder length correctly', () => {
    expect(base64UrlEncode(new Uint8Array([0x66]))).toBe('Zg');
    expect(base64UrlEncode(new Uint8Array([0x66, 0x6f]))).toBe('Zm8');
    expect(base64UrlEncode(new Uint8Array([0x66, 0x6f, 0x6f]))).toBe('Zm9v');
  });
});

describe('PKCE', () => {
  // RFC 7636, Appendix B — the canonical verification vector.
  it('reproduces the RFC 7636 S256 challenge', () => {
    const verifier = 'dBjftJeZ4CVP-mB92K27uhbUJU1p1r_wW1gFWFOEjXk';
    expect(createCodeChallenge(verifier)).toBe('E9Melhoa2OwvFrEMTJguCHaoeK1t8URWbuGJSstw-cM');
  });

  it('generates a verifier that satisfies Discord\'s 43-char minimum', () => {
    const verifier = createCodeVerifier();
    expect(verifier.length).toBeGreaterThanOrEqual(43);
    expect(verifier).toMatch(/^[A-Za-z0-9\-_]+$/);
  });

  it('generates distinct verifiers and states', () => {
    expect(createCodeVerifier()).not.toBe(createCodeVerifier());
    expect(createState()).not.toBe(createState());
  });
});
