import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { WidgetSDK } from '../src/sdk.js';
import {
    SDK_VERSION,
    type DisplayMode,
    type HostToWidgetMessage,
    type OpenUrlStatus,
    type WidgetContext,
    type WidgetToHostMessage
} from '../src/types.js';

const HOST_ORIGIN = 'https://host.example.com';

function makeFakeParent(): Window {
    return { postMessage: vi.fn() } as unknown as Window;
}

function setWindowParent(parent: Window): void {
    Object.defineProperty(window, 'parent', { value: parent, writable: true, configurable: true });
}

function emitFromHost(source: Window, message: HostToWidgetMessage, origin: string = HOST_ORIGIN): void {
    window.dispatchEvent(new MessageEvent('message', { data: message, origin, source }));
}

async function completeHandshakeAndContext(
    parent: Window,
    context: WidgetContext = {
        theme: 'light',
        locale: 'en',
        campusId: 'campus-1',
        displayName: 'Ada'
    }
): Promise<void> {
    emitFromHost(parent, { source: 'ivicos-widget-host', type: 'handshake', nonce: 'nonce-1' });
    emitFromHost(parent, { source: 'ivicos-widget-host', type: 'context', context });
}

function sentMessages(parent: Window): WidgetToHostMessage[] {
    return (parent.postMessage as ReturnType<typeof vi.fn>).mock.calls.map(([msg]) => msg as WidgetToHostMessage);
}

function openUrlRequests(parent: Window): { requestId: string; url: string }[] {
    return sentMessages(parent).filter((msg): msg is Extract<WidgetToHostMessage, { type: 'open-url' }> => msg.type === 'open-url');
}

describe('WidgetSDK', () => {
    let parent: Window;
    let sdk: WidgetSDK;

    beforeEach(() => {
        parent = makeFakeParent();
        setWindowParent(parent);
        sdk = new WidgetSDK();
    });

    afterEach(() => {
        sdk.destroy();
        setWindowParent(window);
        vi.useRealTimers();
    });

    it('throws if not embedded in an iframe', async () => {
        setWindowParent(window);
        await expect(sdk.init({ widgetId: 'test-widget' })).rejects.toThrow('not embedded in an iframe');
        expect(parent.postMessage).not.toHaveBeenCalled();
    });

    it('throws if init() is called twice', async () => {
        vi.useFakeTimers();
        const firstInit = sdk.init({ widgetId: 'test-widget' }).catch(() => undefined);
        await expect(sdk.init({ widgetId: 'test-widget' })).rejects.toThrow('WidgetSDK.init() was already called');
        await vi.advanceTimersByTimeAsync(10_000);
        await firstInit;
    });

    it('rejects init() if the host never responds within 10s', async () => {
        vi.useFakeTimers();
        const initPromise = sdk.init({ widgetId: 'test-widget' });
        const assertion = expect(initPromise).rejects.toThrow('handshake with host timed out');
        await vi.advanceTimersByTimeAsync(10_000);
        await assertion;
    });

    it('rejects init() if the host handshakes but never sends a context', async () => {
        vi.useFakeTimers();
        const initPromise = sdk.init({ widgetId: 'test-widget' });
        emitFromHost(parent, { source: 'ivicos-widget-host', type: 'handshake', nonce: 'nonce-1' });
        const assertion = expect(initPromise).rejects.toThrow('never sent a context');
        await vi.advanceTimersByTimeAsync(0); // let init() get past the handshake and arm the context deadline
        await vi.advanceTimersByTimeAsync(10_000);
        await assertion;
    });

    it('resolves init() with the first context after a full handshake', async () => {
        const initPromise = sdk.init({ widgetId: 'test-widget' });
        await completeHandshakeAndContext(parent);
        const context = await initPromise;

        expect(context).toEqual({ theme: 'light', locale: 'en', campusId: 'campus-1', displayName: 'Ada' });
        expect(sdk.getContext()).toEqual(context);

        const calls = (parent.postMessage as ReturnType<typeof vi.fn>).mock.calls;
        const readyCall = calls.find(([msg]) => msg.type === 'ready');
        expect(readyCall?.[0]).toEqual({ source: 'ivicos-widget-sdk', type: 'ready', widgetId: 'test-widget', sdkVersion: SDK_VERSION });
        expect(readyCall?.[1]).toBe('*');

        const ackCall = calls.find(([msg]) => msg.type === 'handshake-ack');
        expect(ackCall?.[0]).toEqual({ source: 'ivicos-widget-sdk', type: 'handshake-ack', nonce: 'nonce-1' });
        expect(ackCall?.[1]).toBe(HOST_ORIGIN);
    });

    it('ignores messages from an origin different from the first accepted one', async () => {
        const initPromise = sdk.init({ widgetId: 'test-widget' });
        await completeHandshakeAndContext(parent);
        const context = await initPromise;

        const listener = vi.fn();
        sdk.onContextChange(listener);

        emitFromHost(
            parent,
            {
                source: 'ivicos-widget-host',
                type: 'context',
                context: { theme: 'dark', locale: 'de', campusId: 'campus-2', displayName: 'Eve' }
            },
            'https://attacker.example.com'
        );

        expect(listener).not.toHaveBeenCalled();
        expect(sdk.getContext()).toEqual(context);
    });

    it('ignores messages whose event.source is not window.parent', async () => {
        const initPromise = sdk.init({ widgetId: 'test-widget' });
        await completeHandshakeAndContext(parent);
        await initPromise;

        const listener = vi.fn();
        sdk.onContextChange(listener);

        const otherSource = makeFakeParent();
        emitFromHost(otherSource, {
            source: 'ivicos-widget-host',
            type: 'context',
            context: { theme: 'dark', locale: 'de', campusId: 'campus-2', displayName: 'Eve' }
        });

        expect(listener).not.toHaveBeenCalled();
    });

    it('notifies visibility listeners and supports unsubscribe', async () => {
        const initPromise = sdk.init({ widgetId: 'test-widget' });
        await completeHandshakeAndContext(parent);
        await initPromise;

        const listener = vi.fn();
        const unsubscribe = sdk.onVisibilityChange(listener);

        emitFromHost(parent, { source: 'ivicos-widget-host', type: 'visibility-change', visible: false });
        expect(listener).toHaveBeenCalledWith(false);

        unsubscribe();
        emitFromHost(parent, { source: 'ivicos-widget-host', type: 'visibility-change', visible: true });
        expect(listener).toHaveBeenCalledTimes(1);
    });

    it('reportResize sends only on a changed height', async () => {
        const initPromise = sdk.init({ widgetId: 'test-widget' });
        await completeHandshakeAndContext(parent);
        await initPromise;
        (parent.postMessage as ReturnType<typeof vi.fn>).mockClear();

        sdk.reportResize(200);
        sdk.reportResize(200);
        sdk.reportResize(250);

        const resizeCalls = (parent.postMessage as ReturnType<typeof vi.fn>).mock.calls.filter(([msg]) => msg.type === 'resize');
        expect(resizeCalls).toHaveLength(2);
        expect(resizeCalls[0][0]).toEqual({ source: 'ivicos-widget-sdk', type: 'resize', height: 200 });
        expect(resizeCalls[1][0]).toEqual({ source: 'ivicos-widget-sdk', type: 'resize', height: 250 });
    });

    it('destroy() stops further message handling and clears listeners', async () => {
        const initPromise = sdk.init({ widgetId: 'test-widget' });
        await completeHandshakeAndContext(parent);
        await initPromise;

        const contextListener = vi.fn();
        sdk.onContextChange(contextListener);

        const sessionEndingListener = vi.fn();
        sdk.onSessionEnding(sessionEndingListener);

        sdk.destroy();

        emitFromHost(parent, {
            source: 'ivicos-widget-host',
            type: 'context',
            context: { theme: 'dark', locale: 'de', campusId: 'campus-2', displayName: 'Eve' }
        });
        emitFromHost(parent, { source: 'ivicos-widget-host', type: 'session-ending' });

        expect(contextListener).not.toHaveBeenCalled();
        expect(sessionEndingListener).not.toHaveBeenCalled();
    });

    it('exposes optional avatar and status fields on context', async () => {
        vi.useFakeTimers();
        const initPromise = sdk.init({ widgetId: 'test-widget' });
        await vi.advanceTimersByTimeAsync(0);
        await completeHandshakeAndContext(parent, {
            theme: 'light',
            locale: 'en',
            campusId: 'campus-1',
            displayName: 'Ada',
            avatar: 'https://cdn.example.com/ada.png',
            status: 'online'
        });
        const context = await initPromise;
        expect(context.avatar).toBe('https://cdn.example.com/ada.png');
        expect(context.status).toBe('online');
    });

    it('notifies session-ending listeners and supports unsubscribe', async () => {
        vi.useFakeTimers();
        const initPromise = sdk.init({ widgetId: 'test-widget' });
        await vi.advanceTimersByTimeAsync(0);
        await completeHandshakeAndContext(parent);
        await initPromise;

        const listener = vi.fn();
        const unsubscribe = sdk.onSessionEnding(listener);

        emitFromHost(parent, { source: 'ivicos-widget-host', type: 'session-ending' });
        expect(listener).toHaveBeenCalledTimes(1);

        unsubscribe();
        emitFromHost(parent, { source: 'ivicos-widget-host', type: 'session-ending' });
        expect(listener).toHaveBeenCalledTimes(1);
    });

    // Room data reaches a widget only through the context now - there is no data-fetching RPC and
    // no widget-session token. `type` is what tells a widget whether it is sitting in the viewing
    // user's own personal room or in a shared one.
    it('delivers the room object on the initial context', async () => {
        vi.useFakeTimers();
        const initPromise = sdk.init({ widgetId: 'test-widget' });
        await vi.advanceTimersByTimeAsync(0);
        await completeHandshakeAndContext(parent, {
            theme: 'light',
            locale: 'en',
            campusId: 'campus-1',
            displayName: 'Ada',
            room: { id: 'room-1', name: 'Team Room', type: 'common' }
        });

        const context = await initPromise;
        expect(context.room).toEqual({ id: 'room-1', name: 'Team Room', type: 'common' });
    });

    it('pushes a changed room through onContextChange when the user moves rooms', async () => {
        vi.useFakeTimers();
        const initPromise = sdk.init({ widgetId: 'test-widget' });
        await vi.advanceTimersByTimeAsync(0);
        await completeHandshakeAndContext(parent, {
            theme: 'light',
            locale: 'en',
            campusId: 'campus-1',
            displayName: 'Ada',
            room: { id: 'room-1', name: 'Team Room', type: 'common' }
        });
        await initPromise;

        const listener = vi.fn();
        sdk.onContextChange(listener);

        emitFromHost(parent, {
            source: 'ivicos-widget-host',
            type: 'context',
            context: {
                theme: 'light',
                locale: 'en',
                campusId: 'campus-1',
                displayName: 'Ada',
                room: { id: 'personal-ada', name: "Ada's room", type: 'personal' }
            }
        });

        expect(listener).toHaveBeenCalledTimes(1);
        expect(listener.mock.calls[0][0].room).toEqual({ id: 'personal-ada', name: "Ada's room", type: 'personal' });
        expect(sdk.getContext()?.room?.type).toBe('personal');
    });

    it('does not announce a back face unless the widget opts in', async () => {
        const initPromise = sdk.init({ widgetId: 'test-widget' });
        await completeHandshakeAndContext(parent);
        await initPromise;

        const calls = (parent.postMessage as ReturnType<typeof vi.fn>).mock.calls;
        const readyCall = calls.find(([msg]) => msg.type === 'ready');
        expect(readyCall?.[0]).not.toHaveProperty('hasBackFace');
    });

    it('carries the open-url message types', () => {
        const ask: WidgetToHostMessage = {
            source: 'ivicos-widget-sdk',
            type: 'open-url',
            requestId: 'r1',
            url: 'https://example.com/a'
        };
        const answer: HostToWidgetMessage = {
            source: 'ivicos-widget-host',
            type: 'open-url-result',
            requestId: 'r1',
            status: 'opened' satisfies OpenUrlStatus
        };
        expect(ask.type).toBe('open-url');
        expect(answer.type).toBe('open-url-result');
    });

    it('openUrl() rejects before init()', async () => {
        await expect(sdk.openUrl('https://example.com/a')).rejects.toThrow('wait for the handshake before openUrl()');
        expect(parent.postMessage).not.toHaveBeenCalled();
    });

    // The gap between init() starting and the handshake landing is the one window where the host's
    // real origin isn't known yet, so send() would fall back to '*'. openUrl() must refuse there.
    it('openUrl() rejects while init() is still waiting for the handshake, and sends nothing', async () => {
        vi.useFakeTimers();
        const initPromise = sdk.init({ widgetId: 'test-widget' }).catch(() => undefined);
        (parent.postMessage as ReturnType<typeof vi.fn>).mockClear();

        await expect(sdk.openUrl('https://example.com/a')).rejects.toThrow('wait for the handshake before openUrl()');
        expect(parent.postMessage).not.toHaveBeenCalled();

        await vi.advanceTimersByTimeAsync(10_000);
        await initPromise;
    });

    it('openUrl() rejects a non-string or empty url without sending anything', async () => {
        const initPromise = sdk.init({ widgetId: 'test-widget' });
        await completeHandshakeAndContext(parent);
        await initPromise;
        (parent.postMessage as ReturnType<typeof vi.fn>).mockClear();

        await expect(sdk.openUrl('')).rejects.toThrow('non-empty URL string');
        await expect(sdk.openUrl(undefined as unknown as string)).rejects.toThrow('non-empty URL string');
        expect(openUrlRequests(parent)).toHaveLength(0);
    });

    it('openUrl() sends an origin-pinned open-url with a unique requestId per call', async () => {
        const initPromise = sdk.init({ widgetId: 'test-widget' });
        await completeHandshakeAndContext(parent);
        await initPromise;
        (parent.postMessage as ReturnType<typeof vi.fn>).mockClear();

        void sdk.openUrl('https://example.com/1');
        void sdk.openUrl('https://example.com/2');

        const requests = openUrlRequests(parent);
        expect(requests.map((msg) => msg.url)).toEqual(['https://example.com/1', 'https://example.com/2']);
        expect(requests[0].requestId).toBeTruthy();
        expect(requests[0].requestId).not.toBe(requests[1].requestId);

        const targets = (parent.postMessage as ReturnType<typeof vi.fn>).mock.calls
            .filter(([msg]) => msg.type === 'open-url')
            .map(([, target]) => target);
        expect(targets).toEqual([HOST_ORIGIN, HOST_ORIGIN]);
    });

    it.each(['opened', 'blocked', 'denied'] as const)('openUrl() resolves %s when the host answers it', async (status) => {
        const initPromise = sdk.init({ widgetId: 'test-widget' });
        await completeHandshakeAndContext(parent);
        await initPromise;

        const pending = sdk.openUrl('https://example.com/a');
        const { requestId } = openUrlRequests(parent)[0];
        emitFromHost(parent, { source: 'ivicos-widget-host', type: 'open-url-result', requestId, status });

        await expect(pending).resolves.toBe(status);
    });

    it('openUrl() resolves the matching request and leaves others pending', async () => {
        const initPromise = sdk.init({ widgetId: 'test-widget' });
        await completeHandshakeAndContext(parent);
        await initPromise;

        const first = sdk.openUrl('https://example.com/1');
        const second = sdk.openUrl('https://example.com/2');
        const [idOne, idTwo] = openUrlRequests(parent).map((msg) => msg.requestId);
        expect(idOne).not.toBe(idTwo);

        emitFromHost(parent, { source: 'ivicos-widget-host', type: 'open-url-result', requestId: idTwo, status: 'blocked' });

        await expect(second).resolves.toBe('blocked');
        // `first` must still be pending - an answer is not a broadcast.
        expect(await Promise.race([first, Promise.resolve('pending')])).toBe('pending');

        emitFromHost(parent, { source: 'ivicos-widget-host', type: 'open-url-result', requestId: idOne, status: 'opened' });
        await expect(first).resolves.toBe('opened');
    });

    it('ignores an open-url-result carrying an unknown requestId', async () => {
        const initPromise = sdk.init({ widgetId: 'test-widget' });
        await completeHandshakeAndContext(parent);
        await initPromise;

        const pending = sdk.openUrl('https://example.com/a');
        expect(() =>
            emitFromHost(parent, { source: 'ivicos-widget-host', type: 'open-url-result', requestId: 'not-a-real-id', status: 'opened' })
        ).not.toThrow();
        expect(await Promise.race([pending, Promise.resolve('pending')])).toBe('pending');
    });

    it('openUrl() resolves denied after 5s when the host never answers', async () => {
        const initPromise = sdk.init({ widgetId: 'test-widget' });
        await completeHandshakeAndContext(parent);
        await initPromise;

        vi.useFakeTimers();
        const pending = sdk.openUrl('https://example.com/a');

        await vi.advanceTimersByTimeAsync(4_999);
        expect(await Promise.race([pending, Promise.resolve('pending')])).toBe('pending');

        await vi.advanceTimersByTimeAsync(1);
        await expect(pending).resolves.toBe('denied');
    });

    it('destroy() settles outstanding openUrl() promises instead of leaking them', async () => {
        const initPromise = sdk.init({ widgetId: 'test-widget' });
        await completeHandshakeAndContext(parent);
        await initPromise;

        const pending = sdk.openUrl('https://example.com/a');
        sdk.destroy();

        await expect(pending).resolves.toBe('denied');
    });

    it('announces a back face on ready when backFace is set', async () => {
        const initPromise = sdk.init({ widgetId: 'test-widget', backFace: true });
        await completeHandshakeAndContext(parent);
        await initPromise;

        const calls = (parent.postMessage as ReturnType<typeof vi.fn>).mock.calls;
        const readyCall = calls.find(([msg]) => msg.type === 'ready');
        expect(readyCall?.[0]).toEqual({
            source: 'ivicos-widget-sdk',
            type: 'ready',
            widgetId: 'test-widget',
            sdkVersion: SDK_VERSION,
            hasBackFace: true
        });
    });

    it('carries the display-mode types', () => {
        const request: WidgetToHostMessage = {
            source: 'ivicos-widget-sdk',
            type: 'display-mode-request',
            mode: 'expanded'
        };
        const answer: HostToWidgetMessage = {
            source: 'ivicos-widget-host',
            type: 'display-mode',
            mode: 'default'
        };
        // The open member is the point: a mode nobody has designed yet must still typecheck,
        // so adding a third one later is not a breaking change for widget authors.
        const future: DisplayMode = 'theatre';

        expect(request.mode).toBe('expanded');
        expect(answer.mode).toBe('default');
        expect(future).toBe('theatre');
    });

    it('announces displayModes on the ready message when asked to', async () => {
        const initPromise = sdk.init({ widgetId: 'test-widget', displayModes: ['default', 'expanded'] });
        await completeHandshakeAndContext(parent);
        await initPromise;

        const ready = sentMessages(parent).find((m) => m.type === 'ready');
        expect(ready).toMatchObject({ displayModes: ['default', 'expanded'] });
    });

    it('omits displayModes entirely when the widget does not announce any', async () => {
        const initPromise = sdk.init({ widgetId: 'test-widget' });
        await completeHandshakeAndContext(parent);
        await initPromise;

        const ready = sentMessages(parent).find((m) => m.type === 'ready');
        // Absent, not present-and-undefined: a widget that never opted in must send a message
        // byte-identical to what every pre-display-mode widget already sends.
        expect(ready && 'displayModes' in ready).toBe(false);
    });

    it('reports supportsDisplayModes from the context, not from what the widget announced', async () => {
        const initPromise = sdk.init({ widgetId: 'test-widget', displayModes: ['default', 'expanded'] });
        await completeHandshakeAndContext(parent, {
            theme: 'light',
            locale: 'en',
            campusId: 'campus-1',
            displayName: 'Ada'
        });
        await initPromise;

        // The widget can render two modes, but this placement offered none - so there is nothing
        // to switch between and no control should be shown.
        expect(sdk.supportsDisplayModes()).toBe(false);
        expect(sdk.getDisplayMode()).toBe('default');
    });

    it('reports supportsDisplayModes once a placement offers more than one mode', async () => {
        const initPromise = sdk.init({ widgetId: 'test-widget', displayModes: ['default', 'expanded'] });
        await completeHandshakeAndContext(parent, {
            theme: 'light',
            locale: 'en',
            campusId: 'campus-1',
            displayName: 'Ada',
            displayModes: ['default', 'expanded']
        });
        await initPromise;

        expect(sdk.supportsDisplayModes()).toBe(true);
    });

    it('lets a host withdraw the offer on a later context', async () => {
        const initPromise = sdk.init({ widgetId: 'test-widget', displayModes: ['default', 'expanded'] });
        await completeHandshakeAndContext(parent, {
            theme: 'light',
            locale: 'en',
            campusId: 'campus-1',
            displayName: 'Ada',
            displayModes: ['default', 'expanded']
        });
        await initPromise;

        emitFromHost(parent, {
            source: 'ivicos-widget-host',
            type: 'context',
            context: { theme: 'light', locale: 'en', campusId: 'campus-1', displayName: 'Ada' }
        });

        expect(sdk.supportsDisplayModes()).toBe(false);
    });
});
