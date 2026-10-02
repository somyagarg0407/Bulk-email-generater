export const escapeRegex = (s) => String(s).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

/** In-memory search/sort/paginate for already generated recipient arrays. */
export function queryArray(items, { q, sort = 'position', order = 'asc', page = 1, limit = 50 } = {}) {
  let rows = items.map((r, i) => ({ position: i + 1, ...r }));
  if (q) {
    const needle = String(q).toLowerCase();
    rows = rows.filter((r) => r.rollNumber.includes(needle) || r.email.includes(needle) || r.branch.toLowerCase().includes(needle));
  }
  const dir = order === 'desc' ? -1 : 1;
  rows.sort((a, b) => {
    const x = a[sort], y = b[sort];
    return (typeof x === 'number' ? x - y : String(x).localeCompare(String(y))) * dir;
  });
  const total = rows.length;
  const pages = Math.max(1, Math.ceil(total / limit));
  const start = (page - 1) * limit;
  return { rows: rows.slice(start, start + limit), pagination: { page, limit, total, pages } };
}
