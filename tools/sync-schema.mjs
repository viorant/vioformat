#!/usr/bin/env node
/**
 * Regenerate schema/v1/vio.schema.json from the reference implementation.
 *
 * The structural contract for a .vio bundle has exactly one authority:
 * `VioBundleSchema` in @viorant/shared, which emits `vio-bundle.schema.json`
 * at build time. This repo used to hand-maintain a second, independent copy —
 * and it drifted far enough that every bundle the reference implementation
 * produces was rejected by this repo's own linter, and vice versa.
 *
 * So the committed schema is *generated*, never edited. This script writes it,
 * and `--check` re-derives it and fails on any difference, which is what the
 * conformance workflow runs.
 *
 *   node tools/sync-schema.mjs            # write
 *   node tools/sync-schema.mjs --check    # verify, exit 1 on drift
 *
 * The source checkout defaults to a sibling `viorant-shared/`; override with
 * VIORANT_SHARED_DIR. The implementation is a private package, so this is a
 * developer-run sync rather than a CI dependency — public CI validates the
 * committed schema against the committed fixtures instead, which catches the
 * same drift from the other side.
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const sharedDir = process.env.VIORANT_SHARED_DIR
  ? resolve(process.env.VIORANT_SHARED_DIR)
  : resolve(repoRoot, '..', 'viorant-shared');

const OUT = join(repoRoot, 'schema', 'v1', 'vio.schema.json');

const DESCRIPTION =
  'Structural schema for a .vio bundle, format version 1. NON-NORMATIVE: the ' +
  'specification in spec/v1/index.md is authoritative. GENERATED — do not edit ' +
  'by hand; run `node tools/sync-schema.mjs`. Derived from the reference ' +
  "implementation's bundle schema, so this file and the deployed reader cannot " +
  'disagree. JSON Schema cannot express the format’s cross-cutting rules ' +
  '(trust tiers, digest subjects, connector-scope surfacing, credential ' +
  'invariants); those are checked by tools/vio-lint and by the conformance suite.';

function build() {
  const srcPath = join(sharedDir, 'schemas', 'vio-bundle.schema.json');
  let src;
  try {
    src = JSON.parse(readFileSync(srcPath, 'utf8'));
  } catch (e) {
    console.error(`cannot read the reference schema at ${srcPath}: ${e.message}`);
    console.error('set VIORANT_SHARED_DIR to a checkout of the reference implementation.');
    process.exit(2);
  }

  let version = 'unknown';
  try {
    version = JSON.parse(readFileSync(join(sharedDir, 'package.json'), 'utf8')).version ?? 'unknown';
  } catch { /* provenance is best-effort */ }

  // Identity and provenance first, then the generated body verbatim.
  const { $schema, description: _drop, ...body } = src;
  const out = {
    $schema: $schema ?? 'https://json-schema.org/draft/2020-12/schema',
    $id: 'https://vioformat.org/schema/v1/vio.schema.json',
    title: '.vio artifact bundle',
    description: DESCRIPTION,
    'x-generated-from': { package: '@viorant/shared', version, source: 'schemas/vio-bundle.schema.json' },
    ...body,
  };
  return JSON.stringify(out, null, 2) + '\n';
}

const next = build();

if (process.argv.includes('--check')) {
  let current;
  try {
    current = readFileSync(OUT, 'utf8');
  } catch {
    console.error(`✕ ${OUT} is missing — run: node tools/sync-schema.mjs`);
    process.exit(1);
  }
  if (current !== next) {
    console.error('✕ schema/v1/vio.schema.json has drifted from the reference implementation.');
    console.error('  run: node tools/sync-schema.mjs');
    process.exit(1);
  }
  console.log('✓ schema/v1/vio.schema.json matches the reference implementation');
  process.exit(0);
}

writeFileSync(OUT, next);
const stamp = JSON.parse(next)['x-generated-from'];
console.log(`✓ wrote schema/v1/vio.schema.json from ${stamp.package}@${stamp.version}`);
