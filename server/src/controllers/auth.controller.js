import bcrypt from 'bcrypt';
import { Club, User } from '../models/index.js';
import { signToken } from '../middleware/auth.js';
import { audit } from '../services/audit.service.js';
import { ApiError } from '../utils/ApiError.js';
import { AUDIT_ACTIONS as A, ROLES } from '../utils/constants.js';

const DUMMY_HASH = bcrypt.hashSync('not-a-real-password', 12);
const safe = (u) => ({ id: u._id, name: u.name, email: u.email, role: u.role, club: u.club, mustChangePassword: u.mustChangePassword });

export async function login(req, res) {
  const { email, password } = req.valid.body;
  const user = await User.findOne({ email }).select('+passwordHash');
  const ok = await bcrypt.compare(password, user?.passwordHash ?? DUMMY_HASH);
  if (!user || !ok || !user.active) {
    await audit(req, A.LOGIN_FAILED, `Failed login for ${email}`);
    throw new ApiError(401, 'Invalid email or password.');
  }
  user.lastLoginAt = new Date(); await user.save();
  req.user = user;
  await audit(req, A.LOGIN, `${user.name} logged in`);
  res.json({ data: { token: signToken(user), user: safe(user) } });
}

export const me = (req, res) => res.json({ data: safe(req.user) });

export async function changePassword(req, res) {
  const { currentPassword, newPassword } = req.valid.body;
  const user = await User.findById(req.user._id).select('+passwordHash');
  if (!(await bcrypt.compare(currentPassword, user.passwordHash))) throw new ApiError(400, 'Current password is incorrect.');
  if (await bcrypt.compare(newPassword, user.passwordHash)) throw new ApiError(400, 'New password must be different from the current password.');
  user.passwordHash = await bcrypt.hash(newPassword, 12);
  user.mustChangePassword = false; await user.save();
  await audit(req, A.PASSWORD_CHANGED, `${user.name} changed their password`);
  res.json({ data: { ok: true } });
}

/** SUPER_ADMIN: any role. CLUB_ADMIN: CLUB_MEMBER in own club only. */
export async function register(req, res) {
  const { name, email, password, role, clubId } = req.valid.body;
  const actor = req.user;
  let club = null;
  if (actor.role === ROLES.CLUB_ADMIN) {
    if (role !== ROLES.CLUB_MEMBER) throw new ApiError(403, 'Club admins can only create club members.');
    club = actor.club;
  } else if (role !== ROLES.SUPER_ADMIN) {
    if (!clubId || !(await Club.exists({ _id: clubId }))) throw new ApiError(400, 'A valid club is required for this role.');
    club = clubId;
  }
  const user = await User.create({ name, email, role, club, passwordHash: await bcrypt.hash(password, 12), mustChangePassword: true });
  await audit(req, A.USER_CREATED, `${actor.name} created ${role} ${email}`, { userId: user._id });
  res.status(201).json({ data: safe(user) });
}
