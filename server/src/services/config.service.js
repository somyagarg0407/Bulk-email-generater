import { Batch, Branch, RollNumberRule } from '../models/index.js';
import { ApiError } from '../utils/ApiError.js';
import { buildRollNumber, rulesCollide } from '../utils/rollNumber.js';

export const describeRule = (r) => ({
  ...r,
  maxStudents: r.endSequence - r.startSequence + 1,
  firstRoll: buildRollNumber(r, r.startSequence),
  lastRoll: buildRollNumber(r, r.endSequence),
  rangeKind: 'Configured maximum range',
});

const pickDefined = (obj, keys) => Object.fromEntries(keys.filter((k) => obj[k] !== undefined).map((k) => [k, obj[k]]));

/** Human-readable diff, e.g. "endSequence 140 → 137" */
export function diffSummary(before, after, keys) {
  const parts = keys.filter((k) => String(before[k] ?? '') !== String(after[k] ?? '')).map((k) => `${k} ${before[k] ?? '∅'} → ${after[k] ?? '∅'}`);
  return parts.join(', ');
}

async function assertNoOverlap(c, excludeId) {
  const width = c.sequenceWidth ?? 3;
  if (String(c.endSequence).length > width) {
    throw new ApiError(400, `End sequence ${c.endSequence} does not fit in a width of ${width} digits.`);
  }
  const others = await RollNumberRule.find(excludeId ? { _id: { $ne: excludeId } } : {}).lean();
  for (const o of others) {
    if (rulesCollide(c, o)) {
      throw new ApiError(409, `These roll numbers overlap with ${o.branch} UG ${o.batch} (${buildRollNumber(o, o.startSequence)}–${buildRollNumber(o, o.endSequence)}).`);
    }
  }
}

export const RULE_FIELDS = ['prefix', 'startSequence', 'endSequence', 'sequenceWidth', 'emailDomain', 'active', 'note'];

export async function createRule(data) {
  if (!(await Batch.exists({ year: data.batch }))) throw new ApiError(400, `Batch ${data.batch} does not exist. Create it first.`);
  data.branch = data.branch.toUpperCase();
  if (!(await Branch.exists({ key: data.branch }))) throw new ApiError(400, `Branch ${data.branch} does not exist. Create it first.`);
  await assertNoOverlap(data);
  return (await RollNumberRule.create(data)).toObject();
}

export async function updateRule(id, patch) {
  const rule = await RollNumberRule.findById(id);
  if (!rule) throw new ApiError(404, 'Roll-number rule not found.');
  const before = rule.toObject();
  const merged = { ...before, ...pickDefined(patch, RULE_FIELDS) };
  if (merged.endSequence < merged.startSequence) throw new ApiError(400, 'Invalid roll-number range.');
  await assertNoOverlap(merged, id);
  rule.set(pickDefined(patch, RULE_FIELDS));
  await rule.save();
  return { before, after: rule.toObject() };
}

export async function deleteRule(id) {
  const rule = await RollNumberRule.findByIdAndDelete(id).lean();
  if (!rule) throw new ApiError(404, 'Roll-number rule not found.');
  return rule;
}

export async function updateBatch(id, patch) {
  const b = await Batch.findById(id);
  if (!b) throw new ApiError(404, 'Batch not found.');
  const before = b.toObject();
  b.set(pickDefined(patch, ['label', 'active'])); await b.save();
  return { before, after: b.toObject() };
}
export async function deleteBatch(id) {
  const b = await Batch.findById(id);
  if (!b) throw new ApiError(404, 'Batch not found.');
  if (await RollNumberRule.exists({ batch: b.year })) throw new ApiError(409, 'This batch has roll-number rules. Delete them first, or mark the batch inactive.');
  await b.deleteOne(); return b.toObject();
}
export async function updateBranch(id, patch) {
  const b = await Branch.findById(id);
  if (!b) throw new ApiError(404, 'Branch not found.');
  const before = b.toObject();
  b.set(pickDefined(patch, ['name', 'code', 'sortOrder', 'active'])); await b.save();
  return { before, after: b.toObject() };
}
export async function deleteBranch(id) {
  const b = await Branch.findById(id);
  if (!b) throw new ApiError(404, 'Branch not found.');
  if (await RollNumberRule.exists({ branch: b.key })) throw new ApiError(409, 'This branch has roll-number rules. Delete them first, or mark the branch inactive.');
  await b.deleteOne(); return b.toObject();
}
