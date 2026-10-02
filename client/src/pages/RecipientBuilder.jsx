import { useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import CopyExportBar from '../components/recipients/CopyExportBar.jsx';
import RecipientTable from '../components/recipients/RecipientTable.jsx';
import { InvalidEntries, SourceNotice, StatsPanel, Warnings } from '../components/recipients/ResultNotices.jsx';
import { Alert, Button, Card, CardHeader, Chip, Field, Input, LoadingBlock, Modal, PageHeader, Textarea } from '../components/ui/index.jsx';
import { useToast } from '../context/ToastContext.jsx';
import { useFetch } from '../hooks/useFetch.js';
import { api } from '../services/api.js';
import { batchLabel, errMsg } from '../utils/format.js';

const EMPTY = { batches: [], allBatches: false, branches: [], allBranches: false, mode: 'ALL', start: '', end: '', rollText: '', exclusions: '', additions: '' };
const FIRST_VIEW = { q: '', sort: 'position', order: 'asc', page: 1 };

// Shapes form state into the API request. NO roll-number logic lives here: the backend generates everything.
const buildSpec = (f) => ({
  batches: f.allBatches ? [] : f.batches,
  allBatches: f.allBatches,
  branches: f.allBranches ? [] : f.branches,
  allBranches: f.allBranches,
  selection: f.mode === 'ALL' ? { mode: 'ALL' }
    : f.mode === 'RANGE' ? { mode: 'RANGE', start: Number(f.start), end: Number(f.end) }
      : { mode: 'ROLLS', rollNumbers: f.rollText },
  exclusions: f.exclusions,
  additions: f.additions,
});

const toggle = (list, v, on) => (on ? [...new Set([...list, v])] : list.filter((x) => x !== v));
const Step = ({ n, title, children, aside }) => (
  <div className="px-5 py-5">
    <div className="mb-3 flex items-center justify-between gap-3">
      <h3 className="flex items-center gap-2 text-sm font-semibold text-ink">
        <span className="flex h-6 w-6 items-center justify-center rounded-full bg-nitd-50 text-xs font-bold text-nitd-700 ring-1 ring-nitd-200">{n}</span>{title}
      </h3>{aside}
    </div>
    {children}
  </div>
);

export default function RecipientBuilder() {
  const toast = useToast();
  const navigate = useNavigate();
  // Config is re-fetched every time this page opens, so admin edits show up with no rebuild.
  const cfg = useFetch(async () => {
    const [b, br, ru] = await Promise.all([api.config.batches(), api.config.branches(), api.config.rules()]);
    return { batches: b.data.filter((x) => x.active), branches: br.data.filter((x) => x.active), rules: ru.data.filter((x) => x.active) };
  }, []);

  const [form, setForm] = useState(EMPTY);
  const set = (patch) => setForm((f) => ({ ...f, ...patch }));
  const [result, setResult] = useState(null);
  const [genSpec, setGenSpec] = useState(null);
  const [view, setView] = useState(FIRST_VIEW);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [saveOpen, setSaveOpen] = useState(false);
  const resultsRef = useRef(null);

  const load = async (spec, v, { audit = false } = {}) => {
    setLoading(true); setError(null);
    try {
      const r = await api.recipients.preview(spec, { ...v, limit: 25, audit });
      setResult(r.data); setGenSpec(spec); setView(v);
    } catch (e) {
      setError(e);
      if (audit) { setResult(null); setGenSpec(null); }
    } finally { setLoading(false); }
  };

  const generate = async () => {
    await load(buildSpec(form), FIRST_VIEW, { audit: true });
    setTimeout(() => resultsRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 60);
  };
  const onView = (patch) => genSpec && load(genSpec, { ...view, ...patch });
  const stale = genSpec && JSON.stringify(genSpec) !== JSON.stringify(buildSpec(form));

  const removeRow = (row) => {
    const next = { ...form, exclusions: `${form.exclusions.trim()}${form.exclusions.trim() ? '\n' : ''}${row.rollNumber}` };
    setForm(next);
    load(buildSpec(next), { ...view, page: 1 });
  };

  // Display-only hint for the range inputs (taken from configured rules; not used to generate anything).
  const rangeHint = useMemo(() => {
    if (!cfg.data) return '';
    const max = new Map();
    for (const r of cfg.data.rules) {
      const bOk = form.allBatches || form.batches.includes(r.batch);
      const kOk = form.allBranches || form.branches.includes(r.branch);
      if (bOk && kOk) max.set(r.branch, Math.max(max.get(r.branch) ?? 0, r.endSequence));
    }
    return [...max.entries()].map(([k, n]) => `${cfg.data.branches.find((b) => b.key === k)?.name ?? k} ${n}`).join(' · ');
  }, [cfg.data, form.allBatches, form.allBranches, form.batches, form.branches]);

  if (cfg.loading) return <><PageHeader title="Recipient Builder" /><LoadingBlock label="Loading configuration…" /></>;
  if (cfg.error) return <><PageHeader title="Recipient Builder" /><Alert tone="error">{errMsg(cfg.error)} <button className="underline" onClick={cfg.reload}>Retry</button></Alert></>;
  const { batches, branches } = cfg.data;

  return (
    <>
      <PageHeader title="Recipient Builder" subtitle="Choose batch, branch and filters. Generate the recipient email IDs, then copy or export them for the official college/club mail account." />

      <Card>
        <CardHeader title="Select recipients" />
        <div className="divide-y divide-slate-200">
          <Step n={1} title="Batch">
            <div className="flex flex-wrap gap-2">
              <Chip checked={form.allBatches} onChange={(v) => set({ allBatches: v })}>All Batches</Chip>
              <span className="mx-1 hidden h-8 w-px bg-slate-200 sm:block" aria-hidden="true" />
              {batches.map((b) => (
                <Chip key={b.year} checked={form.allBatches || form.batches.includes(b.year)} disabled={form.allBatches}
                  onChange={(v) => set({ batches: toggle(form.batches, b.year, v) })}>{b.label || batchLabel(b.year)}</Chip>
              ))}
            </div>
          </Step>

          <Step n={2} title="Branch">
            <div className="flex flex-wrap gap-2">
              <Chip checked={form.allBranches} onChange={(v) => set({ allBranches: v })}>All Branches</Chip>
              <span className="mx-1 hidden h-8 w-px bg-slate-200 sm:block" aria-hidden="true" />
              {branches.map((b) => (
                <Chip key={b.key} checked={form.allBranches || form.branches.includes(b.key)} disabled={form.allBranches}
                  onChange={(v) => set({ branches: toggle(form.branches, b.key, v) })}>{b.name}</Chip>
              ))}
            </div>
          </Step>

          <Step n={3} title="Selection">
            <fieldset>
              <legend className="sr-only">Selection mode</legend>
              <div className="grid gap-2 sm:grid-cols-3">
                {[['ALL', 'All students', 'Every roll number in the configured range'], ['RANGE', 'Custom roll range', 'Sequence numbers, e.g. 001–050'], ['ROLLS', 'Specific roll numbers', 'Paste a list of roll numbers']].map(([id, label, hint]) => (
                  <label key={id} className={`flex cursor-pointer items-start gap-3 rounded-md border p-3 text-sm ${form.mode === id ? 'border-nitd-600 bg-nitd-50' : 'border-slate-300 bg-white hover:bg-slate-50'}`}>
                    <input type="radio" name="mode" className="mt-1 accent-nitd-600" checked={form.mode === id} onChange={() => set({ mode: id })} />
                    <span><span className="block font-medium text-ink">{label}</span><span className="text-xs text-slate-500">{hint}</span></span>
                  </label>
                ))}
              </div>
            </fieldset>

            {form.mode === 'RANGE' && (
              <div className="mt-4">
                <div className="grid max-w-md grid-cols-2 gap-3">
                  <Field label="Start"><Input inputMode="numeric" placeholder="001" value={form.start} onChange={(e) => set({ start: e.target.value })} /></Field>
                  <Field label="End"><Input inputMode="numeric" placeholder="050" value={form.end} onChange={(e) => set({ end: e.target.value })} /></Field>
                </div>
                <p className="mt-2 text-xs text-slate-600">The range is applied to <strong>each selected branch independently</strong> (e.g. 001–050 gives the first 50 roll numbers of every selected branch and batch).</p>
                {rangeHint && <p className="mt-1 text-xs text-slate-500">Configured maximum: {rangeHint}</p>}
              </div>
            )}
            {form.mode === 'ROLLS' && (
              <div className="mt-4">
                <Field label="Roll numbers" hint="Separate with new lines, commas, semicolons or spaces. Batch/branch selection is optional here; every entry is validated against the configured ranges.">
                  <Textarea rows={5} placeholder={'251210001\n251210015\n251210029'} value={form.rollText} onChange={(e) => set({ rollText: e.target.value })} />
                </Field>
              </div>
            )}
          </Step>

          <Step n={4} title="Refine (optional)">
            <div className="grid gap-4 md:grid-cols-2">
              <Field label="Exclude roll numbers" hint="These are removed from the final list.">
                <Textarea rows={3} placeholder="251210014, 251210057" value={form.exclusions} onChange={(e) => set({ exclusions: e.target.value })} />
              </Field>
              <Field label="Add individual roll numbers" hint="Must be valid for a configured batch/branch. Can belong to another group.">
                <Textarea rows={3} placeholder="251220001" value={form.additions} onChange={(e) => set({ additions: e.target.value })} />
              </Field>
            </div>
          </Step>
        </div>
        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-200 bg-slate-50 px-5 py-4">
          <p className="text-xs text-slate-500">Nothing is sent from this app. You will copy or export the addresses.</p>
          <Button size="lg" onClick={generate} loading={loading}>{loading ? 'Generating recipients…' : 'Generate Recipients'}</Button>
        </div>
      </Card>

      {error && <Alert tone="error" className="mt-5">{errMsg(error)}</Alert>}

      {result && (
        <div className="mt-6 space-y-5" ref={resultsRef}>
          {stale && <Alert tone="warn">You changed the selection after generating. Copy, export and save use the list below; press <strong>Generate Recipients</strong> to update it.</Alert>}
          <StatsPanel stats={result.stats} />
          <p className="text-sm text-slate-600"><strong>Next:</strong> press <strong>Copy Emails</strong> and paste the addresses into your official college/club email, or export them. You can also save this list.</p>
          <SourceNotice source={result.source} sourceLabel={result.sourceLabel} disclaimer={result.disclaimer} />
          <Warnings warnings={result.warnings} />
          <InvalidEntries invalid={result.invalid} />

          <Card>
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 px-5 py-4">
              <h2 className="text-base font-semibold">Recipient preview</h2>
              <div className="flex flex-wrap items-center gap-2">
                <CopyExportBar disabled={!result.stats.final}
                  copy={(f) => api.recipients.copyText(genSpec, f)} download={(f) => api.recipients.download(genSpec, f)} />
                <Button variant="secondary" disabled={!result.stats.final} onClick={() => setSaveOpen(true)}>Save as list</Button>
              </div>
            </div>
            {result.stats.groups?.length > 0 && (
              <div className="flex flex-wrap gap-2 border-b border-slate-200 px-5 py-3 text-xs text-slate-600">
                {result.stats.groups.map((g) => <span key={`${g.batch}-${g.branch}`} className="rounded bg-slate-100 px-2 py-1">{batchLabel(g.batch)} · {g.branch}: <strong>{g.count}</strong></span>)}
              </div>
            )}
            <RecipientTable rows={result.recipients} pagination={result.pagination} view={view} onView={onView} loading={loading} onRemove={removeRow} />
          </Card>
        </div>
      )}

      {saveOpen && <SaveListModal onClose={() => setSaveOpen(false)} spec={genSpec} onSaved={(id) => { toast.success('List saved.'); navigate(`/saved-lists/${id}`); }} />}
    </>
  );
}

function SaveListModal({ spec, onClose, onSaved }) {
  const [name, setName] = useState('');
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const save = async (e) => {
    e.preventDefault(); setSaving(true); setError(null);
    try { const r = await api.lists.create({ name, notes: notes || undefined, spec }); onSaved(r.data._id); }
    catch (err) { setError(err); setSaving(false); }
  };
  return (
    <Modal title="Save recipient list" onClose={onClose} footer={<>
      <Button variant="secondary" onClick={onClose} disabled={saving}>Cancel</Button>
      <Button type="submit" form="save-list" loading={saving}>{saving ? 'Saving list…' : 'Save list'}</Button>
    </>}>
      <form id="save-list" onSubmit={save} className="space-y-4">
        <p className="text-sm text-slate-600">A snapshot of the current recipients is stored. It does not change if the roll-number configuration changes later; only an explicit regenerate updates it.</p>
        <Field label="List name"><Input required maxLength={150} value={name} onChange={(e) => setName(e.target.value)} placeholder="UG 2025 CSE Orientation" /></Field>
        <Field label="Notes (optional)"><Textarea rows={3} maxLength={1000} value={notes} onChange={(e) => setNotes(e.target.value)} className="font-sans" /></Field>
        {error && <Alert tone="error">{errMsg(error)}</Alert>}
      </form>
    </Modal>
  );
}
