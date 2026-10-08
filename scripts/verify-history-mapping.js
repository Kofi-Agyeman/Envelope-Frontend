/**
 * Checks the /utilities/envelopes mapping using payloads captured from the
 * live backend. Run with: node scripts/verify-history-mapping.js
 */

// Verbatim from GET https://envlope.onrender.com/api/utilities/envelopes
// after amount/shareUrl were added and the token restriction was lifted.
const LIVE = [
  {
    envelope_code: '9PhO8KaGhSWKc_pK1DqD9-Ko2izDcBYbyxBeJp4ibFY',
    created_at: '2026-10-04T00:53:41.649074+00:00',
    expiry_at: '2026-10-05T00:53:41.648667+00:00',
    transaction_state: 'PENDING',
    amount: 9.25,
    shareUrl: 'https://envlope.onrender.com/api/payments/pay/9PhO8KaGhSWKc_pK1DqD9-Ko2izDcBYbyxBeJp4ibFY',
  },
  {
    envelope_code: '6KU1or81tevlqRz6-fSuLw6Zl7pmUQKsdSaD4DUtl6E',
    created_at: '2026-10-04T00:53:41.233665+00:00',
    expiry_at: '2026-10-05T00:53:41.233250+00:00',
    transaction_state: 'PENDING',
    amount: 175.5,
    shareUrl: 'https://envlope.onrender.com/api/payments/pay/6KU1or81tevlqRz6-fSuLw6Zl7pmUQKsdSaD4DUtl6E',
  },
];

const DISPLAY_CODE_LENGTH = 6;

function displayCode(token, fallback = '') {
  const cleaned = token.replace(/[^A-Za-z0-9]/g, '');
  if (cleaned.length >= DISPLAY_CODE_LENGTH) return cleaned.slice(0, DISPLAY_CODE_LENGTH).toUpperCase();
  const alt = fallback.replace(/-/g, '');
  return alt.length >= DISPLAY_CODE_LENGTH ? alt.slice(0, DISPLAY_CODE_LENGTH).toUpperCase() : cleaned.toUpperCase();
}

function toAmount(value) {
  const parsed = typeof value === 'number' ? value : Number.parseFloat(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function parseServerDate(value) {
  if (!value) return null;
  const trimmed = String(value).trim();
  const hasZone = /(?:Z|[+-]\d{2}:?\d{2})$/i.test(trimmed);
  const ms = Date.parse(hasZone ? trimmed : `${trimmed}Z`);
  return Number.isNaN(ms) ? null : ms;
}

function normaliseExpiry(value) {
  const ms = parseServerDate(value);
  return ms === null ? null : new Date(ms).toISOString();
}

function isExpired(value, now = Date.now()) {
  const ms = parseServerDate(value);
  return ms !== null && ms <= now;
}

function mapStatus(raw, expiryAt, now = Date.now()) {
  const value = String(raw ?? '').trim().toLowerCase();
  const dead = isExpired(expiryAt, now);
  if (['waiting', 'claimed', 'processing', 'completed', 'expired', 'failed'].includes(value)) {
    if ((value === 'waiting' || value === 'claimed') && dead) return 'expired';
    return value;
  }
  if (['success', 'succeeded', 'successful', 'paid', 'complete'].includes(value)) return 'completed';
  if (['pending', 'created', 'active'].includes(value)) return dead ? 'expired' : 'waiting';
  if (['cancelled', 'canceled', 'declined'].includes(value)) return 'failed';
  return dead ? 'expired' : 'waiting';
}

// Fixed reference point inside the captured rows' real 24h window
// (created 2026-10-04T00:53Z, expiry 2026-10-05T00:53Z).
const NOW = Date.parse('2026-10-04T12:00:00Z');

const ACTIVITY_TYPE = {
  waiting: 'envelope_created', claimed: 'envelope_claimed', processing: 'payment_processing',
  completed: 'payment_completed', expired: 'envelope_expired', failed: 'payment_failed',
};

let pass = 0, fail = 0;
const check = (name, cond, extra) => {
  if (cond) { pass++; console.log(`  PASS  ${name}`); }
  else { fail++; console.log(`  FAIL  ${name}${extra ? ` -> ${extra}` : ''}`); }
};

console.log('\nMapping the live history payload');
const mapped = LIVE.map((item) => ({
  id: item.envelope_code,
  code: displayCode(item.envelope_code),
  amount: toAmount(item.amount),
  currency: 'GHS',
  status: mapStatus(item.transaction_state, item.expiry_at, NOW),
  shareUrl: item.shareUrl,
  createdAt: item.created_at,
  expiresAt: normaliseExpiry(item.expiry_at),
}));

check('produces one envelope per row', mapped.length === 2);
check('newest first is preserved',
  Date.parse(mapped[0].createdAt) > Date.parse(mapped[1].createdAt));
check('uppercase PENDING -> waiting', mapped[0].status === 'waiting', mapped[0].status);
check('amount comes from the response', mapped[0].amount === 9.25, String(mapped[0].amount));
check('fractional amount preserved', mapped[1].amount === 175.5, String(mapped[1].amount));
check('shareUrl is the full claim link', mapped[0].shareUrl === LIVE[0].shareUrl);
check('shareUrl embeds the token', mapped[0].shareUrl.includes(LIVE[0].envelope_code));
check('status is always a valid EnvelopeStatus',
  mapped.every((e) => Object.keys(ACTIVITY_TYPE).includes(e.status)));

console.log('\nDisplay code derivation (frontend-side restriction)');
check('code is exactly 6 chars', mapped.every((e) => e.code.length === 6), mapped.map((e) => e.code).join(','));
check('code is uppercase', mapped.every((e) => e.code === e.code.toUpperCase()));
check('code has no base64 - or _', mapped.every((e) => !/[-_]/.test(e.code)), mapped.map((e) => e.code).join(','));
check('codes are distinct', mapped[0].code !== mapped[1].code, `${mapped[0].code} / ${mapped[1].code}`);
check('full token retained as id', mapped[0].id === LIVE[0].envelope_code);
check('full token length > 6', LIVE[0].envelope_code.length === 43, String(LIVE[0].envelope_code.length));
check('short token still handled', displayCode('abc12') === 'ABC12', displayCode('abc12'));
check('missing token falls back', displayCode('', 'abcdef01-2345') === 'ABCDEF');

console.log('\nDates are parseable');
check('createdAt parses', !Number.isNaN(Date.parse(mapped[0].createdAt)));
check('expiry is after creation', Date.parse(mapped[0].expiresAt) > Date.parse(mapped[0].createdAt));

console.log('\nexpiry_at is the only clock (NOW = 2026-10-04T12:00:00Z)');
const at = (state, expiry) => mapStatus(state, expiry, NOW);
check('future expiry keeps PENDING waiting', at('PENDING', '2026-10-06T00:00:00+00:00') === 'waiting');
check('past expiry turns PENDING expired', at('PENDING', '2026-10-04T00:00:00+00:00') === 'expired');
check('expiry exactly now is expired', at('PENDING', '2026-10-04T12:00:00+00:00') === 'expired');
check('past expiry turns CLAIMED expired', at('CLAIMED', '2026-10-04T00:00:00+00:00') === 'expired');
check('missing expiry keeps PENDING waiting', at('PENDING', null) === 'waiting');
check('missing expiry keeps CLAIMED claimed', at('CLAIMED', null) === 'claimed');
check('paid envelope stays completed past expiry', at('SUCCESS', '2026-10-04T00:00:00+00:00') === 'completed');
check('failed envelope stays failed past expiry', at('FAILED', '2026-10-04T00:00:00+00:00') === 'failed');
check('processing envelope is not force-expired', at('PROCESSING', '2026-10-04T00:00:00+00:00') === 'processing');
check('unknown state past expiry is expired', at('SOMETHING_NEW', '2026-10-04T00:00:00+00:00') === 'expired');
check('both captured rows were still inside their window', mapped.every((e) => e.status === 'waiting'),
  mapped.map((e) => e.status).join(','));
check('expiry is stored as an ISO string', mapped.every((e) => typeof e.expiresAt === 'string' && e.expiresAt.endsWith('Z')));
check('a null expiry is never invented', normaliseExpiry(null) === null, String(normaliseExpiry(null)));

console.log('\nTimestamps without a zone are read as UTC');
check('naive expiry matches the same instant with an offset',
  parseServerDate('2026-10-05T00:53:41.648667') === parseServerDate('2026-10-05T00:53:41.648667+00:00'));
check('Z suffix is honoured', parseServerDate('2026-10-05T00:53:41.648667Z') === parseServerDate('2026-10-05T00:53:41.648667+00:00'));
check('negative offset is honoured', parseServerDate('2026-10-04T20:53:41-04:00') === parseServerDate('2026-10-05T00:53:41+00:00'));
check('garbage is null, not NaN', parseServerDate('not-a-date') === null);

console.log('\nStatus vocabulary from transaction_state');
for (const [input, expected] of [
  ['PENDING', 'waiting'], ['SUCCESS', 'completed'], ['COMPLETED', 'completed'],
  ['CLAIMED', 'claimed'], ['PROCESSING', 'processing'], ['EXPIRED', 'expired'],
  ['FAILED', 'failed'], ['CANCELLED', 'failed'], ['SOMETHING_NEW', 'waiting'],
]) {
  check(`${input} -> ${expected}`, mapStatus(input) === expected, mapStatus(input));
}

console.log('\nEvery status has an activity row');
check('all six statuses map to a distinct activity type',
  new Set(Object.values(ACTIVITY_TYPE)).size === 6);

console.log(`\n${pass} passed, ${fail} failed\n`);
process.exit(fail > 0 ? 1 : 0);
