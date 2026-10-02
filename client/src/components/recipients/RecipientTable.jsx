import { useEffect, useState } from 'react';
import { useDebounced } from '../../hooks/useFetch.js';
import { batchLabel } from '../../utils/format.js';
import { Button, Input, Pagination, SortTh, Spinner, TableWrap, Td, Th } from '../ui/index.jsx';

/** Backend-driven table: search, sort and pagination all happen on the server. */
export default function RecipientTable({ rows, pagination, view, onView, loading, onRemove }) {
  const [text, setText] = useState(view.q || '');
  const debounced = useDebounced(text, 350);
  // keep the input in sync when the parent resets the query (e.g. after a new generation)
  useEffect(() => { setText(view.q || ''); }, [view.q]);
  useEffect(() => { if ((view.q || '') !== debounced) onView({ q: debounced, page: 1 }); /* eslint-disable-next-line */ }, [debounced]);

  const onSort = (field) => onView({ sort: field, order: view.sort === field && view.order === 'asc' ? 'desc' : 'asc', page: 1 });
  const sortProps = { sort: view.sort, order: view.order, onSort };

  return (
    <div>
      <div className="flex items-center gap-3 border-b border-slate-200 px-4 py-3">
        <label className="w-full max-w-sm">
          <span className="sr-only">Search recipients</span>
          <Input type="search" placeholder="Search roll number, email or branch" value={text} onChange={(e) => setText(e.target.value)} />
        </label>
        {loading && <span className="flex items-center gap-2 text-sm text-slate-500"><Spinner className="h-4 w-4 text-nitd-600" /> Loading recipients…</span>}
      </div>
      <TableWrap>
        <thead>
          <tr>
            <SortTh field="position" {...sortProps}>#</SortTh>
            <SortTh field="rollNumber" {...sortProps}>Roll Number</SortTh>
            <SortTh field="email" {...sortProps}>Email</SortTh>
            <SortTh field="batch" {...sortProps}>Batch</SortTh>
            <SortTh field="branch" {...sortProps}>Branch</SortTh>
            {onRemove && <Th>Action</Th>}
          </tr>
        </thead>
        <tbody className={loading ? 'opacity-60' : ''}>
          {rows.map((r) => (
            <tr key={r.rollNumber} className="hover:bg-slate-50">
              <Td className="text-slate-500">{r.position}</Td>
              <Td className="font-mono">{r.rollNumber}</Td>
              <Td className="font-mono">{r.email}</Td>
              <Td>{batchLabel(r.batch)}</Td>
              <Td>{r.branch}</Td>
              {onRemove && <Td><Button size="sm" variant="ghost" onClick={() => onRemove(r)} aria-label={`Remove ${r.rollNumber}`}>Remove</Button></Td>}
            </tr>
          ))}
          {!rows.length && !loading && (
            <tr><td colSpan={onRemove ? 6 : 5} className="px-4 py-10 text-center text-sm text-slate-500">{view.q ? 'No recipients match your search.' : 'No recipients.'}</td></tr>
          )}
        </tbody>
      </TableWrap>
      <Pagination pagination={pagination} onPage={(page) => onView({ page })} />
    </div>
  );
}
