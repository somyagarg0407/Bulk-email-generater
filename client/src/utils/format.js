export const batchLabel = (year) => `UG ${year}`;
export const fmtDate = (d) => (d ? new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : '—');
export const fmtDateTime = (d) => (d ? new Date(d).toLocaleString('en-IN', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : '—');
export const fmtNum = (n) => (n ?? 0).toLocaleString('en-IN');
export const errMsg = (e) => e?.message || 'Something went wrong. Please try again.';
export const ROLE_LABELS = { SUPER_ADMIN: 'Super Admin', CLUB_ADMIN: 'Club Admin', CLUB_MEMBER: 'Club Member' };
export const SOURCE_LABELS = {
  RULE_BASED: 'Configured maximum range',
  ACTUAL_STUDENT_DATABASE: 'Imported student database',
};
export const COPY_FORMATS = [
  { id: 'comma', label: 'Copy comma-separated' },
  { id: 'semicolon', label: 'Copy semicolon-separated' },
  { id: 'lines', label: 'Copy one-per-line' },
];
export const RULE_BASED_NOTE = 'Recipients are generated from configured roll-number ranges. Some addresses may be inactive or nonexistent.';

export async function copyToClipboard(text) {
  if (navigator.clipboard?.writeText) {
    try { await navigator.clipboard.writeText(text); return; } catch { /* fall through */ }
  }
  const ta = document.createElement('textarea');
  ta.value = text; ta.setAttribute('readonly', ''); ta.style.position = 'fixed'; ta.style.opacity = '0';
  document.body.appendChild(ta); ta.select();
  const ok = document.execCommand('copy');
  ta.remove();
  if (!ok) throw new Error('Copy failed. Please select and copy manually.');
}
