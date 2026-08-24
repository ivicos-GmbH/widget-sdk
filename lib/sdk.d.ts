import { type InitOptions, type WidgetContext, type WidgetPersonalRoomInfo, type WidgetRoomInfo } from './types.js';
export declare class WidgetSDK {
    private widgetId;
    private hostOrigin;
    private context;
    private handshakeComplete;
    private handshakeResolve;
    private contextListeners;
    private visibilityListeners;
    private sessionEndingListeners;
    private pendingRpcCalls;
    readonly data: {
        getRoom: () => Promise<WidgetRoomInfo>;
        getPersonalRoom: () => Promise<WidgetPersonalRoomInfo>;
    };
    private resizeObserver;
    private lastReportedHeight;
    private onMessage;
    init(options: InitOptions): Promise<WidgetContext>;
    getContext(): WidgetContext | null;
    onContextChange(listener: (context: WidgetContext) => void): () => void;
    onVisibilityChange(listener: (visible: boolean) => void): () => void;
    onSessionEnding(listener: () => void): () => void;
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