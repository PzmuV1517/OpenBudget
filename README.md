# OpenBudget

A fully offline, store-agnostic, globally-capable envelope budgeting app.
Receipts are scanned and parsed entirely on-device — no external APIs, no cloud,
no per-request cost. All data lives locally in SQLite.

## Stack

- **Expo SDK 56** + React Native + TypeScript
- **expo-router** — file-based navigation (tabs + stacks)
- **expo-sqlite** — local persistence (source of truth)
- **zustand** — in-memory cache over SQLite
- **@react-native-ml-kit/text-recognition** — on-device OCR (Latin + scripts)
- **expo-camera** — receipt capture
- **react-native-svg** — progress rings
- **@shopify/flash-list** — the spending ledger
- **react-native-reanimated** / **gesture-handler** — interactions

## Important: OCR needs a dev build

ML Kit is a native module — it does **not** work in Expo Go. Run a one-time
prebuild + dev client:

```bash
npx expo prebuild
npx expo run:ios     # or run:android
```

Everything stays local and offline; the dev build is purely so the native OCR
module is available.

## Project layout

```
app/                       # expo-router routes
  _layout.tsx              # root stack; hydrates the store on launch
  (tabs)/
    index.tsx              # Home — budget summary + envelopes + FAB
    spending.tsx           # global ledger, grouped by date
    envelopes.tsx          # manage envelopes (create/edit/delete)
  envelope/[id].tsx        # one envelope: balance, top-up, history
  add/manual.tsx           # amount + envelope + note
  add/scan.tsx             # camera -> OCR -> parse -> confirm
  modal/confirm-scan.tsx   # confirm/edit the parsed total before saving

components/                # 7 reusable primitives + a few composites
lib/
  theme.ts                 # design tokens (single source)
  money.ts                 # integer minor-unit math + formatting
  store.ts                 # zustand store + derived-total selectors
  db/                      # SQLite schema + typed query layer
  receipt/                 # pure, unit-tested parsing pipeline
    ocr.ts                 # ML Kit wrapper (the only native touch point)
    keywords.ts            # multilingual total/negative keywords + currencies
    normalizeAmount.ts     # locale-agnostic separator inference
    extractTotal.ts        # keyword + geometry + magnitude heuristics
    parseReceipt.ts        # orchestrator (screens call only this)
```

## Money

All money is stored as **integer minor units** (cents). Floats are never used
for currency. Conversion to a display string happens only at render, in
`lib/money.ts`. Derived values (`spent`, `remaining`, totals) are computed by
selectors, never stored.

## Tests

The fragile, isolated logic — money math and the receipt parser — is unit
tested in a plain Node environment (no RN needed):

```bash
npm test          # jest (lib/ only)
npm run typecheck # tsc --noEmit
```

## Out of scope (v1)

Cloud sync, multi-device, bank integration, recurring budgets/rollover,
sharing, charts, export/backup. All deferrable on top of the local-first core.
