'use strict';
const yaml = require('js-yaml');
const R = require('./rules');

/**
 * Level 1 (Reader) lint of a .vio document.
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
  // Strip block-scalar bodies and comments first: a `{{var}}` or a stray `*` inside a
  // prompt body is content, not YAML syntax.
  const scanned = src
    .split('\n')
    .filter(l => !/^\s*#/.test(l))
    .join('\n');
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

  // --- §1 top level ------------------------------------------------------------
  const v = doc.vio;
  if (!Number.isInteger(v)) err('unsupported_version', '1', '`vio` must be an integer', `Got ${JSON.stringify(v)}`);
  else if (!R.FORMAT_VERSIONS.includes(v))
    err('unsupported_version', '1', `Format version ${v} is not implemented by this reader`,
        'A conforming reader rejects versions it does not implement rather than guessing.');

  const extra = Object.keys(doc).filter(k => !['vio', 'manifest', 'artifacts'].includes(k));
  if (extra.length) warn('top_level', '1', `Unknown top-level keys: ${extra.join(', ')}`);

  const m = doc.manifest;
  if (!m || typeof m !== 'object') { err('manifest_required', '1.2', '`manifest` missing'); return done(); }

  // --- §1.2 manifest -----------------------------------------------------------
  for (const k of ['id', 'name', 'version', 'composition', 'signer', 'created', 'artifacts'])
    if (!(k in m)) err('manifest_required', '1.2', `manifest.${k} missing`);

  if (m.composition !== undefined && !R.COMPOSITION.includes(m.composition))
    err('reserved_value', '1.2', `manifest.composition "${m.composition}" is reserved`, `Valid: ${R.COMPOSITION.join(', ')}`);
  if (m.composition === 'agent' && !m.framework)
    warn('manifest_required', '1.2', 'composition is `agent` but manifest.framework is unset', 'No adapter can be selected.');
  if (m.signer && !(m.signer.certificate_id && m.signer.algo_id !== undefined))
    err('manifest_required', '1.2', 'manifest.signer must carry certificate_id and algo_id');
  if (m.created !== undefined) {
    const c = m.created instanceof Date ? m.created.toISOString() : String(m.created);
    if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d+)?Z$/.test(c))
      warn('manifest_required', '1.2', 'manifest.created should be ISO-8601 UTC', `Got ${c}`);
  }

  // --- §1.3 artifact index -----------------------------------------------------
  const index = Array.isArray(m.artifacts) ? m.artifacts : [];
  if (!index.length) err('manifest_required', '1.3', 'manifest.artifacts[] is empty');

  const bodies = Array.isArray(doc.artifacts) ? doc.artifacts : [];
  const bodyById = Object.create(null);
  for (const b of bodies) if (b && b.id) bodyById[b.id] = b;

  const seen = new Set();
  for (const a of index) {
    const tag = `manifest.artifacts[${a && a.id ? a.id : '?'}]`;
    if (!a || !a.id) { err('manifest_required', '1.3', `${tag} has no id`); continue; }
    if (seen.has(a.id)) err('manifest_required', '1.3', `${tag} duplicate id`);
    seen.add(a.id);

    if (!R.TYPE.includes(a.type))
      err('reserved_value', '1.3', `${tag} type "${a.type}" is reserved`, `Valid: ${R.TYPE.join(', ')}`);
    if (!R.DEPLOY.includes(a.deploy))
      err('reserved_value', '1.3', `${tag} deploy "${a.deploy}" is reserved`, `Valid: ${R.DEPLOY.join(', ')}`);
    if (!/^sha256:[0-9a-f]+$/i.test(String(a.digest || '')))
      err('digest_shape', '1.3', `${tag} digest must be sha256:…`, `Got ${JSON.stringify(a.digest)}`);

    if (a.type === 'skill') {
      if (a.kind !== undefined && !R.SKILL_KIND.includes(a.kind))
        err('reserved_value', '1.3', `${tag} kind "${a.kind}" is reserved`, `Valid: ${R.SKILL_KIND.join(', ')}`);
      if (a.kind === 'executable' && !R.SKILL_RT.includes(a.runtime))
        err('reserved_value', '1.3', `${tag} executable skill needs runtime python|js`, `Got ${JSON.stringify(a.runtime)}`);
    }

    const authored = R.AUTHORED.includes(a.type);
    if (authored && !('sig' in a))
      warn('missing_signature', '3', `${tag} is authored (${a.type}) but carries no sig`,
           'Signing is optional; a Level 3 deployer will refuse an unsigned bundle.');
    if (!authored && ('sig' in a))
      err('trust_tier', '2.1', `${tag} is ${a.type} — integrity-only tier — but carries a sig`,
          'Memory and model are digest-pinned, never author-signed.');

    if (a.type === 'model') {
      if (!a.ref) err('model_body', '1.7', `${tag} model must carry a ref`);
      if (bodyById[a.id] && (bodyById[a.id].content || bodyById[a.id].files))
        err('model_body', '1.7', `${tag} model carries a body`, 'Weights are never embedded.');
      if (a.engine === undefined)
        warn('model_body', '1.7', `${tag} model has no engine descriptor`, 'A deployer cannot select an inference base image.');
    } else if (!a.ref && !bodyById[a.id]) {
      err('manifest_required', '1.1', `${tag} has neither a body nor a ref`);
    }
    if (a.ref && bodyById[a.id] && bodyById[a.id].content)
      warn('manifest_required', '1.1', `${tag} has both a ref and a body`);
  }

  // --- bodies ------------------------------------------------------------------
  for (const b of bodies) {
    if (!b || !b.id) continue;
    const tag = `artifacts[${b.id}]`;
    if (!seen.has(b.id))
      err('orphan_body', '1.3', `${tag} has no manifest index entry`,
          'A body outside the index is outside the signed manifest.');

    if (b.type === 'prompt') {
      if (b.mode !== undefined && !R.PROMPT_MODE.includes(b.mode))
        err('reserved_value', '1.5', `${tag} mode "${b.mode}" is reserved`, `Valid: ${R.PROMPT_MODE.join(', ')}`);
      const declared = (b.variables || []).map(x => x && x.name);
      for (const vr of b.variables || [])
        if (!R.VAR_SOURCE.includes(vr && vr.source))
          err('reserved_value', '1.5', `${tag} variable ${vr && vr.name} source "${vr && vr.source}" is reserved`,
              `Valid: ${R.VAR_SOURCE.join(', ')}`);
      const text = (b.content && typeof b.content === 'object')
        ? Object.values(b.content).join('\n') : String(b.content || '');
      for (const slot of text.match(/\{\{\s*([A-Za-z_]\w*)\s*\}\}/g) || []) {
        const name = slot.replace(/[{}\s]/g, '');
        if (!declared.includes(name))
          err('undeclared_variable', '2.4', `${tag} uses {{${name}}} but does not declare it in variables[]`,
              'A stray slot is a signature-relevant change.');
      }
      for (const k of Object.keys(b.bindings || {}))
        if (!declared.includes(k)) warn('undeclared_variable', '1.5', `${tag} binds "${k}", which is not a declared variable`);
    }

    if (b.type === 'skill') {
      for (const t of b.tools || []) {
        if (!R.TOOL_KIND.includes(t && t.kind))
          err('reserved_value', '1.6', `${tag} tool ${t && t.ref} kind "${t && t.kind}" is reserved`,
              `Valid: ${R.TOOL_KIND.join(', ')}`);
        if (t && t.kind === 'mcp') {
          if (!t.connector) err('reserved_value', '1.6', `${tag} mcp tool ${t.ref} has no connector`);
          if (!Array.isArray(t.scopes) || !t.scopes.length)
            warn('scope_widening', '1.6', `${tag} mcp tool ${t.ref} declares no scopes`, 'Least privilege expects an explicit scope list.');
        }
      }
    }

    if (b.type === 'memory') {
      if (b.layer !== undefined && !R.MEMORY_LAYER.includes(b.layer))
        err('reserved_value', '1.8', `${tag} layer "${b.layer}" is reserved`, `Valid: ${R.MEMORY_LAYER.join(', ')}`);
      else info('reserved_value', '1.8', `${tag} memory layer: ${b.layer || 'seed (default)'}`);
    }
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
            'A widened capability surface would break the skill signature.');
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
       'Level 1 has no key registry. A Level 2 verifier recomputes digests over the canonical form and checks each sig and the vio_bundle signature.');

  return done();
}

module.exports = { lint, rules: R };
