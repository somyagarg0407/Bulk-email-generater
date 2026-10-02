import { env } from '../config/env.js';
import { ApiError } from '../utils/ApiError.js';

export const notFound = (_req, _res, next) => next(new ApiError(404, 'Route not found.'));

// eslint-disable-next-line no-unused-vars
export function errorHandler(err, req, res, _next) {
  let status = 500, message = 'Something went wrong. Please try again.', details, code;
  if (err instanceof ApiError) { status = err.status; message = err.message; details = err.details; code = err.code; }
  else if (err?.name === 'ValidationError') { status = 400; message = Object.values(err.errors)[0]?.message || 'Invalid input.'; }
  else if (err?.name === 'CastError') { status = 400; message = 'Invalid identifier.'; }
  else if (err?.code === 11000) { status = 409; message = 'A record with these values already exists.'; }
  else if (err?.type === 'entity.parse.failed') { status = 400; message = 'Malformed JSON body.'; }
  else if (err?.type === 'entity.too.large') { status = 413; message = 'Request body too large.'; }
  if (status >= 500) console.error(`[${req.method} ${req.originalUrl}]`, env.isProd ? err.message : err);
  res.status(status).json({ error: { message, ...(code && { code }), ...(details && { details }) } });
}
