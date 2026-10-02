import { Batch, Branch, Campaign, CampaignRecipient, RollNumberRule } from '../models/index.js';
import { ApiError } from '../utils/ApiError.js';
import { ROLES, CAMPAIGN_STATUS } from '../utils/constants.js';
import { escapeRegex } from '../utils/paginate.js';
import { generateRecipients } from './recipientGenerator.service.js';

const scopeFilter = (user) =>
  user.role === ROLES.SUPER_ADMIN ? {} : user.role === ROLES.CLUB_ADMIN ? (user.club ? { club: user.club } : { _id: null }) : { createdBy: user._id };

async function snapshot(campaignId, recipients) {
  await CampaignRecipient.deleteMany({ campaign: campaignId });
  const docs = recipients.map((r, i) => ({ campaign: campaignId, position: i + 1, ...r }));
  for (let i = 0; i < docs.length; i += 1000) await CampaignRecipient.insertMany(docs.slice(i, i + 1000), { ordered: false });
}

const countsFrom = (g) => ({ generated: g.stats.generated, added: g.stats.added, excluded: g.stats.excluded, final: g.stats.final });

export async function createCampaign({ name, notes, status, spec, clubId }, user) {
  const g = await generateRecipients(spec);
  if (!g.recipients.length) throw new ApiError(400, 'No recipients generated.');
  const campaign = await Campaign.create({
    name, notes, status: status ?? CAMPAIGN_STATUS.GENERATED, spec, createdBy: user._id,
    club: user.role === ROLES.SUPER_ADMIN ? clubId ?? null : user.club,
    source: g.source, emailDomain: g.emailDomain, counts: countsFrom(g), groups: g.stats.groups,
    warnings: g.warnings, generatedAt: new Date(),
  });
  try { await snapshot(campaign._id, g.recipients); }
  catch (e) { await Campaign.deleteOne({ _id: campaign._id }); await CampaignRecipient.deleteMany({ campaign: campaign._id }); throw e; }
  return campaign;
}

export async function getCampaignOr404(id, user) {
  const c = await Campaign.findOne({ _id: id, ...scopeFilter(user) })
    .populate('createdBy', 'name email').populate('club', 'name').lean();
  if (!c) throw new ApiError(404, 'Recipient list not found.');
  return c;
}

export async function updateCampaign(id, { name, notes, status, spec }, user) {
  const c = await getCampaignOr404(id, user);
  const set = {};
  if (name !== undefined) set.name = name;
  if (notes !== undefined) set.notes = notes;
  if (status !== undefined) set.status = status;
  if (spec) {
    // Explicit regeneration is the ONLY way a saved list changes after creation.
    const g = await generateRecipients(spec);
    if (!g.recipients.length) throw new ApiError(400, 'No recipients generated.');
    Object.assign(set, {
      spec, source: g.source, emailDomain: g.emailDomain, counts: countsFrom(g),
      groups: g.stats.groups, warnings: g.warnings, generatedAt: new Date(),
    });
    await snapshot(c._id, g.recipients);
  }
  return Campaign.findByIdAndUpdate(c._id, { $set: set }, { new: true, runValidators: true }).lean();
}

export async function deleteCampaign(id, user) {
  const c = await getCampaignOr404(id, user);
  await CampaignRecipient.deleteMany({ campaign: c._id });
  await Campaign.deleteOne({ _id: c._id });
  return c;
}

export async function listCampaigns(user, { page, limit, q, status }) {
  const filter = { ...scopeFilter(user) };
  if (status) filter.status = status;
  if (q) filter.name = { $regex: escapeRegex(q), $options: 'i' };
  const [items, total] = await Promise.all([
    Campaign.find(filter).sort({ createdAt: -1 }).skip((page - 1) * limit).limit(limit)
      .populate('createdBy', 'name').populate('club', 'name').lean(),
    Campaign.countDocuments(filter),
  ]);
  return { items, pagination: { page, limit, total, pages: Math.max(1, Math.ceil(total / limit)) } };
}

export async function getRecipients(id, user, { q, sort, order, page, limit }) {
  const c = await getCampaignOr404(id, user);
  const filter = { campaign: c._id };
  if (q) filter.$or = [{ rollNumber: { $regex: escapeRegex(q) } }, { email: { $regex: escapeRegex(q), $options: 'i' } }, { branch: { $regex: escapeRegex(q), $options: 'i' } }];
  const [rows, total] = await Promise.all([
    CampaignRecipient.find(filter).sort({ [sort]: order === 'desc' ? -1 : 1 }).skip((page - 1) * limit).limit(limit)
      .select('-_id position rollNumber email batch branch').lean(),
    CampaignRecipient.countDocuments(filter),
  ]);
  return { campaign: c, rows, pagination: { page, limit, total, pages: Math.max(1, Math.ceil(total / limit)) } };
}

export async function getAllRecipients(id, user) {
  const c = await getCampaignOr404(id, user);
  const rows = await CampaignRecipient.find({ campaign: c._id }).sort({ position: 1 })
    .select('-_id rollNumber email batch branch').lean();
  return { campaign: c, rows };
}

export async function dashboardStats(user) {
  const f = scopeFilter(user);
  const [total, drafts, generated, recent, sum, batches, branches, rules] = await Promise.all([
    Campaign.countDocuments(f),
    Campaign.countDocuments({ ...f, status: CAMPAIGN_STATUS.DRAFT }),
    Campaign.countDocuments({ ...f, status: CAMPAIGN_STATUS.GENERATED }),
    Campaign.find(f).sort({ createdAt: -1 }).limit(5).populate('createdBy', 'name').lean(),
    Campaign.aggregate([{ $match: f }, { $group: { _id: null, n: { $sum: '$counts.final' } } }]),
    Batch.countDocuments({ active: true }), Branch.countDocuments({ active: true }), RollNumberRule.countDocuments({ active: true }),
  ]);
  return {
    totalLists: total, draftLists: drafts, generatedLists: generated, recipientsListed: sum[0]?.n ?? 0,
    recent, configuredBatches: batches, configuredBranches: branches, activeRules: rules,
  };
}
