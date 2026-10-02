import { useState } from 'react';
import { Alert, Badge, Button, Card, EmptyState, Field, Input, LoadingBlock, Modal, PageHeader, TableWrap, Td, Th } from '../../components/ui/index.jsx';
import { useToast } from '../../context/ToastContext.jsx';
import { useFetch } from '../../hooks/useFetch.js';
import { api } from '../../services/api.js';
import { errMsg, fmtDate } from '../../utils/format.js';

export default function Branches() {
  const toast = useToast();
  const { data, loading, error, reload } = useFetch(async () => (await api.config.branches()).data, []);
  const [modal, setModal] = useState(null);

  const toggle = async (b) => {
    try { await api.admin.updateBranch(b._id, { active: !b.active }); toast.success(`${b.name} ${b.active ? 'deactivated' : 'activated'}.`); reload(); }
    catch (e) { toast.error(errMsg(e)); }
  };

  return (
    <>
      <PageHeader title="Branches" subtitle="Branches that appear in the Recipient Builder."
        actions={<Button onClick={() => setModal({})}>Add branch</Button>} />
      {error && <Alert tone="error" className="mb-4">{errMsg(error)}</Alert>}
      {loading && !data ? <LoadingBlock label="Loading branches…" /> : data?.length ? (
        <Card>
          <TableWrap>
            <thead><tr><Th>Order</Th><Th>Key</Th><Th>Name</Th><Th>Program code</Th><Th>Status</Th><Th>Updated</Th><Th>Actions</Th></tr></thead>
            <tbody>
              {data.map((b) => (
                <tr key={b._id}>
                  <Td>{b.sortOrder}</Td><Td className="font-mono">{b.key}</Td><Td className="font-medium">{b.name}</Td><Td className="font-mono">{b.code || '—'}</Td>
                  <Td><Badge tone={b.active ? 'blue' : 'muted'}>{b.active ? 'Active' : 'Inactive'}</Badge></Td>
                  <Td>{fmtDate(b.updatedAt)}</Td>
                  <Td><div className="flex gap-2">
                    <Button size="sm" variant="secondary" onClick={() => setModal({ branch: b })}>Edit</Button>
                    <Button size="sm" variant="secondary" onClick={() => toggle(b)}>{b.active ? 'Deactivate' : 'Activate'}</Button>
                  </div></Td>
                </tr>
              ))}
            </tbody>
          </TableWrap>
        </Card>
      ) : <EmptyState title="No branches configured." action={<Button onClick={() => setModal({})}>Add branch</Button>} />}
      {modal && <BranchModal branch={modal.branch} onClose={() => setModal(null)} onSaved={() => { setModal(null); reload(); toast.success('Branch saved.'); }} />}
    </>
  );
}

function BranchModal({ branch, onClose, onSaved }) {
  const [f, setF] = useState({ key: branch?.key ?? '', name: branch?.name ?? '', code: branch?.code ?? '', sortOrder: branch?.sortOrder ?? 100 });
  const set = (p) => setF((s) => ({ ...s, ...p }));
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);
  const submit = async (e) => {
    e.preventDefault(); setBusy(true); setError(null);
    try {
      const body = { name: f.name, code: f.code, sortOrder: Number(f.sortOrder) };
      if (branch) await api.admin.updateBranch(branch._id, body); else await api.admin.createBranch({ key: f.key, ...body });
      onSaved();
    } catch (err) { setError(err); setBusy(false); }
  };
  return (
    <Modal title={branch ? `Edit ${branch.name}` : 'Add branch'} onClose={onClose} footer={<>
      <Button variant="secondary" onClick={onClose} disabled={busy}>Cancel</Button>
      <Button type="submit" form="branch-form" loading={busy}>Save</Button></>}>
      <form id="branch-form" onSubmit={submit} className="space-y-4">
        <Field label="Key" hint="Letters, digits, underscore (e.g. CSE). Cannot be changed later."><Input required disabled={!!branch} value={f.key} onChange={(e) => set({ key: e.target.value.toUpperCase() })} /></Field>
        <Field label="Display name"><Input required maxLength={60} value={f.name} onChange={(e) => set({ name: e.target.value })} /></Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Program code" hint="Informational, e.g. 1210"><Input maxLength={20} value={f.code} onChange={(e) => set({ code: e.target.value })} /></Field>
          <Field label="Sort order"><Input type="number" min={0} max={1000} value={f.sortOrder} onChange={(e) => set({ sortOrder: e.target.value })} /></Field>
        </div>
        {error && <Alert tone="error">{errMsg(error)}</Alert>}
      </form>
    </Modal>
  );
}
