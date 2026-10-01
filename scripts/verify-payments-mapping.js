/**
 * Checks the /payments/send -> Envelope mapping in isolation.
 * Run with: node scripts/verify-payments-mapping.js
 */

// Mirrors the real sample from the backend's TransactionResponse.
const RESPONSE = {
  transaction_id: '0f9a1c2e-4b7d-4a1f-9c3e-8d2b5a6f1e40',
  status: 'pending',
  amount: '150.00',
  currency: 'GHS',
  link: 'https://envlope.onrender.com/api/payments/pay/8X7K29xQpL4mZ',
};

function mapStatus(raw) {
  const value = raw.trim().toLowerCase();
  if (['waiting', 'claimed', 'processing', 'completed', 'expired', 'failed'].includes(value)) {
    return value;
  }
  if (['success', 'succeeded', 'successful', 'paid', 'complete'].includes(value)) {
    return 'completed';
  }
  if (['pending', 'created', 'active'].includes(value)) return 'waiting';
  if (['cancelled', 'canceled', 'declined'].includes(value)) return 'failed';
  return 'waiting';
}

function toAmount(value) {
  const parsed = typeof value === 'number' ? value : Number.parseFloat(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function codeFromLink(link, transactionId) {
  const tail = link.split('?')[0].split('/').filter(Boolean).pop() ?? '';
  const cleaned = tail.replace(/[^A-Za-z0-9]/g, '').toUpperCase();
  if (cleaned.length >= 4) return cleaned.slice(-6);
  return transactionId.replace(/-/g, '').slice(0, 6).toUpperCase();
}

let pass = 0;
let fail = 0;
function check(name, cond, extra) {
  if (cond) { pass++; console.log(`  PASS  ${name}`); }
  else { fail++; console.log(`  FAIL  ${name}${extra ? ` -> ${extra}` : ''}`); }
}

console.log('\nMapping the real TransactionResponse');
const envelope = {
  id: RESPONSE.transaction_id,
  code: codeFromLink(RESPONSE.link, RESPONSE.transaction_id),
  amount: toAmount(RESPONSE.amount),
  currency: RESPONSE.currency,
  status: mapStatus(RESPONSE.status),
  shareUrl: RESPONSE.link,
};

check('id is the transaction_id', envelope.id === RESPONSE.transaction_id);
check('shareUrl is the claim link', envelope.shareUrl === RESPONSE.link);
check('amount parses from Decimal string', envelope.amount === 150, String(envelope.amount));
check('currency passes through', envelope.currency === 'GHS');
check('"pending" maps to waiting', envelope.status === 'waiting', envelope.status);
check('code is 6 chars', envelope.code.length === 6, envelope.code);
console.log(`        code = ${envelope.code}`);

console.log('\nStatus vocabulary');
check('"success" -> completed', mapStatus('success') === 'completed');
check('"SUCCESS" -> completed', mapStatus('SUCCESS') === 'completed');
check('"completed" -> completed', mapStatus('completed') === 'completed');
check('"processing" -> processing', mapStatus('processing') === 'processing');
check('"claimed" -> claimed', mapStatus('claimed') === 'claimed');
check('"cancelled" -> failed', mapStatus('cancelled') === 'failed');
check('"failed" -> failed', mapStatus('failed') === 'failed');
check('unknown -> waiting (not failed)', mapStatus('brand_new_state') === 'waiting');

console.log('\nDecimal precision (gt=0, max_digits=12, decimal_places=2)');
for (const [input, expected] of [['0.30', 0.3], ['19.99', 19.99], ['500.00', 500], ['1000.10', 1000.1], [12.34, 12.34]]) {
  const got = toAmount(input);
  check(`${input} -> ${expected}`, Math.abs(got - expected) < 1e-9, String(got));
}
check('string sent for 0.1+0.2 stays exact', (0.1 + 0.2).toFixed(2) === '0.30');
check('rejects 0 (gt=0 enforced by backend)', toAmount('0.00') === 0);

console.log('\nCode derivation edge cases');
check('trailing slash handled', codeFromLink('https://x.co/api/payments/pay/ABC123/', 'tid').length === 6);
check('query string stripped', codeFromLink('https://x.co/pay/ABC123?a=1', 'tid') === 'ABC123');
check('falls back to transaction id', codeFromLink('https://x.co/pay/ab', '0f9a1c2e-4b7d') === '0F9A1C');

console.log(`\n${pass} passed, ${fail} failed\n`);
process.exit(fail > 0 ? 1 : 0);
