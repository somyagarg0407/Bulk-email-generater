import { SystemSetting } from '../models/index.js';
import { env } from '../config/env.js';
import { RECIPIENT_SOURCES } from '../utils/constants.js';

const defaults = () => ({ emailDomain: env.defaultEmailDomain, recipientSource: RECIPIENT_SOURCES.RULE_BASED });

export async function getSettings() {
  const out = defaults();
  for (const d of await SystemSetting.find().lean()) out[d.key] = d.value;
  return out;
}

export async function updateSettings(patch, user) {
  const before = await getSettings();
  for (const [key, value] of Object.entries(patch)) {
    await SystemSetting.updateOne({ key }, { $set: { value, updatedBy: user._id } }, { upsert: true });
  }
  return { before, after: await getSettings() };
}
