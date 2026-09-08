import { type DisplayMode, type InitOptions, type OpenUrlStatus, type WidgetContext } from './types.js';
export declare class WidgetSDK {
    private widgetId;
    private hostOrigin;
    private context;
    private displayMode;
    private handshakeComplete;
    private handshakeResolve;
    private contextListeners;
    private visibilityListeners;
    private sessionEndingListeners;
    private resizeObserver;
    private lastReportedHeight;
    private openUrlResolvers;
    private onMessage;
    init(options: InitOptions): Promise<WidgetContext>;
    getContext(): WidgetContext | null;
    supportsDisplayModes(): boolean;
    getDisplayMode(): DisplayMode;
    onContextChange(listener: (context: WidgetContext) => void): () => void;
    onVisibilityChange(listener: (visible: boolean) => void): () => void;
    onSessionEnding(listener: () => void): () => void;
    reportResize(height: number): void;
    openUrl(url: string): Promise<OpenUrlStatus>;
    destroy(): void;
    private send;
    private completeHandshake;
    private waitForHandshake;
    private waitForFirstContext;
    private startAutoResize;
}
//# sourceMappingURL=sdk.d.ts.map