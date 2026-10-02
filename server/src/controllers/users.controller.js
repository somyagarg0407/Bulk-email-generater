import { Club, User } from '../models/index.js';
import { audit } from '../services/audit.service.js';
import { ApiError } from '../utils/ApiError.js';
import { AUDIT_ACTIONS as A, ROLES } from '../utils/constants.js';

export async function listUsers(req, res) {
  const filter = req.user.role === ROLES.SUPER_ADMIN ? {} : { club: req.user.club };
  res.json({ data: await User.find(filter).populate('club', 'name').sort({ createdAt: -1 }).lean() });
}

export async function updateUser(req, res) {
  const target = await User.findById(req.valid.params.id);
  const actor = req.user;
  if (!target) throw new ApiError(404, 'User not found.');
  const { name, role, active, clubId } = req.valid.body;
  if (actor.role === ROLES.CLUB_ADMIN) {
    if (String(target.club) !== String(actor.club) || target.role !== ROLES.CLUB_MEMBER) throw new ApiError(403, 'You do not have permission to perform this action.');
    if (role !== undefined || clubId !== undefined) throw new ApiError(403, 'Club admins cannot change roles or clubs.');
  }
  if (String(target._id) === String(actor._id) && (active === false || (role && role !== actor.role))) {
    throw new ApiError(400, 'You cannot deactivate or change the role of your own account.');
  }
  if (clubId && !(await Club.exists({ _id: clubId }))) throw new ApiError(400, 'Club not found.');
  if (name !== undefined) target.name = name;
  if (role !== undefined) target.role = role;
  if (active !== undefined) target.active = active;
  if (clubId !== undefined) target.club = clubId;
  await target.save();
  await audit(req, A.USER_UPDATED, `${actor.name} updated user ${target.email}`, { changes: req.valid.body });
  res.json({ data: target });
}

export async function listClubs(req, res) {
  const filter = req.user.role === ROLES.SUPER_ADMIN ? {} : { _id: req.user.club };
  res.json({ data: await Club.find(filter).sort({ name: 1 }).lean() });
}

export async function createClub(req, res) {
  const name = req.valid.body.name;
  const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
  const club = await Club.create({ name, slug });
  await audit(req, A.CONFIG_CHANGED, `${req.user.name} created club ${name}`);
  res.status(201).json({ data: club });
}
