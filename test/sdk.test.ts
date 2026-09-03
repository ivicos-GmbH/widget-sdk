import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { WidgetSDK } from '../src/sdk.js';
import { SDK_VERSION, type HostToWidgetMessage, type WidgetContext } from '../src/types.js';

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
});
