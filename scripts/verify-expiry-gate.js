/**
 * Checks the expiry clock and the copy-link gate.
 *
 * `expiry_at` from GET /api/utilities/envelopes is the only input: the countdown,
 * the status shown, and whether the link may be copied or shared at all are all
 * derived from it. Run with: node scripts/verify-expiry-gate.js
 */

// Mirrors utils/format.ts
function parseServerDate(value) {
  if (!value) return null;
  const trimmed = String(value).trim();
  const hasZone = /(?:Z|[+-]\d{2}:?\d{2})$/i.test(trimmed);
  const ms = Date.parse(hasZone ? trimmed : `${trimmed}Z`);
  return Number.isNaN(ms) ? null : ms;
}

function isExpired(value, now = Date.now()) {
  const ms = parseServerDate(value);
  return ms !== null && ms <= now;
}

function countdownLabel(value, now = Date.now()) {
  const ms = parseServerDate(value);
  if (ms === null) return 'Expiry pending';
  const diff = ms - now;
  if (diff <= 0) return 'Expired';
  if (diff < 60_000) return 'Under a minute left';
  const minutes = Math.floor(diff / 60_000);
  if (minutes < 60) return `${minutes}m left`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h left`;
  return `${Math.floor(hours / 24)}d left`;
}

// Mirrors app/envelope/[id].tsx
function effectiveStatus(envelope, now) {
  if (isExpired(envelope.expiresAt, now)) {
    if (envelope.status === 'waiting' || envelope.status === 'claimed') return 'expired';
  }
  return envelope.status;
}

function canCopyLink(envelope, now) {
  const status = effectiveStatus(envelope, now);
  const expired = status === 'expired' || isExpired(envelope.expiresAt, now);
  return !expired && status === 'waiting' && !!envelope.shareUrl;
}

// Mirrors store/data.tsx
function sameEnvelope(a, b) {
  return a.id === b.id || a.code === b.code || (!!a.shareUrl && a.shareUrl === b.shareUrl);
}

function mergeEnvelopes(server, local) {
  const pending = local.filter(
    (envelope) => envelope.expiresAt === null && !server.some((item) => sameEnvelope(item, envelope)),
  );
  return pending.length > 0 ? [...server, ...pending] : server;
}

const NOW = Date.parse('2026-10-04T12:00:00Z');
const at = (minutes) => new Date(NOW + minutes * 60_000).toISOString();

let pass = 0, fail = 0;
const check = (name, cond, extra) => {
  if (cond) { pass++; console.log(`  PASS  ${name}`); }
  else { fail++; console.log(`  FAIL  ${name}${extra ? ` -> ${extra}` : ''}`); }
};

const live = {
  id: 'tok_abc',
  code: 'TOKABC',
  status: 'waiting',
  shareUrl: 'https://envlope.onrender.com/api/payments/pay/tok_abc',
  expiresAt: at(90),
};
const dead = { ...live, status: 'waiting', expiresAt: at(-1) };

console.log('\nCountdown comes from expiry_at only');
check('2 days out reads in days', countdownLabel(at(60 * 48), NOW) === '2d left', countdownLabel(at(60 * 48), NOW));
check('23 hours out reads in hours', countdownLabel(at(60 * 23), NOW) === '23h left', countdownLabel(at(60 * 23), NOW));
check('90 minutes out reads in hours', countdownLabel(at(90), NOW) === '1h left', countdownLabel(at(90), NOW));
check('45 minutes out reads in minutes', countdownLabel(at(45), NOW) === '45m left', countdownLabel(at(45), NOW));
check('1 minute out is not zero', countdownLabel(at(1), NOW) === '1m left', countdownLabel(at(1), NOW));
check('30 seconds out is called out', countdownLabel(at(0.5), NOW) === 'Under a minute left');
check('past expiry reads Expired', countdownLabel(at(-1), NOW) === 'Expired');
check('expiry exactly now reads Expired', countdownLabel(at(0), NOW) === 'Expired');
check('no expiry is not counted down', countdownLabel(null, NOW) === 'Expiry pending');
check('unparseable expiry is not counted down', countdownLabel('soon', NOW) === 'Expiry pending');

console.log('\nexpiry_at decides expiry, not the stored status');
check('past expiry makes waiting expired', effectiveStatus(dead, NOW) === 'expired');
check('future expiry keeps waiting waiting', effectiveStatus(live, NOW) === 'waiting');
check('missing expiry keeps waiting waiting', effectiveStatus({ ...live, expiresAt: null }, NOW) === 'waiting');
check('claimed past expiry is expired', effectiveStatus({ ...live, status: 'claimed', expiresAt: at(-1) }, NOW) === 'expired');
check('completed past expiry stays completed',
  effectiveStatus({ ...live, status: 'completed', expiresAt: at(-1) }, NOW) === 'completed');
check('failed past expiry stays failed',
  effectiveStatus({ ...live, status: 'failed', expiresAt: at(-1) }, NOW) === 'failed');
check('processing past expiry is left alone',
  effectiveStatus({ ...live, status: 'processing', expiresAt: at(-1) }, NOW) === 'processing');

console.log('\nAn expired link cannot be copied or shared');
check('live envelope can copy', canCopyLink(live, NOW) === true);
check('expired envelope cannot copy', canCopyLink(dead, NOW) === false);
check('expired-by-status cannot copy', canCopyLink({ ...live, status: 'expired' }, NOW) === false);
check('claimed envelope is not copyable', canCopyLink({ ...live, status: 'claimed' }, NOW) === false);
check('completed cannot copy', canCopyLink({ ...live, status: 'completed' }, NOW) === false);
check('failed cannot copy', canCopyLink({ ...live, status: 'failed' }, NOW) === false);
check('unknown expiry does not block copying', canCopyLink({ ...live, expiresAt: null }, NOW) === true);
check('no share url cannot copy', canCopyLink({ ...live, shareUrl: '' }, NOW) === false);
check('expiry one millisecond away still copies',
  canCopyLink({ ...live, expiresAt: new Date(NOW + 1).toISOString() }, NOW) === true);
check('expiry at now cannot copy',
  canCopyLink({ ...live, expiresAt: new Date(NOW).toISOString() }, NOW) === false);

console.log('\nThe gate flips on its own as the clock passes');
let liveNow = { ...live, expiresAt: new Date(NOW + 120_000).toISOString() };
check('copies while inside the window', canCopyLink(liveNow, NOW) === true);
const later = NOW + 121_000;
check('refuses once the window closes', canCopyLink(liveNow, later) === false);
check('status reads expired afterwards', effectiveStatus(liveNow, later) === 'expired');
liveNow = null;

console.log('\nServer rows replace unsynced local ones');
const localFresh = {
  ...live,
  id: 'tok_new',
  code: 'TOKNEW',
  shareUrl: 'https://envlope.onrender.com/api/payments/pay/tok_new',
  expiresAt: null,
};
const localSynced = { ...live, id: 'tok_old', code: 'TOKOLD', expiresAt: at(60) };
const serverRow = { ...live, id: 'tok_abc', expiresAt: at(60) };
check('unsynced envelope survives a refresh',
  mergeEnvelopes([serverRow], [localFresh]).length === 2);
check('synced local envelope is dropped once the server has it',
  mergeEnvelopes([serverRow, { ...localSynced, expiresAt: at(30) }], [localSynced]).length === 2);
check('no duplicate when the token already arrived',
  mergeEnvelopes([serverRow], [{ ...localFresh, expiresAt: at(60) }]).length === 1);
check('matching by share url also de-duplicates',
  mergeEnvelopes([serverRow], [{ ...localFresh, id: 'tx-123', expiresAt: at(60) }]).length === 1);
check('empty local list is untouched', mergeEnvelopes([serverRow], []).length === 1);

console.log(`\n${pass} passed, ${fail} failed\n`);
process.exit(fail > 0 ? 1 : 0);
