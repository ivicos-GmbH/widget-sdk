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
    displayModes?: DisplayMode[];
}
export interface InitOptions {
    widgetId: string;
    backFace?: boolean;
    displayModes?: DisplayMode[];
}
export type OpenUrlStatus = 'opened' | 'blocked' | 'denied';
export type DisplayMode = 'default' | 'expanded' | (string & {});
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
    type: 'open-url-result';
    requestId: string;
    status: OpenUrlStatus;
} | {
    source: 'ivicos-widget-host';
    type: 'display-mode';
    mode: DisplayMode;
};
export type WidgetToHostMessage = {
    source: 'ivicos-widget-sdk';
    type: 'ready';
    widgetId: string;
    sdkVersion: number;
    hasBackFace?: boolean;
    displayModes?: DisplayMode[];
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
    type: 'open-url';
    requestId: string;
    url: string;
} | {
    source: 'ivicos-widget-sdk';
    type: 'display-mode-request';
    mode: DisplayMode;
};
//# sourceMappingURL=types.d.ts.map