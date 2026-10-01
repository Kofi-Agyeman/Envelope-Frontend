# PingPay — Envelope (Sender App)

A React Native / Expo frontend for **PingPay**, a digital money envelope for MTN MoMo.

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

store/     auth.tsx, data.tsx — app state
constants/ colors, typography, layout, config
utils/     format, haptics, async
hooks/     useReducedMotion
```

Routes live in `app/` at the project root, not `src/app/`.

There is deliberately **no `app/index.tsx`**. `(tabs)/index.tsx` already owns
the `/` path; a second file claiming `/` makes Expo Router silently pick one of
the two. Auth gating lives in `_layout.tsx`, which swaps between a signed-out and
a signed-in navigator.

## Backend integration

The UI never imports a transport directly. Everything goes through
`services/api.ts`:

```ts
getProfile(token)
getBalance(token)
getEnvelopes(token)
getEnvelope(id, token)
createEnvelope({ amount }, token)
getActivity(token)
```

Each function checks `USE_MOCKS`. When `EXPO_PUBLIC_API_URL` is set, calls go
to the FastAPI backend; otherwise they resolve against `mockService` with
realistic latency. Swapping to production is a config change, not a refactor.

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
