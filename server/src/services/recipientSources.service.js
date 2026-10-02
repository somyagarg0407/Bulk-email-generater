import { Student } from '../models/index.js';
import { RECIPIENT_SOURCES } from '../utils/constants.js';
import { buildEmail, generateRuleRange, resolveRoll } from '../utils/rollNumber.js';

/**
 * Returns the "universe" (all candidate recipients) for the given rules.
 * Add a new source here later (e.g. a CSV-backed list) without touching the engine.
 */
export async function loadUniverse(source, rules, defaultDomain, branchMap) {
  const orderOf = (r) => branchMap.get(r.branch)?.sortOrder ?? 999;
  const domainOf = (r) => r.emailDomain || defaultDomain;

  if (source === RECIPIENT_SOURCES.ACTUAL_STUDENT_DATABASE) {
    if (!rules.length) return [];
    const students = await Student.find({
      status: 'ACTIVE',
      $or: rules.map((r) => ({ batch: r.batch, branch: r.branch })),
    }).lean();
    const out = [];
    for (const s of students) {
      const hit = resolveRoll(s.rollNumber, rules.filter((r) => r.batch === s.batch && r.branch === s.branch));
      if (!hit) continue;
      const { rule, sequence } = hit;
      out.push({
        rollNumber: s.rollNumber,
        email: s.email || buildEmail(s.rollNumber, domainOf(rule)),
        batch: rule.batch, branch: rule.branch, sequence,
        width: rule.sequenceWidth, ruleKey: `${rule.batch}:${rule.branch}`,
        ruleMin: rule.startSequence, ruleMax: rule.endSequence, branchOrder: orderOf(rule),
      });
    }
    return out;
  }

  return rules.flatMap((r) => generateRuleRange(r, { domain: domainOf(r), branchOrder: orderOf(r) }));
}
