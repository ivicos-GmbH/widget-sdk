# @ivicos-gmbh/widget-sdk

SDK for building widgets that embed into [ivCampus](https://ivicos-campus.app) — inside a Room
or the Personal Dashboard. A widget is any page you host at your own HTTPS URL; ivCampus embeds
it in a sandboxed `<iframe>` and this SDK handles the handshake, context, resizing, and RPC
transport between your page and the host.

This document is the complete guide for external developers: what a widget can and can't do,
how to build one, and how to get it live on a real ivCampus org.

## Status — read this first

This is an early, internal-only phase of the widget system. Concretely:

- Widgets are **display-only by default**. They always receive read-only display context (theme,
  locale, which room/area/campus they're in, the viewer's display name and avatar) and a
  presence push for the viewer's own status. A widget whose manifest declares a data-access
  scope can additionally call `sdk.data.getRoom()` (common room info) and/or
  `sdk.data.getPersonalRoom()` (the viewer's own personal room) — each requires the widget to
  have been granted the matching scope at review time; an ungranted call rejects rather than
  returning trimmed data. Widgets still cannot write anything back to ivCampus.
- There is **no self-serve publishing**. Every widget goes through manual review before it's
  usable by anyone (see [Submitting your widget](#submitting-your-widget) below).
- The SDK is published to **GitHub Packages**, not the public npm registry — see
  [Install](#install).

None of this is a bug to work around; build against what's actually there.

## Install

Published to [GitHub Packages](https://github.com/features/packages) (npm-compatible), not
`registry.npmjs.org`. This means every consumer — public repo or not — needs a GitHub personal
access token, not just a package name; there's no anonymous `npm install` for GitHub Packages'
npm registry, even for public packages.

1. Add this to your project's `.npmrc` (or `~/.npmrc`):

   ```
   @ivicos-gmbh:registry=https://npm.pkg.github.com
   ```

2. Generate a classic GitHub personal access token with the `read:packages` scope, then add it
   to your `~/.npmrc` (don't commit a token to a project-level `.npmrc`):

   ```
   //npm.pkg.github.com/:_authToken=<your-token>
   ```

3. Install normally:

   ```json
   "@ivicos-gmbh/widget-sdk": "^0.1.0"
   ```

   Real semver ranges work here — this is a real registry, unlike a raw git-SHA pin.

**Alternative: pinned git dependency.** If you'd rather not set up a GitHub Packages token, you
can still consume this repo directly via git, pinned to a tag or commit SHA:

```json
"@ivicos-gmbh/widget-sdk": "git+ssh://git@github.com/ivicos-GmbH/widget-sdk.git#<tag-or-sha>"
```

The compiled `lib/` output is committed to this repo (not built on install), specifically so
this works identically under npm, yarn, and pnpm regardless of install method — pnpm in
particular blocks dependency lifecycle scripts (`prepare`/`postinstall`) by default as a
supply-chain safeguard, which would otherwise silently skip a build-on-install step and leave
you with a "module not found" error that has nothing obviously to do with pnpm. There's nothing
to build here; the files are already there.

## Quick start

```ts
import { WidgetSDK } from '@ivicos-gmbh/widget-sdk';

const sdk = new WidgetSDK();

// widgetId MUST exactly match the id you register this widget under (see below) - a
// mismatch here is the single most common reason a widget silently never renders.
const context = await sdk.init({ widgetId: 'my-widget' });

document.body.textContent = `Hello, ${context.displayName}`;

sdk.onContextChange((context) => {
    // theme, locale, or room changed under you (e.g. the user switched rooms)
});

sdk.onVisibilityChange((visible) => {
    if (!visible) {
        // pause polling/animation - the widget's panel is backgrounded, not closed
    }
});

// Content height is reported automatically via a ResizeObserver on document.body.
// Only call this yourself if you need to override that (e.g. a deliberately fixed height).
sdk.reportResize(320);
```

`sdk.init()` resolves once the host has completed the handshake **and** pushed the first
context — you don't need to separately wait for both. If the host never responds (wrong
`widgetId`, page not actually embedded as a registered widget, etc.), `init()` rejects after
10 seconds with a descriptive error rather than hanging forever.

## The `WidgetContext` object

Everything you get, in full:

```ts
interface WidgetContext {
    theme: 'light' | 'dark';
    locale: string;        // e.g. "en", "de"
    campusId: string;
    areaId?: string;       // present when embedded inside a specific area
    roomId?: string;       // present when embedded inside a specific room (Room placement)
    displayName: string;   // the viewing user's display name
    avatar?: string;       // optional avatar image URL for the viewing user
}
```

That's the entire surface. No user ID, no email, no auth token, no bearer credential of any
kind, no access to any ivCampus API. If your widget needs a backend, it's **your own backend** —
the widget page talks to whatever server you control, using whatever auth model you build for
it; ivCampus is not in that loop.

### Presence

The widget receives the viewing user's coarse presence status (online/away/do-not-disturb/etc.):

```ts
sdk.onPresenceChange((presence) => {
    // presence.status is a string like "online", "away", etc.
});

// Or poll the most recently received status:
const presence = sdk.getPresence(); // WidgetPresence | null
```

### Room data

If your widget's manifest declares `room:read` or `personalRoom:read` scopes, you can query:

```ts
// Common room info (name, member count, optionally member list if scope `room:read:members` is granted)
const room = await sdk.data.getRoom();

// The viewing user's own personal room
const personalRoom = await sdk.data.getPersonalRoom();
```

Both calls reject (rather than returning trimmed data) if the required scope hasn't been granted.

**Note:** The DTO field names are provisional until campus-api's and identity-provider's Phase 4
implementations ship — do not treat the current shape as final. The API surface will remain stable;
internal field names may still change.

## Hosting requirements

Any HTTPS URL you control works, with two hard requirements:

1. **HTTPS, no exceptions.** Plain `http://` URLs are rejected at registration time.
2. **Your page must allow being framed.** If your host sends a restrictive
   `Content-Security-Policy: frame-ancestors` or `X-Frame-Options` header, the browser will
   silently refuse to render your widget inside ivCampus — no error shown to the end user, it
   just won't appear. Before registering, check your own response headers:
   ```bash
   curl -sI https://your-widget-url.example.com/ | grep -i "x-frame-options\|content-security-policy"
   ```
   If either is present and restrictive, you'll need to relax it for embedding to work. Most
   plain static hosts (GitHub Pages, Vercel, Netlify, S3, your own nginx with no extra config)
   don't set these by default and work fine out of the box.

No specific hosting provider is required or preferred — pick whatever you already use.

## The protocol, if you're not using this SDK

Some widgets are simple enough not to want a build step. You can implement the same protocol by
hand in plain `<script>` — this SDK is a thin convenience wrapper, not a black box. The full
message shapes:

**On load, send:**
```js
window.parent.postMessage(
    { source: 'ivicos-widget-sdk', type: 'ready', widgetId: 'my-widget', sdkVersion: 1 },
    '*' // unavoidable here - you don't know the host's origin yet, and this message carries no secrets
);
```

**Listen for the host's reply, and pin its origin from the first accepted message:**
```js
let hostOrigin = null;
window.addEventListener('message', (event) => {
    if (event.source !== window.parent) return;
    const msg = event.data;
    if (!msg || msg.source !== 'ivicos-widget-host') return;

    if (hostOrigin === null) {
        hostOrigin = event.origin; // pin it
    } else if (event.origin !== hostOrigin) {
        return; // reject anything from a different origin after that, even if event.source still matches
    }

    if (msg.type === 'handshake') {
        window.parent.postMessage({ source: 'ivicos-widget-sdk', type: 'handshake-ack', nonce: msg.nonce }, hostOrigin);
    }
    if (msg.type === 'context') {
        // msg.context is the WidgetContext object described above
    }
    if (msg.type === 'visibility-change') {
        // msg.visible: boolean
    }
    if (msg.type === 'session-ending') {
        // the widget's session is ending; clean up and prepare for destruction
    }
    if (msg.type === 'presence') {
        // msg.presence is the WidgetPresence object (e.g. { status: 'online' })
    }
});
```

**Report your content height whenever it changes** (or the host defaults to a small fixed size):
```js
window.parent.postMessage({ source: 'ivicos-widget-sdk', type: 'resize', height: document.body.scrollHeight }, hostOrigin);
```

The origin-pinning step is not optional — skipping it (e.g. accepting any message where
`event.source === window.parent`) means any code the host page later loads from a different
origin could impersonate the host. This is exactly what the SDK does for you automatically.

## Submitting your widget

1. Someone with a Manager or Owner role on an ivCampus org (the **sponsoring org** — your
   widget's accountability traces back to them) opens **Org Settings → Integrations → Submit a
   widget** and fills in:

   | Field | Constraint |
   |---|---|
   | Widget ID | lowercase letters/numbers/hyphens only, must be unique across the whole registry |
   | Name | free text, purely for display |
   | Version | must look like `X.Y.Z` (e.g. `1.0.0`) — not currently checked against anything, just needs the shape |
   | Widget URL | your HTTPS iframe URL |
   | Icon URL | any reachable URL, not validated as an actual image |
   | Description | free text |
   | Placement | Room, Personal Dashboard, or both |

2. The submission is immediately visible to the sponsoring org (as "pending review") and to no
   one else — it can't be enabled or used by anyone until it's reviewed.
3. There is currently no self-serve or automatic approval step. Someone on the ivCampus side
   reviews and enables the widget manually; there's no dashboard or notification for this yet,
   so follow up directly if you're waiting on one.
4. Once approved, the sponsoring org can enable it via the same Integrations screen, and it
   becomes usable in the placement(s) you registered it for.

**The one thing to get exactly right: your registered Widget ID and the `widgetId` your page
announces itself as (in `sdk.init({ widgetId: '...' })`, or the raw `ready` message if not using
the SDK) must match, character for character.** If they don't, nothing errors on submission —
the widget will simply sit there failing to load, timing out after 10 seconds with a generic
"this widget did not respond" message and no further detail about why. This is the single most
common way a correctly-built widget appears broken.

## Local development

Test your widget against a real host before submitting, rather than debugging blind:

1. Build and host your widget wherever you'll eventually deploy it (or any throwaway HTTPS URL —
   it doesn't need to be its final location yet).
2. Register it as above, using a test/personal ivCampus org if you have one.
3. Watch your widget's own `onContextChange`/console output, and the browser's devtools Network
   and Console tabs, for handshake or origin errors.

## Security model

- Runs inside a `sandbox="allow-scripts allow-forms allow-same-origin"` iframe the host
  controls. Notably **not** granted: popups (`window.open` is blocked), top-level navigation of
  the parent page, and no access to any ivCampus cookie/localStorage/DOM outside your own iframe.
- Never receives the end user's real ivCampus credentials, in any form.
- All messages are validated against `event.source === window.parent` and, after the first
  accepted message, a pinned expected origin — see [the protocol section](#the-protocol-if-youre-not-using-this-sdk)
  above, or `src/sdk.ts` for the exact implementation.

## Build (for contributing to the SDK itself)

```bash
yarn install
yarn build   # tsc -> lib/ (real ESM output - see git history if this ever regresses to CJS)
yarn test    # type-checks + lints src/ and test/, then runs the Vitest suite
```

`lib/` is committed (see [Install](#install) for why), which means it does **not** regenerate
itself automatically — if you change anything in `src/`, you must run `yarn build` and
commit the resulting changes in `lib/` in the same commit. Nothing will fail loudly if you
forget; consumers will just silently keep getting the old compiled output. CI enforces this on
every push/PR by diffing a fresh build against what's committed.
