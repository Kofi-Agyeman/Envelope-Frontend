/**
 * Live integration check against the running FastAPI backend.
 * Run with: node scripts/verify-auth.js
 */
const BASE = process.env.API_BASE_URL || 'http://127.0.0.1:8000/api';

let pass = 0;
let fail = 0;

function check(name, condition, extra) {
  if (condition) {
    pass++;
    console.log(`  PASS  ${name}`);
  } else {
    fail++;
    console.log(`  FAIL  ${name}${extra ? ` -> ${extra}` : ''}`);
  }
}

async function call(path, options = {}) {
  const res = await fetch(`${BASE}${path}`, {
    method: options.method || 'GET',
    headers: {
      Accept: 'application/json',
      ...(options.body ? { 'Content-Type': 'application/json' } : {}),
      ...(options.token ? { Authorization: `Bearer ${options.token}` } : {}),
    },
    body: options.body ? JSON.stringify(options.body) : undefined,
  });
  const text = await res.text();
  let json = null;
  try {
    json = text ? JSON.parse(text) : null;
  } catch {
    json = text;
  }
  return { status: res.status, json };
}

const phone = '077' + String(Date.now()).slice(-6);
const password = 'Test1234!';

(async () => {
  console.log('\n1. Register (RegisterRequest)');
  const reg = await call('/auth/register', {
    method: 'POST',
    body: { full_name: 'Ama Owusu', phone_number: phone, email: `ama${phone}@test.com`, password },
  });
  check('register returns 200', reg.status === 200, `got ${reg.status}`);
  check('register returns user_id', typeof reg.json?.user_id === 'string', JSON.stringify(reg.json));
  check('register returns no access_token', !reg.json?.access_token);

  console.log('\n2. Register rejects a bad email (422 detail array)');
  const bad = await call('/auth/register', {
    method: 'POST',
    body: { full_name: 'X Y', phone_number: '0200000001', email: 'nope', password },
  });
  check('returns 422', bad.status === 422, `got ${bad.status}`);
  check('detail is an array', Array.isArray(bad.json?.detail));

  console.log('\n3. Login (LoginRequest)');
  const login = await call('/auth/login', {
    method: 'POST',
    body: { phone_number: phone, password },
  });
  check('login returns 200', login.status === 200, `got ${login.status}`);
  check('has access_token', typeof login.json?.access_token === 'string');
  check('has refresh_token', typeof login.json?.refresh_token === 'string');
  check('token_type is bearer', login.json?.token_type === 'bearer');
  const access = login.json?.access_token;
  const refresh = login.json?.refresh_token;

  console.log('\n4. Login rejects a wrong password (401)');
  const wrong = await call('/auth/login', {
    method: 'POST',
    body: { phone_number: phone, password: 'WrongPass1' },
  });
  check('returns 401', wrong.status === 401, `got ${wrong.status}`);
  check('detail is a string', typeof wrong.json?.detail === 'string');

  console.log('\n5. Access token works on a protected route');
  const me = await call('/users/me', { token: access });
  check('me returns 200', me.status === 200, `got ${me.status}`);
  check('me has full_name', typeof me.json?.full_name === 'string');
  check('me has phone_number', me.json?.phone_number === phone);
  check('me user_id matches register', me.json?.id === reg.json?.user_id);

  console.log('\n6. Bad token is rejected with 401 (the refresh trigger)');
  const badTok = await call('/users/me', { token: 'garbage' });
  check('returns 401', badTok.status === 401, `got ${badTok.status}`);

  console.log('\n7. Refresh via query parameter');
  const refreshed = await call(`/auth/refresh?refresh_token=${encodeURIComponent(refresh)}`, {
    method: 'POST',
  });
  check('refresh returns 200', refreshed.status === 200, `got ${refreshed.status}`);
  check('new access_token differs', refreshed.json?.access_token !== access);
  check('new refresh_token returned', typeof refreshed.json?.refresh_token === 'string');
  const newAccess = refreshed.json?.access_token;
  const newRefresh = refreshed.json?.refresh_token;

  console.log('\n8. New access token works');
  const me2 = await call('/users/me', { token: newAccess });
  check('me returns 200 with refreshed token', me2.status === 200, `got ${me2.status}`);

  console.log('\n9. Refresh token rotates (old one should be rejected)');
  const reuse = await call(`/auth/refresh?refresh_token=${encodeURIComponent(refresh)}`, {
    method: 'POST',
  });
  console.log(`  note  old refresh token -> ${reuse.status} (200 means the backend does not rotate-revoke)`);

  console.log('\n10. Unauthenticated access to a data route the backend lacks');
  for (const p of ['/envelopes', '/activity', '/wallet/balance']) {
    const r = await call(p, { token: newAccess });
    console.log(`  note  ${p} -> ${r.status}`);
  }

  console.log(`\n${pass} passed, ${fail} failed\n`);
  process.exit(fail > 0 ? 1 : 0);
})().catch((e) => {
  console.error('UNEXPECTED ERROR:', e);
  process.exit(1);
});
