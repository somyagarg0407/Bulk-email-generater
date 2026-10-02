// Minimal in-memory stand-in for the Mongoose models, so the REAL service code can be exercised
// without MongoDB. Supports only what the services use. Not a Mongoose replacement.
let n = 0;
const newId = () => `id${++n}`;
const clone = (o) => JSON.parse(JSON.stringify(o));

function matches(row, filter = {}) {
  return Object.entries(filter).every(([k, v]) => {
    if (v && typeof v === 'object' && '$ne' in v) return row[k] !== v.$ne;
    return String(row[k]) === String(v);
  });
}
class Q {
  constructor(rows) { this.rows = rows; }
  lean() { return this; }
  populate() { return this; }
  select() { return this; }
  sort(spec = {}) {
    const [[k, d] = []] = Object.entries(spec);
    if (k) this.rows = [...this.rows].sort((a, b) => (a[k] > b[k] ? 1 : a[k] < b[k] ? -1 : 0) * d);
    return this;
  }
  skip(x) { this.rows = this.rows.slice(x); return this; }
  limit(x) { this.rows = this.rows.slice(0, x); return this; }
  then(res, rej) { return Promise.resolve(this.rows).then(res, rej); }
}

export function makeModel(table = []) {
  const wrap = (row) => row && {
    ...row,
    toObject() { return clone(table.find((r) => r._id === row._id)); },
    set(patch) { Object.assign(table.find((r) => r._id === row._id), patch); Object.assign(this, patch); },
    async save() { return this; },
    async deleteOne() { table.splice(table.findIndex((r) => r._id === row._id), 1); },
  };
  return {
    table,
    find: (f) => new Q(table.filter((r) => matches(r, f)).map(clone)),
    findOne: (f) => { const r = table.find((x) => matches(x, f)); return new Q(r ? clone(r) : null); },
    async findById(id) { return wrap(table.find((r) => r._id === id)); },
    async create(data) { const row = { _id: newId(), createdAt: new Date(), updatedAt: new Date(), ...clone(data) }; table.push(row); return wrap(row); },
    async insertMany(docs) { docs.forEach((d) => table.push({ _id: newId(), ...clone(d) })); },
    async deleteMany(f) { for (let i = table.length - 1; i >= 0; i--) if (matches(table[i], f)) table.splice(i, 1); },
    async deleteOne(f) { const i = table.findIndex((r) => matches(r, f)); if (i >= 0) table.splice(i, 1); },
    findByIdAndUpdate(id, upd) { const r = table.find((x) => x._id === id); if (r) Object.assign(r, upd.$set); return new Q(r ? clone(r) : null); },
    async countDocuments(f) { return table.filter((r) => matches(r, f)).length; },
    async exists(f) { return table.some((r) => matches(r, f)) ? { _id: 1 } : null; },
  };
}
