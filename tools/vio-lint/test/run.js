#!/usr/bin/env node
'use strict';
// Runs the conformance case manifest against the linter.
const fs = require('fs');
const path = require('path');
const yaml = require('js-yaml');
const { lint } = require('../lint');

const ROOT = path.resolve(__dirname, '..', '..', '..');
const manifest = yaml.load(fs.readFileSync(path.join(ROOT, 'conformance/v1/cases.yaml'), 'utf8'));

let pass = 0, fail = 0;
for (const c of manifest.cases) {
  const src = fs.readFileSync(path.join(ROOT, c.file), 'utf8');
  const { ok, findings } = lint(src);
  const got = ok ? 'accept' : 'reject';
  const rules = findings.filter(f => f.level === 'error').map(f => f.rule);
  const warns = findings.filter(f => f.level === 'warn').map(f => f.rule);

  let bad = null;
  if (got !== c.expect) bad = `expected ${c.expect}, got ${got} [${rules.join(', ') || '—'}]`;
  else if (c.rule && !rules.includes(c.rule)) bad = `expected rule ${c.rule}, got [${rules.join(', ') || '—'}]`;
  else if (c.warnings) {
    const missing = c.warnings.filter(w => !warns.includes(w));
    if (missing.length) bad = `expected warning ${missing.join(', ')}, got [${warns.join(', ') || '—'}]`;
  }

  if (bad) { fail++; console.log(`✕ ${c.file}\n    ${bad}`); }
  else { pass++; console.log(`✓ ${c.file} — ${got}${c.rule ? ` (${c.rule})` : ''}`); }
}

console.log(`\n${pass} passed, ${fail} failed, ${manifest.cases.length} cases`);
process.exit(fail ? 1 : 0);
