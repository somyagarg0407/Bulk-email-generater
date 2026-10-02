// PURE recipient engine: no DB, no framework. Takes pre-loaded "universe" records and a spec.
import { ApiError } from '../utils/ApiError.js';
import { padSequence, parseRollTokens } from '../utils/rollNumber.js';

const label = (r) => `${r.branch} UG ${r.batch}`;
const order = (a, b) =>
  a.batch - b.batch || a.branchOrder - b.branchOrder || a.branch.localeCompare(b.branch) || a.sequence - b.sequence;

/**
 * spec: { selection:{mode:'ALL'|'RANGE'|'ROLLS', start?, end?, rollNumbers?}, exclusions?, additions? }
 * universe: records for the chosen batches/branches (see generateRuleRange)
 * additionUniverse: records for ALL active rules, used to validate individually added roll numbers
 */
export function computeRecipients(spec, universe, additionUniverse = []) {
  const warnings = [];
  const invalid = [];
  const sel = spec.selection ?? { mode: 'ALL' };
  let selected;

  if (sel.mode === 'RANGE') {
    const { start, end } = sel;
    if (!Number.isInteger(start) || !Number.isInteger(end) || start < 1 || end < start) {
      throw new ApiError(400, 'Invalid roll-number range.');
    }
    selected = universe.filter((r) => r.sequence >= start && r.sequence <= end);
    const firstPerRule = new Map();
    for (const r of universe) if (!firstPerRule.has(r.ruleKey)) firstPerRule.set(r.ruleKey, r);
    for (const r of firstPerRule.values()) {
      const p = (n) => padSequence(n, r.width);
      if (end < r.ruleMin || start > r.ruleMax) {
        warnings.push(`${label(r)}: no students in ${p(start)}–${p(end)} (configured range is ${p(r.ruleMin)}–${p(r.ruleMax)}).`);
      } else if (start < r.ruleMin || end > r.ruleMax) {
        warnings.push(`${label(r)}: requested ${p(start)}–${p(end)} goes beyond the configured ${p(r.ruleMin)}–${p(r.ruleMax)}; only the configured part was used.`);
      }
    }
  } else if (sel.mode === 'ROLLS') {
    const { valid, malformed } = parseRollTokens(sel.rollNumbers);
    if (!valid.length && !malformed.length) throw new ApiError(400, 'No roll numbers provided.');
    malformed.forEach((value) => invalid.push({ value, reason: 'Not a valid roll number (digits only).' }));
    const byRoll = new Map(universe.map((r) => [r.rollNumber, r]));
    selected = [];
    for (const t of valid) {
      const rec = byRoll.get(t);
      if (rec) selected.push(rec);
      else invalid.push({ value: t, reason: 'Not within any active configured roll-number range for the selected batches/branches.' });
    }
  } else {
    selected = universe;
  }

  // Map keyed by roll number => a recipient can never appear twice.
  const finalMap = new Map();
  for (const r of selected) finalMap.set(r.rollNumber, r);
  const generated = finalMap.size;

  let added = 0;
  if (spec.additions) {
    const { valid, malformed } = parseRollTokens(spec.additions);
    malformed.forEach((value) => invalid.push({ value, reason: 'Added entry is not a valid roll number.' }));
    const byRoll = new Map(additionUniverse.map((r) => [r.rollNumber, r]));
    for (const t of valid) {
      if (finalMap.has(t)) continue;
      const rec = byRoll.get(t);
      if (rec) { finalMap.set(t, rec); added++; }
      else invalid.push({ value: t, reason: 'Added roll number is not within any active configured range.' });
    }
  }

  let excluded = 0;
  if (spec.exclusions) {
    const { valid, malformed } = parseRollTokens(spec.exclusions);
    malformed.forEach((value) => invalid.push({ value, reason: 'Excluded entry is not a valid roll number.' }));
    const notFound = [];
    for (const t of valid) {
      if (finalMap.delete(t)) excluded++;
      else notFound.push(t);
    }
    if (notFound.length) {
      const sample = notFound.slice(0, 5).join(', ');
      warnings.push(`${notFound.length} excluded roll number(s) were not in the generated list${notFound.length > 5 ? ` (e.g. ${sample})` : `: ${sample}`}.`);
    }
  }

  const final = [...finalMap.values()].sort(order);
  if (!final.length) warnings.push('No recipients generated.');
  const groupMap = new Map();
  for (const r of final) {
    const g = groupMap.get(r.ruleKey) ?? { batch: r.batch, branch: r.branch, count: 0, branchOrder: r.branchOrder, sequence: r.sequence };
    g.count++;
    groupMap.set(r.ruleKey, g);
  }
  const groups = [...groupMap.values()].sort(order).map(({ batch, branch, count }) => ({ batch, branch, count }));

  return {
    recipients: final.map(({ rollNumber, email, batch, branch }) => ({ rollNumber, email, batch, branch })),
    stats: { generated, added, excluded, final: final.length, groups },
    warnings,
    invalid,
  };
}


/**
 * PURE: decide which rules are in scope for a spec, and collect warnings about anything skipped.
 * config = { batches, branches, rules } (ALL records, active or not, so we can explain what was skipped)
 */
export function resolveScope(spec, { batches, branches, rules }) {
  const mode = spec.selection?.mode ?? 'ALL';
  const reqBatches = [...new Set((spec.batches ?? []).map(Number))];
  const reqBranches = [...new Set((spec.branches ?? []).map((b) => String(b).toUpperCase()))];
  const anyBatch = !!spec.allBatches || (mode === 'ROLLS' && !reqBatches.length);
  const anyBranch = !!spec.allBranches || (mode === 'ROLLS' && !reqBranches.length);
  if (!anyBatch && !reqBatches.length) throw new ApiError(400, 'No batches selected.');
  if (!anyBranch && !reqBranches.length) throw new ApiError(400, 'No branches selected.');

  const warnings = [];
  const batchByYear = new Map(batches.map((b) => [b.year, b]));
  const branchByKey = new Map(branches.map((b) => [b.key, b]));
  const activeYears = new Set(batches.filter((b) => b.active).map((b) => b.year));
  const activeKeys = new Set(branches.filter((b) => b.active).map((b) => b.key));

  if (!anyBatch) for (const y of reqBatches) {
    if (!activeYears.has(y)) warnings.push(`UG ${y} is ${batchByYear.has(y) ? 'inactive' : 'not configured'} and was skipped.`);
  }
  if (!anyBranch) for (const k of reqBranches) {
    if (!activeKeys.has(k)) warnings.push(`${k} is ${branchByKey.has(k) ? 'inactive' : 'not configured'} and was skipped.`);
  }

  const usable = rules.filter((r) => r.active !== false && activeYears.has(r.batch) && activeKeys.has(r.branch));
  const scope = usable.filter((r) => (anyBatch || reqBatches.includes(r.batch)) && (anyBranch || reqBranches.includes(r.branch)));
  if (!scope.length) throw new ApiError(400, 'This batch/branch configuration is inactive or not configured.');

  if (!anyBatch && !anyBranch) {
    const have = new Set(scope.map((r) => `${r.batch}:${r.branch}`));
    for (const y of reqBatches.filter((y) => activeYears.has(y))) for (const k of reqBranches.filter((k) => activeKeys.has(k))) {
      if (!have.has(`${y}:${k}`)) warnings.push(`${k} UG ${y}: no active roll-number rule, so it was skipped.`);
    }
  }
  return { scope, usable, warnings, branchMap: branchByKey, mode };
}
