import {
    SDK_VERSION,
    type HostToWidgetMessage,
    type InitOptions,
    type WidgetContext,
    type WidgetPresence,
    type WidgetToHostMessage
} from './types.js';

function randomNonce(): string {
    if (typeof crypto !== 'undefined' && crypto.randomUUID) {
        return crypto.randomUUID();
    }
    // Fallback for older embedding environments without crypto.randomUUID.
    return `${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

const HANDSHAKE_TIMEOUT_MS = 10_000;

type PendingRpcCall = { resolve: (value: unknown) => void; reject: (error: Error) => void };

/**
 * SDK for widgets embedded into ivCampus. One instance per page - construct it once and call
 * `init()` before doing anything else. See https://github.com/ivicos-GmbH/widget-sdk for docs.
 */
export class WidgetSDK {
    private widgetId: string | null = null;

    private hostOrigin: string | null = null;

    private context: WidgetContext | null = null;

    private handshakeComplete = false;

    private handshakeResolve: (() => void) | null = null;

    private contextListeners = new Set<(context: WidgetContext) => void>();

    private visibilityListeners = new Set<(visible: boolean) => void>();

    private sessionEndingListeners = new Set<() => void>();

    private presence: WidgetPresence | null = null;

    private presenceListeners = new Set<(presence: WidgetPresence) => void>();

    private pendingRpcCalls = new Map<string, PendingRpcCall>();

    private resizeObserver: ResizeObserver | null = null;

    private lastReportedHeight: number | null = null;

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
                this.contextListeners.forEach((listener) => listener(message.context));
                break;
            }
            case 'visibility-change': {
                this.visibilityListeners.forEach((listener) => listener(message.visible));
                break;
            }
            case 'session-ending': {
                this.sessionEndingListeners.forEach((listener) => listener());
                break;
            }
            case 'presence': {
                this.presence = message.presence;
                this.presenceListeners.forEach((listener) => listener(message.presence));
                break;
            }
            case 'rpc-response': {
                const pending = this.pendingRpcCalls.get(message.id);
                if (!pending) return;
                this.pendingRpcCalls.delete(message.id);
                if (message.error) {
                    pending.reject(new Error(message.error));
                } else {
                    pending.resolve(message.result);
                }
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

        this.send({ source: 'ivicos-widget-sdk', type: 'ready', widgetId: this.widgetId, sdkVersion: SDK_VERSION });

        await this.waitForHandshake();
        const context = await this.waitForFirstContext();

        this.startAutoResize();

        return context;
    }

    /** The most recently received context. `null` until `init()` resolves. */
    public getContext(): WidgetContext | null {
        return this.context;
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

    /** The most recently received presence. `null` until the host pushes one. */
    public getPresence(): WidgetPresence | null {
        return this.presence;
    }

    public onPresenceChange(listener: (presence: WidgetPresence) => void): () => void {
        this.presenceListeners.add(listener);
        return () => this.presenceListeners.delete(listener);
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

    /** Calls a host-provided RPC method. The set of available methods depends on this widget's granted permissions. */
    public call<TResult = unknown>(method: string, params?: unknown): Promise<TResult> {
        const id = randomNonce();
        return new Promise<TResult>((resolve, reject) => {
            this.pendingRpcCalls.set(id, { resolve: resolve as (value: unknown) => void, reject });
            this.send({ source: 'ivicos-widget-sdk', type: 'rpc-request', id, method, params });
        });
    }

    /** Stops watching for resize/messages. Call this if the widget's own page is being torn down without a full reload. */
    public destroy(): void {
        window.removeEventListener('message', this.onMessage);
        this.resizeObserver?.disconnect();
        this.resizeObserver = null;
        this.contextListeners.clear();
        this.visibilityListeners.clear();
        this.sessionEndingListeners.clear();
        this.presenceListeners.clear();
        this.pendingRpcCalls.clear();
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
        return new Promise((resolve) => {
            const unsubscribe = this.onContextChange((context) => {
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
