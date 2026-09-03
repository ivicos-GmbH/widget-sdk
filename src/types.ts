/** SDK major version. Bumped on any breaking change to the postMessage envelope shape. */
export const SDK_VERSION = 2;

/** Read-only context the host pushes down after a successful handshake. Never contains secrets or bearer tokens. */
export interface WidgetContext {
    theme: 'light' | 'dark';
    locale: string;
    campusId: string;
    areaId?: string;
    displayName: string;
    /** Optional avatar image URL for the viewing user. Absent if they have none set. */
    avatar?: string;
    /**
     * Coarse presence status for the viewing user - one of 'available', 'away', 'busy',
     * 'out-of-office' or 'on-the-phone'. Typed as a plain string so the host can add values
     * without a breaking SDK change. Absent if unknown.
     */
    status?: string;
    /**
     * The room this widget is placed in. Absent only if the host has no room in scope yet - every
     * placement is inside a room, either a user's own personal room or a common one.
     */
    room?: {
        id: string;
        name: string;
        type: 'personal' | 'common';
    };
}

export interface InitOptions {
    /** Must match the `id` this widget was registered under in the ivCampus widget registry. */
    widgetId: string;
    /**
     * Set when this widget also serves a back face at `<your iframe URL>/backside`. The host only
     * offers the flip control to widgets that announce one, so leaving this unset means no control
     * ever appears. The back page itself does not need this SDK.
     */
    backFace?: boolean;
}

/** Internal message envelope exchanged over postMessage between host and widget iframe. */
export type HostToWidgetMessage =
    | { source: 'ivicos-widget-host'; type: 'handshake'; nonce: string }
    | { source: 'ivicos-widget-host'; type: 'context'; context: WidgetContext }
    | { source: 'ivicos-widget-host'; type: 'visibility-change'; visible: boolean }
    | { source: 'ivicos-widget-host'; type: 'session-ending' };

export type WidgetToHostMessage =
    | { source: 'ivicos-widget-sdk'; type: 'ready'; widgetId: string; sdkVersion: number; hasBackFace?: boolean }
    | { source: 'ivicos-widget-sdk'; type: 'handshake-ack'; nonce: string }
    | { source: 'ivicos-widget-sdk'; type: 'resize'; height: number };
