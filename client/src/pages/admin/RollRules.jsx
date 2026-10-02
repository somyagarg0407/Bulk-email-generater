import { useState } from 'react';
import { Alert, Badge, Button, Card, ConfirmDialog, EmptyState, Field, Input, LoadingBlock, Modal, PageHeader, Select, TableWrap, Td, Th } from '../../components/ui/index.jsx';
import { useToast } from '../../context/ToastContext.jsx';
import { useFetch } from '../../hooks/useFetch.js';
import { api } from '../../services/api.js';
import { batchLabel, errMsg, fmtDateTime } from '../../utils/format.js';

export default function RollRules() {
  const toast = useToast();
  const { data, loading, error, reload } = useFetch(async () => {
    const [r, b, br, s] = await Promise.all([api.config.rules(), api.config.batches(), api.config.branches(), api.config.settings()]);
    return { rules: r.data, batches: b.data, branches: br.data, domain: s.data.emailDomain };
  }, []);
  const [fb, setFb] = useState('');
  const [fk, setFk] = useState('');
  const [modal, setModal] = useState(null);
  const [del, setDel] = useState(null);
  const [busy, setBusy] = useState(false);

  const rows = (data?.rules ?? []).filter((r) => (!fb || r.batch === Number(fb)) && (!fk || r.branch === fk));
  const toggle = async (r) => {
    try { await api.admin.updateRule(r._id, { active: !r.active }); toast.success(`Rule ${r.active ? 'deactivated' : 'activated'}.`); reload(); }
    catch (e) { toast.error(errMsg(e)); }
  };
  const remove = async () => {
    setBusy(true);
    try { await api.admin.deleteRule(del._id); toast.success('Rule deleted.'); setDel(null); reload(); }
    catch (e) { toast.error(errMsg(e)); setDel(null); } finally { setBusy(false); }
  };
  const branchName = (k) => data?.branches.find((b) => b.key === k)?.name ?? k;

  return (
    <>
      <PageHeader title="Roll Rules" subtitle="Configured maximum ranges (assumed, not a verified student list). Changes apply to the Recipient Builder immediately."
        actions={<Button onClick={() => setModal({})}>Add rule</Button>} />
      {error && <Alert tone="error" className="mb-4">{errMsg(error)}</Alert>}
      {loading && !data ? <LoadingBlock label="Loading roll rules…" /> : data && (
        <>
          <div className="mb-4 flex flex-wrap gap-3">
            <label className="text-sm"><span className="sr-only">Filter by batch</span>
              <Select value={fb} onChange={(e) => setFb(e.target.value)}><option value="">All batches</option>{data.batches.map((b) => <option key={b.year} value={b.year}>{batchLabel(b.year)}</option>)}</Select></label>
            <label className="text-sm"><span className="sr-only">Filter by branch</span>
              <Select value={fk} onChange={(e) => setFk(e.target.value)}><option value="">All branches</option>{data.branches.map((b) => <option key={b.key} value={b.key}>{b.name}</option>)}</Select></label>
          </div>
          {rows.length ? (
            <Card>
              <TableWrap>
                <thead><tr><Th>Batch</Th><Th>Branch</Th><Th>Prefix</Th><Th>Start</Th><Th>End</Th><Th>Width</Th><Th>Domain</Th><Th>Status</Th><Th>Last updated</Th><Th>Actions</Th></tr></thead>
                <tbody>
                  {rows.map((r) => (
                    <tr key={r._id} className={r.active ? '' : 'bg-slate-50 text-slate-500'}>
                      <Td>{batchLabel(r.batch)}</Td><Td className="font-medium">{branchName(r.branch)}</Td>
                      <Td className="font-mono">{r.prefix}</Td><Td className="tabular-nums">{r.startSequence}</Td><Td className="tabular-nums font-medium">{r.endSequence}</Td><Td>{r.sequenceWidth}</Td>
                      <Td>{r.emailDomain || <span className="text-slate-500">{data.domain} <span className="text-xs">(default)</span></span>}</Td>
                      <Td><Badge tone={r.active ? 'blue' : 'muted'}>{r.active ? 'Active' : 'Inactive'}</Badge></Td>
                      <Td>{fmtDateTime(r.updatedAt)}</Td>
                      <Td><div className="flex gap-2">
                        <Button size="sm" variant="secondary" onClick={() => setModal({ rule: r })}>Edit</Button>
                        <Button size="sm" variant="secondary" onClick={() => toggle(r)}>{r.active ? 'Deactivate' : 'Activate'}</Button>
                        <Button size="sm" variant="danger" onClick={() => setDel(r)}>Delete</Button>
                      </div></Td>
                    </tr>
                  ))}
                </tbody>
              </TableWrap>
              <p className="border-t border-slate-200 px-4 py-2 text-xs text-slate-500">Roll numbers = prefix + zero-padded sequence (e.g. {rows[0].firstRoll} to {rows[0].lastRoll}).</p>
            </Card>
          ) : <EmptyState title="No rules match." text="Adjust the filters or add a rule." />}
        </>
      )}
      {modal && <RuleModal rule={modal.rule} data={data} onClose={() => setModal(null)} onSaved={() => { setModal(null); reload(); toast.success('Rule saved.'); }} />}
      {del && <ConfirmDialog title="Delete this rule?" danger confirmLabel="Delete rule" loading={busy} onConfirm={remove} onClose={() => setDel(null)}>
        {batchLabel(del.batch)} {branchName(del.branch)} will no longer generate recipients. Saved lists are not affected. To keep the rule but stop using it, deactivate it instead.
      </ConfirmDialog>}
    </>
  );
}

function RuleModal({ rule, data, onClose, onSaved }) {
  const [f, setF] = useState({
    batch: rule?.batch ?? data.batches[0]?.year ?? '', branch: rule?.branch ?? data.branches[0]?.key ?? '',
    prefix: rule?.prefix ?? '', startSequence: rule?.startSequence ?? 1, endSequence: rule?.endSequence ?? '',
    sequenceWidth: rule?.sequenceWidth ?? 3, emailDomain: rule?.emailDomain ?? '', active: rule?.active ?? true,
  });
  const set = (p) => setF((s) => ({ ...s, ...p }));
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);
  const submit = async (e) => {
    e.preventDefault(); setBusy(true); setError(null);
    const body = { prefix: f.prefix, startSequence: Number(f.startSequence), endSequence: Number(f.endSequence), sequenceWidth: Number(f.sequenceWidth), emailDomain: f.emailDomain.trim(), active: f.active };
    try {
      if (rule) await api.admin.updateRule(rule._id, body); else await api.admin.createRule({ batch: Number(f.batch), branch: f.branch, ...body });
      onSaved();
    } catch (err) { setError(err); setBusy(false); }
  };
  return (
    <Modal wide title={rule ? `Edit ${batchLabel(rule.batch)} · ${rule.branch}` : 'Add roll rule'} onClose={onClose} footer={<>
      <Button variant="secondary" onClick={onClose} disabled={busy}>Cancel</Button>
      <Button type="submit" form="rule-form" loading={busy}>Save changes</Button></>}>
      <form id="rule-form" onSubmit={submit} className="grid gap-4 sm:grid-cols-2">
        <Field label="Batch"><Select disabled={!!rule} value={f.batch} onChange={(e) => set({ batch: e.target.value })}>{data.batches.map((b) => <option key={b.year} value={b.year}>{batchLabel(b.year)}</option>)}</Select></Field>
        <Field label="Branch"><Select disabled={!!rule} value={f.branch} onChange={(e) => set({ branch: e.target.value })}>{data.branches.map((b) => <option key={b.key} value={b.key}>{b.name}</option>)}</Select></Field>
        <Field label="Prefix" hint="Digits before the sequence, e.g. 251210"><Input required inputMode="numeric" value={f.prefix} onChange={(e) => set({ prefix: e.target.value })} /></Field>
        <Field label="Width" hint="Digits in the sequence (3 → 001)"><Input required type="number" min={1} max={6} value={f.sequenceWidth} onChange={(e) => set({ sequenceWidth: e.target.value })} /></Field>
        <Field label="Start sequence"><Input required type="number" min={1} value={f.startSequence} onChange={(e) => set({ startSequence: e.target.value })} /></Field>
        <Field label="End sequence" hint="Configured maximum, e.g. 140"><Input required type="number" min={1} value={f.endSequence} onChange={(e) => set({ endSequence: e.target.value })} /></Field>
        <Field label="Email domain override" hint={`Leave blank to use ${data.domain}`} className="sm:col-span-2"><Input value={f.emailDomain} onChange={(e) => set({ emailDomain: e.target.value })} /></Field>
        <label className="flex items-center gap-2 text-sm sm:col-span-2"><input type="checkbox" className="accent-nitd-600" checked={f.active} onChange={(e) => set({ active: e.target.checked })} /> Active</label>
        {error && <Alert tone="error" className="sm:col-span-2">{errMsg(error)}</Alert>}
      </form>
    </Modal>
  );
}
