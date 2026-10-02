import { Link } from 'react-router-dom';
import { Alert, Button, Card, CardHeader, EmptyState, PageHeader, Skeleton } from '../components/ui/index.jsx';
import { useAuth } from '../context/AuthContext.jsx';
import { useFetch } from '../hooks/useFetch.js';
import { api } from '../services/api.js';
import { errMsg, fmtDateTime, fmtNum, SOURCE_LABELS } from '../utils/format.js';

const Stat = ({ label, value, loading }) => (
  <div className="rounded-lg border border-slate-200 bg-white p-5">
    <p className="text-xs font-medium uppercase tracking-wide text-slate-500">{label}</p>
    {loading ? <Skeleton className="mt-2 h-8 w-16" /> : <p className="mt-1 text-3xl font-semibold tabular-nums text-nitd-700">{fmtNum(value)}</p>}
  </div>
);

export default function Dashboard() {
  const { user } = useAuth();
  const { data, loading, error, reload } = useFetch(async () => (await api.dashboard()).data, []);

  return (
    <>
      <PageHeader title="Dashboard" subtitle={`Welcome, ${user.name}.`}
        actions={<Link to="/recipients"><Button>Open Recipient Builder</Button></Link>} />
      {error && <Alert tone="error" className="mb-4">{errMsg(error)} <button className="underline" onClick={reload}>Retry</button></Alert>}

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <Stat label="Configured Batches" value={data?.configuredBatches} loading={loading} />
        <Stat label="Configured Branches" value={data?.configuredBranches} loading={loading} />
        <Stat label="Active Rules" value={data?.activeRules} loading={loading} />
        <Stat label="Saved Lists" value={data?.totalLists} loading={loading} />
      </div>

      <Card className="mt-6">
        <CardHeader title="Recently generated lists" action={<Link to="/saved-lists" className="text-sm font-medium text-nitd-700 hover:underline">View all</Link>} />
        {loading ? (
          <div className="space-y-3 p-5"><Skeleton className="h-10" /><Skeleton className="h-10" /><Skeleton className="h-10" /></div>
        ) : data?.recent?.length ? (
          <ul className="divide-y divide-slate-100">
            {data.recent.map((c) => (
              <li key={c._id}>
                <Link to={`/saved-lists/${c._id}`} className="flex flex-wrap items-center justify-between gap-2 px-5 py-3 hover:bg-slate-50">
                  <div><p className="font-medium text-ink">{c.name}</p><p className="text-xs text-slate-500">{SOURCE_LABELS[c.source]} · {fmtDateTime(c.createdAt)}</p></div>
                  <p className="text-sm font-medium tabular-nums text-nitd-700">{fmtNum(c.counts?.final)} recipients</p>
                </Link>
              </li>
            ))}
          </ul>
        ) : (
          <div className="p-5"><EmptyState title="No saved lists yet." text="Build a recipient list and save it to reuse it later." action={<Link to="/recipients"><Button>Open Recipient Builder</Button></Link>} /></div>
        )}
      </Card>
    </>
  );
}
