import { RULE_BASED_NOTE, SOURCE_LABELS } from '../../utils/format.js';
import { Alert, Badge, Card, CardHeader, TableWrap, Td, Th } from '../ui/index.jsx';

export function SourceNotice({ source, sourceLabel, disclaimer }) {
  return (
    <div className="space-y-2">
      <div className="flex flex-wrap items-center gap-2 text-sm text-slate-600">
        Source: <Badge tone="blue">{sourceLabel || SOURCE_LABELS[source]}</Badge>
      </div>
      {(disclaimer || source === 'RULE_BASED') && <Alert tone="info">{disclaimer || RULE_BASED_NOTE}</Alert>}
    </div>
  );
}

export function Warnings({ warnings }) {
  if (!warnings?.length) return null;
  return (
    <Alert tone="warn" title="Please review">
      <ul className="mt-1 list-disc space-y-0.5 pl-5">{warnings.map((w) => <li key={w}>{w}</li>)}</ul>
    </Alert>
  );
}

/** Invalid entries are shown separately and are never part of the recipient list. */
export function InvalidEntries({ invalid }) {
  if (!invalid?.length) return null;
  return (
    <Card>
      <CardHeader title={`Invalid entries (${invalid.length})`} subtitle="These were not included in the recipient list." />
      <TableWrap>
        <thead><tr><Th>Entry</Th><Th>Reason</Th></tr></thead>
        <tbody>
          {invalid.map((i, idx) => (
            <tr key={`${i.value}-${idx}`}><Td className="font-mono">{i.value}</Td><Td className="whitespace-normal">{i.reason}</Td></tr>
          ))}
        </tbody>
      </TableWrap>
    </Card>
  );
}

export function StatsPanel({ stats }) {
  const small = [['Generated', stats.generated], ['Added', stats.added], ['Excluded', stats.excluded]];
  return (
    <div className="grid gap-3 sm:grid-cols-4">
      <div className="rounded-lg bg-nitd-600 p-5 text-white sm:col-span-2 sm:row-span-1">
        <p className="text-xs font-semibold uppercase tracking-wide text-nitd-100">Final recipients</p>
        <p className="mt-1 text-5xl font-bold tabular-nums" data-testid="final-count">{stats.final.toLocaleString('en-IN')}</p>
      </div>
      <div className="grid grid-cols-3 gap-3 sm:col-span-2">
        {small.map(([label, n]) => (
          <div key={label} className="rounded-lg border border-slate-200 bg-white p-4">
            <p className="text-xs font-medium uppercase tracking-wide text-slate-500">{label}</p>
            <p className="mt-1 text-2xl font-semibold tabular-nums text-ink">{n.toLocaleString('en-IN')}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
