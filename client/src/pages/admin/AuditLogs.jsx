import { useState } from 'react';
import { Alert, Badge, Card, EmptyState, LoadingBlock, PageHeader, Select, TableWrap, Td, Th } from '../../components/ui/index.jsx';
import { useFetch } from '../../hooks/useFetch.js';
import { api } from '../../services/api.js';
import { errMsg, fmtDateTime } from '../../utils/format.js';

export default function AuditLogs() {
  const [limit, setLimit] = useState(100);
  const { data, loading, error } = useFetch(async () => (await api.admin.auditLogs(limit)).data, [limit]);
  return (
    <>
      <PageHeader title="Audit Logs" subtitle="Logins, recipient generation, copy/export, saved-list changes and configuration changes."
        actions={<label className="text-sm"><span className="sr-only">Number of entries</span>
          <Select value={limit} onChange={(e) => setLimit(Number(e.target.value))}>{[100, 250, 500].map((n) => <option key={n} value={n}>Latest {n}</option>)}</Select></label>} />
      {error && <Alert tone="error" className="mb-4">{errMsg(error)}</Alert>}
      {loading && !data ? <LoadingBlock label="Loading audit logs…" /> : data?.length ? (
        <Card className={loading ? 'opacity-70' : ''}>
          <TableWrap>
            <thead><tr><Th>Timestamp</Th><Th>User</Th><Th>Action</Th><Th>Summary</Th></tr></thead>
            <tbody>
              {data.map((l) => (
                <tr key={l._id}>
                  <Td>{fmtDateTime(l.createdAt)}</Td><Td>{l.userName ?? '—'}</Td>
                  <Td><Badge tone="blue">{l.action.replaceAll('_', ' ').toLowerCase()}</Badge></Td>
                  <Td className="whitespace-normal">{l.summary}</Td>
                </tr>
              ))}
            </tbody>
          </TableWrap>
        </Card>
      ) : <EmptyState title="No audit entries yet." />}
    </>
  );
}
