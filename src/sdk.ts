import {
    SDK_VERSION,
    type DisplayMode,
    type HostToWidgetMessage,
    type InitOptions,
    type OpenUrlStatus,
    type WidgetContext,
    type WidgetToHostMessage
} from './types.js';

const HANDSHAKE_TIMEOUT_MS = 10_000;
// A host that completes the handshake and then never pushes a context would otherwise leave
// init() pending forever. Each stage gets its own deadline rather than one shared budget.
const CONTEXT_TIMEOUT_MS = 10_000;
/** How long to wait for the host's answer before assuming an older host that ignores the message. */
const OPEN_URL_TIMEOUT_MS = 5_000;

// Mirrors the host's own nonce generator. The SDK ships to browsers we don't choose, so the
// fallback isn't optional - `crypto.randomUUID` needs a secure context and isn't everywhere.
function generateRequestId(): string {
    if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
        return crypto.randomUUID();
    }
    return `${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

/**
 * SDK for widgets embedded into ivCampus. One instance per page - construct it once and call
 * `init()` before doing anything else. See https://github.com/ivicos-GmbH/widget-sdk for docs.
 */
export class WidgetSDK {
    private widgetId: string | null = null;

    private hostOrigin: string | null = null;

    private context: WidgetContext | null = null;

    private displayMode: DisplayMode = 'default';

    private handshakeComplete = false;

    private handshakeResolve: (() => void) | null = null;

    private contextListeners = new Set<(context: WidgetContext) => void>();

    private visibilityListeners = new Set<(visible: boolean) => void>();

    private sessionEndingListeners = new Set<() => void>();

    private resizeObserver: ResizeObserver | null = null;

    private lastReportedHeight: number | null = null;

    private openUrlResolvers = new Map<string, (status: OpenUrlStatus) => void>();

    private displayModeListeners = new Set<(mode: DisplayMode) => void>();

    private onMessage = (event: MessageEvent): void => {
        if (event.source !== window.parent) return;

        const message = event.data as HostToWidgetMessage | undefined;
        if (!message || message.source !== 'ivicos-widget-host') return;

        // The first message we accept from the host tells us its real origin. Every message
        // after that must come from that exact origin - not just `event.source === window.parent`
        // - since `window.parent` identity alone doesn't rule out the host itself having been
        // navigated to a different, untrusted origin after the iframe was created.
        if (this.hostOrigin === null) {
            this.hostOrigin = event.origin;
        } else if (event.origin !== this.hostOrigin) {
            return;
        }

        switch (message.type) {
            case 'handshake': {
                this.completeHandshake(message.nonce);
                break;
            }
            case 'context': {
                this.context = message.context;
                [...this.contextListeners].forEach((listener) => listener(message.context));
                break;
            }
            case 'visibility-change': {
                [...this.visibilityListeners].forEach((listener) => listener(message.visible));
                break;
            }
            case 'session-ending': {
                [...this.sessionEndingListeners].forEach((listener) => listener());
                break;
            }
            case 'open-url-result': {
                // Unknown ids are dropped rather than treated as an error: a late answer for a
                // request abandoned by destroy() is expected, not exceptional.
                const resolve = this.openUrlResolvers.get(message.requestId);
                if (!resolve) break;
                this.openUrlResolvers.delete(message.requestId);
                resolve(message.status);
                break;
            }
            case 'display-mode': {
                // Notified unconditionally, NOT only on a change of value. An answer repeating
                // the current mode is a refusal - the widget asked to expand and did not get
                // it - and a widget that never hears the refusal waits forever for an answer
                // that already came.
                this.displayMode = message.mode;
                [...this.displayModeListeners].forEach((listener) => listener(message.mode));
                break;
            }
        }
    };

    /**
     * Announces this widget to the host and waits for the handshake + first context push to
     * complete. Must be called before any other SDK method. Resolves with the initial context.
     */
    public async init(options: InitOptions): Promise<WidgetContext> {
        if (this.widgetId !== null) {
            throw new Error('WidgetSDK.init() was already called');
        }
        if (window.parent === window) {
            throw new Error('WidgetSDK: this page is not embedded in an iframe - nothing to hand a shake to');
        }

        this.widgetId = options.widgetId;
        window.addEventListener('message', this.onMessage);

        // Spread rather than `hasBackFace: options.backFace`: a widget that never opted in must
        // send a `ready` with the key *absent*, not present-and-undefined, so its message is
        // byte-identical to what every pre-back-face widget already sends.
        this.send({
            source: 'ivicos-widget-sdk',
            type: 'ready',
            widgetId: this.widgetId,
            sdkVersion: SDK_VERSION,
            ...(options.backFace === true ? { hasBackFace: true } : {}),
            ...(options.displayModes ? { displayModes: options.displayModes } : {})
        });

        await this.waitForHandshake();
        const context = await this.waitForFirstContext();

        this.startAutoResize();

        return context;
    }

    /** The most recently received context. `null` until `init()` resolves. */
    public getContext(): WidgetContext | null {
        return this.context;
    }

    /**
     * Whether this placement offers a choice at all. Read from the host's context, never from
     * what the widget announced - the widget knowing how to render 'expanded' says nothing
     * about whether there is room for it here. Show your own UI only when this is true.
     */
    public supportsDisplayModes(): boolean {
        return (this.context?.displayModes?.length ?? 0) > 1;
    }

    /** The mode the host last confirmed. 'default' until it says otherwise. */
    public getDisplayMode(): DisplayMode {
        return this.displayMode;
    }

    public onContextChange(listener: (context: WidgetContext) => void): () => void {
        this.contextListeners.add(listener);
        return () => this.contextListeners.delete(listener);
    }

    public onVisibilityChange(listener: (visible: boolean) => void): () => void {
        this.visibilityListeners.add(listener);
        return () => this.visibilityListeners.delete(listener);
    }

    public onSessionEnding(listener: () => void): () => void {
        this.sessionEndingListeners.add(listener);
        return () => this.sessionEndingListeners.delete(listener);
    }

    /**
     * Manually report this widget's content height, in case the automatic ResizeObserver
     * (which watches `document.body` by default) isn't tracking the right element.
     */
    public reportResize(height: number): void {
        if (height === this.lastReportedHeight) return;
        this.lastReportedHeight = height;
        this.send({ source: 'ivicos-widget-sdk', type: 'resize', height });
    }

    /**
     * Asks the host to open `url` in a new tab. The widget iframe is sandboxed without
     * `allow-popups`, so it cannot open a window itself - the host does it, but only for origins
     * declared in this widget's manifest and only while a user gesture is in effect. Call it from
     * a click handler, never from a timer or a data-load callback.
     *
     * A request is a request: check the status before assuming anything happened.
     */
    public async openUrl(url: string): Promise<OpenUrlStatus> {
        // Guarded on hostOrigin, not widgetId: widgetId is set the moment init() starts, but the
        // host's real origin only arrives with the handshake. Sending before that would post the
        // URL to '*' - readable by whatever else is listening - which is exactly the kind of leak
        // this whole mechanism exists to avoid.
        if (this.hostOrigin === null) {
            throw new Error('WidgetSDK: call init() and wait for the handshake before openUrl()');
        }
        if (typeof url !== 'string' || url.length === 0) {
            throw new Error('WidgetSDK: openUrl() needs a non-empty URL string');
        }

        const requestId = generateRequestId();
        return new Promise<OpenUrlStatus>((resolve) => {
            // A host predating this message type drops it silently (the same way it already
            // ignores 'resize'), so there is no answer coming. Time out into the status that
            // means "it didn't happen" rather than leaving the caller's promise pending.
            const timeout = setTimeout(() => {
                this.openUrlResolvers.delete(requestId);
                resolve('denied');
            }, OPEN_URL_TIMEOUT_MS);

            this.openUrlResolvers.set(requestId, (status) => {
                clearTimeout(timeout);
                resolve(status);
            });

            this.send({ source: 'ivicos-widget-sdk', type: 'open-url', requestId, url });
        });
    }

    /**
     * Asks the host for a display mode. A request is a request: the host decides, and may
     * refuse, or grant it now and take it back a moment later. Nothing changes until
     * `onDisplayModeChange` fires - re-lay out there, never in the click handler.
     *
     * You do not need this to offer enlargement: the host renders the control itself, and
     * you should not render a second one. Use this only to expand in response to something
     * the user did inside your widget.
     */
    public requestDisplayMode(mode: DisplayMode): void {
        // Guarded on hostOrigin, not widgetId - see openUrl() for why. widgetId is set at the
        // top of init(), so a widgetId guard would let a call during the await window post
        // this to '*'.
        if (this.hostOrigin === null) {
            throw new Error('WidgetSDK: call init() and wait for the handshake before requestDisplayMode()');
        }
        this.send({ source: 'ivicos-widget-sdk', type: 'display-mode-request', mode });
    }

    /**
     * Fires on every mode the host confirms, including ones nobody asked for (Escape, a click
     * on the backdrop, the card being turned away) and including refusals, which arrive as the
     * mode you already had. Returns an unsubscribe function.
     */
    public onDisplayModeChange(listener: (mode: DisplayMode) => void): () => void {
        this.displayModeListeners.add(listener);
        return () => this.displayModeListeners.delete(listener);
    }

    /** Stops watching for resize/messages. Call this if the widget's own page is being torn down without a full reload. */
    public destroy(): void {
        window.removeEventListener('message', this.onMessage);
        this.resizeObserver?.disconnect();
        this.resizeObserver = null;
        this.contextListeners.clear();
        this.visibilityListeners.clear();
        this.sessionEndingListeners.clear();
        this.displayModeListeners.clear();
        // An openUrl() promise left pending after teardown surfaces as a widget that silently
        // never responds to a click, so settle them the same way a silent host would.
        [...this.openUrlResolvers.values()].forEach((resolve) => resolve('denied'));
        this.openUrlResolvers.clear();
    }

    private send(message: WidgetToHostMessage): void {
        // Before the handshake tells us the host's real origin, '*' is unavoidable - the
        // message itself carries no secrets (widgetId/sdkVersion, or the handshake echo).
        // Every message after that targets the exact origin we learned, never '*'.
        window.parent.postMessage(message, this.hostOrigin ?? '*');
    }

    private completeHandshake(nonce: string): void {
        if (this.handshakeComplete) return;
        this.send({ source: 'ivicos-widget-sdk', type: 'handshake-ack', nonce });
        this.handshakeComplete = true;
        this.handshakeResolve?.();
    }

    private waitForHandshake(): Promise<void> {
        if (this.handshakeComplete) return Promise.resolve();
        return new Promise((resolve, reject) => {
            const timeout = setTimeout(() => {
                reject(new Error('WidgetSDK: handshake with host timed out - is this page actually loaded as a registered widget?'));
            }, HANDSHAKE_TIMEOUT_MS);

            this.handshakeResolve = () => {
                clearTimeout(timeout);
                resolve();
            };
        });
    }

    private waitForFirstContext(): Promise<WidgetContext> {
        if (this.context) return Promise.resolve(this.context);
        return new Promise((resolve, reject) => {
            const timeout = setTimeout(() => {
                unsubscribe();
                reject(new Error('WidgetSDK: host completed the handshake but never sent a context'));
            }, CONTEXT_TIMEOUT_MS);

            const unsubscribe = this.onContextChange((context) => {
                clearTimeout(timeout);
                unsubscribe();
                resolve(context);
            });
        });
    }

    private startAutoResize(): void {
        if (typeof ResizeObserver === 'undefined') return;
        this.resizeObserver = new ResizeObserver((entries) => {
            const height = Math.ceil(entries[0]?.contentRect.height ?? document.body.scrollHeight);
            this.reportResize(height);
        });
        this.resizeObserver.observe(document.body);
    }
}
