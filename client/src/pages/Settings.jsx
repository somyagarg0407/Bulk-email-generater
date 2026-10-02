import { useState } from 'react';
import { Alert, Badge, Button, Card, CardHeader, Field, Input, PageHeader } from '../components/ui/index.jsx';
import { useAuth } from '../context/AuthContext.jsx';
import { useToast } from '../context/ToastContext.jsx';
import { useFetch } from '../hooks/useFetch.js';
import { api } from '../services/api.js';
import { errMsg, ROLE_LABELS, SOURCE_LABELS } from '../utils/format.js';

export default function Settings() {
  const { user, refresh } = useAuth();
  const toast = useToast();
  const settings = useFetch(async () => (await api.config.settings()).data, []);
  const [cur, setCur] = useState('');
  const [next, setNext] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);

  const submit = async (e) => {
    e.preventDefault(); setBusy(true); setError(null);
    try { await api.auth.changePassword(cur, next); toast.success('Password changed.'); setCur(''); setNext(''); await refresh(); }
    catch (err) { setError(err); } finally { setBusy(false); }
  };

  return (
    <>
      <PageHeader title="Settings" />
      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader title="Your account" />
          <dl className="space-y-3 p-5 text-sm">
            <div><dt className="text-xs uppercase tracking-wide text-slate-500">Name</dt><dd>{user.name}</dd></div>
            <div><dt className="text-xs uppercase tracking-wide text-slate-500">Email</dt><dd>{user.email}</dd></div>
            <div><dt className="text-xs uppercase tracking-wide text-slate-500">Role</dt><dd>{ROLE_LABELS[user.role]}</dd></div>
          </dl>
        </Card>
        <Card>
          <CardHeader title="Recipient generation" subtitle="Managed by a Super Admin." />
          <dl className="space-y-3 p-5 text-sm">
            <div><dt className="text-xs uppercase tracking-wide text-slate-500">Email domain</dt><dd className="font-mono">@{settings.data?.emailDomain ?? '…'}</dd></div>
            <div><dt className="text-xs uppercase tracking-wide text-slate-500">Recipient source</dt><dd>{settings.data ? <Badge tone="blue">{SOURCE_LABELS[settings.data.recipientSource]}</Badge> : '…'}</dd></div>
          </dl>
        </Card>
        <Card className="lg:col-span-2">
          <CardHeader title="Change password" />
          <form onSubmit={submit} className="grid gap-4 p-5 sm:grid-cols-2">
            <Field label="Current password"><Input type="password" autoComplete="current-password" required value={cur} onChange={(e) => setCur(e.target.value)} /></Field>
            <Field label="New password" hint="At least 10 characters."><Input type="password" autoComplete="new-password" minLength={10} required value={next} onChange={(e) => setNext(e.target.value)} /></Field>
            {error && <Alert tone="error" className="sm:col-span-2">{errMsg(error)}</Alert>}
            <div className="sm:col-span-2"><Button type="submit" loading={busy}>Change password</Button></div>
          </form>
        </Card>
      </div>
    </>
  );
}
