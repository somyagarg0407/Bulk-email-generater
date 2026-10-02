// Runs the REAL auth middleware/controller with jsonwebtoken, bcrypt and the models replaced by fakes.
// This validates our logic (mustChangePassword enforcement, inactive users, algorithm pinning, authorize),
// NOT the real jsonwebtoken/bcrypt libraries and NOT HTTP.
import { test, mock } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const users = new Map();
const calls = { verify: [], sign: [] };
const thenable = (u) => ({ select: async () => u, then: (res, rej) => Promise.resolve(u).then(res, rej) });
const User = {
  findById: (id) => thenable(users.get(id) ?? null),
  findOne: ({ email }) => thenable([...users.values()].find((u) => u.email === email) ?? null),
};
const jwt = {
  sign: (payload, _s, opts) => { calls.sign.push(opts); return `tok:${payload.sub}`; },
  verify: (token, _s, opts) => { calls.verify.push(opts); if (!token.startsWith('tok:')) throw new Error('bad'); return { sub: token.slice(4) }; },
};
const bcrypt = { hashSync: (p) => `h(${p})`, hash: async (p) => `h(${p})`, compare: async (p, h) => `h(${p})` === h };

const here = (p) => new URL(p, import.meta.url).href;
mock.module(here('../src/models/index.js'), { namedExports: { User, Club: {}, AuditLog: { create: async () => {} } } });
mock.module(here('../src/config/env.js'), { namedExports: { env: { jwtSecret: 's', jwtExpiresIn: '1h' } } });
mock.module('jsonwebtoken', { defaultExport: jwt });
mock.module('bcrypt', { defaultExport: bcrypt });

const { authenticate, authenticateAllowPending, authorize } = await import('../src/middleware/auth.js');
const auth = await import('../src/controllers/auth.controller.js');

const mk = (id, extra = {}) => { const u = { _id: id, id, name: id, email: `${id}@x.edu`, role: 'CLUB_MEMBER', club: 'c1', active: true, mustChangePassword: false, passwordHash: 'h(Current-pass-123)', save: async () => {}, ...extra }; users.set(id, u); return u; };
const run = async (mw, token) => {
  const req = { headers: token === undefined ? {} : { authorization: `Bearer ${token}` } };
  let err; await mw(req, {}, (e) => { err = e; });
  return { err, req };
};
const res = () => { const r = { body: null, json(b) { r.body = b; return r; }, status() { return r; } }; return r; };

test('missing / malformed token -> 401', async () => {
  assert.equal((await run(authenticate)).err.status, 401);
  assert.equal((await run(authenticate, 'garbage')).err.status, 401);
  assert.equal((await run(authenticate, 'tok:nobody')).err.status, 401);
});

test('JWT is verified with algorithms pinned to HS256 and signed with HS256', async () => {
  mk('ok1');
  await run(authenticate, 'tok:ok1');
  assert.deepEqual(calls.verify.at(-1), { algorithms: ['HS256'] });
  const r = res(); const u = mk('login1', { passwordHash: 'h(Current-pass-123)' });
  await auth.login({ valid: { body: { email: u.email, password: 'Current-pass-123' } }, headers: {}, ip: '1' }, r);
  assert.equal(calls.sign.at(-1).algorithm, 'HS256');
});

test('inactive users cannot authenticate (token or login)', async () => {
  mk('gone', { active: false });
  assert.equal((await run(authenticate, 'tok:gone')).err.status, 401);
  await assert.rejects(auth.login({ valid: { body: { email: 'gone@x.edu', password: 'Current-pass-123' } }, headers: {} }, res()), /Invalid email or password/);
});

test('mustChangePassword: blocked everywhere except me/change-password', async () => {
  mk('pend', { mustChangePassword: true });
  const blocked = (await run(authenticate, 'tok:pend')).err;
  assert.equal(blocked.status, 403);
  assert.equal(blocked.code, 'PASSWORD_CHANGE_REQUIRED');
  assert.match(blocked.message, /must be changed before you continue/);
  assert.equal((await run(authenticateAllowPending, 'tok:pend')).err, undefined);
});

test('login still works for a pending user (so they can reach change-password)', async () => {
  const u = mk('pend2', { mustChangePassword: true, passwordHash: 'h(Temp-pass-1234)' });
  const r = res();
  await auth.login({ valid: { body: { email: u.email, password: 'Temp-pass-1234' } }, headers: {}, ip: '1' }, r);
  assert.equal(r.body.data.user.mustChangePassword, true);
  assert.ok(r.body.data.token);
});

test('change-password: wrong current, same password rejected; success lifts the block', async () => {
  const u = mk('pend3', { mustChangePassword: true, passwordHash: 'h(Temp-pass-1234)' });
  const call = (body) => auth.changePassword({ user: u, valid: { body }, headers: {} }, res());
  await assert.rejects(call({ currentPassword: 'wrong-password', newPassword: 'Brand-new-pass-1' }), /Current password is incorrect/);
  await assert.rejects(call({ currentPassword: 'Temp-pass-1234', newPassword: 'Temp-pass-1234' }), /must be different/);
  assert.equal((await run(authenticate, 'tok:pend3')).err.status, 403); // still blocked
  await call({ currentPassword: 'Temp-pass-1234', newPassword: 'Brand-new-pass-1' });
  assert.equal(u.mustChangePassword, false);
  assert.equal(u.passwordHash, 'h(Brand-new-pass-1)');
  assert.equal((await run(authenticate, 'tok:pend3')).err, undefined); // normal access restored
});

test('authorize() enforces roles', async () => {
  const check = (role, ...allowed) => { let e; authorize(...allowed)({ user: { role } }, {}, (x) => { e = x; }); return e; };
  assert.equal(check('SUPER_ADMIN', 'SUPER_ADMIN'), undefined);
  assert.equal(check('CLUB_ADMIN', 'SUPER_ADMIN').status, 403);
  assert.equal(check('CLUB_MEMBER', 'SUPER_ADMIN', 'CLUB_ADMIN').status, 403);
  assert.equal(check('CLUB_ADMIN', 'SUPER_ADMIN', 'CLUB_ADMIN'), undefined);
});

test('route wiring (static): only me/change-password allow pending users; admin router is SUPER_ADMIN only', () => {
  const src = readFileSync(new URL('../src/routes/index.js', import.meta.url), 'utf8');
  const pendingLines = src.split('\n').filter((l) => l.includes('authenticateAllowPending') && l.includes('r.'));
  assert.equal(pendingLines.length, 2);
  assert.ok(pendingLines.every((l) => /\/auth\/(me|change-password)/.test(l)));
  assert.match(src, /admin\.use\(authorize\(SUPER_ADMIN\)\)/);
  const beforeGlobal = src.slice(0, src.indexOf('r.use(authenticate)'));
  const publicRoutes = beforeGlobal.split('\n').filter((l) => /^r\.(get|post|put|patch|delete)\(/.test(l) && !/authenticate/.test(l));
  assert.equal(publicRoutes.length, 1); // login only
  assert.match(publicRoutes[0], /\/auth\/login/);
});
