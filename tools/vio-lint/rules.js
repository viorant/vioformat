'use strict';
// Reserved value sets — spec/v1/reference.md. A value outside a set is reserved, and a
// conforming reader rejects rather than guessing (spec §1.4, property 3).
module.exports = {
  FORMAT_VERSIONS: [1],
  COMPOSITION: ['agent', 'prompt', 'skill', 'memory', 'model', 'bundle'],
  TYPE:        ['prompt', 'skill', 'memory', 'model', 'agent'],
  DEPLOY:      ['runtime', 'runtime/standalone', 'registry', 'store'],
  SKILL_KIND:  ['declarative', 'executable'],
  SKILL_RT:    ['python', 'js'],
  VAR_SOURCE:  ['input', 'env', 'task', 'connector', 'secret', 'static'],
  TOOL_KIND:   ['viorant', 'mcp'],
  PROMPT_MODE: ['chat', 'single_shot'],
  MEMORY_LAYER:['seed', 'runtime'],
  AUTHORED:    ['prompt', 'skill', 'agent'],   // signed tier (§2.1)
  INTEGRITY:   ['memory', 'model'],            // digest-only tier (§2.1)
  // Shapes that must never appear literally in a bundle: credentials ride
  // secret:// and connection:// handles (§1.6, conformance invariants).
  CREDENTIAL_PATTERNS: [
    /sk-[A-Za-z0-9_-]{12,}/,
    /AKIA[0-9A-Z]{12,}/,
    /gh[pousr]_[A-Za-z0-9]{20,}/,
    /-----BEGIN [A-Z ]*PRIVATE KEY-----/,
    /xox[abprs]-[A-Za-z0-9-]{10,}/
  ]
};
