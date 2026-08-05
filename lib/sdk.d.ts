import { type InitOptions, type WidgetContext } from './types.js';
export declare class WidgetSDK {
    private widgetId;
    private hostOrigin;
    private context;
    private handshakeComplete;
    private contextListeners;
    private visibilityListeners;
    private pendingRpcCalls;
    private resizeObserver;
    private lastReportedHeight;
    private onMessage;
    init(options: InitOptions): Promise<WidgetContext>;
    getContext(): WidgetContext | null;
    onContextChange(listener: (context: WidgetContext) => void): () => void;
    onVisibilityChange(listener: (visible: boolean) => void): () => void;
    reportResize(height: number): void;
    call<TResult = unknown>(method: string, params?: unknown): Promise<TResult>;
    destroy(): void;
    private send;
    private completeHandshake;
    private waitForHandshake;
    private waitForFirstContext;
    private startAutoResize;
}
