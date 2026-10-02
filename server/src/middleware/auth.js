import jwt from 'jsonwebtoken';
import { env } from '../config/env.js';
import { User } from '../models/index.js';
import { ApiError } from '../utils/ApiError.js';
import { asyncHandler } from '../utils/asyncHandler.js';

export const signToken = (user) =>
  jwt.sign({ sub: String(user._id) }, env.jwtSecret, { expiresIn: env.jwtExpiresIn, algorithm: 'HS256' });

const PASSWORD_CHANGE_MSG = 'Your password must be changed before you continue.';

// allowPending=false (default): a user whose password must be changed is rejected everywhere.
// allowPending=true is used ONLY by GET /auth/me and POST /auth/change-password.
const build = (allowPending) => asyncHandler(async (req, _res, next) => {
  const [scheme, token] = (req.headers.authorization || '').split(' ');
  if (scheme !== 'Bearer' || !token) throw new ApiError(401, 'Unauthorized.');
  let payload;
  try { payload = jwt.verify(token, env.jwtSecret, { algorithms: ['HS256'] }); }
  catch { throw new ApiError(401, 'Unauthorized.'); }
  const user = await User.findById(payload.sub);
  if (!user || !user.active) throw new ApiError(401, 'Unauthorized.');
  if (user.mustChangePassword && !allowPending) {
    throw new ApiError(403, PASSWORD_CHANGE_MSG, undefined, 'PASSWORD_CHANGE_REQUIRED');
  }
  req.user = user;
  next();
});

export const authenticate = build(false);
export const authenticateAllowPending = build(true);

export const authorize = (...roles) => (req, _res, next) =>
  roles.includes(req.user.role) ? next() : next(new ApiError(403, 'You do not have permission to perform this action.'));
