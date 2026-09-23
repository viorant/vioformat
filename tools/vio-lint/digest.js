'use strict';
/**
 * The digest subject rule, and the primitives it needs.
 *
 * A .vio carries no signatures today, so `manifest.artifacts[].digest` is the
 * whole integrity story: it is the only thing that catches a body edited after
 * the bundle was produced. A conformance suite that never recomputes one
 * cannot test the property the format exists to provide — so this file is a
 * faithful port of the reference implementation's rule, and `lint.js` checks
 * every body against it.
 *
 * Ported from @viorant/shared `src/vio/canonical.ts` and
 * `src/vio/artifact-digest.ts`. Both are dependency-free by construction, so
 * the port adds no runtime dependency here either. The port is verified
 * against the reference implementation by `test/digest-parity.js`, which
 * recomputes every fixture's digests both ways — a divergence fails the suite
 * rather than silently producing a second, wrong definition of the format.
 *
 *   digest = "sha256:" + sha256(utf8(JCS(subject(body))))
 *
 * where `subject` is the body minus `id` and `type`, projected per artifact
 * type. `id` is bundle-local naming, not content, so renaming an artifact must
 * not invalidate its digest; `type` is already carried by the index entry that
 * holds the digest, so including it would bind the same fact twice.
 */

/** RFC 8785 JCS: keys sorted by UTF-16 code unit, no insignificant whitespace. */
function canonicalize(value) {
  if (value === null) return 'null';
  const t = typeof value;
  if (t === 'boolean') return value ? 'true' : 'false';
  if (t === 'number') {
    if (!Number.isFinite(value)) throw new Error(`non-finite number in JCS: ${String(value)}`);
    return JSON.stringify(value);
  }
  if (t === 'string') return JSON.stringify(value);
  if (t === 'undefined') throw new Error('undefined is not permitted in JCS');
  if (t === 'function') throw new Error('functions are not permitted in JCS');
  if (t !== 'object') throw new Error(`unsupported JCS value type: ${t}`);
  if (Array.isArray(value)) return `[${value.map(canonicalize).join(',')}]`;
  const keys = Object.keys(value).sort();
  return `{${keys.map(k => `${JSON.stringify(k)}:${canonicalize(value[k])}`).join(',')}}`;
}

const IV = new Uint32Array([
  0x6a09e667, 0xbb67ae85, 0x3c6ef372, 0xa54ff53a, 0x510e527f, 0x9b05688c, 0x1f83d9ab, 0x5be0cd19,
]);
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
const rotr = (x, n) => ((x >>> n) | (x << (32 - n))) >>> 0;

/** FIPS 180-4 SHA-256, lowercase hex. */
function sha256(bytes) {
  const H = new Uint32Array(IV);
  const bitLen = bytes.length * 8;
  const paddedLen = ((bytes.length + 1 + 8 + 63) & ~63) >>> 0;
  const padded = new Uint8Array(paddedLen);
  padded.set(bytes);
  padded[bytes.length] = 0x80;
  const view = new DataView(padded.buffer);
  view.setUint32(paddedLen - 8, Math.floor(bitLen / 0x100000000), false);
  view.setUint32(paddedLen - 4, bitLen >>> 0, false);

  const w = new Uint32Array(64);
  for (let off = 0; off < paddedLen; off += 64) {
    for (let i = 0; i < 16; i++) w[i] = view.getUint32(off + i * 4, false);
    for (let i = 16; i < 64; i++) {
      const a = w[i - 15], b = w[i - 2];
      const s0 = rotr(a, 7) ^ rotr(a, 18) ^ (a >>> 3);
      const s1 = rotr(b, 17) ^ rotr(b, 19) ^ (b >>> 10);
      w[i] = (w[i - 16] + s0 + w[i - 7] + s1) >>> 0;
    }
    let [a, b, c, d, e, f, g, h] = H;
    for (let i = 0; i < 64; i++) {
      const S1 = rotr(e, 6) ^ rotr(e, 11) ^ rotr(e, 25);
      const ch = (e & f) ^ (~e & g);
      const t1 = (h + S1 + ch + K[i] + w[i]) >>> 0;
      const S0 = rotr(a, 2) ^ rotr(a, 13) ^ rotr(a, 22);
      const maj = (a & b) ^ (a & c) ^ (b & c);
      const t2 = (S0 + maj) >>> 0;
      h = g; g = f; f = e; e = (d + t1) >>> 0;
      d = c; c = b; b = a; a = (t1 + t2) >>> 0;
    }
    H[0] = (H[0] + a) >>> 0; H[1] = (H[1] + b) >>> 0; H[2] = (H[2] + c) >>> 0; H[3] = (H[3] + d) >>> 0;
    H[4] = (H[4] + e) >>> 0; H[5] = (H[5] + f) >>> 0; H[6] = (H[6] + g) >>> 0; H[7] = (H[7] + h) >>> 0;
  }
  let hex = '';
  for (let i = 0; i < 8; i++) hex += H[i].toString(16).padStart(8, '0');
  return hex;
}

/** Assign only when present — absent stays absent, or the JCS bytes change. */
function put(subject, key, value) {
  if (value !== undefined) subject[key] = value;
}

/**
 * The per-type digest subject. `layer` is deliberately excluded from a memory
 * subject: it marks seed-vs-runtime for materialization, not authored content,
 * so adding it would have invalidated every already-deployed bundle's digest.
 * A skill's `tools` IS inside the subject — widening a connector scope must
 * change the digest, not ride along under an unchanged one.
 */
function artifactSubject(body) {
  const s = {};
  switch (body.type) {
    case 'prompt':
      s.mode = body.mode;
      s.content = body.content;
      put(s, 'variables', body.variables);
      put(s, 'bindings', body.bindings);
      return s;
    case 'skill':
      put(s, 'entry', body.entry);
      put(s, 'content', body.content);
      put(s, 'files', body.files);
      put(s, 'tools', body.tools);
      return s;
    case 'agent':
      return { content: body.content };
    case 'memory':
      return { content: body.content };
    default:
      throw new Error(`unsupported .vio artifact body type: ${JSON.stringify(body.type)}`);
  }
}

const encoder = new TextEncoder();

/** Canonical digest of an artifact body, as `sha256:<hex>`. */
function artifactDigest(body) {
  return `sha256:${sha256(encoder.encode(canonicalize(artifactSubject(body))))}`;
}

module.exports = { canonicalize, sha256, artifactSubject, artifactDigest };
