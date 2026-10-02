import { audit } from '../services/audit.service.js';
import { sendFormatted, formatRecipients } from '../services/export.service.js';
import { generateRecipients } from '../services/recipientGenerator.service.js';
import { AUDIT_ACTIONS as A } from '../utils/constants.js';
import { queryArray } from '../utils/paginate.js';
import { pickSpec } from '../validators/recipient.validator.js';

const brief = (g) => `${g.stats.final} recipients (generated ${g.stats.generated}, excluded ${g.stats.excluded}, added ${g.stats.added}) for UG ${g.summary.batches.join('+')} ${g.summary.branches.join('+')}`;

export async function generate(req, res) {
  const g = await generateRecipients(pickSpec(req.valid.body));
  await audit(req, A.RECIPIENTS_GENERATED, `${req.user.name} generated ${brief(g)}`);
  res.json({ data: g });
}

/** Same as generate, but returns one searchable/sortable page of recipients. */
export async function preview(req, res) {
  const { q, sort, order, page, limit, audit: shouldAudit } = req.valid.body;
  const g = await generateRecipients(pickSpec(req.valid.body));
  const { rows, pagination } = queryArray(g.recipients, { q, sort, order, page, limit });
  if (shouldAudit) await audit(req, A.RECIPIENTS_GENERATED, `${req.user.name} generated ${brief(g)}`);
  res.json({ data: { ...g, recipients: rows, pagination } });
}

export async function exportRecipients(req, res) {
  const { format, inline } = req.valid.query;
  const g = await generateRecipients(pickSpec(req.valid.body));
  await audit(req, A.RECIPIENTS_EXPORTED, `${req.user.name} ${inline === '1' ? 'copied' : 'exported'} (${format}) ${brief(g)}`);
  if (inline === '1') return res.json({ data: { format, count: g.recipients.length, text: formatRecipients(g.recipients, format).text } });
  sendFormatted(res, g.recipients, format, `recipients-${new Date().toISOString().slice(0, 10)}`);
}
