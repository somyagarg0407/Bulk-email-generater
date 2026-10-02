import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Alert, Button, Card, CardHeader, ConfirmDialog, Field, Input, LoadingBlock, PageHeader, Select } from '../../components/ui/index.jsx';
import { useToast } from '../../context/ToastContext.jsx';
import { useFetch } from '../../hooks/useFetch.js';
import { api } from '../../services/api.js';
import { errMsg } from '../../utils/format.js';

const links = [
  ['/admin/batches', 'Batches', 'UG batch years used in roll numbers.'],
  ['/admin/branches', 'Branches', 'Branch names, codes and display order.'],
  ['/admin/roll-rules', 'Roll Rules', 'Prefix, start and end sequence per batch and branch.'],
  ['/admin/users', 'Users', 'Create and deactivate users.'],
  ['/admin/audit-logs', 'Audit Logs', 'Who changed or generated what.'],
];

export default function AdminHome() {
  const toast = useToast();
  const { data, loading, error, reload } = useFetch(async () => (await api.config.settings()).data, []);
  const [domain, setDomain] = useState('');
  const [source, setSource] = useState('RULE_BASED');
  const [busy, setBusy] = useState(false);
  const [confirm, setConfirm] = useState(false);
  const [saveError, setSaveError] = useState(null);
  useEffect(() => { if (data) { setDomain(data.emailDomain); setSource(data.recipientSource); } }, [data]);

  const save = async () => {
    setBusy(true); setSaveError(null);
    try { await api.admin.updateSettings({ emailDomain: domain, recipientSource: source }); toast.success('Settings saved.'); setConfirm(false); reload(); }
    catch (e) { setSaveError(e); setConfirm(false); } finally { setBusy(false); }
  };
  const submit = (e) => { e.preventDefault(); if (source === 'ACTUAL_STUDENT_DATABASE' && data?.recipientSource !== source) setConfirm(true); else save(); };

  return (
    <>
      <PageHeader title="Administration" subtitle="Configuration changes apply immediately to the Recipient Builder. No code changes are needed." />
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {links.map(([to, title, text]) => (
          <Link key={to} to={to} className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm transition-colors hover:border-nitd-400">
            <p className="font-semibold text-nitd-700">{title}</p><p className="mt-1 text-sm text-slate-600">{text}</p>
          </Link>
        ))}
      </div>

      <Card className="mt-6">
        <CardHeader title="System settings" />
        {loading ? <div className="p-5"><LoadingBlock label="Loading settings…" /></div> : error ? <div className="p-5"><Alert tone="error">{errMsg(error)}</Alert></div> : (
          <form onSubmit={submit} className="grid gap-4 p-5 md:grid-cols-2">
            <Field label="Default email domain" hint="Appended to every roll number. A rule can override it."><Input required value={domain} onChange={(e) => setDomain(e.target.value)} /></Field>
            <Field label="Recipient source" hint="Rule-based uses the configured maximum ranges.">
              <Select value={source} onChange={(e) => setSource(e.target.value)}>
                <option value="RULE_BASED">Configured maximum range (rule-based)</option>
                <option value="ACTUAL_STUDENT_DATABASE">Imported student database</option>
              </Select>
            </Field>
            {source === 'ACTUAL_STUDENT_DATABASE' && <Alert tone="warn" className="md:col-span-2">Student CSV import is not available yet. With this source, lists contain only students already stored in the database (currently none), so generated lists will be empty.</Alert>}
            {saveError && <Alert tone="error" className="md:col-span-2">{errMsg(saveError)}</Alert>}
            <div className="md:col-span-2"><Button type="submit" loading={busy}>Save settings</Button></div>
          </form>
        )}
      </Card>
      {confirm && <ConfirmDialog title="Switch recipient source?" confirmLabel="Switch source" loading={busy} onConfirm={save} onClose={() => setConfirm(false)}>
        No student records have been imported, so new lists will be empty until student data is available. You can switch back at any time.
      </ConfirmDialog>}
    </>
  );
}
