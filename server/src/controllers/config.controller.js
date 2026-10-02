import { AuditLog, Batch, Branch, RollNumberRule } from '../models/index.js';
import { audit } from '../services/audit.service.js';
import * as svc from '../services/config.service.js';
import { getSettings, updateSettings } from '../services/settings.service.js';
import { AUDIT_ACTIONS as A } from '../utils/constants.js';

const log = (req, summary, meta) => audit(req, A.CONFIG_CHANGED, `${req.user.name}: ${summary}`, meta);

export const listBatches = async (_req, res) => res.json({ data: await Batch.find().sort({ year: 1 }).lean() });
export const listBranches = async (_req, res) => res.json({ data: await Branch.find().sort({ sortOrder: 1, name: 1 }).lean() });
export const listRules = async (_req, res) =>
  res.json({ data: (await RollNumberRule.find().sort({ batch: 1, branch: 1 }).lean()).map(svc.describeRule) });
export const getSettingsHandler = async (_req, res) => res.json({ data: await getSettings() });

export async function createBatch(req, res) {
  const b = await Batch.create({ label: `UG ${req.valid.body.year}`, ...req.valid.body });
  await log(req, `created batch UG ${b.year}`); res.status(201).json({ data: b });
}
export async function updateBatch(req, res) {
  const { before, after } = await svc.updateBatch(req.valid.params.id, req.valid.body);
  await log(req, `batch UG ${after.year}: ${svc.diffSummary(before, after, ['label', 'active']) || 'no changes'}`); res.json({ data: after });
}
export async function deleteBatch(req, res) {
  const b = await svc.deleteBatch(req.valid.params.id); await log(req, `deleted batch UG ${b.year}`); res.json({ data: { ok: true } });
}

export async function createBranch(req, res) {
  const b = await Branch.create(req.valid.body); await log(req, `created branch ${b.name} (${b.key})`); res.status(201).json({ data: b });
}
export async function updateBranch(req, res) {
  const { before, after } = await svc.updateBranch(req.valid.params.id, req.valid.body);
  await log(req, `branch ${after.key}: ${svc.diffSummary(before, after, ['name', 'code', 'sortOrder', 'active']) || 'no changes'}`); res.json({ data: after });
}
export async function deleteBranch(req, res) {
  const b = await svc.deleteBranch(req.valid.params.id); await log(req, `deleted branch ${b.key}`); res.json({ data: { ok: true } });
}

export async function createRule(req, res) {
  const r = await svc.createRule(req.valid.body);
  await log(req, `created rule ${r.branch} UG ${r.batch}: ${r.prefix}${String(r.startSequence).padStart(r.sequenceWidth, '0')}–${String(r.endSequence).padStart(r.sequenceWidth, '0')}`);
  res.status(201).json({ data: svc.describeRule(r) });
}
export async function updateRule(req, res) {
  const { before, after } = await svc.updateRule(req.valid.params.id, req.valid.body);
  const diff = svc.diffSummary(before, after, svc.RULE_FIELDS) || 'no changes';
  await log(req, `changed ${after.branch} UG ${after.batch}: ${diff}`, { before, after });
  res.json({ data: svc.describeRule(after) });
}
export async function deleteRule(req, res) {
  const r = await svc.deleteRule(req.valid.params.id); await log(req, `deleted rule ${r.branch} UG ${r.batch}`); res.json({ data: { ok: true } });
}

export async function putSettings(req, res) {
  const { before, after } = await updateSettings(req.valid.body, req.user);
  await log(req, `settings: ${svc.diffSummary(before, after, Object.keys(req.valid.body)) || 'no changes'}`); res.json({ data: after });
}
export async function auditLogs(req, res) {
  const limit = Math.min(Number(req.query.limit) || 100, 500);
  res.json({ data: await AuditLog.find().sort({ createdAt: -1 }).limit(limit).lean() });
}
