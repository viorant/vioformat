'use strict';
/**
 * Cross-cutting constants — the rules JSON Schema cannot express.
 *
 * Structural validation (required keys, types, enums, closed objects) is NOT
 * here any more: it lives in ../../schema/v1/vio.schema.json, which is
 * generated from the reference implementation. This file previously restated
 * those sets by hand and drifted, to the point that every bundle the reference
 * implementation produces was rejected here for missing `manifest.version` and
 * `manifest.signer` — neither of which the format requires.
 */
module.exports = {
  FORMAT_VERSIONS: [1],

  // Trust tiers (§2.1). Authored artifacts may carry a sig; the integrity-only
  // tier never does — you cannot author-sign mutable user data or someone
  // else's weights.
  AUTHORED:  ['prompt', 'skill', 'agent'],
  INTEGRITY: ['memory', 'model'],

  // Bodies that carry a digestable subject. A model is index-only: weights are
  // never embedded, so there is nothing local to digest.
  DIGESTED: ['prompt', 'skill', 'agent', 'memory'],

  // Shapes that must never appear literally in a bundle: credentials ride
  // secret:// and connection:// handles (§1.6, conformance invariants).
  CREDENTIAL_PATTERNS: [
    /sk-[A-Za-z0-9_-]{12,}/,
    /AKIA[0-9A-Z]{12,}/,
    /gh[pousr]_[A-Za-z0-9]{20,}/,
    /-----BEGIN [A-Z ]*PRIVATE KEY-----/,
    /xox[abprs]-[A-Za-z0-9-]{10,}/,
  ],
};
