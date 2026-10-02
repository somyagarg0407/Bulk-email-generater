// Exercises the REAL generator / campaign / config services against in-memory fake models.
// (No MongoDB is involved. This validates service logic, not Mongoose or HTTP.)
import { test, mock } from 'node:test';
import assert from 'node:assert/strict';
import { makeModel } from '../testkit/fakeModels.js';
import { DEFAULT_BATCH_YEARS, DEFAULT_BRANCHES, prefixFor } from '../src/config/defaultRules.js';

const Batch = makeModel(DEFAULT_BATCH_YEARS.map((year) => ({ _id: `b${year}`, year, label: `UG ${year}`, active: true })));
const Branch = makeModel(DEFAULT_BRANCHES.map((b) => ({ _id: `br${b.key}`, key: b.key, name: b.name, code: b.code, sortOrder: b.sortOrder, active: true })));
const RollNumberRule = makeModel(DEFAULT_BATCH_YEARS.flatMap((batch) => DEFAULT_BRANCHES.map((b) => ({
  _id: `r${batch}${b.key}`, batch, branch: b.key, prefix: prefixFor(batch, b.code), startSequence: 1, endSequence: b.max, sequenceWidth: 3, emailDomain: '', active: true,
}))));
const SystemSetting = makeModel([]);
const Campaign = makeModel();
const CampaignRecipient = makeModel();
const Student = makeModel();

const here = (p) => new URL(p, import.meta.url).href;
mock.module(here('../src/models/index.js'), { namedExports: { Batch, Branch, RollNumberRule, SystemSetting, Campaign, CampaignRecipient, Student } });
mock.module(here('../src/config/env.js'), { namedExports: { env: { defaultEmailDomain: 'nitdelhi.ac.in' } } });

const { generateRecipients } = await import('../src/services/recipientGenerator.service.js');
const campaigns = await import('../src/services/campaign.service.js');
const config = await import('../src/services/config.service.js');

const user = { _id: 'u1', role: 'SUPER_ADMIN', club: null, name: 'Admin' };
const spec = (batches, branches, extra = {}) => ({ batches, branches, allBatches: false, allBranches: false, selection: { mode: 'ALL' }, ...extra });
const gen = (b, k, extra) => generateRecipients(spec(b, k, extra));

test('A-D: CSE for every batch = 140, correct first/last', async () => {
  for (const y of [2025, 2024, 2023, 2026]) {
    const r = await gen([y], ['CSE']);
    const yy = String(y).slice(2);
    assert.equal(r.stats.final, 140);
    assert.equal(r.recipients[0].email, `${yy}1210001@nitdelhi.ac.in`);
    assert.equal(r.recipients.at(-1).email, `${yy}1210140@nitdelhi.ac.in`);
    assert.match(r.disclaimer, /may be inactive or nonexistent/);
    assert.match(r.sourceLabel, /Configured maximum range/);
  }
});

test('E-J: every branch maximum and last roll number (UG 2025)', async () => {
  const expected = { AIDS: [26, '251212026'], CIVIL: [26, '251320026'], ELECTRICAL: [60, '251230060'], ECE: [65, '251220065'], MECHANICAL: [45, '251310045'], VLSI: [26, '251221026'], AEROSPACE: [26, '251312026'] };
  for (const [k, [n, last]] of Object.entries(expected)) {
    const r = await gen([2025], [k]);
    assert.equal(r.stats.final, n, k);
    assert.equal(r.recipients.at(-1).rollNumber, last, k);
  }
});

test('K-O: combinations, range, exclusions, mixed specific roll numbers', async () => {
  assert.equal((await gen([2025], ['CSE', 'ECE'])).stats.final, 205);
  assert.equal((await gen([2024, 2025], ['CSE'])).stats.final, 280);
  assert.equal((await gen([2025], ['CSE'], { selection: { mode: 'RANGE', start: 1, end: 50 } })).stats.final, 50);
  const ex = await gen([2025], ['CSE'], { exclusions: '251210014\n251210057\n251210102' });
  assert.deepEqual([ex.stats.generated, ex.stats.excluded, ex.stats.final], [140, 3, 137]);
  const mixed = await generateRecipients({ ...spec([], []), selection: { mode: 'ROLLS', rollNumbers: '251210001 251210001, 251210015;251210029\n251220001 999 abc 251210999 241210140' } });
  assert.equal(mixed.stats.final, 5);
  assert.deepEqual(mixed.invalid.map((i) => i.value).sort(), ['251210999', '999', 'abc']);
});

test('R + S: admin change 140->137 applies to new generations; saved list snapshot stays 140 until regenerated', async () => {
  const saved = await campaigns.createCampaign({ name: 'UG 2025 CSE Orientation', spec: spec([2025], ['CSE']) }, user);
  assert.equal(saved.counts.final, 140);
  assert.equal(CampaignRecipient.table.filter((r) => r.campaign === saved._id).length, 140);

  // Admin edits the configured maximum (no code change).
  const { before, after } = await config.updateRule('r2025CSE', { endSequence: 137 });
  assert.equal(before.endSequence, 140); assert.equal(after.endSequence, 137);

  // S: new generation reflects the change.
  const fresh = await gen([2025], ['CSE']);
  assert.equal(fresh.stats.final, 137);
  assert.equal(fresh.recipients.at(-1).rollNumber, '251210137');

  // R: old saved list is unchanged.
  const still = await campaigns.getAllRecipients(saved._id, user);
  assert.equal(still.rows.length, 140);
  assert.equal(still.campaign.counts.final, 140);
  assert.equal(still.rows.at(-1).rollNumber, '251210140');

  // Only explicit regeneration changes it.
  const upd = await campaigns.updateCampaign(saved._id, { spec: spec([2025], ['CSE']) }, user);
  assert.equal(upd.counts.final, 137);
  assert.equal((await campaigns.getAllRecipients(saved._id, user)).rows.length, 137);

  // renaming does not regenerate
  await config.updateRule('r2025CSE', { endSequence: 140 });
  await campaigns.updateCampaign(saved._id, { name: 'Renamed' }, user);
  assert.equal((await campaigns.getAllRecipients(saved._id, user)).rows.length, 137);
});

test('config validation: overlap and width are rejected', async () => {
  await assert.rejects(config.updateRule('r2025CSE', { endSequence: 1000 }), /does not fit in a width/);
  await assert.rejects(config.updateRule('r2025CSE', { prefix: '251220' }), /overlap/);
});

test('inactive rule is not used by the real service', async () => {
  await config.updateRule('r2025ECE', { active: false });
  await assert.rejects(gen([2025], ['ECE']), /inactive or not configured/);
  const r = await gen([2025], ['CSE', 'ECE']);
  assert.equal(r.stats.final, 140);
  assert.ok(r.warnings.some((w) => /ECE UG 2025: no active roll-number rule/.test(w)));
  await config.updateRule('r2025ECE', { active: true });
  assert.equal((await gen([2025], ['ECE'])).stats.final, 65);
});

test('access scoping: member only sees own lists, club admin only own club', async () => {
  const member = { _id: 'u2', role: 'CLUB_MEMBER', club: 'c1', name: 'M' };
  const other = { _id: 'u3', role: 'CLUB_MEMBER', club: 'c1', name: 'O' };
  const admin = { _id: 'u4', role: 'CLUB_ADMIN', club: 'c1', name: 'A' };
  const outsider = { _id: 'u5', role: 'CLUB_ADMIN', club: 'c2', name: 'X' };
  const mine = await campaigns.createCampaign({ name: 'mine', spec: spec([2025], ['VLSI']) }, member);
  await assert.doesNotReject(campaigns.getCampaignOr404(mine._id, member));
  await assert.doesNotReject(campaigns.getCampaignOr404(mine._id, admin));
  await assert.rejects(campaigns.getCampaignOr404(mine._id, other), /not found/);
  await assert.rejects(campaigns.getCampaignOr404(mine._id, outsider), /not found/);
  await assert.doesNotReject(campaigns.getCampaignOr404(mine._id, user));
});
