'use strict';
const yaml = require('js-yaml');
const Ajv = require('ajv/dist/2020');
const R = require('./rules');
const { artifactDigest } = require('./digest');
const schema = require('../../schema/v1/vio.schema.json');

const ajv = new Ajv({ allErrors: true, strict: false });
const validateStructure = ajv.compile(schema);

const TOP_LEVEL = ['vio', 'manifest', 'artifacts'];

/**
 * Level 1 (Reader) lint of a .vio document.
 *
 * Two layers, deliberately separated:
 *   1. Structure — delegated to the generated schema, so this linter and the
 *      deployed reader cannot disagree about what a .vio is.
 *   2. Cross-cutting rules — trust tiers, digest subjects, connector-scope
 *      surfacing, credential literals, parser-independence. JSON Schema cannot
 *      express any of these, and they are where the format's guarantees live.
 *
 * @param {string} src raw file text
 * @returns {{ok:boolean, findings:Array<{level:'error'|'warn'|'info', rule:string, section:string, message:string, detail?:string}>}}
 */
function lint(src) {
  const f = [];
  const err  = (rule, section, message, detail) => f.push({ level: 'error', rule, section, message, detail });
  const warn = (rule, section, message, detail) => f.push({ level: 'warn',  rule, section, message, detail });
  const info = (rule, section, message, detail) => f.push({ level: 'info',  rule, section, message, detail });
  const done = () => ({ ok: !f.some(x => x.level === 'error'), findings: f });

  // --- §1 plain-YAML guarantee -------------------------------------------------
  const scanned = src.split('\n').filter(l => !/^\s*#/.test(l)).join('\n');
  if (/(^|\s)&[A-Za-z_][\w-]*\s*$/m.test(scanned) || /(^|\s)\*[A-Za-z_][\w-]*\s*$/m.test(scanned))
    err('plain_yaml', '1', 'Anchors or aliases present', 'The portable YAML core forbids & anchors and * aliases.');
  if (/(^|\s)!!?[A-Za-z][\w:.-]*\s/.test(scanned))
    err('plain_yaml', '1', 'Custom tag present', 'The portable YAML core forbids !tags.');
  if (/^\s*<<\s*:/m.test(scanned))
    err('plain_yaml', '1', 'Merge key present', 'The portable YAML core forbids <<.');

  // --- §1 parse ----------------------------------------------------------------
  let doc;
  try {
    doc = yaml.load(src, { schema: yaml.CORE_SCHEMA });
  } catch (e) {
    err('parse', '1', 'Does not parse with a stock YAML parser', String(e.message || e).split('\n')[0]);
    return done();
  }
  if (!doc || typeof doc !== 'object' || Array.isArray(doc)) {
    err('parse', '1', 'Document is not a mapping');
    return done();
  }

  // The plain-YAML guarantee is a claim about *every* parser, so test it rather
  // than assert it: a value whose scalar resolution differs between YAML cores
  // (an unquoted timestamp, `0x02`, `yes`) makes the bundle mean different
  // things to different readers — and a body that resolves differently changes
  // its digest.
  try {
    const dflt = yaml.load(src, { schema: yaml.DEFAULT_SCHEMA });
    if (JSON.stringify(dflt) !== JSON.stringify(doc))
      err('parser_dependent', '1', 'Scalar resolution differs between YAML schemas',
          'Quote values whose type depends on the parser (timestamps, 0x-prefixed numbers, yes/no). ' +
          'Two conforming parsers must not disagree about what this file says.');
  } catch { /* the CORE parse already succeeded; a default-schema failure is not this rule's business */ }

  // --- §1 top level ------------------------------------------------------------
  const v = doc.vio;
  if (!Number.isInteger(v)) err('unsupported_version', '1', '`vio` must be an integer', `Got ${JSON.stringify(v)}`);
  else if (!R.FORMAT_VERSIONS.includes(v))
    err('unsupported_version', '1', `Format version ${v} is not implemented by this reader`,
        'A conforming reader rejects versions it does not implement rather than guessing.');

  const extra = Object.keys(doc).filter(k => !TOP_LEVEL.includes(k));
  if (extra.length)
    err('schema', '1', `Unknown top-level keys: ${extra.join(', ')}`,
        'Every object in a .vio is closed. An unknown key is rejected, not ignored — ' +
        'which is why an additive field costs a format version.');

  // --- structure, per the generated schema -------------------------------------
  if (!validateStructure(doc)) {
    const seen = new Set();
    for (const e of validateStructure.errors || []) {
      const where = e.instancePath || '(root)';
      const rule = (e.keyword === 'enum' || e.keyword === 'const') ? 'reserved_value' : 'schema';
      const msg = `${where} ${e.message}`;
      if (seen.has(msg)) continue;
      seen.add(msg);
      const detail = e.keyword === 'enum' && e.params && e.params.allowedValues
        ? `Valid: ${e.params.allowedValues.join(', ')}. A value outside the set is reserved; a reader rejects rather than guessing.`
        : undefined;
      err(rule, '1.2', msg, detail);
    }
  }

  const m = doc.manifest;
  if (!m || typeof m !== 'object') return done();
  const index  = Array.isArray(m.artifacts) ? m.artifacts : [];
  const bodies = Array.isArray(doc.artifacts) ? doc.artifacts : [];
  const bodyById = Object.create(null);
  for (const b of bodies) if (b && b.id) bodyById[b.id] = b;
  const indexed = new Set(index.map(a => a && a.id).filter(Boolean));

  if (m.composition === 'agent' && !m.framework)
    warn('manifest_required', '1.2', 'composition is `agent` but manifest.framework is unset', 'No adapter can be selected.');

  // --- §2.1 trust tier + §2.3 digest -------------------------------------------
  for (const a of index) {
    if (!a || !a.id) continue;
    const tag = `manifest.artifacts[${a.id}]`;

    const authored = R.AUTHORED.includes(a.type);
    if (authored && !('sig' in a))
      warn('missing_signature', '3', `${tag} is authored (${a.type}) but carries no sig`,
           'Signing is optional; a Level 3 deployer will refuse an unsigned bundle.');
    if (!authored && ('sig' in a))
      err('trust_tier', '2.1', `${tag} is ${a.type} — integrity-only tier — but carries a sig`,
          'Memory and model are digest-pinned, never author-signed.');

    if (a.type === 'model') {
      if (bodyById[a.id])
        err('model_body', '1.7', `${tag} model carries a body`, 'Weights are never embedded.');
      continue;
    }

    const body = bodyById[a.id];
    if (!body) {
      if (!a.ref) err('missing_body', '1.3', `${tag} has neither a body nor a ref`);
      continue;
    }

    // The integrity check. With signing out of phase this is the only thing
    // standing between a bundle and an edited body.
    let computed;
    try { computed = artifactDigest(body); }
    catch (e) { err('digest_subject', '2.3', `${tag} body cannot be digested`, e.message); continue; }
    if (computed !== a.digest)
      err('digest_mismatch', '2.3', `${tag} digest does not match its body`,
          `manifest: ${a.digest}\n      computed: ${computed}\n      ` +
          'The digest subject is the body minus `id` and `type`, canonicalized per RFC 8785.');
  }

  // --- bodies ------------------------------------------------------------------
  for (const b of bodies) {
    if (!b || !b.id) continue;
    const tag = `artifacts[${b.id}]`;
    if (!indexed.has(b.id))
      err('orphan_body', '1.3', `${tag} has no manifest index entry`,
          'A body outside the index is outside the manifest, so nothing pins it.');

    if (b.type === 'prompt') {
      const declared = (b.variables || []).map(x => x && x.name);
      const text = (b.content && typeof b.content === 'object')
        ? Object.values(b.content).join('\n') : String(b.content || '');
      for (const slot of text.match(/\{\{\s*([A-Za-z_]\w*)\s*\}\}/g) || []) {
        const name = slot.replace(/[{}\s]/g, '');
        if (!declared.includes(name))
          err('undeclared_variable', '2.4', `${tag} uses {{${name}}} but does not declare it in variables[]`,
              'An undeclared slot can never be bound, so the run fails after verification rather than before.');
      }
      for (const k of Object.keys(b.bindings || {}))
        if (!declared.includes(k)) warn('undeclared_variable', '1.5', `${tag} binds "${k}", which is not a declared variable`);
    }

    if (b.type === 'skill') {
      for (const t of b.tools || []) {
        if (t && t.kind === 'mcp' && (!Array.isArray(t.scopes) || !t.scopes.length))
          warn('scope_widening', '1.6', `${tag} mcp tool ${t.ref} declares no scopes`, 'Least privilege expects an explicit scope list.');
      }
    }

    if (b.type === 'memory')
      info('memory_layer', '1.8', `${tag} memory layer: ${b.layer || 'seed (default)'}`);
  }

  // --- §1.6 connector surfacing ------------------------------------------------
  const declaredConn = Object.create(null);
  for (const r of m.requires || []) if (r && r.connector) declaredConn[r.connector] = r;
  for (const b of bodies) {
    if (!b || b.type !== 'skill') continue;
    for (const t of b.tools || []) {
      if (!t || t.kind !== 'mcp' || !t.connector) continue;
      const d = declaredConn[t.connector];
      if (!d) {
        err('scope_widening', '1.6', `Skill ${b.id} uses connector ${t.connector}, not surfaced in manifest.requires[]`,
            'A deployer gates connector auth from the manifest without parsing bodies.');
        continue;
      }
      const beyond = (t.scopes || []).filter(s => !(d.scopes || []).includes(s));
      if (beyond.length)
        err('scope_widening', '1.6', `Skill ${b.id} requests scope ${beyond.join(', ')} on ${t.connector} beyond manifest.requires[]`,
            'Capability is inside the digest; widening it here would not be covered by what the manifest surfaces.');
      const undeclaredTools = [t.ref].filter(x => x && Array.isArray(d.tools) && !d.tools.includes(x));
      if (undeclaredTools.length)
        err('scope_widening', '1.6', `Skill ${b.id} calls ${undeclaredTools.join(', ')} on ${t.connector}, not listed in manifest.requires[].tools`,
            'The enabled-tool list is explicit and never a wildcard.');
    }
  }

  // --- conformance invariant: no credential literals ----------------------------
  for (const re of R.CREDENTIAL_PATTERNS) {
    const hit = src.match(re);
    if (hit) {
      err('credential_literal', 'conformance-invariants',
          `Credential-shaped literal in the file: ${hit[0].slice(0, 10)}…`,
          'Credentials ride secret:// and connection:// handles. This bundle is non-conforming regardless of signatures.');
      break;
    }
  }

  info('signature', '2', 'Signatures not verified',
       'Level 1 has no key registry. A Level 2 verifier additionally checks each sig and the vio_bundle signature.');

  return done();
}

module.exports = { lint, rules: R };
