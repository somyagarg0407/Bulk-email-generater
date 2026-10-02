import { Batch, Branch, RollNumberRule } from '../models/index.js';
import { RULE_BASED_DISCLAIMER, RECIPIENT_SOURCES, SOURCE_LABELS } from '../utils/constants.js';
import { parseRollTokens } from '../utils/rollNumber.js';
import { computeRecipients, resolveScope } from './recipientGenerator.core.js';
import { loadUniverse } from './recipientSources.service.js';
import { getSettings } from './settings.service.js';

/** Loads configuration from the DB, then delegates to the pure engine. */
export async function generateRecipients(spec) {
  const settings = await getSettings();
  const source = settings.recipientSource;
  const [batches, branches, rules] = await Promise.all([
    Batch.find().lean(), Branch.find().lean(), RollNumberRule.find().lean(),
  ]);

  const { scope, usable, warnings, branchMap } = resolveScope(spec, { batches, branches, rules });
  const universe = await loadUniverse(source, scope, settings.emailDomain, branchMap);
  const needsAdditions = spec.additions && parseRollTokens(spec.additions).valid.length > 0;
  const additionUniverse = needsAdditions ? await loadUniverse(source, usable, settings.emailDomain, branchMap) : [];

  const result = computeRecipients(spec, universe, additionUniverse);
  result.warnings.unshift(...warnings);

  return {
    ...result,
    source,
    sourceLabel: SOURCE_LABELS[source],
    emailDomain: settings.emailDomain,
    disclaimer: source === RECIPIENT_SOURCES.RULE_BASED ? RULE_BASED_DISCLAIMER : null,
    summary: {
      batches: [...new Set(scope.map((r) => r.batch))].sort(),
      branches: [...new Set(scope.map((r) => branchMap.get(r.branch).name))],
      selectionMode: spec.selection?.mode ?? 'ALL',
    },
  };
}
