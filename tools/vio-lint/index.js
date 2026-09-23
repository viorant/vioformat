#!/usr/bin/env node
'use strict';
const fs = require('fs');
const path = require('path');
const { lint } = require('./lint');

const args = process.argv.slice(2);
const json = args.includes('--json');
const files = args.filter(a => !a.startsWith('-'));

if (!files.length) {
  console.error('usage: vio-lint [--json] <file.vio> [more.vio …]');
  process.exit(2);
}

const ICON = { error: '✕', warn: '!', info: '·' };
let worst = 0;
const report = [];

for (const file of files) {
  let src;
  try { src = fs.readFileSync(file, 'utf8'); }
  catch (e) { console.error(`cannot read ${file}: ${e.message}`); process.exit(2); }

  const { ok, findings } = lint(src);
  report.push({ file, ok, findings });
  if (!ok) worst = 1;

  if (json) continue;
  const errs = findings.filter(f => f.level === 'error').length;
  const warns = findings.filter(f => f.level === 'warn').length;
  const verdict = ok ? (warns ? `ACCEPT WITH WARNINGS (${warns})` : 'ACCEPT') : `REJECT (${errs} error${errs > 1 ? 's' : ''}${warns ? `, ${warns} warning${warns > 1 ? 's' : ''}` : ''})`;
  console.log(`\n${path.basename(file)} — ${verdict}`);
  for (const f of findings) {
    if (f.level === 'info' && ok === false) continue;
    console.log(`  ${ICON[f.level]} [${f.rule} §${f.section}] ${f.message}`);
    if (f.detail) console.log(`      ${f.detail}`);
  }
}

if (json) console.log(JSON.stringify(report, null, 2));
process.exit(worst);
