/** Build the shipped naming data from the reviewed Shadowdark classification CSV.
 * Usage: node scripts/ingest/build-diablo-name-pools.mjs path/to/diablo_shadowdark_categories.csv
 */
import { readFileSync, writeFileSync } from 'node:fs';

function parseCsv(text) {
  const rows = []; let row = [], field = '', quoted = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (c === '"') {
      if (quoted && text[i + 1] === '"') { field += '"'; i++; }
      else quoted = !quoted;
    } else if (!quoted && (c === ',' || c === '\n')) {
      row.push(field.replace(/\r$/, '')); field = '';
      if (c === '\n') { rows.push(row); row = []; }
    } else field += c;
  }
  if (quoted) throw new Error('Unclosed CSV quote');
  if (field || row.length) { row.push(field); rows.push(row); }
  const [headers, ...data] = rows;
  return data.map(values => {
    if (values.length !== headers.length) throw new Error('CSV column count mismatch');
    return Object.fromEntries(headers.map((header, i) => [header, values[i]]));
  });
}

const input = process.argv[2];
if (!input) throw new Error('Supply the reviewed classification CSV path');
const records = parseCsv(readFileSync(input, 'utf8').replace(/^\uFEFF/, ''));
const pools = new Map();
const sources = new Set();
for (const row of records) {
  const { shadowdark_group: group, shadowdark_category: category, base_name: name } = row;
  if (!group || !category || !name) throw new Error('Missing classification or base name');
  // A helm or greave must never become the name of a complete suit of armour.
  const key = group === 'Armour component'
    ? (row.category === 'Helms' ? 'helm' : null)
    : category === 'none' ? null : category.toLowerCase();
  if (!key) continue;
  if (!pools.has(key)) pools.set(key, new Map());
  pools.get(key).set(name.toLowerCase(), name);
  sources.add(row.source_url);
}
const data = {
  source: 'Reviewed Diablo I–IV base names, mapped to Shadowdark categories. Cosmetic names only; no Diablo statistics.',
  sourceCsv: input.replaceAll('\\', '/'),
  sources: [...sources].sort(),
  pools: Object.fromEntries([...pools].sort(([a], [b]) => a.localeCompare(b)).map(([key, names]) =>
    [key, [...names.values()].sort((a, b) => a.localeCompare(b, 'en'))])),
};
writeFileSync('data/treasure/diablo-name-pools.json', JSON.stringify(data, null, 2) + '\n');
console.log(`Built ${pools.size} naming pools from ${records.length} classified entries.`);
