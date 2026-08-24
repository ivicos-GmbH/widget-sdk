export declare const SDK_VERSION = 1;
export interface WidgetContext {
    theme: 'light' | 'dark';
    locale: string;
    campusId: string;
    areaId?: string;
    roomId?: string;
    displayName: string;
    avatar?: string;
}
export interface WidgetPresence {
    status: string;
}
export interface InitOptions {
    widgetId: string;
}
export type HostToWidgetMessage = {
    source: 'ivicos-widget-host';
    type: 'handshake';
    nonce: string;
} | {
    source: 'ivicos-widget-host';
    type: 'context';
    context: WidgetContext;
} | {
    source: 'ivicos-widget-host';
    type: 'visibility-change';
    visible: boolean;
} | {
    source: 'ivicos-widget-host';
    type: 'session-ending';
} | {
    source: 'ivicos-widget-host';
    type: 'presence';
    presence: WidgetPresence;
} | {
    source: 'ivicos-widget-host';
    type: 'rpc-response';
    id: string;
    result?: unknown;
    error?: string;
};
export type WidgetToHostMessage = {
    source: 'ivicos-widget-sdk';
    type: 'ready';
    widgetId: string;
    sdkVersion: number;
} | {
    source: 'ivicos-widget-sdk';
    type: 'handshake-ack';
    nonce: string;
} | {
    source: 'ivicos-widget-sdk';
    type: 'resize';
    height: number;
} | {
    source: 'ivicos-widget-sdk';
    type: 'rpc-request';
    id: string;
    method: string;
    params?: unknown;
};
//# sourceMappingURL=types.d.ts.map