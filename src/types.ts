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
    /**
     * Modes THIS placement offers, which is not the same question as which modes the widget
     * can render. Absent, or holding fewer than two entries, means there is nothing to
     * switch between here. Every context message is authoritative: a host may withdraw the
     * offer, for instance when the widget moves to a placement with no room to grow.
     */
    displayModes?: DisplayMode[];
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
    /**
     * Modes this widget can actually render. Announce nothing and the host offers no
     * control - the same rule `backFace` follows. Announcing 'expanded' is a claim that
     * your layout uses the extra room; a widget that looks identical at both sizes should
     * not announce it.
     */
    displayModes?: DisplayMode[];
}

/**
 * Outcome of an `openUrl` request.
 *
 * - 'opened'  - the host opened the window.
 * - 'denied'  - host policy refused: origin not declared in the widget's manifest, not https, or
 *               no user gesture was in effect. A developer error - log it, don't show the user an
 *               error they didn't cause.
 * - 'blocked' - policy allowed it, the browser's popup blocker didn't. Offer the user a link they
 *               can click themselves.
 */
export type OpenUrlStatus = 'opened' | 'blocked' | 'denied';

/**
 * How much room the host is giving this widget. 'default' is the placement's normal size;
 * 'expanded' is deliberately not given a pixel meaning here - the host decides, and it
 * differs by placement.
 *
 * The open member is not an accident. A closed union would make a third mode a breaking
 * type change for every widget already compiled against this package. `WidgetContext.status`
 * is a plain string for exactly the same reason.
 */
// `string & {}` is the only way to keep the two literals autocompleting while leaving the union
// open; plain `string` would swallow them.
// eslint-disable-next-line @typescript-eslint/ban-types
export type DisplayMode = 'default' | 'expanded' | (string & {});

/** Internal message envelope exchanged over postMessage between host and widget iframe. */
export type HostToWidgetMessage =
    | { source: 'ivicos-widget-host'; type: 'handshake'; nonce: string }
    | { source: 'ivicos-widget-host'; type: 'context'; context: WidgetContext }
    | { source: 'ivicos-widget-host'; type: 'visibility-change'; visible: boolean }
    | { source: 'ivicos-widget-host'; type: 'session-ending' }
    | { source: 'ivicos-widget-host'; type: 'open-url-result'; requestId: string; status: OpenUrlStatus }
    | { source: 'ivicos-widget-host'; type: 'display-mode'; mode: DisplayMode };

export type WidgetToHostMessage =
    | {
          source: 'ivicos-widget-sdk';
          type: 'ready';
          widgetId: string;
          sdkVersion: number;
          hasBackFace?: boolean;
          displayModes?: DisplayMode[];
      }
    | { source: 'ivicos-widget-sdk'; type: 'handshake-ack'; nonce: string }
    | { source: 'ivicos-widget-sdk'; type: 'resize'; height: number }
    | { source: 'ivicos-widget-sdk'; type: 'open-url'; requestId: string; url: string }
    // A request, not an instruction. The host answers every one of these, refusals included -
    // a widget that heard nothing back could not tell "refused" from "this host is too old to
    // understand the message".
    | { source: 'ivicos-widget-sdk'; type: 'display-mode-request'; mode: DisplayMode };
