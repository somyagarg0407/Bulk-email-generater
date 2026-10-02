import { audit } from '../services/audit.service.js';
import * as svc from '../services/campaign.service.js';
import { formatRecipients, sendFormatted } from '../services/export.service.js';
import { AUDIT_ACTIONS as A, CAMPAIGN_STATUS_LABELS, SOURCE_LABELS } from '../utils/constants.js';

const withLabel = (c) => ({ ...c, statusLabel: CAMPAIGN_STATUS_LABELS[c.status], sourceLabel: SOURCE_LABELS[c.source] });

export async function create(req, res) {
  const c = await svc.createCampaign(req.valid.body, req.user);
  await audit(req, A.CAMPAIGN_CREATED, `${req.user.name} saved recipient list "${c.name}" (${c.counts.final} recipients)`, { campaignId: c._id });
  res.status(201).json({ data: withLabel(c.toObject()) });
}
export async function list(req, res) {
  const { items, pagination } = await svc.listCampaigns(req.user, req.valid.query);
  res.json({ data: items.map(withLabel), pagination });
}
export async function getOne(req, res) { res.json({ data: withLabel(await svc.getCampaignOr404(req.valid.params.id, req.user)) }); }
export async function update(req, res) {
  const c = await svc.updateCampaign(req.valid.params.id, req.valid.body, req.user);
  await audit(req, A.CAMPAIGN_UPDATED, `${req.user.name} updated recipient list "${c.name}"${req.valid.body.spec ? ' (regenerated)' : ''}`, { campaignId: c._id });
  res.json({ data: withLabel(c) });
}
export async function remove(req, res) {
  const c = await svc.deleteCampaign(req.valid.params.id, req.user);
  await audit(req, A.CAMPAIGN_DELETED, `${req.user.name} deleted recipient list "${c.name}"`, { campaignId: c._id });
  res.json({ data: { ok: true } });
}
export async function recipients(req, res) {
  const { campaign, rows, pagination } = await svc.getRecipients(req.valid.params.id, req.user, req.valid.query);
  res.json({ data: rows, pagination, campaign: { id: campaign._id, name: campaign.name, counts: campaign.counts } });
}
export async function exportOne(req, res) {
  const { format, inline } = req.valid.query;
  const { campaign, rows } = await svc.getAllRecipients(req.valid.params.id, req.user);
  await audit(req, A.CAMPAIGN_EXPORTED, `${req.user.name} ${inline === '1' ? 'copied' : 'exported'} (${format}) saved list "${campaign.name}" (${rows.length} recipients)`, { campaignId: campaign._id });
  if (inline === '1') return res.json({ data: { format, count: rows.length, text: formatRecipients(rows, format).text } });
  sendFormatted(res, rows, format, campaign.name.replace(/[^a-z0-9]+/gi, '-').toLowerCase().slice(0, 60) || 'recipients');
}
export async function dashboard(req, res) { res.json({ data: await svc.dashboardStats(req.user) }); }
