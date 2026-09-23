#!/usr/bin/env node
'use strict';
/**
 * Parity against the reference implementation.
 *
 * The conformance suite proves this repo is self-consistent. It cannot prove
 * the thing that actually matters — that this repo and the deployed reader
 * agree about what a .vio is. They did not: every fixture this repo called
 * valid was rejected by the reference implementation, and every bundle the
 * reference implementation produces was rejected here. Both suites were green
 * throughout, because neither ever ran the other's inputs.
 *
 * So this test runs both. Three assertions:
 *   1. Digest parity — the ported rule in digest.js reproduces the reference
 *      implementation's digest for every body in every fixture.
 *   2. Accept parity — every fixture this repo calls valid is accepted by the
 *      reference parser.
 *   3. Reject parity — anything the reference parser rejects is also rejected
 *      here. (Not the converse: the cross-cutting rules are this linter's job,
 *      so it legitimately rejects bundles that are structurally fine.)
 *
 * The reference implementation is a private package, so this skips cleanly
 * when it is absent — public CI runs the conformance suite alone.
 */
const fs = require('fs');
const path = require('path');
const yaml = require('js-yaml');
const { lint } = require('../lint');
const { artifactDigest } = require('../digest');

const ROOT = path.resolve(__dirname, '..', '..', '..');
const sharedDir = process.env.VIORANT_SHARED_DIR
  ? path.resolve(process.env.VIORANT_SHARED_DIR)
  : path.resolve(ROOT, '..', 'viorant-shared');

(async () => {
  let ref;
  try {
    ref = await import(path.join(sharedDir, 'dist', 'index.js'));
    if (!ref.parseVioBundle || !ref.vioArtifactDigest) throw new Error('unexpected exports');
  } catch (e) {
    console.log(`· parity skipped — reference implementation not available at ${sharedDir}`);
    console.log('  (set VIORANT_SHARED_DIR, or build it, to run this check)');
    process.exit(0);
  }

  const files = [];
  for (const bucket of ['valid', 'invalid']) {
    const dir = path.join(ROOT, 'examples', bucket);
    for (const f of fs.readdirSync(dir).sort()) files.push({ bucket, rel: `examples/${bucket}/${f}`, abs: path.join(dir, f) });
  }

  let pass = 0, fail = 0;
  const bad = (msg) => { fail++; console.log(`✕ ${msg}`); };

  for (const { bucket, rel, abs } of files) {
    const src = fs.readFileSync(abs, 'utf8');

    // 1. digest parity — every digestable body, both ways
    let doc = null;
    try { doc = yaml.load(src, { schema: yaml.CORE_SCHEMA }); } catch { /* covered elsewhere */ }
    if (doc && Array.isArray(doc.artifacts)) {
      for (const body of doc.artifacts) {
        if (!body || !body.type || body.type === 'model') continue;
        let mine = null, theirs = null;
        try { mine = artifactDigest(body); } catch (e) { mine = `error: ${e.message}`; }
        try { theirs = ref.vioArtifactDigest(body); } catch (e) { theirs = `error: ${e.message}`; }
        if (mine !== theirs) bad(`${rel} [${body.id}] digest port diverges\n    ours: ${mine}\n    ref:  ${theirs}`);
        else pass++;
      }
    }

    // 2 & 3. accept / reject parity
    const here = lint(src).ok;
    const there = ref.parseVioBundle(src).ok;

    if (bucket === 'valid') {
      if (!there) bad(`${rel} is a valid fixture but the reference parser rejects it`);
      else if (!here) bad(`${rel} is a valid fixture but this linter rejects it`);
      else pass++;
    } else if (there === false && here === false) {
      pass++;
    } else if (there === false && here === true) {
      bad(`${rel} is rejected by the reference parser but accepted here`);
    } else {
      // Structurally fine, rejected here by a cross-cutting rule. Expected.
      pass++;
    }
  }

  console.log(`\n${pass} parity checks passed, ${fail} failed`);
  process.exit(fail ? 1 : 0);
})();
