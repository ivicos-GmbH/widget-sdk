import { SDK_VERSION } from './types.js';
function randomNonce() {
    if (typeof crypto !== 'undefined' && crypto.randomUUID) {
        return crypto.randomUUID();
    }
    return `${Date.now()}-${Math.random().toString(36).slice(2)}`;
}
const HANDSHAKE_TIMEOUT_MS = 10000;
export class WidgetSDK {
    constructor() {
        this.widgetId = null;
        this.hostOrigin = null;
        this.context = null;
        this.handshakeComplete = false;
        this.handshakeResolve = null;
        this.contextListeners = new Set();
        this.visibilityListeners = new Set();
        this.sessionEndingListeners = new Set();
        this.presence = null;
        this.presenceListeners = new Set();
        this.pendingRpcCalls = new Map();
        this.resizeObserver = null;
        this.lastReportedHeight = null;
        this.onMessage = (event) => {
            if (event.source !== window.parent)
                return;
            const message = event.data;
            if (!message || message.source !== 'ivicos-widget-host')
                return;
            if (this.hostOrigin === null) {
                this.hostOrigin = event.origin;
            }
            else if (event.origin !== this.hostOrigin) {
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
                    if (!pending)
                        return;
                    this.pendingRpcCalls.delete(message.id);
                    if (message.error) {
                        pending.reject(new Error(message.error));
                    }
                    else {
                        pending.resolve(message.result);
                    }
                    break;
                }
            }
        };
    }
    async init(options) {
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
    getContext() {
        return this.context;
    }
    onContextChange(listener) {
        this.contextListeners.add(listener);
        return () => this.contextListeners.delete(listener);
    }
    onVisibilityChange(listener) {
        this.visibilityListeners.add(listener);
        return () => this.visibilityListeners.delete(listener);
    }
    onSessionEnding(listener) {
        this.sessionEndingListeners.add(listener);
        return () => this.sessionEndingListeners.delete(listener);
    }
    getPresence() {
        return this.presence;
    }
    onPresenceChange(listener) {
        this.presenceListeners.add(listener);
        return () => this.presenceListeners.delete(listener);
    }
    reportResize(height) {
        if (height === this.lastReportedHeight)
            return;
        this.lastReportedHeight = height;
        this.send({ source: 'ivicos-widget-sdk', type: 'resize', height });
    }
    call(method, params) {
        const id = randomNonce();
        return new Promise((resolve, reject) => {
            this.pendingRpcCalls.set(id, { resolve: resolve, reject });
            this.send({ source: 'ivicos-widget-sdk', type: 'rpc-request', id, method, params });
        });
    }
    destroy() {
        var _a;
        window.removeEventListener('message', this.onMessage);
        (_a = this.resizeObserver) === null || _a === void 0 ? void 0 : _a.disconnect();
        this.resizeObserver = null;
        this.contextListeners.clear();
        this.visibilityListeners.clear();
        this.sessionEndingListeners.clear();
        this.presenceListeners.clear();
        this.pendingRpcCalls.clear();
    }
    send(message) {
        var _a;
        window.parent.postMessage(message, (_a = this.hostOrigin) !== null && _a !== void 0 ? _a : '*');
    }
    completeHandshake(nonce) {
        var _a;
        if (this.handshakeComplete)
            return;
        this.send({ source: 'ivicos-widget-sdk', type: 'handshake-ack', nonce });
        this.handshakeComplete = true;
        (_a = this.handshakeResolve) === null || _a === void 0 ? void 0 : _a.call(this);
    }
    waitForHandshake() {
        if (this.handshakeComplete)
            return Promise.resolve();
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
    waitForFirstContext() {
        if (this.context)
            return Promise.resolve(this.context);
        return new Promise((resolve) => {
            const unsubscribe = this.onContextChange((context) => {
                unsubscribe();
                resolve(context);
            });
        });
    }
    startAutoResize() {
        if (typeof ResizeObserver === 'undefined')
            return;
        this.resizeObserver = new ResizeObserver((entries) => {
            var _a, _b;
            const height = Math.ceil((_b = (_a = entries[0]) === null || _a === void 0 ? void 0 : _a.contentRect.height) !== null && _b !== void 0 ? _b : document.body.scrollHeight);
            this.reportResize(height);
        });
        this.resizeObserver.observe(document.body);
    }
}
//# sourceMappingURL=sdk.js.map