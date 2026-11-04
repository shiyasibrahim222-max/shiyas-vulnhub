/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

// Utility: ArrayBuffer to hex string
function bufToHex(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  return Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

// Utility: String to Uint8Array UTF-8
function strToUtf8(str: string): Uint8Array {
  return new TextEncoder().encode(str);
}

// Utility: Base64URL encode/decode
export function base64UrlEncode(str: string): string {
  const base64 = btoa(str);
  return base64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

export function base64UrlDecode(str: string): string {
  let base64 = str.replace(/-/g, '+').replace(/_/g, '/');
  while (base64.length % 4) {
    base64 += '=';
  }
  try {
    return atob(base64);
  } catch {
    return '{}';
  }
}

/**
 * Standard SHA-256 hash using WebCrypto
 */
export async function sha256(text: string): Promise<string> {
  const data = strToUtf8(text);
  const hashBuf = await crypto.subtle.digest('SHA-256', data.buffer as ArrayBuffer);
  return bufToHex(hashBuf);
}

/**
 * Simulated legacy weak MD5 hash (for demonstration of why obsolete hashes are insecure)
 */
export function weakMd5Simulated(text: string): string {
  let h0 = 0x67452301;
  let h1 = 0xefcdab89;
  let h2 = 0x98badcfe;
  let h3 = 0x10325476;

  for (let i = 0; i < text.length; i++) {
    const code = text.charCodeAt(i);
    h0 = (h0 + (code << 4) + (h1 ^ h2)) & 0xffffffff;
    h1 = (h1 + code + (h2 & h3)) & 0xffffffff;
    h2 = (h2 + (code >> 2) + (h0 | h3)) & 0xffffffff;
    h3 = (h3 + code * 31 + (h1 ^ h0)) & 0xffffffff;
  }

  const toHex = (n: number) => (n >>> 0).toString(16).padStart(8, '0');
  return `${toHex(h0)}${toHex(h1)}${toHex(h2)}${toHex(h3)}`;
}

/**
 * PBKDF2 Password Hashing (NIST SP 800-63B standard)
 * Uses PBKDF2-HMAC-SHA-256 with 100,000 iterations and a 128-bit cryptographic salt.
 */
export async function pbkdf2Derive(
  password: string,
  saltHex?: string,
  iterations: number = 100000
): Promise<{ hashHex: string; saltHex: string; durationMs: number }> {
  const startTime = performance.now();

  let saltBytes: Uint8Array;
  if (saltHex && saltHex.length === 32) {
    saltBytes = new Uint8Array(
      saltHex.match(/.{1,2}/g)!.map((byte) => parseInt(byte, 16))
    );
  } else {
    saltBytes = new Uint8Array(16);
    crypto.getRandomValues(saltBytes as any);
  }

  const generatedSaltHex = Array.from(saltBytes)
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');

  // Import password as raw key
  const passwordKey = await crypto.subtle.importKey(
    'raw',
    strToUtf8(password).buffer as ArrayBuffer,
    { name: 'PBKDF2' },
    false,
    ['deriveBits']
  );

  // Derive 256 bits (32 bytes)
  const derivedBits = await crypto.subtle.deriveBits(
    {
      name: 'PBKDF2',
      salt: saltBytes.buffer as ArrayBuffer,
      iterations: iterations,
      hash: 'SHA-256',
    },
    passwordKey,
    256
  );

  const durationMs = Math.round(performance.now() - startTime);
  const hashHex = bufToHex(derivedBits);

  return { hashHex, saltHex: generatedSaltHex, durationMs };
}

/**
 * RFC 6238 TOTP (Time-Based One-Time Password) Generator
 * Computes authentic 6-digit TOTP codes from a secret key based on 30-second time steps.
 */
export async function generateTotpCode(
  secret: string,
  stepSeconds: number = 30
): Promise<{ code: string; secondsRemaining: number; currentStep: number }> {
  const epoch = Math.floor(Date.now() / 1000);
  const currentStep = Math.floor(epoch / stepSeconds);
  const secondsRemaining = stepSeconds - (epoch % stepSeconds);

  // Encode time counter as 8-byte big endian array
  const counterBuf = new ArrayBuffer(8);
  const counterView = new DataView(counterBuf);
  counterView.setUint32(0, Math.floor(currentStep / 0x100000000));
  counterView.setUint32(4, currentStep & 0xffffffff);

  // Import secret into HMAC-SHA256
  const secretKey = await crypto.subtle.importKey(
    'raw',
    strToUtf8(secret).buffer as ArrayBuffer,
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );

  const hmacResult = await crypto.subtle.sign('HMAC', secretKey, counterBuf);
  const hmacBytes = new Uint8Array(hmacResult);

  // Dynamic truncation (RFC 4226 / RFC 6238)
  const offset = hmacBytes[hmacBytes.length - 1] & 0x0f;
  const binary =
    ((hmacBytes[offset] & 0x7f) << 24) |
    ((hmacBytes[offset + 1] & 0xff) << 16) |
    ((hmacBytes[offset + 2] & 0xff) << 8) |
    (hmacBytes[offset + 3] & 0xff);

  const otp = binary % 1000000;
  const code = otp.toString().padStart(6, '0');

  return { code, secondsRemaining, currentStep };
}

/**
 * JWT Token Generation & Verification with HMAC-SHA256
 */
export async function createJwt(
  payload: Record<string, unknown>,
  secret: string,
  algorithm: 'HS256' | 'none' = 'HS256'
): Promise<string> {
  const header = { alg: algorithm, typ: 'JWT' };
  const encodedHeader = base64UrlEncode(JSON.stringify(header));
  const encodedPayload = base64UrlEncode(JSON.stringify(payload));
  const unsignedToken = `${encodedHeader}.${encodedPayload}`;

  if (algorithm === 'none') {
    return `${unsignedToken}.`;
  }

  const key = await crypto.subtle.importKey(
    'raw',
    strToUtf8(secret).buffer as ArrayBuffer,
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );

  const sigBuf = await crypto.subtle.sign('HMAC', key, strToUtf8(unsignedToken).buffer as ArrayBuffer);
  const encodedSig = base64UrlEncode(
    String.fromCharCode(...new Uint8Array(sigBuf))
  );

  return `${unsignedToken}.${encodedSig}`;
}

export async function verifyJwt(
  token: string,
  secret: string,
  allowAlgNone: boolean = false
): Promise<{
  valid: boolean;
  header: Record<string, unknown>;
  payload: Record<string, unknown>;
  error?: string;
}> {
  const parts = token.split('.');
  if (parts.length < 2 || parts.length > 3) {
    return { valid: false, header: {}, payload: {}, error: 'Invalid token structure (must have 3 parts)' };
  }

  const [encHeader, encPayload, encSig] = parts;
  let header: Record<string, unknown>;
  let payload: Record<string, unknown>;

  try {
    header = JSON.parse(base64UrlDecode(encHeader));
    payload = JSON.parse(base64UrlDecode(encPayload));
  } catch {
    return { valid: false, header: {}, payload: {}, error: 'Failed to decode Base64URL JSON' };
  }

  if (header.alg === 'none') {
    if (allowAlgNone) {
      return { valid: true, header, payload };
    }
    return { valid: false, header, payload, error: 'Rejected: Algorithm "none" is disallowed by security policy.' };
  }

  if (!encSig) {
    return { valid: false, header, payload, error: 'Signature is missing.' };
  }

  // Recalculate signature
  const unsignedToken = `${encHeader}.${encPayload}`;
  const key = await crypto.subtle.importKey(
    'raw',
    strToUtf8(secret).buffer as ArrayBuffer,
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );

  const sigBuf = await crypto.subtle.sign('HMAC', key, strToUtf8(unsignedToken).buffer as ArrayBuffer);
  const expectedSig = base64UrlEncode(
    String.fromCharCode(...new Uint8Array(sigBuf))
  );

  if (encSig !== expectedSig) {
    return { valid: false, header, payload, error: 'Signature verification failed (tampered payload or invalid secret).' };
  }

  // Check expiration if present
  if (typeof payload.exp === 'number') {
    const now = Math.floor(Date.now() / 1000);
    if (now > payload.exp) {
      return { valid: false, header, payload, error: `Token expired at ${new Date(payload.exp * 1000).toISOString()}` };
    }
  }

  return { valid: true, header, payload };
}

/**
 * NIST SP 800-63B Password Entropy and Strength Calculation
 */
export function calculatePasswordEntropy(password: string): {
  bits: number;
  strength: 'VERY_WEAK' | 'WEAK' | 'MODERATE' | 'STRONG' | 'EXCELLENT';
  feedback: string[];
} {
  if (!password) {
    return { bits: 0, strength: 'VERY_WEAK', feedback: ['Password is empty'] };
  }

  let poolSize = 0;
  if (/[a-z]/.test(password)) poolSize += 26;
  if (/[A-Z]/.test(password)) poolSize += 26;
  if (/[0-9]/.test(password)) poolSize += 10;
  if (/[^a-zA-Z0-9]/.test(password)) poolSize += 33;

  const bits = Math.round(password.length * Math.log2(Math.max(poolSize, 1)));
  const feedback: string[] = [];

  if (password.length < 8) {
    feedback.push('Must be at least 8 characters (NIST recommendation is 12+)');
  }
  if (!/[A-Z]/.test(password)) {
    feedback.push('Add uppercase characters to expand character pool');
  }
  if (!/[0-9]/.test(password)) {
    feedback.push('Include numbers to resist brute-force dictionaries');
  }
  if (!/[^a-zA-Z0-9]/.test(password)) {
    feedback.push('Include special symbols (!@#$%^&*)');
  }

  const commonPatterns = ['123456', 'password', 'admin', 'qwerty', 'welcome', 'letmein'];
  if (commonPatterns.some((pattern) => password.toLowerCase().includes(pattern))) {
    feedback.push('Contains easily guessable dictionary patterns');
  }

  let strength: 'VERY_WEAK' | 'WEAK' | 'MODERATE' | 'STRONG' | 'EXCELLENT' = 'VERY_WEAK';
  if (bits < 28) strength = 'VERY_WEAK';
  else if (bits < 40) strength = 'WEAK';
  else if (bits < 60) strength = 'MODERATE';
  else if (bits < 80) strength = 'STRONG';
  else strength = 'EXCELLENT';

  return { bits, strength, feedback };
}
