import { useState } from 'react';
import { Alert, Badge, Button, Card, EmptyState, Field, Input, LoadingBlock, Modal, PageHeader, Select, TableWrap, Td, Th } from '../../components/ui/index.jsx';
import { useAuth } from '../../context/AuthContext.jsx';
import { useToast } from '../../context/ToastContext.jsx';
import { useFetch } from '../../hooks/useFetch.js';
import { api } from '../../services/api.js';
import { errMsg, fmtDate, ROLE_LABELS } from '../../utils/format.js';

export default function Users() {
  const { user: me } = useAuth();
  const toast = useToast();
  const isSuper = me.role === 'SUPER_ADMIN';
  const { data, loading, error, reload } = useFetch(async () => {
    const [u, c] = await Promise.all([api.users.list(), isSuper ? api.clubs.list() : Promise.resolve({ data: [] })]);
    return { users: u.data, clubs: c.data };
  }, []);
  const [modal, setModal] = useState(null);

  const toggle = async (u) => {
    try { await api.users.update(u._id, { active: !u.active }); toast.success(`${u.name} ${u.active ? 'deactivated' : 'activated'}.`); reload(); }
    catch (e) { toast.error(errMsg(e)); }
  };

  return (
    <>
      <PageHeader title={isSuper ? 'Users' : 'Club members'} subtitle="There is no public registration. Accounts are created here and must change their password on first use."
        actions={<>{isSuper && <Button variant="secondary" onClick={() => setModal('club')}>New club</Button>}<Button onClick={() => setModal('user')}>Add user</Button></>} />
      {error && <Alert tone="error" className="mb-4">{errMsg(error)}</Alert>}
      {loading && !data ? <LoadingBlock label="Loading users…" /> : data?.users.length ? (
        <Card>
          <TableWrap>
            <thead><tr><Th>Name</Th><Th>Email</Th><Th>Role</Th><Th>Club</Th><Th>Status</Th><Th>Created</Th><Th>Actions</Th></tr></thead>
            <tbody>
              {data.users.map((u) => (
                <tr key={u._id}>
                  <Td className="font-medium">{u.name}</Td><Td>{u.email}</Td><Td>{ROLE_LABELS[u.role]}</Td><Td>{u.club?.name ?? '—'}</Td>
                  <Td><Badge tone={u.active ? 'blue' : 'muted'}>{u.active ? 'Active' : 'Inactive'}</Badge></Td>
                  <Td>{fmtDate(u.createdAt)}</Td>
                  <Td>{u._id !== me.id && (isSuper || u.role === 'CLUB_MEMBER') ? <Button size="sm" variant="secondary" onClick={() => toggle(u)}>{u.active ? 'Deactivate' : 'Activate'}</Button> : <span className="text-xs text-slate-400">—</span>}</Td>
                </tr>
              ))}
            </tbody>
          </TableWrap>
        </Card>
      ) : <EmptyState title="No users yet." />}
      {modal === 'user' && <UserModal isSuper={isSuper} clubs={data?.clubs ?? []} onClose={() => setModal(null)} onSaved={() => { setModal(null); reload(); toast.success('User created.'); }} />}
      {modal === 'club' && <ClubModal onClose={() => setModal(null)} onSaved={() => { setModal(null); reload(); toast.success('Club created.'); }} />}
    </>
  );
}

function UserModal({ isSuper, clubs, onClose, onSaved }) {
  const [f, setF] = useState({ name: '', email: '', password: '', role: 'CLUB_MEMBER', clubId: clubs[0]?._id ?? '' });
  const set = (p) => setF((s) => ({ ...s, ...p }));
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);
  const submit = async (e) => {
    e.preventDefault(); setBusy(true); setError(null);
    try {
      await api.users.create({ name: f.name, email: f.email, password: f.password, role: isSuper ? f.role : 'CLUB_MEMBER', ...(isSuper && f.role !== 'SUPER_ADMIN' && { clubId: f.clubId }) });
      onSaved();
    } catch (err) { setError(err); setBusy(false); }
  };
  return (
    <Modal title="Add user" onClose={onClose} footer={<>
      <Button variant="secondary" onClick={onClose} disabled={busy}>Cancel</Button>
      <Button type="submit" form="user-form" loading={busy}>Create user</Button></>}>
      <form id="user-form" onSubmit={submit} className="space-y-4">
        <Field label="Name"><Input required value={f.name} onChange={(e) => set({ name: e.target.value })} /></Field>
        <Field label="Email"><Input type="email" required value={f.email} onChange={(e) => set({ email: e.target.value })} /></Field>
        <Field label="Temporary password" hint="At least 10 characters. The user must change it after signing in."><Input type="text" autoComplete="off" minLength={10} required value={f.password} onChange={(e) => set({ password: e.target.value })} /></Field>
        {isSuper && <>
          <Field label="Role"><Select value={f.role} onChange={(e) => set({ role: e.target.value })}>{Object.entries(ROLE_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</Select></Field>
          {f.role !== 'SUPER_ADMIN' && <Field label="Club" hint={clubs.length ? undefined : 'Create a club first.'}><Select required value={f.clubId} onChange={(e) => set({ clubId: e.target.value })}>{clubs.map((c) => <option key={c._id} value={c._id}>{c.name}</option>)}</Select></Field>}
        </>}
        {error && <Alert tone="error">{errMsg(error)}</Alert>}
      </form>
    </Modal>
  );
}

function ClubModal({ onClose, onSaved }) {
  const [name, setName] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);
  const submit = async (e) => { e.preventDefault(); setBusy(true); setError(null); try { await api.clubs.create(name); onSaved(); } catch (err) { setError(err); setBusy(false); } };
  return (
    <Modal title="New club" onClose={onClose} footer={<>
      <Button variant="secondary" onClick={onClose} disabled={busy}>Cancel</Button>
      <Button type="submit" form="club-form" loading={busy}>Create club</Button></>}>
      <form id="club-form" onSubmit={submit} className="space-y-4">
        <Field label="Club name"><Input required minLength={2} value={name} onChange={(e) => setName(e.target.value)} /></Field>
        {error && <Alert tone="error">{errMsg(error)}</Alert>}
      </form>
    </Modal>
  );
}
