/** SDK major version. Bumped on any breaking change to the postMessage envelope shape. */
export const SDK_VERSION = 1;

/** Read-only context the host pushes down after a successful handshake. Never contains secrets or bearer tokens. */
export interface WidgetContext {
    theme: 'light' | 'dark';
    locale: string;
    campusId: string;
    areaId?: string;
    roomId?: string;
    displayName: string;
}

export interface InitOptions {
    /** Must match the `id` this widget was registered under in the ivCampus widget registry. */
    widgetId: string;
}

/** Internal message envelope exchanged over postMessage between host and widget iframe. */
export type HostToWidgetMessage =
    | { source: 'ivicos-widget-host'; type: 'handshake'; nonce: string }
    | { source: 'ivicos-widget-host'; type: 'context'; context: WidgetContext }
    | { source: 'ivicos-widget-host'; type: 'visibility-change'; visible: boolean }
    | { source: 'ivicos-widget-host'; type: 'rpc-response'; id: string; result?: unknown; error?: string };

export type WidgetToHostMessage =
    | { source: 'ivicos-widget-sdk'; type: 'ready'; widgetId: string; sdkVersion: number }
    | { source: 'ivicos-widget-sdk'; type: 'handshake-ack'; nonce: string }
    | { source: 'ivicos-widget-sdk'; type: 'resize'; height: number }
    | { source: 'ivicos-widget-sdk'; type: 'rpc-request'; id: string; method: string; params?: unknown };
