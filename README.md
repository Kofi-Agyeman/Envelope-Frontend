# Envelope (Sender App)

A React Native / Expo frontend for **Envelope**, a digital money envelope for MTN MoMo.

The sender never needs the recipient's MoMo number. They choose an amount, get a
private link, and send it. The money stays in their MoMo account until someone
claims the envelope.

```
AMOUNT  →  ENVELOPE  →  LINK  →  RECIPIENT
```

---

## Stack

| Concern | Choice |
| --- | --- |
| Framework | Expo SDK 57, React Native 0.86, New Architecture |
| Language | TypeScript (strict) |
| Navigation | Expo Router (file-based) |
| Animation | React Native Reanimated 4 + Gesture Handler 4 |
| Haptics | Expo Haptics |
| Icons | Ionicons via `@expo/vector-icons` |
| Fonts | Inter via `@expo-google-fonts/inter` |
| Storage | AsyncStorage (session + preferences) |

## Running

```bash
npm install
npx expo start
```

Then press `a` for Android, `i` for iOS, or scan the QR code with Expo Go.

```bash
npm run typecheck   # tsc --noEmit
```

`expo-linear-gradient`, `expo-haptics` and `react-native-reanimated` include native
code. Expo Go covers all of them, but a development build
(`npx expo run:android`) is required if you add anything not in the Expo SDK.

There is no demo mode and no mock service: every screen talks to the
deployed FastAPI backend. The only exception is the balance card, which
stays empty because `/api/wallet/balance` does not exist on the backend
yet (see [Backend integration](#backend-integration)).

---

## Project structure

```
app/
├── _layout.tsx           Root providers, fonts, auth-aware stack
├── onboarding.tsx        3-screen first-run explainer
├── (auth)/
│   ├── index.tsx         → /login
│   ├── login.tsx
│   └── register.tsx
├── (tabs)/
│   ├── index.tsx         Home — the create-envelope hero
│   ├── envelopes.tsx     Envelopes with animated filters
│   ├── activity.tsx      Grouped timeline
│   └── profile.tsx       Grouped settings, native switches
├── account/
│   └── index.tsx         → /account — the live GET /users/me record
└── envelope/
    ├── created.tsx       Creation animation → success → share
    └── [id].tsx          Share link + lifecycle timeline

components/
├── ui.tsx                Card, ListGroup/ListRow, SegmentedControl, headers, EmptyState
├── Logo.tsx              Brand mark + wordmark
├── DigitalEnvelope.tsx   Reusable SVG envelope, all lifecycle states
├── Glow.tsx              Radial-gradient halo behind the envelope
├── AmountSlider.tsx      Gesture-driven slider with haptics
├── AmountDisplay.tsx     Large readout with tap-to-type
├── PresetChips.tsx       GH₵20/50/100/200/500
├── BalanceCard.tsx       Greeting + balance with hide toggle
├── EnvelopeCard.tsx      List row
├── StatusBadge.tsx       Status pill
├── QuickAction.tsx       Secondary action tile
├── PrimaryButton.tsx     Gradient CTA with press states
├── MoneySafetyNote.tsx   "Money stays in your account" reassurance
├── Field.tsx             Labelled auth input + password toggle
└── Skeleton.tsx          Shimmer placeholders

services/
├── api.ts                Single data entry point, always the backend
├── http.ts               Fetch wrapper, ApiError
├── auth.ts               Login/register/session persistence
└── tokenManager.ts       Token pair, 401 refresh

store/     auth.tsx, data.tsx, theme.tsx — app state
constants/ theme, typography, layout, config
utils/     format, haptics
hooks/     useReducedMotion
```

Routes live in `app/` at the project root, not `src/app/`.

There is deliberately **no `app/index.tsx`**. `(tabs)/index.tsx` already owns
the `/` path; a second file claiming `/` makes Expo Router silently pick one of
the two. Auth gating lives in `_layout.tsx`, which swaps between a signed-out and
a signed-in navigator.

## Theming

Light, dark, and system themes are user-selectable under **Profile → Appearance**
and persist to `AsyncStorage` under `envelope.theme.mode`.

- `constants/theme.ts` holds the two palettes plus `makeStatusColors`,
  `makeGradients`, and `makeShadows`. These are pure functions of the palette,
  not module-level constants, because a module-level constant would freeze one
  theme at import time.
- `store/theme.ts` owns the resolved palette and persists the user's choice.
- Components never import a colour constant directly. They read
  `useTheme().colors` and build styles with `useThemedStyles((colors) => ...)`,
  which memoises the stylesheet per scheme.

## Icons

All glyphs come from `components/Icon.tsx`, a single `react-native-svg` set drawn
on one 24×24 grid with a shared 2px stroke, round caps, and round joins. Using one
source keeps the optical weight consistent; mixing icon fonts reads as generic.

Icons are semantic (`envelope`, `wallet`, `lock`, `checkCircle`), not decorative
nouns, so a glyph can be reused wherever the meaning repeats.

## Backend integration

The UI never imports a transport directly. Everything goes through
`services/api.ts`:

```ts
getProfile(token)
getBalance(token)                             // backend: not implemented yet
getEnvelopes(token)                           // -> GET /api/utilities/envelopes
getEnvelope(id, token)                        // served from the loaded list
createEnvelope({ amount }, token)             // -> POST /api/payments/send
getActivity(token)                            // derived from the history list
```

Each function checks `USE_MOCKS`. Mocks are **opt-in**
(`EXPO_PUBLIC_USE_MOCKS=true`); by default the app talks to the real backend at
`http://127.0.0.1:8000/api`. An Android emulator reaches the host at
`10.0.2.2`, so set `EXPO_PUBLIC_API_URL=http://10.0.2.2:8000/api` there.

### Authentication

Auth is implemented against the live FastAPI backend:

| Endpoint | Request | Response |
| --- | --- | --- |
| `POST /api/auth/register` | `{ full_name, phone_number, email?, password }` | `{ message, user_id }` |
| `POST /api/auth/login` | `{ phone_number, password }` | `{ access_token, refresh_token, token_type }` |
| `POST /api/auth/refresh?refresh_token=…` | token as a **query** parameter | `{ access_token, refresh_token, token_type }` |

Two details are easy to get wrong and are worth stating explicitly:

- **Register issues no tokens.** It only confirms the account and returns the
  new `user_id`, so `authService.register` signs in immediately afterwards to
  obtain a usable session.
- **Refresh takes a query parameter,** not a JSON body.

`services/tokenManager.ts` owns the pair. `http.ts` calls `refreshTokens()` on
any `401` and replays the original request exactly once
(`retryOnUnauthorized: false` on the replay prevents a refresh loop). The
in-flight promise is shared, so several requests hitting `401` together produce
one refresh rather than N racing on the rotating token — verified: the backend
revokes the old refresh token on use. A failed refresh fires
`onSessionExpired`, which drops the app back to signed-out.

The profile is read from `GET /api/users/me` after the token exists, since
neither auth endpoint returns user details. Snake_case wire shapes live in
`types/index.ts` (`RegisterRequestBody`, `LoginRequestBody`, `TokenPairResponse`,
`MeResponse`) and are mapped to camelCase app models at the service boundary.

Run `node scripts/verify-auth.js` to exercise the whole contract against a
running backend.

### The Account screen (`/account`)

`app/account/index.tsx` renders the `GET /api/users/me` record in full. It is
reachable from **Profile → Personal information**.

**This endpoint requires the JWT.** The call goes through `request` with the
session's access token as `Authorization: Bearer <jwt>`, so it inherits the same
401 handling as everything else: one refresh-and-replay, and a refresh that also
fails ends the session through the auth store, which unmounts the screen. A 401
or 403 that still gets through is shown as "Your session has expired", never as
raw `Not authenticated`.

The endpoint returns exactly five fields, and all five are on screen:

```ts
{
  id: string;            // UUID -> "User ID"
  full_name: string;     // -> "Full name", and the hero card
  phone_number: string;  // -> "MTN MoMo number" (masked in the hero pill)
  email: string | null;  // -> "Email", or "Not added"
  is_verified: boolean;  // -> "Verification" and the hero badge
}
```

Two deliberate details:

- `is_verified` is read as `=== true`, so a missing or `1`-shaped value reads as
  **not verified**. The app never vouches for an account the backend has not
  confirmed.
- `email` stays nullable end to end (`Account.email: string | null`) because the
  backend allows an account with no email; the screen prints "Not added" instead
  of an empty row.

The record is fetched live on every visit and on pull-to-refresh rather than read
from the cached profile in the auth store, so the screen always shows current
server truth. A failed refresh keeps the last good record on screen behind a
warning instead of blanking it.

`node scripts/verify-account-live.js` checks the contract against the deployed
service: that the token is required (missing, scheme-less and malformed tokens
are all rejected), that the record is the account that signed up, that the field
list is unchanged, and that a user registered without an email comes back as
`null`.

### Creating a payment

Envelope creation posts to `POST /api/payments/send` with the access token:

```ts
// SendMoneyRequest — amount is a Decimal(gt=0, max_digits=12, decimal_places=2)
{ "amount": "150.00" }
```

The amount is sent as a **string**, not a JSON number. A float can carry binary
rounding (`0.1 + 0.2 === 0.30000000000000004`), which would violate
`decimal_places=2` or produce a cedi amount that is off by a cent.

The response is a `TransactionResponse`:

```ts
{
  transaction_id: string;   // UUID
  status: string;           // free-form, normalised by mapStatus()
  amount: string;           // Decimal, serialised as a string
  currency: string;
  link: string;             // the recipient's claim link
}
```

`link` becomes the envelope's `shareUrl` and is what the recipient opens to
claim the cash. Two adaptations happen at the service boundary:

- `status` is normalised onto `EnvelopeStatus`. Unknown values fall back to
  `waiting`, not `failed` — a new backend state is far likelier to be a healthy
  in-progress envelope than a genuine failure.
- The UI's 6-character envelope code is derived from the tail of the claim
  link, since the backend returns a UUID rather than a short code.

`TransactionResponse` carries **no expiry**, so the app never invents one after a
send. `createEnvelope` reads the real deadline from `expiry_at` in the envelope
history (see below) and leaves `expiresAt` as `null` if the history has not
published one yet.

`node scripts/verify-payments-mapping.js` checks this mapping in isolation.

### Envelope history (Envelopes + Activity tabs)

Both tabs read from `GET /api/utilities/envelopes` ("Get Envelope History"),
which requires the bearer token and returns a list, newest first:

```ts
[{
  envelope_code: string;        // the FULL 43-char link token
  created_at: string;           // ISO 8601
  expiry_at: string | null;     // ISO 8601, with an explicit UTC offset
  transaction_state: string;    // e.g. "PENDING"
  amount: number;               // Decimal, coerced to a number here
  shareUrl: string;             // the full claim link
}]
```

`transaction_state` is uppercase; `mapStatus` normalises it onto `EnvelopeStatus`
(`PENDING` → `waiting`, `SUCCESS` → `completed`, unknown → `waiting`).

### Expiry is decided by the backend, not by the app

**`expiry_at` from this endpoint is the only thing that decides when a link
stops working.** The app keeps no window of its own:

- No `+72h` is added anywhere. `constants/config.ts`'s `ENVELOPE.expiryHours` is
  unused by the runtime — the server owns the deadline.
- `utils/format.ts` reads timestamps through `parseServerDate`, which treats a
  value with no zone designator as UTC. A naive timestamp would otherwise be read
  as device-local time and shift the countdown by the device's offset.
- `countdownLabel(expiry_at)` is the countdown, and `isExpired(expiry_at)` is the
  gate. A missing or unparseable `expiry_at` is *unknown*, not *expired*: it
  reads "Expiry pending" and does not block anything, because a guessed window
  would either hide a live link or resurrect a dead one.
- An envelope still recorded as `PENDING`/`CLAIMED` after its `expiry_at` is
  shown as **expired** — the stored state lags, the deadline does not. `completed`,
  `failed` and `processing` keep their own status.
- The detail screen re-reads the history at most once per envelope when it
  arrives without an expiry, and ticks every 30s so the countdown and the gate
  flip on their own while the screen is open.

**Once a link is expired it cannot be copied or shared.** The claim-link card is
replaced by a "Link no longer available" note; `handleCopy` and `handleShare`
both re-check `canCopyLink`, so the actions are unreachable even if the UI were
to render them. The gate is `status === 'waiting' && !expired && shareUrl`, so
`claimed`, `processing`, `completed` and `failed` envelopes are not copyable
either — there is nothing left to hand over.

**The 6-character envelope code is derived on the frontend.** The backend
returns the whole 43-character URL-safe base64 token in `envelope_code` and in
`shareUrl`, so `displayCode()` takes the first 6 alphanumeric characters and
uppercases them. Stripping the non-alphanumerics first matters — these tokens
contain `-` and `_`, which read poorly in the letter-spaced code style. The
full token is kept as the envelope `id`, since it is the only stable identifier
the history exposes and the detail screen matches on id *or* code. A freshly
created envelope is keyed on the same token (not on `transaction_id`), so the
server row replaces it in place on the next refresh instead of appearing twice.

There is no separate activity endpoint, so `getActivity` derives one row per
envelope from the same history.

`node scripts/verify-history-live.js` exercises the whole flow against the
deployed service, and `node scripts/verify-expiry-gate.js` covers the countdown,
the expiry gate and the copy/share rule offline.

### Not yet implemented on the backend

`/api/wallet/balance` still returns `404`, so the balance card stays empty.

### Security posture

The mobile bundle contains **no** MTN API key or secret, no JWT signing secret,
no database credentials. It holds only the short-lived user access token issued
by the backend.

```
React Native  ──HTTPS──▶  FastAPI  ──server-side──▶  MTN MoMo
```

`.env` files are for the public base URL only. `.env.example` documents the
expected shape.

## Configuration

`constants/config.ts` is the single place to tune the product:

```ts
AMOUNT = { min: 5, max: 500, step: 5, presets: [20, 50, 100, 200, 500] }
ENVELOPE = { expiryHours: 72 }   // display default only; the server decides
```

Changing the slider range or presets needs no other edits. `expiryHours` is not
consulted at runtime — link validity comes from `expiry_at` (see above).

## Design notes

- Neutral surfaces carry the interface; MTN yellow is reserved for the primary
  action on a screen and for brand marks. `colors.primary` is a fill colour;
  yellow used as text or an icon goes through `colors.accent`, which is
  darkened in light mode for contrast.
- Screens are built from the primitives in `components/ui.tsx` (cards, grouped
  lists, segmented controls, section headers) so spacing, radii and hierarchy
  stay consistent. Lists are grouped rows with inset dividers, not stacks of
  floating cards.
- Buttons use sentence case and solid fills. Money uses tabular figures
  (`tabularNums`) so amounts do not jitter while the slider moves.
- The wallet card is always the dark `ink` surface, in both themes.
- The envelope is the visual identity. It is one reusable SVG component
  (`DigitalEnvelope`) that reacts to amount intensity and to lifecycle status
  (glow, pulse, seal, checkmark, red failure accent).
- The money-safety line sits under the primary CTA on every creation surface.
  It is a defining product guarantee, not fine print.
- Haptics are deliberate: ticks on slider steps, light on selection, medium on
  create, success on completion. Users can disable them in Profile.
- Decorative loops (auras, shimmer) respect the system Reduce Motion setting;
  interaction feedback does not.
- The slider is an `adjustable` accessibility element with increment/decrement
  actions, and the amount can always be typed directly.

## Not in this app

The recipient-side claim experience is a separate surface and is intentionally
out of scope here.
