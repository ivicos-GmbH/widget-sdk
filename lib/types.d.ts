export declare const SDK_VERSION = 2;
export interface WidgetContext {
    theme: 'light' | 'dark';
    locale: string;
    campusId: string;
    areaId?: string;
    displayName: string;
    avatar?: string;
    status?: string;
    room?: {
        id: string;
        name: string;
        type: 'personal' | 'common';
    };
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
};
//# sourceMappingURL=types.d.ts.map