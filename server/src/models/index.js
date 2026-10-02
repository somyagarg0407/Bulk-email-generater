import mongoose from 'mongoose';
import { ROLE_VALUES, ROLES, RECIPIENT_SOURCES, CAMPAIGN_STATUS } from '../utils/constants.js';

const { Schema } = mongoose;
const oid = (ref) => ({ type: Schema.Types.ObjectId, ref });

export const Club = mongoose.model('Club', new Schema({
  name: { type: String, required: true, unique: true, trim: true, maxlength: 120 },
  slug: { type: String, required: true, unique: true, lowercase: true, trim: true },
  active: { type: Boolean, default: true },
}, { timestamps: true }));

export const User = mongoose.model('User', new Schema({
  name: { type: String, required: true, trim: true, maxlength: 100 },
  email: { type: String, required: true, unique: true, lowercase: true, trim: true },
  passwordHash: { type: String, required: true, select: false },
  role: { type: String, enum: ROLE_VALUES, default: ROLES.CLUB_MEMBER },
  club: { ...oid('Club'), default: null },
  active: { type: Boolean, default: true },
  mustChangePassword: { type: Boolean, default: false },
  lastLoginAt: Date,
}, { timestamps: true }));

export const Batch = mongoose.model('Batch', new Schema({
  year: { type: Number, required: true, unique: true, min: 2000, max: 2100 },
  label: { type: String, trim: true },
  active: { type: Boolean, default: true },
}, { timestamps: true }));

export const Branch = mongoose.model('Branch', new Schema({
  key: { type: String, required: true, unique: true, uppercase: true, trim: true, match: /^[A-Z0-9_]+$/ },
  name: { type: String, required: true, trim: true, maxlength: 60 },
  code: { type: String, trim: true, default: '' }, // informational program code
  sortOrder: { type: Number, default: 100 },
  active: { type: Boolean, default: true },
}, { timestamps: true }));

// roll number = prefix + zero-padded sequence; email = rollNumber@(emailDomain || system default)
const ruleSchema = new Schema({
  batch: { type: Number, required: true },
  branch: { type: String, required: true, uppercase: true, trim: true },
  prefix: { type: String, required: true, trim: true, match: /^\d{1,12}$/ },
  startSequence: { type: Number, required: true, min: 1, max: 99999, validate: Number.isInteger },
  endSequence: { type: Number, required: true, min: 1, max: 99999, validate: Number.isInteger },
  sequenceWidth: { type: Number, default: 3, min: 1, max: 6, validate: Number.isInteger },
  emailDomain: { type: String, default: '', lowercase: true, trim: true }, // blank = system default
  active: { type: Boolean, default: true },
  note: { type: String, default: 'Configured maximum range (assumed, not verified)', maxlength: 300 },
}, { timestamps: true });
ruleSchema.index({ batch: 1, branch: 1 }, { unique: true });
ruleSchema.pre('validate', function (next) {
  if (this.endSequence < this.startSequence) return next(new Error('Invalid roll-number range.'));
  next();
});
export const RollNumberRule = mongoose.model('RollNumberRule', ruleSchema);

export const SystemSetting = mongoose.model('SystemSetting', new Schema({
  key: { type: String, required: true, unique: true },
  value: Schema.Types.Mixed,
  updatedBy: oid('User'),
}, { timestamps: true }));

// Future: real student data (CSV import). Used when recipientSource = ACTUAL_STUDENT_DATABASE.
const studentSchema = new Schema({
  rollNumber: { type: String, required: true, unique: true, match: /^\d+$/ },
  name: { type: String, trim: true },
  email: { type: String, lowercase: true, trim: true },
  batch: { type: Number, required: true },
  branch: { type: String, required: true, uppercase: true },
  status: { type: String, enum: ['ACTIVE', 'INACTIVE'], default: 'ACTIVE' },
  importBatchId: String,
}, { timestamps: true });
studentSchema.index({ batch: 1, branch: 1, status: 1 });
export const Student = mongoose.model('Student', studentSchema);

// A "campaign" = a saved recipient list (snapshot). Nothing is ever sent by this app.
export const Campaign = mongoose.model('Campaign', new Schema({
  name: { type: String, required: true, trim: true, maxlength: 150 },
  notes: { type: String, default: '', maxlength: 1000 },
  club: { ...oid('Club'), default: null },
  createdBy: { ...oid('User'), required: true },
  status: { type: String, enum: Object.values(CAMPAIGN_STATUS), default: CAMPAIGN_STATUS.GENERATED },
  spec: { type: Schema.Types.Mixed, required: true },        // filters used to generate the list
  source: { type: String, enum: Object.values(RECIPIENT_SOURCES), required: true },
  emailDomain: String,
  counts: { generated: Number, added: Number, excluded: Number, final: Number },
  groups: [{ _id: false, batch: Number, branch: String, count: Number }],
  warnings: [String],
  generatedAt: Date,
}, { timestamps: true }));

const crSchema = new Schema({
  campaign: { ...oid('Campaign'), required: true },
  position: Number,
  rollNumber: { type: String, required: true },
  email: { type: String, required: true },
  batch: Number,
  branch: String,
});
crSchema.index({ campaign: 1, rollNumber: 1 }, { unique: true });
crSchema.index({ campaign: 1, position: 1 });
export const CampaignRecipient = mongoose.model('CampaignRecipient', crSchema);

const auditSchema = new Schema({
  user: oid('User'), userName: String, role: String,
  action: { type: String, required: true, index: true },
  summary: String, meta: Schema.Types.Mixed, ip: String,
}, { timestamps: { createdAt: true, updatedAt: false } });
auditSchema.index({ createdAt: -1 });
export const AuditLog = mongoose.model('AuditLog', auditSchema);
