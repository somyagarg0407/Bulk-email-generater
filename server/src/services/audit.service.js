import { AuditLog } from '../models/index.js';

/** Never throws: a failed audit write must not break the request. */
export async function audit(req, action, summary, meta = {}) {
  try {
    const u = req.user;
    await AuditLog.create({
      user: u?._id, userName: u?.name, role: u?.role, action, summary, meta, ip: req.ip,
    });
  } catch (e) {
    console.error('Audit log failed:', e.message);
  }
}
