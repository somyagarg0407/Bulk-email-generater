import { useState } from 'react';
import { Alert, Badge, Button, Card, EmptyState, Field, Input, LoadingBlock, Modal, PageHeader, TableWrap, Td, Th } from '../../components/ui/index.jsx';
import { useToast } from '../../context/ToastContext.jsx';
import { useFetch } from '../../hooks/useFetch.js';
import { api } from '../../services/api.js';
import { errMsg, fmtDate } from '../../utils/format.js';

export default function Batches() {
  const toast = useToast();
  const { data, loading, error, reload } = useFetch(async () => (await api.config.batches()).data, []);
  const [modal, setModal] = useState(null); // { batch? }

  const toggle = async (b) => {
    try { await api.admin.updateBatch(b._id, { active: !b.active }); toast.success(`UG ${b.year} ${b.active ? 'deactivated' : 'activated'}.`); reload(); }
    catch (e) { toast.error(errMsg(e)); }
  };

  return (
    <>
      <PageHeader title="Batches" subtitle="Batch years that appear in the Recipient Builder. Deactivate instead of deleting."
        actions={<Button onClick={() => setModal({})}>Add batch</Button>} />
      {error && <Alert tone="error" className="mb-4">{errMsg(error)}</Alert>}
      {loading && !data ? <LoadingBlock label="Loading batches…" /> : data?.length ? (
        <Card>
          <TableWrap>
            <thead><tr><Th>Year</Th><Th>Label</Th><Th>Status</Th><Th>Updated</Th><Th>Actions</Th></tr></thead>
            <tbody>
              {data.map((b) => (
                <tr key={b._id}>
                  <Td className="font-medium">{b.year}</Td><Td>{b.label}</Td>
                  <Td><Badge tone={b.active ? 'blue' : 'muted'}>{b.active ? 'Active' : 'Inactive'}</Badge></Td>
                  <Td>{fmtDate(b.updatedAt)}</Td>
                  <Td><div className="flex gap-2">
                    <Button size="sm" variant="secondary" onClick={() => setModal({ batch: b })}>Edit</Button>
                    <Button size="sm" variant="secondary" onClick={() => toggle(b)}>{b.active ? 'Deactivate' : 'Activate'}</Button>
                  </div></Td>
                </tr>
              ))}
            </tbody>
          </TableWrap>
        </Card>
      ) : <EmptyState title="No batches configured." action={<Button onClick={() => setModal({})}>Add batch</Button>} />}
      {modal && <BatchModal batch={modal.batch} onClose={() => setModal(null)} onSaved={() => { setModal(null); reload(); toast.success('Batch saved.'); }} />}
    </>
  );
}

function BatchModal({ batch, onClose, onSaved }) {
  const [year, setYear] = useState(batch?.year ?? '');
  const [label, setLabel] = useState(batch?.label ?? '');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);
  const submit = async (e) => {
    e.preventDefault(); setBusy(true); setError(null);
    try {
      if (batch) await api.admin.updateBatch(batch._id, { label });
      else await api.admin.createBatch({ year: Number(year), label: label || undefined });
      onSaved();
    } catch (err) { setError(err); setBusy(false); }
  };
  return (
    <Modal title={batch ? `Edit UG ${batch.year}` : 'Add batch'} onClose={onClose} footer={<>
      <Button variant="secondary" onClick={onClose} disabled={busy}>Cancel</Button>
      <Button type="submit" form="batch-form" loading={busy}>Save</Button></>}>
      <form id="batch-form" onSubmit={submit} className="space-y-4">
        <Field label="Admission year" hint="e.g. 2027. Cannot be changed later."><Input required inputMode="numeric" disabled={!!batch} value={year} onChange={(e) => setYear(e.target.value)} /></Field>
        <Field label="Label"><Input maxLength={40} value={label} onChange={(e) => setLabel(e.target.value)} placeholder="UG 2027" /></Field>
        {!batch && <p className="text-xs text-slate-500">After adding a batch, create its roll rules under Roll Rules.</p>}
        {error && <Alert tone="error">{errMsg(error)}</Alert>}
      </form>
    </Modal>
  );
}
