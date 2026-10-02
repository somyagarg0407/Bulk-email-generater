import { test } from 'node:test';
import assert from 'node:assert/strict';
import { computeRecipients, resolveScope } from '../src/services/recipientGenerator.core.js';
import { formatRecipients } from '../src/services/export.service.js';
import { generateRuleRange, resolveRoll, rulesCollide } from '../src/utils/rollNumber.js';
import { DEFAULT_BATCH_YEARS, DEFAULT_BRANCHES, prefixFor } from '../src/config/defaultRules.js';

const mkConfig = () => ({
  batches: DEFAULT_BATCH_YEARS.map((year) => ({ year, active: true })),
  branches: DEFAULT_BRANCHES.map((b) => ({ key: b.key, name: b.name, sortOrder: b.sortOrder, active: true })),
  rules: DEFAULT_BATCH_YEARS.flatMap((batch) => DEFAULT_BRANCHES.map((b) => ({
    batch, branch: b.key, prefix: prefixFor(batch, b.code), startSequence: 1, endSequence: b.max, sequenceWidth: 3, active: true,
  }))),
});
const universe = (rules, cfg) => {
  const order = new Map(cfg.branches.map((b) => [b.key, b.sortOrder]));
  return rules.flatMap((r) => generateRuleRange(r, { domain: 'nitdelhi.ac.in', branchOrder: order.get(r.branch) }));
};
// Mirrors what the service does: scope -> universe -> engine.
const run = (spec, cfg = mkConfig()) => {
  const full = { batches: [], branches: [], selection: { mode: 'ALL' }, ...spec };
  const { scope, usable, warnings } = resolveScope(full, cfg);
  const out = computeRecipients(full, universe(scope, cfg), universe(usable, cfg));
  out.warnings.unshift(...warnings);
  return out;
};

test('entire batch / entire branch across batches', () => {
  assert.equal(run({ batches: [2025], allBranches: true }).stats.final, 26 + 26 + 26 + 140 + 60 + 65 + 45 + 26);
  for (const y of [2023, 2024, 2025, 2026]) assert.equal(run({ batches: [y], branches: ['CSE'] }).stats.final, 140);
  assert.equal(run({ allBatches: true, branches: ['CSE'] }).stats.final, 560);
});

test('expected first/last emails for every batch', () => {
  for (const y of [2023, 2024, 2025, 2026]) {
    const r = run({ batches: [y], branches: ['CSE'] }).recipients;
    assert.equal(r[0].email, `${String(y).slice(2)}1210001@nitdelhi.ac.in`);
    assert.equal(r.at(-1).email, `${String(y).slice(2)}1210140@nitdelhi.ac.in`);
  }
});

test('specific roll numbers across groups with mixed separators', () => {
  const r = run({ selection: { mode: 'ROLLS', rollNumbers: '251210001;251210015 251210029\n251220001, nope, 251210141' } });
  assert.equal(r.stats.final, 4);
  assert.deepEqual(r.invalid.map((i) => i.value).sort(), ['251210141', 'nope']);
});

test('empty batches / branches produce clear errors', () => {
  assert.throws(() => run({ branches: ['CSE'] }), /No batches selected/);
  assert.throws(() => run({ batches: [2025] }), /No branches selected/);
});

test('inactive batch / branch / rule are never used', () => {
  const cfg = mkConfig();
  cfg.batches.find((b) => b.year === 2024).active = false;
  const r = run({ batches: [2024, 2025], branches: ['CSE'] }, cfg);
  assert.equal(r.stats.final, 140);
  assert.ok(r.warnings.some((w) => /UG 2024 is inactive/.test(w)));
  assert.throws(() => run({ batches: [2024], branches: ['CSE'] }, cfg), /inactive or not configured/);

  const cfg2 = mkConfig();
  cfg2.branches.find((b) => b.key === 'ECE').active = false;
  const r2 = run({ batches: [2025], branches: ['CSE', 'ECE'] }, cfg2);
  assert.equal(r2.stats.final, 140);
  assert.ok(r2.warnings.some((w) => /ECE is inactive/.test(w)));
  assert.equal(run({ batches: [2025], allBranches: true }, cfg2).stats.final, 414 - 65);

  const cfg3 = mkConfig();
  cfg3.rules.find((x) => x.batch === 2025 && x.branch === 'CSE').active = false;
  assert.throws(() => run({ batches: [2025], branches: ['CSE'] }, cfg3), /inactive or not configured/);
  const r3 = run({ batches: [2025], branches: ['CSE', 'ECE'] }, cfg3);
  assert.equal(r3.stats.final, 65);
  assert.ok(r3.warnings.some((w) => /CSE UG 2025: no active roll-number rule/.test(w)));
});

test('unknown batch/branch is reported, not ignored', () => {
  const r = run({ batches: [2025, 1999], branches: ['CSE', 'XYZ'] });
  assert.equal(r.stats.final, 140);
  assert.ok(r.warnings.some((w) => /UG 1999 is not configured/.test(w)));
  assert.ok(r.warnings.some((w) => /XYZ is not configured/.test(w)));
});

test('duplicate batches / branches in the request do not duplicate recipients', () => {
  assert.equal(run({ batches: [2025, 2025], branches: ['CSE', 'CSE', 'cse'] }).stats.final, 140);
});

test('range: beyond max is clamped, fully outside warns and yields empty', () => {
  const clamp = run({ batches: [2025], branches: ['CSE'], selection: { mode: 'RANGE', start: 100, end: 500 } });
  assert.equal(clamp.stats.final, 41);
  assert.equal(clamp.warnings.length, 1);
  const outside = run({ batches: [2025], branches: ['CSE'], selection: { mode: 'RANGE', start: 200, end: 300 } });
  assert.equal(outside.stats.final, 0);
  assert.ok(outside.warnings.some((w) => /no students in 200–300/.test(w)));
  assert.ok(outside.warnings.includes('No recipients generated.'));
});

test('range applies to each selected branch independently', () => {
  const r = run({ batches: [2025], branches: ['CSE', 'AEROSPACE'], selection: { mode: 'RANGE', start: 20, end: 30 } });
  // CSE 020-030 = 11, Aerospace 020-026 = 7 (+ a clamp warning)
  assert.equal(r.stats.final, 18);
  assert.equal(r.warnings.length, 1);
});

test('exclusions: spec example, nonexistent and duplicates', () => {
  const r = run({ batches: [2025], branches: ['CSE'], exclusions: '251210014 251210057 251210102 251210014 251299999' });
  assert.deepEqual([r.stats.generated, r.stats.excluded, r.stats.final], [140, 3, 137]);
  assert.ok(r.warnings.some((w) => /1 excluded roll number/.test(w)));
});

test('additions from another group; already-selected add is a no-op; invalid add is reported', () => {
  const r = run({ batches: [2025], branches: ['CSE'], additions: '251220001 251210005 251220999 12x' });
  assert.equal(r.stats.added, 1);
  assert.equal(r.stats.final, 141);
  assert.equal(r.invalid.length, 2);
  assert.equal(r.recipients.filter((x) => x.rollNumber === '251210005').length, 1);
});

test('excluding an added recipient removes it', () => {
  const r = run({ batches: [2025], branches: ['CSE'], additions: '251220001', exclusions: '251220001' });
  assert.equal(r.stats.final, 140);
});

test('admin config change is reflected immediately (140 -> 137)', () => {
  const cfg = mkConfig();
  assert.equal(run({ batches: [2025], branches: ['CSE'] }, cfg).stats.final, 140);
  cfg.rules.find((x) => x.batch === 2025 && x.branch === 'CSE').endSequence = 137;
  const r = run({ batches: [2025], branches: ['CSE'] }, cfg);
  assert.equal(r.stats.final, 137);
  assert.equal(r.recipients.at(-1).rollNumber, '251210137');
});

test('a generated result is a plain value: later config changes cannot alter it (snapshot basis)', () => {
  const cfg = mkConfig();
  const before = run({ batches: [2025], branches: ['CSE'] }, cfg);
  const frozen = JSON.stringify(before.recipients);
  cfg.rules.find((x) => x.batch === 2025 && x.branch === 'CSE').endSequence = 137;
  assert.equal(JSON.stringify(before.recipients), frozen);
});

test('overlapping prefixes: collisions are detected and resolution is deterministic', () => {
  const A = { batch: 2025, branch: 'A', prefix: '25121', sequenceWidth: 4, startSequence: 1, endSequence: 50 };
  const B = { batch: 2025, branch: 'B', prefix: '251210', sequenceWidth: 3, startSequence: 1, endSequence: 140 };
  assert.equal(rulesCollide(A, B), true); // both can produce 251210001
  assert.equal(rulesCollide(B, { ...B, branch: 'C', startSequence: 141, endSequence: 150 }), false);
  assert.equal(rulesCollide(B, { ...B, prefix: '251220' }), false);
  assert.equal(rulesCollide(B, { ...B, sequenceWidth: 4 }), false); // different length => different roll numbers
  const r = run({ batches: [2025], branches: ['A', 'B'] }, { ...mkConfig(), branches: [{ key: 'A', name: 'A', sortOrder: 1, active: true }, { key: 'B', name: 'B', sortOrder: 2, active: true }], rules: [A, B].map((x) => ({ ...x, active: true })) });
  assert.equal(new Set(r.recipients.map((x) => x.rollNumber)).size, r.recipients.length); // never duplicated
  assert.equal(resolveRoll('251210141', [B]), null);
});

test('malformed text is reported, not dropped', () => {
  const r = run({ selection: { mode: 'ROLLS', rollNumbers: '25121000A, ###, 251210001' } });
  assert.equal(r.stats.final, 1);
  assert.equal(r.invalid.length, 2);
  assert.throws(() => run({ selection: { mode: 'ROLLS', rollNumbers: '  ' } }), /No roll numbers provided/);
});

test('invalid ranges throw', () => {
  for (const [start, end] of [[10, 5], [0, 5], [1.5, 3]]) {
    assert.throws(() => run({ batches: [2025], branches: ['CSE'], selection: { mode: 'RANGE', start, end } }), /Invalid roll-number range/);
  }
});

test('export formats', () => {
  const rec = [
    { rollNumber: '251210001', email: '251210001@nitdelhi.ac.in', batch: 2025, branch: 'CSE' },
    { rollNumber: '251210002', email: '251210002@nitdelhi.ac.in', batch: 2025, branch: 'CSE' },
  ];
  assert.equal(formatRecipients(rec, 'comma').text, '251210001@nitdelhi.ac.in, 251210002@nitdelhi.ac.in');
  assert.equal(formatRecipients(rec, 'semicolon').text, '251210001@nitdelhi.ac.in; 251210002@nitdelhi.ac.in');
  assert.equal(formatRecipients(rec, 'lines').text, '251210001@nitdelhi.ac.in\n251210002@nitdelhi.ac.in');
  const csv = formatRecipients(rec, 'csv');
  assert.equal(csv.text.split('\r\n')[0], 'rollNumber,email,batch,branch');
  assert.equal(csv.text.split('\r\n')[1], '251210001,251210001@nitdelhi.ac.in,2025,CSE');
  assert.equal(csv.ext, 'csv');
});

test('no email-sending code exists in the backend', async () => {
  const { readdirSync, readFileSync, statSync } = await import('node:fs');
  const { join } = await import('node:path');
  const walk = (d) => readdirSync(d).flatMap((f) => (statSync(join(d, f)).isDirectory() ? walk(join(d, f)) : [join(d, f)]));
  const banned = /nodemailer|sendEmail|sendBulkEmail|smtp|EMAIL_HOST|EMAIL_PASSWORD|bounce/i;
  for (const f of walk(new URL('../src', import.meta.url).pathname)) {
    assert.ok(!banned.test(readFileSync(f, 'utf8')), `${f} mentions email sending`);
  }
});

test('no email-sending code or buttons exist in the client either', async () => {
  const { readdirSync, readFileSync, statSync } = await import('node:fs');
  const { join } = await import('node:path');
  const walk = (d) => readdirSync(d).flatMap((f) => (statSync(join(d, f)).isDirectory() ? walk(join(d, f)) : [join(d, f)]));
  // case-sensitive on purpose: the footer legitimately says "does not send email"
  const banned = /nodemailer|sendEmail|sendBulkEmail|SMTP|smtp|EMAIL_HOST|EMAIL_PORT|EMAIL_USER|EMAIL_PASSWORD|(?<![a-z])[Bb]ounce|Send Email|Send Test|Schedule Email|Email Campaign/;
  for (const f of walk(new URL('../../client/src', import.meta.url).pathname)) {
    assert.ok(!banned.test(readFileSync(f, 'utf8')), `${f} mentions email sending`);
  }
});
