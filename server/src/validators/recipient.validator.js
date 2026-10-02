import { z } from 'zod';
import { EXPORT_FORMATS } from '../utils/constants.js';
import { pageQuery } from './common.js';

const rollText = z.union([z.string().max(60000), z.array(z.string().max(30)).max(5000)]);

const specShape = {
  batches: z.array(z.coerce.number().int()).max(20).default([]),
  allBatches: z.boolean().default(false),
  branches: z.array(z.string().trim().toUpperCase().max(30)).max(50).default([]),
  allBranches: z.boolean().default(false),
  selection: z.object({
    mode: z.enum(['ALL', 'RANGE', 'ROLLS']),
    start: z.coerce.number().int().optional(),
    end: z.coerce.number().int().optional(),
    rollNumbers: rollText.optional(),
  }).default({ mode: 'ALL' }),
  exclusions: rollText.optional(),
  additions: rollText.optional(),
};

const checkSelection = (v, ctx) => {
  const s = v.selection;
  if (s.mode === 'RANGE' && !(Number.isInteger(s.start) && Number.isInteger(s.end) && s.start >= 1 && s.end >= s.start)) {
    ctx.addIssue({ code: 'custom', path: ['selection'], message: 'Invalid roll-number range.' });
  }
  if (s.mode === 'ROLLS' && !(Array.isArray(s.rollNumbers) ? s.rollNumbers.length : String(s.rollNumbers ?? '').trim())) {
    ctx.addIssue({ code: 'custom', path: ['selection', 'rollNumbers'], message: 'No roll numbers provided.' });
  }
};

export const specSchema = z.object(specShape).superRefine(checkSelection);

export const previewSchema = z.object({
  ...specShape,
  q: pageQuery.shape.q,
  sort: z.enum(['position', 'rollNumber', 'email', 'batch', 'branch']).default('position'),
  order: z.enum(['asc', 'desc']).default('asc'),
  page: pageQuery.shape.page,
  limit: pageQuery.shape.limit,
  audit: z.boolean().default(false), // true only for the explicit Generate click, not for paging/search
}).superRefine(checkSelection);

export const exportQuery = z.object({
  format: z.enum(EXPORT_FORMATS).default('csv'),
  inline: z.enum(['0', '1']).default('0'),
});

export const SPEC_KEYS = ['batches', 'allBatches', 'branches', 'allBranches', 'selection', 'exclusions', 'additions'];
export const pickSpec = (obj) => Object.fromEntries(SPEC_KEYS.filter((k) => obj[k] !== undefined).map((k) => [k, obj[k]]));
