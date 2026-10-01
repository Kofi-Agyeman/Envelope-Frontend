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

## Demo sign-in

Any well-formed number works while mock mode is active. There is also a
one-tap **Use demo account** button on the login screen (`024 563 4567`).

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
└── envelope/
    ├── created.tsx       Creation animation → success → share
    └── [id].tsx          Share link + lifecycle timeline

components/
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
├── api.ts                Single data entry point (mock ⇄ backend)
├── http.ts               Fetch wrapper, ApiError
├── auth.ts               Login/register/session persistence
├── mockService.ts        In-memory backend
└── mockData.ts           Seed fixtures

store/     auth.tsx, data.tsx, theme.tsx — app state
constants/ theme, typography, layout, config
utils/     format, haptics, async
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
getBalance(token)
getEnvelopes(token)
getEnvelope(id, token)
createEnvelope({ amount }, token)   // -> POST /api/payments/send
getActivity(token)
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

`node scripts/verify-payments-mapping.js` checks this mapping in isolation.

### Not yet implemented on the backend

`/api/envelopes`, `/api/activity` and `/api/wallet/balance` return `404`. The
data store already degrades gracefully on failure, so those screens show empty
states rather than crashing, but envelope listing, history, and balance are not
yet backed by real endpoints. Creation now works via `/api/payments/send`.

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
ENVELOPE = { expiryHours: 72 }
```

Changing the slider range or presets needs no other edits.

## Design notes

- Dark-first, with MTN yellow used only as an accent — buttons, values, slider
  fill, envelope glow. Everything else is neutral dark and white.
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
