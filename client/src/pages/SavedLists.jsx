import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Alert, Badge, Button, Card, ConfirmDialog, EmptyState, Input, LoadingBlock, MenuButton, PageHeader, Pagination, TableWrap, Td, Th } from '../components/ui/index.jsx';
import { useToast } from '../context/ToastContext.jsx';
import { useDebounced, useFetch } from '../hooks/useFetch.js';
import { api } from '../services/api.js';
import { COPY_FORMATS, copyToClipboard, errMsg, fmtDate, fmtNum, SOURCE_LABELS } from '../utils/format.js';

export default function SavedLists() {
  const toast = useToast();
  const [q, setQ] = useState('');
  const [page, setPage] = useState(1);
  const dq = useDebounced(q, 350);
  const { data, loading, error, reload } = useFetch(() => api.lists.list({ q: dq, page, limit: 20 }), [dq, page]);
  const [toDelete, setToDelete] = useState(null);
  const [deleting, setDeleting] = useState(false);

  const copy = async (id, format) => {
    try { const r = await api.lists.copyText(id, format); await copyToClipboard(r.data.text); toast.success(`${fmtNum(r.data.count)} email addresses copied.`); }
    catch (e) { toast.error(errMsg(e)); }
  };
  const remove = async () => {
    setDeleting(true);
    try { await api.lists.remove(toDelete._id); toast.success('List deleted.'); setToDelete(null); reload(); }
    catch (e) { toast.error(errMsg(e)); } finally { setDeleting(false); }
  };

  return (
    <>
      <PageHeader title="Saved Lists" subtitle="Recipient lists you saved. Each stores a snapshot that only changes when you regenerate it."
        actions={<Link to="/recipients"><Button>New list</Button></Link>} />
      <div className="mb-4 max-w-sm">
        <label><span className="sr-only">Search saved lists</span>
          <Input type="search" placeholder="Search by name" value={q} onChange={(e) => { setQ(e.target.value); setPage(1); }} /></label>
      </div>
      {error && <Alert tone="error" className="mb-4">{errMsg(error)}</Alert>}
      {loading && !data ? <LoadingBlock label="Loading saved lists…" /> : data?.data?.length ? (
        <Card className={loading ? 'opacity-70' : ''}>
          <TableWrap>
            <thead><tr><Th>Name</Th><Th>Recipients</Th><Th>Source</Th><Th>Created</Th><Th>Creator</Th><Th>Actions</Th></tr></thead>
            <tbody>
              {data.data.map((c) => (
                <tr key={c._id} className="hover:bg-slate-50">
                  <Td><Link to={`/saved-lists/${c._id}`} className="font-medium text-nitd-700 hover:underline">{c.name}</Link>{c.status === 'DRAFT' && <span className="ml-2"><Badge tone="muted">Draft</Badge></span>}</Td>
                  <Td className="tabular-nums">{fmtNum(c.counts?.final)}</Td>
                  <Td>{SOURCE_LABELS[c.source]}</Td>
                  <Td>{fmtDate(c.createdAt)}</Td>
                  <Td>{c.createdBy?.name ?? '—'}</Td>
                  <Td>
                    <div className="flex items-center gap-2">
                      <Link to={`/saved-lists/${c._id}`}><Button size="sm" variant="secondary">View</Button></Link>
                      <MenuButton size="sm" variant="secondary" label="Copy" items={COPY_FORMATS.map((f) => ({ label: f.label, onClick: () => copy(c._id, f.id) }))} />
                      <Button size="sm" variant="danger" onClick={() => setToDelete(c)}>Delete</Button>
                    </div>
                  </Td>
                </tr>
              ))}
            </tbody>
          </TableWrap>
          <Pagination pagination={data.pagination} onPage={setPage} />
        </Card>
      ) : (
        <EmptyState title={dq ? 'No lists match your search.' : 'No saved lists yet.'} text={dq ? undefined : 'Generate recipients in the Recipient Builder and save them here for later.'}
          action={!dq && <Link to="/recipients"><Button>Open Recipient Builder</Button></Link>} />
      )}
      {toDelete && (
        <ConfirmDialog title="Delete saved list?" danger confirmLabel="Delete list" loading={deleting} onConfirm={remove} onClose={() => setToDelete(null)}>
          “{toDelete.name}” and its {fmtNum(toDelete.counts?.final)} stored recipients will be permanently deleted.
        </ConfirmDialog>
      )}
    </>
  );
}
