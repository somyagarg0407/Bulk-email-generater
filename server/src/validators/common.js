import { z } from 'zod';
export const idParam = z.object({ id: z.string().regex(/^[a-f\d]{24}$/i, 'Invalid identifier.') });
export const pageQuery = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(500).default(50),
  q: z.string().trim().max(100).optional(),
});
