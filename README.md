# @ivicos/widget-sdk

SDK for building widgets that embed into [ivCampus](https://ivicos-campus.app) — inside a Room
or the Personal Dashboard. A widget is any page you host at your own HTTPS URL; ivCampus embeds
it in a sandboxed `<iframe>` and this SDK handles the handshake, context, resizing, and RPC
transport between your page and the host.

## Status

Phase 1 (internal-only MVP) of the [External Widget Guidelines](../campus-alpha-client/docs/external-widgets-plan.md).
No backend RPC methods are implemented by the host yet — `WidgetSDK.call()` exists as forward
compatible transport for Phase 2, but any call will currently go unanswered.

## Install

Not published to a registry. Consumed as a pinned git dependency, e.g.:

```json
"@ivicos/widget-sdk": "git+ssh://git@github.com/ivicos-GmbH/widget-sdk.git#<commit-sha>"
```

## Usage

```ts
import { WidgetSDK } from '@ivicos/widget-sdk';

const sdk = new WidgetSDK();

const context = await sdk.init({ widgetId: 'my-widget' });
console.log(context.displayName, context.theme, context.locale);

sdk.onContextChange(context => {
    // theme/locale/room changed
});

sdk.onVisibilityChange(visible => {
    if (!visible) {
        // pause polling, etc. - the widget's tab/panel is backgrounded
    }
});

// Content height is reported automatically via ResizeObserver on document.body.
// Call this only if you need to override that (e.g. a fixed-height widget).
sdk.reportResize(320);
```

## Security model

- Runs inside a `sandbox="allow-scripts allow-forms allow-same-origin"` iframe the host
  controls — it cannot assume same-origin access to the host page.
- Never receives the end user's real ivCampus credentials. `WidgetContext` carries only
  non-sensitive display context (theme, locale, campus/area/room id, display name).
- All messages are validated against `event.source === window.parent` and, after the first
  message, a pinned expected origin — see `src/sdk.ts` for the exact protocol.

## Build

```bash
npm install
npm run build   # tsc -> lib/
npm test        # tsc --noEmit + eslint
```
