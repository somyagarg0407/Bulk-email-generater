import { z } from 'zod';
import { RECIPIENT_SOURCES, ROLE_VALUES } from '../utils/constants.js';

const domain = z.string().trim().toLowerCase().regex(/^(?=.{4,100}$)([a-z0-9-]+\.)+[a-z]{2,}$/, 'Invalid email domain.');
const int = (min, max) => z.coerce.number().int().min(min).max(max);

export const batchCreate = z.object({ year: int(2000, 2100), label: z.string().trim().max(40).optional(), active: z.boolean().optional() });
export const batchUpdate = z.object({ label: z.string().trim().max(40).optional(), active: z.boolean().optional() });

export const branchCreate = z.object({
  key: z.string().trim().toUpperCase().regex(/^[A-Z0-9_]{1,30}$/, 'Branch key: letters, digits, underscore.'),
  name: z.string().trim().min(1).max(60),
  code: z.string().trim().max(20).optional(),
  sortOrder: int(0, 1000).optional(),
  active: z.boolean().optional(),
});
export const branchUpdate = branchCreate.omit({ key: true }).partial();

const rangeOk = (v) => v.startSequence === undefined || v.endSequence === undefined || v.endSequence >= v.startSequence;
const ruleShape = {
  prefix: z.string().trim().regex(/^\d{1,12}$/, 'Prefix must be digits only.'),
  startSequence: int(1, 99999),
  endSequence: int(1, 99999),
  sequenceWidth: int(1, 6),
  emailDomain: z.union([domain, z.literal('')]),
  active: z.boolean(),
  note: z.string().trim().max(300),
};
export const ruleCreate = z.object({
  batch: int(2000, 2100), branch: z.string().trim().toUpperCase().min(1).max(30),
  ...ruleShape,
  sequenceWidth: ruleShape.sequenceWidth.default(3),
  emailDomain: ruleShape.emailDomain.default(''),
  active: ruleShape.active.default(true),
  note: ruleShape.note.optional(),
}).refine(rangeOk, { message: 'Invalid roll-number range.' });
export const ruleUpdate = z.object(ruleShape).partial().refine(rangeOk, { message: 'Invalid roll-number range.' });

export const settingsUpdate = z.object({
  emailDomain: domain.optional(),
  recipientSource: z.enum(Object.values(RECIPIENT_SOURCES)).optional(),
}).refine((v) => Object.keys(v).length > 0, { message: 'Nothing to update.' });

export const loginSchema = z.object({ email: z.string().trim().toLowerCase().email().max(200), password: z.string().min(1).max(200) });
export const registerSchema = z.object({
  name: z.string().trim().min(1).max(100),
  email: z.string().trim().toLowerCase().email().max(200),
  password: z.string().min(10, 'Password must be at least 10 characters.').max(100),
  role: z.enum(ROLE_VALUES).default('CLUB_MEMBER'),
  clubId: z.string().regex(/^[a-f\d]{24}$/i).optional(),
});
export const changePasswordSchema = z.object({
  currentPassword: z.string().min(1).max(200),
  newPassword: z.string().min(10, 'Password must be at least 10 characters.').max(100),
});
export const userUpdate = z.object({
  name: z.string().trim().min(1).max(100).optional(),
  role: z.enum(ROLE_VALUES).optional(),
  active: z.boolean().optional(),
  clubId: z.string().regex(/^[a-f\d]{24}$/i).nullable().optional(),
});
export const clubCreate = z.object({ name: z.string().trim().min(2).max(120) });
