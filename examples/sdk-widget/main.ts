/**
 * The same widget as `examples/hello-widget`, written against @ivicos-gmbh/widget-sdk.
 *
 * This is a single copy-paste file rather than a runnable project: drop it into whatever
 * build setup you already use (Vite, webpack, esbuild, tsc — the SDK is plain ESM and
 * doesn't care), point an HTML page at the bundle, and host that page over HTTPS.
 *
 * Compared with the hand-rolled version, the SDK gives you: origin pinning, the handshake,
 * the 10-second timeout, and automatic height reporting.
 */
import { WidgetSDK, type WidgetContext } from '@ivicos-gmbh/widget-sdk';

// Must match the Widget ID you register in Campus Settings, character for character.
const WIDGET_ID = 'hello-widget';

const root = document.getElementById('root') as HTMLElement;

function render(context: WidgetContext): void {
    // theme is typed 'light' | 'dark'; ivCampus currently always sends 'light'. Read it
    // anyway so the widget follows along once that changes.
    document.documentElement.dataset.theme = context.theme;

    // No user ID exists. displayName is a label, not an identifier - never key storage on it.
    // It can also be an empty string while the host is still resolving it.
    const name = context.displayName || 'there';

    // Absent when the user has no picture set.
    const avatar = context.avatar ?? '';

    // 'available' | 'away' | 'busy' | 'out-of-office' | 'on-the-phone', or undefined.
    const status = context.status ?? 'status unknown';

    // room is absent only if the host has no room in scope yet. Guard rather than assume.
    if (!context.room) {
        root.textContent = `Hello, ${name} — no room in scope.`;
        return;
    }

    // room.id IS stable, so it's a safe key for your own per-room backend storage.
    // room.type tells you whether you're in the viewer's private room or a shared one.
    const isPrivate = context.room.type === 'personal';

    root.replaceChildren();
    root.append(
        line(`Hello, ${name}`),
        line(status),
        line(`${context.room.name} (${isPrivate ? 'private' : 'shared'})`),
        line(`Room ID: ${context.room.id}`)
    );
}

function line(text: string): HTMLParagraphElement {
    const p = document.createElement('p');
    p.textContent = text;
    return p;
}

async function main(): Promise<void> {
    const sdk = new WidgetSDK();

    let context: WidgetContext;
    try {
        // Resolves once the host has completed the handshake AND pushed the first context.
        context = await sdk.init({ widgetId: WIDGET_ID });
    } catch {
        // Rejects after 10s rather than hanging. Almost always a Widget ID mismatch, or the
        // page was opened directly instead of embedded in ivCampus.
        root.textContent = 'This page runs as an ivCampus widget.';
        return;
    }

    render(context);

    let currentRoomId: string | undefined = context.room?.id;

    // The whole context is re-pushed whenever any part of it changes - most often because the
    // user walked into a different room. There is no call to re-fetch it.
    const unsubscribeContext = sdk.onContextChange((next) => {
        if (next.room?.id !== currentRoomId) {
            currentRoomId = next.room?.id;
            // The user moved rooms: reload anything you keyed on the old room.
        }
        render(next);
    });

    // Backgrounded is NOT closed. Pause polling and animation; don't tear down.
    const unsubscribeVisibility = sdk.onVisibilityChange((visible) => {
        if (visible) startPolling();
        else stopPolling();
    });

    // Fired shortly before teardown - your last chance to flush unsaved state.
    const unsubscribeSessionEnding = sdk.onSessionEnding(() => {
        flushUnsavedState();
    });

    // Only needed if your page removes the widget without a full reload (an SPA route change,
    // for instance). Every on* method above also returns its own unsubscribe function.
    window.addEventListener('pagehide', () => {
        unsubscribeContext();
        unsubscribeVisibility();
        unsubscribeSessionEnding();
        sdk.destroy();
    });

    // Height is reported automatically via a ResizeObserver on document.body, so there is
    // normally no reportResize() call here. Use it only to override that - for a deliberately
    // fixed height, or when your content sits in an element document.body doesn't measure.
}

function startPolling(): void {}
function stopPolling(): void {}
function flushUnsavedState(): void {}

void main();
