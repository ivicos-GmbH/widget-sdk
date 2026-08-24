# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

`@ivicos/widget-sdk` is the client-side SDK that widget developers embed in their own page to
talk to the ivCampus host over `postMessage`, from inside the sandboxed iframe ivCampus puts
them in. It is not an ivCampus-side package — it never talks to ivCampus's backend directly,
only to the host page one level up via the `postMessage` protocol. The full external-developer
guide (protocol details, hosting requirements, submission process) is in README.md; read it if
you need the widget-author's perspective, not just the code's.

## Commands

```bash
yarn install
yarn build       # tsc -> lib/ (real ESM output, not CJS)
yarn lint        # eslint --ext .ts src/
yarn test        # tsc -p tsconfig.test.json && eslint --ext .ts src/ test/ && vitest run
yarn vitest run test/sdk.test.ts -t "<test name>"   # run a single test by name
```

`yarn test` type-checks and lints both `src/` and `test/`, then runs the Vitest suite — a lint or
type error fails before any test even runs. `yarn lint`/`yarn build` alone still only touch
`src/`, matching what actually ships in `lib/`. Use `yarn vitest` (no `run`) for watch mode while
iterating on a single test.

## Testing and CI

`test/sdk.test.ts` (Vitest, `jsdom` environment) covers the postMessage protocol end-to-end:
handshake/context flow, origin pinning (both the `event.origin` check and the
`event.source === window.parent` check), visibility/context listener unsubscribe, `reportResize`
dedup, `call()`/RPC round-trips including unrecognized response ids, and `destroy()` cleanup.
When touching `onMessage`, `waitForHandshake`, or anything origin/security-related in `sdk.ts`,
run `yarn test` and extend this suite rather than trusting manual testing.

`waitForHandshake()` resolves via a stored resolver called from `completeHandshake()` — the same
pattern `waitForFirstContext()` already used — rather than polling. Follow that pattern for any
similar "wait until an async message arrives" logic added later; don't reintroduce a `setTimeout`
poll loop.

GitHub Actions (`.github/workflows/ci.yml`) runs `yarn build && yarn test` on every push/PR to
`main`, then fails the check if `lib/` differs from a fresh build — this is the automated version
of the "rebuild and commit `lib/`" rule below.

## Critical: `lib/` is committed, not generated on install

The compiled `lib/` output is checked into git (this is intentional — see README's "Install"
section for why: pnpm blocks `prepare`/`postinstall` lifecycle scripts by default, and consumers
pull this repo as a pinned git dependency, not from npm). There is **no `prepare` script** and
`lib/` does **not** regenerate itself.

**Any change to `src/` must be followed by `yarn build` and the resulting `lib/` diff
committed in the same commit.** Nothing fails loudly if this is skipped — consumers just silently
keep getting stale compiled output. Before finishing any task that touched `src/`, run the build
and check `git status` for an accompanying `lib/` diff.

## Architecture

The entire SDK is three files in `src/`:

- `types.ts` — `WidgetContext` (the read-only data a widget receives: theme, locale, campusId,
  optional areaId/roomId, displayName) and the two discriminated-union message types,
  `HostToWidgetMessage` / `WidgetToHostMessage`, that define the wire protocol.
- `sdk.ts` — the `WidgetSDK` class, the entire implementation.
- `index.ts` — the public export surface (`WidgetSDK`, `SDK_VERSION`, and the `WidgetContext`/
  `InitOptions` types). Nothing internal to `sdk.ts` should be exported here beyond this.

Imports between these files use explicit `.js` extensions on `.ts` source (e.g.
`from './types.js'`) — required by `moduleResolution: NodeNext` in tsconfig.json. Don't drop the
extension when adding new imports; it compiles locally without it in some setups but fails
under NodeNext resolution.

### The protocol and its security model

`WidgetSDK` is a `postMessage` state machine talking to exactly one host window
(`window.parent`). The message flow, in order:

1. Widget sends `ready` (with `widgetId` and `sdkVersion`) to `window.parent`, target origin
   `'*'` — unavoidable at this point since the host's real origin isn't known yet, and this
   message carries no secret.
2. Host replies with `handshake` (a nonce); widget echoes it back as `handshake-ack`.
3. Host pushes `context` (the `WidgetContext`); `init()` resolves once both handshake and first
   context have arrived.
4. Afterward: `context` updates on room/theme/locale changes, `visibility-change` when the
   widget's panel is backgrounded, and `rpc-request`/`rpc-response` for `WidgetSDK.call()` (see
   below).

**Origin pinning is the security-critical part and the reason this class exists instead of
widget authors hand-rolling `postMessage` code.** The *first* message accepted from the host
(`event.source === window.parent` and `message.source === 'ivicos-widget-host'`) sets
`this.hostOrigin` from `event.origin`. Every message after that must match that exact origin, or
it's silently dropped — checking `event.source === window.parent` alone is not sufficient,
because that doesn't rule out the parent window later navigating to an untrusted origin. Any
change to `onMessage` in `sdk.ts` must preserve this pinning behavior exactly; see the comment
in that method and README's "The protocol, if you're not using this SDK" section for the
rationale in full.

### Current capability boundary

`WidgetSDK.call()` and the `rpc-request`/`rpc-response` message types exist as forward-compatible
transport, but per the README's "Status" section, no scoped data-access phase exists yet — any
`call()` currently goes unanswered. Don't treat the presence of `call()` as evidence that widgets
have any live data access; they don't. If asked to build against real RPC methods, check the
current status in README.md first rather than assuming `call()` is wired up to anything.

## Code style

Enforced via ESLint (`eslint:recommended` + `@typescript-eslint/recommended`, `no-explicit-any`
turned off) and Prettier (`.prettierrc.json`: single quotes, semicolons, 4-space indent, no
trailing commas, 140-char width). `yarn lint` catches both; Prettier issues surface as
warnings, not errors.
