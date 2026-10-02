import { useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import CopyExportBar from '../components/recipients/CopyExportBar.jsx';
import RecipientTable from '../components/recipients/RecipientTable.jsx';
import { SourceNotice, Warnings } from '../components/recipients/ResultNotices.jsx';
import { Alert, Badge, Button, Card, ConfirmDialog, Field, Input, LoadingBlock, Modal, PageHeader, Textarea } from '../components/ui/index.jsx';
import { useToast } from '../context/ToastContext.jsx';
import { useFetch } from '../hooks/useFetch.js';
import { api } from '../services/api.js';
import { batchLabel, errMsg, fmtDateTime, fmtNum } from '../utils/format.js';

const describeSpec = (s = {}) => {
  const batches = s.allBatches ? 'All batches' : (s.batches || []).map(batchLabel).join(', ') || '—';
  const branches = s.allBranches ? 'All branches' : (s.branches || []).join(', ') || '—';
  const sel = s.selection || {};
  const mode = sel.mode === 'RANGE' ? `Roll range ${sel.start}–${sel.end} (per branch)` : sel.mode === 'ROLLS' ? 'Specific roll numbers' : 'All students';
  return { batches, branches, mode };
};
const Item = ({ label, children }) => <div><dt className="text-xs font-medium uppercase tracking-wide text-slate-500">{label}</dt><dd className="mt-0.5 text-sm text-ink">{children}</dd></div>;

export default function SavedListDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const toast = useToast();
  const meta = useFetch(async () => (await api.lists.get(id)).data, [id]);
  const [view, setView] = useState({ q: '', sort: 'position', order: 'asc', page: 1 });
  const rec = useFetch(() => api.lists.recipients(id, { ...view, limit: 25 }), [id, view, meta.data?.generatedAt]);
  const [dialog, setDialog] = useState(null); // 'regen' | 'delete' | 'edit'
  const [busy, setBusy] = useState(false);

  const onView = (patch) => setView((v) => ({ ...v, ...patch }));
  const c = meta.data;

  const regenerate = async () => {
    setBusy(true);
    try { await api.lists.update(id, { spec: c.spec }); toast.success('List regenerated from the current configuration.'); setDialog(null); setView((v) => ({ ...v, page: 1 })); meta.reload(); }
    catch (e) { toast.error(errMsg(e)); setDialog(null); } finally { setBusy(false); }
  };
  const remove = async () => {
    setBusy(true);
    try { await api.lists.remove(id); toast.success('List deleted.'); navigate('/saved-lists'); }
    catch (e) { toast.error(errMsg(e)); setBusy(false); setDialog(null); }
  };

  if (meta.loading && !c) return <LoadingBlock label="Loading list…" />;
  if (meta.error) return <><Alert tone="error">{errMsg(meta.error)}</Alert><p className="mt-3"><Link className="text-nitd-700 underline" to="/saved-lists">Back to saved lists</Link></p></>;
  const d = describeSpec(c.spec);

  return (
    <>
      <p className="mb-2 text-sm"><Link to="/saved-lists" className="text-nitd-700 hover:underline">← Saved Lists</Link></p>
      <PageHeader title={c.name} subtitle={c.notes || undefined}
        actions={<>
          <Button variant="secondary" onClick={() => setDialog('edit')}>Edit details</Button>
          <Button variant="secondary" onClick={() => setDialog('regen')}>Regenerate</Button>
          <Button variant="danger" onClick={() => setDialog('delete')}>Delete</Button>
        </>} />

      <Card>
        <div className="grid gap-5 p-5 sm:grid-cols-2 lg:grid-cols-4">
          <Item label="Recipients"><span className="text-2xl font-semibold tabular-nums text-nitd-700">{fmtNum(c.counts?.final)}</span></Item>
          <Item label="Generated / Added / Excluded">{fmtNum(c.counts?.generated)} / {fmtNum(c.counts?.added)} / {fmtNum(c.counts?.excluded)}</Item>
          <Item label="Created">{fmtDateTime(c.createdAt)}</Item>
          <Item label="Creator">{c.createdBy?.name ?? '—'}</Item>
          <Item label="Batches">{d.batches}</Item>
          <Item label="Branches">{d.branches}</Item>
          <Item label="Selection">{d.mode}</Item>
          <Item label="Last generated">{fmtDateTime(c.generatedAt)}{c.status === 'DRAFT' && <span className="ml-2"><Badge tone="muted">Draft</Badge></span>}</Item>
        </div>
        {c.groups?.length > 0 && (
          <div className="flex flex-wrap gap-2 border-t border-slate-200 px-5 py-3 text-xs text-slate-600">
            {c.groups.map((g) => <span key={`${g.batch}-${g.branch}`} className="rounded bg-slate-100 px-2 py-1">{batchLabel(g.batch)} · {g.branch}: <strong>{g.count}</strong></span>)}
          </div>
        )}
      </Card>

      <div className="mt-4 space-y-3">
        <SourceNotice source={c.source} sourceLabel={c.sourceLabel} disclaimer={null} />
        <Warnings warnings={c.warnings} />
        <Alert tone="info">This is a stored snapshot. Later changes to the roll-number configuration do not affect it unless you choose <strong>Regenerate</strong>.</Alert>
      </div>

      <Card className="mt-5">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 px-5 py-4">
          <h2 className="text-base font-semibold">Recipients</h2>
          <CopyExportBar copy={(f) => api.lists.copyText(id, f)} download={(f) => api.lists.download(id, f)} />
        </div>
        {rec.error ? <div className="p-5"><Alert tone="error">{errMsg(rec.error)}</Alert></div> : (
          <RecipientTable rows={rec.data?.data ?? []} pagination={rec.data?.pagination} view={view} onView={onView} loading={rec.loading} />
        )}
      </Card>

      {dialog === 'regen' && (
        <ConfirmDialog title="Regenerate this list?" confirmLabel="Regenerate" loading={busy} onConfirm={regenerate} onClose={() => setDialog(null)}>
          This replaces the stored snapshot ({fmtNum(c.counts?.final)} recipients) with a new list generated from the <strong>current</strong> roll-number configuration using the same filters. The previous snapshot cannot be recovered.
        </ConfirmDialog>
      )}
      {dialog === 'delete' && (
        <ConfirmDialog title="Delete saved list?" danger confirmLabel="Delete list" loading={busy} onConfirm={remove} onClose={() => setDialog(null)}>
          “{c.name}” and its stored recipients will be permanently deleted.
        </ConfirmDialog>
      )}
      {dialog === 'edit' && <EditModal list={c} onClose={() => setDialog(null)} onSaved={() => { setDialog(null); meta.reload(); toast.success('Details saved.'); }} />}
    </>
  );
}

function EditModal({ list, onClose, onSaved }) {
  const [name, setName] = useState(list.name);
  const [notes, setNotes] = useState(list.notes || '');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);
  const submit = async (e) => {
    e.preventDefault(); setBusy(true); setError(null);
    try { await api.lists.update(list._id, { name, notes }); onSaved(); } catch (err) { setError(err); setBusy(false); }
  };
  return (
    <Modal title="Edit list details" onClose={onClose} footer={<>
      <Button variant="secondary" onClick={onClose} disabled={busy}>Cancel</Button>
      <Button type="submit" form="edit-list" loading={busy}>Save</Button>
    </>}>
      <form id="edit-list" onSubmit={submit} className="space-y-4">
        <Field label="Name"><Input required maxLength={150} value={name} onChange={(e) => setName(e.target.value)} /></Field>
        <Field label="Notes"><Textarea rows={3} maxLength={1000} value={notes} onChange={(e) => setNotes(e.target.value)} className="font-sans" /></Field>
        {error && <Alert tone="error">{errMsg(error)}</Alert>}
      </form>
    </Modal>
  );
}
