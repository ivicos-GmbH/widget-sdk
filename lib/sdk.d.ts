import { type InitOptions, type WidgetContext, type WidgetPresence, type WidgetRoomInfo } from './types.js';
export declare class WidgetSDK {
    private widgetId;
    private hostOrigin;
    private context;
    private handshakeComplete;
    private handshakeResolve;
    private contextListeners;
    private visibilityListeners;
    private sessionEndingListeners;
    private presence;
    private presenceListeners;
    private pendingRpcCalls;
    readonly data: {
        getRoom: () => Promise<WidgetRoomInfo>;
    };
    private resizeObserver;
    private lastReportedHeight;
    private onMessage;
    init(options: InitOptions): Promise<WidgetContext>;
    getContext(): WidgetContext | null;
    onContextChange(listener: (context: WidgetContext) => void): () => void;
    onVisibilityChange(listener: (visible: boolean) => void): () => void;
    onSessionEnding(listener: () => void): () => void;
    getPresence(): WidgetPresence | null;
    onPresenceChange(listener: (presence: WidgetPresence) => void): () => void;
    reportResize(height: number): void;
    call<TResult = unknown>(method: string, params?: unknown): Promise<TResult>;
    destroy(): void;
    private send;
    private completeHandshake;
    private waitForHandshake;
    private waitForFirstContext;
    private startAutoResize;
}
//# sourceMappingURL=sdk.d.ts.map