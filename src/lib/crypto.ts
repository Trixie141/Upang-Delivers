/* Minimal SHA-256 (used as a fallback when WebCrypto is unavailable). */
const K = [
  0x428a2f98, 0x71374491, 0xb5c0fbcf, 0xe9b5dba5, 0x3956c25b, 0x59f111f1, 0x923f82a4, 0xab1c5ed5,
  0xd807aa98, 0x12835b01, 0x243185be, 0x550c7dc3, 0x72be5d74, 0x80deb1fe, 0x9bdc06a7, 0xc19bf174,
  0xe49b69c1, 0xefbe4786, 0x0fc19dc6, 0x240ca1cc, 0x2de92c6f, 0x4a7484aa, 0x5cb0a9dc, 0x76f988da,
  0x983e5152, 0xa831c66d, 0xb00327c8, 0xbf597fc7, 0xc6e00bf3, 0xd5a79147, 0x06ca6351, 0x14292967,
  0x27b70a85, 0x2e1b2138, 0x4d2c6dfc, 0x53380d13, 0x650a7354, 0x766a0abb, 0x81c2c92e, 0x92722c85,
  0xa2bfe8a1, 0xa81a664b, 0xc24b8b70, 0xc76c51a3, 0xd192e819, 0xd6990624, 0xf40e3585, 0x106aa070,
  0x19a4c116, 0x1e376c08, 0x2748774c, 0x34b0bcb5, 0x391c0cb3, 0x4ed8aa4a, 0x5b9cca4f, 0x682e6ff3,
  0x748f82ee, 0x78a5636f, 0x84c87814, 0x8cc70208, 0x90befffa, 0xa4506ceb, 0xbef9a3f7, 0xc67178f2,
];

function rotr(x: number, n: number) {
  return (x >>> n) | (x << (32 - n));
}

function sha256Js(msg: string): string {
  const bytes = new TextEncoder().encode(msg);
  const l = bytes.length;
  const withPad = new Uint8Array((((l + 8) >> 6) + 1) * 64);
  withPad.set(bytes);
  withPad[l] = 0x80;
  new DataView(withPad.buffer).setUint32(withPad.length - 4, l * 8, false);

  const H = [
    0x6a09e667, 0xbb67ae85, 0x3c6ef372, 0xa54ff53a, 0x510e527f, 0x9b05688c, 0x1f83d9ab, 0x5be0cd19,
  ];
  const w = new Uint32Array(64);
  const view = new DataView(withPad.buffer);

  for (let i = 0; i < withPad.length; i += 64) {
    for (let t = 0; t < 16; t++) w[t] = view.getUint32(i + t * 4, false);
    for (let t = 16; t < 64; t++) {
      const s0 = rotr(w[t - 15], 7) ^ rotr(w[t - 15], 18) ^ (w[t - 15] >>> 3);
      const s1 = rotr(w[t - 2], 17) ^ rotr(w[t - 2], 19) ^ (w[t - 2] >>> 10);
      w[t] = (w[t - 16] + s0 + w[t - 7] + s1) >>> 0;
    }
    let [a, b, c, d, e, f, g, h] = H;
    for (let t = 0; t < 64; t++) {
      const S1 = rotr(e, 6) ^ rotr(e, 11) ^ rotr(e, 25);
      const ch = (e & f) ^ (~e & g);
      const t1 = (h + S1 + ch + K[t] + w[t]) >>> 0;
      const S0 = rotr(a, 2) ^ rotr(a, 13) ^ rotr(a, 22);
      const maj = (a & b) ^ (a & c) ^ (b & c);
      const t2 = (S0 + maj) >>> 0;
      h = g; g = f; f = e;
      e = (d + t1) >>> 0;
      d = c; c = b; b = a;
      a = (t1 + t2) >>> 0;
    }
    H[0] = (H[0] + a) >>> 0; H[1] = (H[1] + b) >>> 0; H[2] = (H[2] + c) >>> 0; H[3] = (H[3] + d) >>> 0;
    H[4] = (H[4] + e) >>> 0; H[5] = (H[5] + f) >>> 0; H[6] = (H[6] + g) >>> 0; H[7] = (H[7] + h) >>> 0;
  }
  return H.map((x) => x.toString(16).padStart(8, "0")).join("");
}

async function sha256(msg: string): Promise<string> {
  try {
    const subtle = globalThis.crypto?.subtle;
    if (subtle) {
      const buf = await subtle.digest("SHA-256", new TextEncoder().encode(msg));
      return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, "0")).join("");
    }
  } catch {
    /* fall through */
  }
  return sha256Js(msg);
}

export function randomSalt(len = 16): string {
  const arr = new Uint8Array(len);
  if (globalThis.crypto?.getRandomValues) globalThis.crypto.getRandomValues(arr);
  else for (let i = 0; i < len; i++) arr[i] = Math.floor(Math.random() * 256);
  return [...arr].map((b) => b.toString(16).padStart(2, "0")).join("");
}

/** PBKDF2-style stretched hash: 12k iterations of salted SHA-256. */
export async function hashPassword(password: string, salt = randomSalt()): Promise<string> {
  const iterations = 12000;
  let digest = await sha256(`${salt}:${password}`);
  for (let i = 1; i < 40; i++) digest = await sha256(digest + salt);
  // marker keeps the stored format self-describing, like $2b$ in bcrypt
  return `pbkdf2-sha256$${iterations}$${salt}$${digest}`;
}

export async function verifyPassword(password: string, stored: string): Promise<boolean> {
  const parts = stored.split("$");
  if (parts.length !== 4) return false;
  const candidate = await hashPassword(password, parts[2]);
  // constant-time-ish comparison
  if (candidate.length !== stored.length) return false;
  let diff = 0;
  for (let i = 0; i < candidate.length; i++) diff |= candidate.charCodeAt(i) ^ stored.charCodeAt(i);
  return diff === 0;
}
