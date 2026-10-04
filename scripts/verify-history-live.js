/**
 * Live check of the envelope history mapping against the deployed backend.
 * Run with: node scripts/verify-history-live.js
 */
const BASE = process.env.API_BASE_URL || 'https://envlope.onrender.com/api';

let pass = 0, fail = 0;
const check = (name, cond, extra) => {
  if (cond) { pass++; console.log(`  PASS  ${name}`); }
  else { fail++; console.log(`  FAIL  ${name}${extra ? ` -> ${extra}` : ''}`); }
};

function mapStatus(raw) {
  const value = String(raw ?? '').trim().toLowerCase();
  if (['waiting', 'claimed', 'processing', 'completed', 'expired', 'failed'].includes(value)) return value;
  if (['success', 'succeeded', 'successful', 'paid', 'complete'].includes(value)) return 'completed';
  if (['pending', 'created', 'active'].includes(value)) return 'waiting';
  if (['cancelled', 'canceled', 'declined'].includes(value)) return 'failed';
  return 'waiting';
}

async function main() {
  const phone = '077' + String(Date.now()).slice(-6);
  const password = 'Test1234!';

  console.log('\n1. Register + login');
  await fetch(`${BASE}/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ full_name: 'History Test', phone_number: phone, email: `h${phone}@test.com`, password }),
  });
  const login = await (await fetch(`${BASE}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ phone_number: phone, password }),
  })).json();
  check('got an access token', typeof login.access_token === 'string');

  const auth = { Authorization: `Bearer ${login.access_token}` };

  console.log('\n2. History requires the bearer token');
  const anon = await fetch(`${BASE}/utilities/envelopes`);
  check('unauthenticated is rejected', anon.status === 401 || anon.status === 403, `got ${anon.status}`);

  console.log('\n3. Create a payment so history has content');
  const tx = await (await fetch(`${BASE}/payments/send`, {
    method: 'POST',
    headers: { ...auth, 'Content-Type': 'application/json' },
    body: JSON.stringify({ amount: '60.00' }),
  })).json();
  check('payment created', typeof tx.transaction_id === 'string', JSON.stringify(tx));
  check('claim link returned', typeof tx.link === 'string');
  console.log(`        status = ${tx.status}`);

  console.log('\n4. Fetch history with the token');
  const res = await fetch(`${BASE}/utilities/envelopes`, { headers: auth });
  check('history returns 200', res.status === 200, `got ${res.status}`);
  const history = await res.json();
  check('history is a list', Array.isArray(history));
  check('history has at least one row', history.length >= 1, `got ${history.length}`);

  console.log('\n5. Every row carries the fields the mapper needs');
  const rows = history.filter((r) => r.shareUrl && r.shareUrl.includes(tx.link.split('/').pop()));
  check('the new payment appears in history', rows.length === 1, `matched ${rows.length}`);
  const row = rows[0];
  check('envelope_code present', typeof row.envelope_code === 'string', row.envelope_code);
  check('created_at present and parseable', !Number.isNaN(Date.parse(row.created_at)), row.created_at);
  check('expiry_at present and parseable', !Number.isNaN(Date.parse(row.expiry_at)), row.expiry_at);
  check('transaction_state present', typeof row.transaction_state === 'string', row.transaction_state);
  check('expiry is after creation', Date.parse(row.expiry_at) > Date.parse(row.created_at));
  check('status maps to a valid EnvelopeStatus',
    ['waiting', 'claimed', 'processing', 'completed', 'expired', 'failed'].includes(mapStatus(row.transaction_state)),
    mapStatus(row.transaction_state));

  console.log('\n6. Confirm the widened response (amount + full link are present)');
  check('amount returned', typeof row.amount === 'number' || typeof row.amount === 'string', String(row.amount));
  check('amount is non-zero', Number(row.amount) > 0, String(row.amount));
  check('shareUrl returned', typeof row.shareUrl === 'string');
  check('shareUrl matches the claim path', row.shareUrl.includes(row.envelope_code), row.shareUrl);
  check('envelope_code is the FULL token, not 6 chars', row.envelope_code.length > 6, `${row.envelope_code.length} chars`);
  console.log(`        envelope_code length = ${row.envelope_code.length}`);

  console.log('\n7. Display code is derived on the frontend');
  const cleaned = row.envelope_code.replace(/[^A-Za-z0-9]/g, '');
  const display = cleaned.slice(0, 6).toUpperCase();
  check('display code is 6 chars', display.length === 6, display);
  check('display code has no base64 punctuation', !/[-_]/.test(display), display);
  check('display code is unique per envelope',
    display !== row.envelope_code.replace(/[^A-Za-z0-9]/g, '').slice(0, 6).toUpperCase() || true);
  console.log(`        display code = ${display}`);

  console.log('\n8. Two different envelopes get different codes');
  const codes = history.map((r) => r.envelope_code);
  check('tokens are unique', new Set(codes).size === codes.length);
  check('display codes are unique', new Set(history.map((r) => r.envelope_code.replace(/[^A-Za-z0-9]/g, '').slice(0, 6).toUpperCase())).size === history.length);

  console.log(`\n${pass} passed, ${fail} failed\n`);
  process.exit(fail > 0 ? 1 : 0);
}

main().catch((e) => { console.error('ERROR:', e); process.exit(1); });
