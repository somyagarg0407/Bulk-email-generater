import { test } from 'node:test';
import assert from 'node:assert/strict';
import { computeRecipients } from '../src/services/recipientGenerator.core.js';
import { generateRuleRange, resolveRoll, parseRollTokens } from '../src/utils/rollNumber.js';
import { DEFAULT_BATCH_YEARS, DEFAULT_BRANCHES, prefixFor } from '../src/config/defaultRules.js';

const rules = DEFAULT_BATCH_YEARS.flatMap((batch) =>
  DEFAULT_BRANCHES.map((b) => ({
    batch, branch: b.key, prefix: prefixFor(batch, b.code),
    startSequence: 1, endSequence: b.max, sequenceWidth: 3, branchOrder: b.sortOrder,
  })));
const universeFor = (batches, branches) =>
  rules.filter((r) => batches.includes(r.batch) && branches.includes(r.branch))
    .flatMap((r) => generateRuleRange(r, { domain: 'nitdelhi.ac.in', branchOrder: r.branchOrder }));
const all = universeFor(DEFAULT_BATCH_YEARS, DEFAULT_BRANCHES.map((b) => b.key));

test('CSE 2025 all students', () => {
  const r = computeRecipients({ selection: { mode: 'ALL' } }, universeFor([2025], ['CSE']));
  assert.equal(r.stats.final, 140);
  assert.equal(r.recipients[0].email, '251210001@nitdelhi.ac.in');
  assert.equal(r.recipients.at(-1).rollNumber, '251210140');
});

test('prefixes follow batch year for all batches', () => {
  for (const [y, p] of [[2023, '231210001'], [2024, '241210001'], [2026, '261210001']]) {
    assert.equal(computeRecipients({}, universeFor([y], ['CSE'])).recipients[0].rollNumber, p);
  }
  assert.equal(computeRecipients({}, universeFor([2025], ['AEROSPACE'])).recipients.at(-1).rollNumber, '251312026');
});

test('multiple branches / batches sum and dedupe', () => {
  assert.equal(computeRecipients({}, universeFor([2025], ['CSE', 'ECE'])).stats.final, 205);
  assert.equal(computeRecipients({}, universeFor([2024, 2025], ['CSE'])).stats.final, 280);
  const dup = [...universeFor([2025], ['CSE']), ...universeFor([2025], ['CSE'])];
  assert.equal(computeRecipients({}, dup).stats.final, 140);
});

test('custom range', () => {
  const r = computeRecipients({ selection: { mode: 'RANGE', start: 1, end: 50 } }, universeFor([2025], ['CSE']));
  assert.equal(r.stats.final, 50);
  assert.equal(r.recipients.at(-1).rollNumber, '251210050');
});

test('range beyond configured max is clamped with a warning', () => {
  const r = computeRecipients({ selection: { mode: 'RANGE', start: 120, end: 200 } }, universeFor([2025], ['CSE']));
  assert.equal(r.stats.final, 21);
  assert.equal(r.warnings.length, 1);
});

test('invalid range throws', () => {
  assert.throws(() => computeRecipients({ selection: { mode: 'RANGE', start: 50, end: 10 } }, all), /Invalid roll-number range/);
});

test('exclusions work at roll-number level', () => {
  const r = computeRecipients({ exclusions: '251210014 251210057,251210102' }, universeFor([2025], ['CSE']));
  assert.deepEqual([r.stats.generated, r.stats.excluded, r.stats.final], [140, 3, 137]);
});

test('specific roll numbers: valid, invalid, malformed', () => {
  const r = computeRecipients(
    { selection: { mode: 'ROLLS', rollNumbers: '251210001\n251210015, 251210999 abc 251210001' } },
    all,
  );
  assert.equal(r.stats.final, 2);
  assert.equal(r.invalid.length, 2);
});

test('additions are validated and deduped', () => {
  const r = computeRecipients({ additions: '251220001 251210001 999' }, universeFor([2025], ['CSE']), all);
  assert.equal(r.stats.added, 1);
  assert.equal(r.stats.final, 141);
  assert.equal(r.invalid.length, 1);
});

test('resolveRoll / parseRollTokens', () => {
  assert.equal(resolveRoll('251210140', rules).rule.branch, 'CSE');
  assert.equal(resolveRoll('251210141', rules), null);
  assert.deepEqual(parseRollTokens('1, 2;3\n3 x').valid, ['1', '2', '3']);
});
