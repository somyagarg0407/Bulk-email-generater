// Idempotent seed. Existing rules/settings are NEVER overwritten, so admin edits are safe.
import crypto from 'crypto';
import bcrypt from 'bcrypt';
import mongoose from 'mongoose';
import { connectDB } from '../config/db.js';
import { env } from '../config/env.js';
import { DEFAULT_BATCH_YEARS, DEFAULT_BRANCHES, DEFAULT_SEQUENCE_WIDTH, prefixFor } from '../config/defaultRules.js';
import { Batch, Branch, Club, RollNumberRule, SystemSetting, User } from '../models/index.js';
import { RECIPIENT_SOURCES, ROLES } from '../utils/constants.js';

await connectDB();

await SystemSetting.updateOne({ key: 'emailDomain' }, { $setOnInsert: { value: env.defaultEmailDomain } }, { upsert: true });
await SystemSetting.updateOne({ key: 'recipientSource' }, { $setOnInsert: { value: RECIPIENT_SOURCES.RULE_BASED } }, { upsert: true });

for (const year of DEFAULT_BATCH_YEARS) {
  await Batch.updateOne({ year }, { $setOnInsert: { year, label: `UG ${year}`, active: true } }, { upsert: true });
}
for (const b of DEFAULT_BRANCHES) {
  await Branch.updateOne({ key: b.key }, { $setOnInsert: { key: b.key, name: b.name, code: b.code, sortOrder: b.sortOrder, active: true } }, { upsert: true });
}
for (const year of DEFAULT_BATCH_YEARS) {
  for (const b of DEFAULT_BRANCHES) {
    await RollNumberRule.updateOne(
      { batch: year, branch: b.key },
      { $setOnInsert: { batch: year, branch: b.key, prefix: prefixFor(year, b.code), startSequence: 1, endSequence: b.max, sequenceWidth: DEFAULT_SEQUENCE_WIDTH, emailDomain: '', active: true } },
      { upsert: true },
    );
  }
}
await Club.updateOne({ slug: 'demo-club' }, { $setOnInsert: { name: 'Demo Club', slug: 'demo-club' } }, { upsert: true });

const email = (process.env.SEED_ADMIN_EMAIL || '').trim().toLowerCase();
if (!email) {
  console.log('SEED_ADMIN_EMAIL not set - skipped creating the admin user.');
} else if (await User.exists({ email })) {
  console.log(`Admin ${email} already exists - left unchanged.`);
} else {
  const generated = !process.env.SEED_ADMIN_PASSWORD;
  const password = process.env.SEED_ADMIN_PASSWORD || crypto.randomBytes(12).toString('base64url');
  await User.create({
    name: process.env.SEED_ADMIN_NAME || 'Super Admin', email, role: ROLES.SUPER_ADMIN,
    passwordHash: await bcrypt.hash(password, 12), mustChangePassword: true,
  });
  console.log(`Created SUPER_ADMIN ${email}`);
  if (generated) console.log(`One-time password (shown once, change it after login): ${password}`);
}

console.log('Seed complete.');
await mongoose.disconnect();
