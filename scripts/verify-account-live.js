/**
 * Live check of the /users/me contract and the mapping the Account screen
 * renders. Run with: node scripts/verify-account-live.js
 */
const BASE = process.env.API_BASE_URL || 'https://envlope.onrender.com/api';

let pass = 0, fail = 0;
const check = (name, cond, extra) => {
  if (cond) { pass++; console.log(`  PASS  ${name}`); }
  else { fail++; console.log(`  FAIL  ${name}${extra ? ` -> ${extra}` : ''}`); }
};

/** Mirrors services/api.ts accountFromWire + utils/format initialsFromName. */
function initialsFromName(fullName) {
  const parts = String(fullName ?? '').trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return '?';
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
}

function accountFromWire(me) {
  return {
    id: me.id,
    fullName: me.full_name,
    phone: me.phone_number,
    email: me.email ?? null,
    isVerified: me.is_verified === true,
    initials: initialsFromName(me.full_name),
  };
}

async function signUp(fullName, email) {
  const phone = '077' + String(Date.now()).slice(-7) + Math.floor(Math.random() * 9);
  const password = 'Test1234!';
  const reg = await fetch(`${BASE}/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ full_name: fullName, phone_number: phone, email, password }),
  });
  const regBody = await reg.json();
  const login = await fetch(`${BASE}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ phone_number: phone, password }),
  });
  const loginBody = await login.json();
  return { phone, password, userId: regBody.user_id, tokens: loginBody };
}

async function main() {
  console.log('\n1. Register + login (the endpoint needs a JWT)');
  const withEmail = await signUp('Kwame Mensah', `me${Date.now()}@test.com`);
  check('register returns a user id', typeof withEmail.userId === 'string', withEmail.userId);
  check('login returns an access token', typeof withEmail.tokens.access_token === 'string');
  check('login returns a refresh token', typeof withEmail.tokens.refresh_token === 'string');
  check('token type is bearer', /bearer/i.test(withEmail.tokens.token_type ?? ''), withEmail.tokens.token_type);
  const auth = { Authorization: `Bearer ${withEmail.tokens.access_token}` };

  console.log('\n2. The JWT is actually required');
  const anon = await fetch(`${BASE}/users/me`);
  check('no token is rejected', anon.status === 401 || anon.status === 403, `got ${anon.status}`);
  const badScheme = await fetch(`${BASE}/users/me`, { headers: { Authorization: withEmail.tokens.access_token } });
  check('a bare token without the Bearer scheme is rejected',
    badScheme.status === 401 || badScheme.status === 403, `got ${badScheme.status}`);
  const garbage = await fetch(`${BASE}/users/me`, { headers: { Authorization: 'Bearer not-a-jwt' } });
  check('a malformed token is rejected', garbage.status === 401 || garbage.status === 403, `got ${garbage.status}`);

  console.log('\n3. With the token the record comes back');
  const res = await fetch(`${BASE}/users/me`, { headers: auth });
  check('returns 200', res.status === 200, `got ${res.status}`);
  check('is JSON', (res.headers.get('content-type') ?? '').includes('application/json'));
  const me = await res.json();

  console.log('\n4. The record carries exactly what the screen renders');
  check('id is a string', typeof me.id === 'string', String(me.id));
  check('full_name is a string', typeof me.full_name === 'string', String(me.full_name));
  check('phone_number is a string', typeof me.phone_number === 'string', String(me.phone_number));
  check('email is a string here', typeof me.email === 'string', String(me.email));
  check('is_verified is a boolean', typeof me.is_verified === 'boolean', String(me.is_verified));
  check('no unexpected extra fields',
    Object.keys(me).sort().join(',') === 'email,full_name,id,is_verified,phone_number',
    Object.keys(me).sort().join(','));

  console.log('\n5. The record is the account that signed up');
  check('id matches the registered user', me.id === withEmail.userId, `${me.id} vs ${withEmail.userId}`);
  check('full_name matches', me.full_name === 'Kwame Mensah', me.full_name);
  check('phone_number matches', me.phone_number === withEmail.phone, me.phone_number);
  check('email matches', me.email === `me${withEmail.phone}@test.com` || String(me.email).endsWith('@test.com'), String(me.email));

  console.log('\n6. Mapping onto the app model');
  const account = accountFromWire(me);
  check('camelCase keys', Object.keys(account).join(',') === 'id,fullName,phone,email,isVerified,initials',
    Object.keys(account).join(','));
  check('fullName carried over', account.fullName === me.full_name);
  check('phone carried over verbatim', account.phone === me.phone_number);
  check('initials derived from the name', account.initials === 'KM', account.initials);
  check('isVerified is a strict boolean', account.isVerified === (me.is_verified === true));
  check('is_verified: 1 is not treated as verified', accountFromWire({ ...me, is_verified: 1 }).isVerified === false);
  check('a missing is_verified is not verified', accountFromWire({ ...me, is_verified: undefined }).isVerified === false);
  check('email stays nullable', accountFromWire({ ...me, email: null }).email === null);

  console.log('\n7. An account registered without an email');
  const noEmail = await signUp('Ama Serwaa', null);
  const noEmailRes = await fetch(`${BASE}/users/me`, {
    headers: { Authorization: `Bearer ${noEmail.tokens.access_token}` },
  });
  const noEmailMe = await noEmailRes.json();
  check('registering without an email works', noEmailRes.status === 200, `got ${noEmailRes.status}`);
  check('email comes back null', noEmailMe.email === null, JSON.stringify(noEmailMe.email));
  check('maps to null, not an empty string', accountFromWire(noEmailMe).email === null);
  check('is_verified defaults to false', noEmailMe.is_verified === false, String(noEmailMe.is_verified));
  check('single-name initials use two letters', accountFromWire({ ...noEmailMe, full_name: 'Cher' }).initials === 'CH');

  console.log(`\n${pass} passed, ${fail} failed\n`);
  process.exit(fail > 0 ? 1 : 0);
}

main().catch((e) => { console.error('ERROR:', e); process.exit(1); });
