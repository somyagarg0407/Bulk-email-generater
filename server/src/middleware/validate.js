import { ApiError } from '../utils/ApiError.js';

/** validate(schema, 'body' | 'query' | 'params') -> parsed data at req.valid[source] */
export const validate = (schema, source = 'body') => (req, _res, next) => {
  const r = schema.safeParse(req[source]);
  if (!r.success) {
    const details = r.error.issues.map((i) => ({ path: i.path.join('.'), message: i.message }));
    return next(new ApiError(400, details[0]?.message || 'Invalid input.', details));
  }
  req.valid = { ...(req.valid || {}), [source]: r.data };
  next();
};
