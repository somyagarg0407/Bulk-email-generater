// SEED-ONLY defaults. After seeding, the database (Admin panel) is the source of truth.
// These are ASSUMED maximum ranges (based on UG 2025), not a verified student list.
export const DEFAULT_BATCH_YEARS = [2023, 2024, 2025, 2026];
export const DEFAULT_SEQUENCE_WIDTH = 3;

// code = program code that follows the 2-digit batch year in the roll number
// (e.g. 25 + 1210 + 001 = 251210001). max = assumed last sequence number.
export const DEFAULT_BRANCHES = [
  { key: 'AEROSPACE', name: 'Aerospace', code: '1312', max: 26, sortOrder: 1 },
  { key: 'AIDS', name: 'AI & DS', code: '1212', max: 26, sortOrder: 2 },
  { key: 'CIVIL', name: 'Civil', code: '1320', max: 26, sortOrder: 3 },
  { key: 'CSE', name: 'CSE', code: '1210', max: 140, sortOrder: 4 },
  { key: 'ELECTRICAL', name: 'Electrical', code: '1230', max: 60, sortOrder: 5 },
  { key: 'ECE', name: 'ECE', code: '1220', max: 65, sortOrder: 6 },
  { key: 'MECHANICAL', name: 'Mechanical', code: '1310', max: 45, sortOrder: 7 },
  { key: 'VLSI', name: 'VLSI', code: '1221', max: 26, sortOrder: 8 },
];

export const prefixFor = (year, code) => `${String(year).slice(-2)}${code}`;
