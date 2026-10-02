import { z } from 'zod';
import { CAMPAIGN_STATUS } from '../utils/constants.js';
import { specSchema } from './recipient.validator.js';
import { pageQuery } from './common.js';

const status = z.enum(Object.values(CAMPAIGN_STATUS));
export const createCampaignSchema = z.object({
  name: z.string().trim().min(1, 'Name is required.').max(150),
  notes: z.string().trim().max(1000).optional(),
  status: status.optional(),
  clubId: z.string().regex(/^[a-f\d]{24}$/i).optional(),
  spec: specSchema,
});
export const updateCampaignSchema = z.object({
  name: z.string().trim().min(1).max(150).optional(),
  notes: z.string().trim().max(1000).optional(),
  status: status.optional(),
  spec: specSchema.optional(),
});
export const listCampaignQuery = pageQuery.extend({ status: status.optional(), limit: z.coerce.number().int().min(1).max(100).default(20) });
export const campaignRecipientsQuery = pageQuery.extend({
  sort: z.enum(['position', 'rollNumber', 'email', 'batch', 'branch']).default('position'),
  order: z.enum(['asc', 'desc']).default('asc'),
});
