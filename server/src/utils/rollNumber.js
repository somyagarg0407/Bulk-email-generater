// Pure helpers for the roll-number structure. No DB / framework imports so they are easy to test.
// roll number = rule.prefix (batch year + program code) + zero-padded sequence
export const padSequence = (seq, width = 3) => String(seq).padStart(width, '0');
export const buildRollNumber = (rule, seq) => `${rule.prefix}${padSequence(seq, rule.sequenceWidth ?? 3)}`;
export const buildEmail = (roll, domain) =>
  `${roll}@${String(domain).trim().replace(/^@/, '').toLowerCase()}`;

/** Generate every record in a rule's configured range. */
export function generateRuleRange(rule, { domain, branchOrder = 999 } = {}) {
  const width = rule.sequenceWidth ?? 3;
  const out = [];
  for (let seq = rule.startSequence; seq <= rule.endSequence; seq++) {
    const rollNumber = buildRollNumber(rule, seq);
    out.push({
      rollNumber,
      email: buildEmail(rollNumber, domain),
      batch: rule.batch,
      branch: rule.branch,
      sequence: seq,
      width,
      ruleKey: `${rule.batch}:${rule.branch}`,
      ruleMin: rule.startSequence,
      ruleMax: rule.endSequence,
      branchOrder,
    });
  }
  return out;
}

/** Find which rule (if any) a roll number belongs to. */
export function resolveRoll(roll, rules) {
  for (const rule of rules) {
    const width = rule.sequenceWidth ?? 3;
    if (!roll.startsWith(rule.prefix)) continue;
    const rest = roll.slice(rule.prefix.length);
    if (rest.length !== width || !/^\d+$/.test(rest)) continue;
    const sequence = parseInt(rest, 10);
    if (sequence >= rule.startSequence && sequence <= rule.endSequence) return { rule, sequence };
  }
  return null;
}

/** Split free text / arrays of roll numbers on whitespace, commas, semicolons. */
export function parseRollTokens(input) {
  const text = Array.isArray(input) ? input.join('\n') : String(input ?? '');
  const valid = [];
  const malformed = [];
  const seen = new Set();
  for (const raw of text.split(/[\s,;]+/)) {
    const t = raw.trim();
    if (!t) continue;
    if (!/^\d+$/.test(t)) { malformed.push(t); continue; }
    if (!seen.has(t)) { seen.add(t); valid.push(t); }
  }
  return { valid, malformed };
}

/** True if two rules could produce the same roll number (compares the actual numeric roll ranges). */
export function rulesCollide(a, b) {
  const wa = a.sequenceWidth ?? 3, wb = b.sequenceWidth ?? 3;
  if (a.prefix.length + wa !== b.prefix.length + wb) return false;
  const lo = (r) => BigInt(buildRollNumber(r, r.startSequence));
  const hi = (r) => BigInt(buildRollNumber(r, r.endSequence));
  return lo(a) <= hi(b) && lo(b) <= hi(a);
}
