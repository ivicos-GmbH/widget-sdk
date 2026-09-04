# Widget examples

*[Deutsch](#deutsch) | [English](#english)*

---

## Deutsch

Zwei vollständige Beispiel-Widgets. Beide zeigen dasselbe: den Namen, das Avatarbild und den
Präsenzstatus der betrachtenden Person sowie Name, ID und Typ des aktuellen Raums — also genau die
Daten, die jedes freigegebene Widget ohne Berechtigung, Token oder Scope erhält.

| Verzeichnis | Was es ist |
|---|---|
| `hello-widget/` | Eine einzelne HTML-Datei. Kein Build-Schritt, keine Abhängigkeiten. Implementiert das `postMessage`-Protokoll von Hand — inklusive Origin-Pinning. Zum sofortigen Hosten und Ausprobieren. |
| `sdk-widget/` | Dieselbe Anzeige über `@ivicos-gmbh/widget-sdk`. Eine einzelne Datei zum Kopieren in dein eigenes Projekt, kein fertiges Setup. |

Nimm `hello-widget`, wenn du die Mechanik sehen oder schnell etwas Lauffähiges registrieren willst.
Nimm `sdk-widget` als Ausgangspunkt für ein echtes Widget: Das SDK übernimmt Origin-Pinning,
Handshake und den 10-Sekunden-Timeout für dich. Um die Größe musst du dich nicht kümmern — die
bestimmt der Host, und deine eigene Seite scrollt in dem Bereich, den sie bekommt.

### `hello-widget` ausprobieren

1. Lade `hello-widget/index.html` auf einen beliebigen statischen HTTPS-Host (GitHub Pages, Vercel,
   Netlify, S3, dein eigenes nginx). **HTTPS ist Pflicht**, und die Seite darf nicht mit
   `X-Frame-Options` oder einer restriktiven `Content-Security-Policy: frame-ancestors` antworten —
   sonst weigert sich der Browser stillschweigend, sie einzubetten:

   ```bash
   curl -sI https://deine-url.example.com/ | grep -i "x-frame-options\|content-security-policy"
   ```

2. Reiche es unter **Campus-Einstellungen → Externe Widgets → Widget einreichen** ein. Trage als
   Widget-ID exakt `hello-widget` ein — oder ändere `WIDGET_ID` in der HTML-Datei auf die ID, die du
   verwendest. **Beide müssen Zeichen für Zeichen übereinstimmen**, sonst antwortet der Host nie und
   das Widget läuft nach 10 Sekunden in einen Timeout.

3. Warte auf die Freigabe, aktiviere das Widget und öffne es in einem Raum oder auf dem
   persönlichen Dashboard.

Öffnest du die Datei direkt im Browser statt eingebettet, sagt sie das ausdrücklich, statt hängen zu
bleiben. Das ist der schnellste Test dafür, dass die Datei überhaupt ausgeliefert wird.

### `sdk-widget` verwenden

`main.ts` ist eine Datei zum Kopieren, kein lauffähiges Projekt — es gibt bewusst keine
`package.json` und keine Build-Konfiguration zu pflegen. Kopiere sie in ein Projekt mit dem
Build-Setup, das du ohnehin nutzt (Vite, webpack, esbuild, tsc), installiere das SDK wie in der
[Installation](../README.md#installation) im Haupt-README beschrieben, und binde das Bundle von einer
HTML-Seite mit einem `<div id="root">` ein.

Die vollständige Feldbeschreibung steht unter [Den Kontext nutzen](../README.md#den-kontext-nutzen),
die Methodenliste unter [API-Referenz](../README.md#api-referenz).

Das Beispiel registriert eine Rückseite: `main.ts` setzt `backFace: true` in `init()`, und
`backside.html` liegt als kopierbare Datei daneben. Sie ist absichtlich reines HTML — kein SDK, kein
Handshake — um zu zeigen, dass die Rückseite das SDK nicht braucht. Beim Hosten musst du sie unter
`<deine-widget-url>/backside` ausliefern (Query-String und Hash bleiben erhalten). Zum Ansehen ohne
Campus: `backside.html` direkt im Browser öffnen oder statisch ausliefern, z. B.
`python3 -m http.server --directory examples/sdk-widget` und dann `http://localhost:8000/backside.html`
aufrufen.

---

## English

Two complete example widgets. Both show the same thing: the viewing user's name, avatar and presence
status, plus the current room's name, ID and type — exactly the data every approved widget receives
with no permission, token or scope.

| Directory | What it is |
|---|---|
| `hello-widget/` | A single HTML file. No build step, no dependencies. Implements the `postMessage` protocol by hand, origin pinning included. Host it and try it immediately. |
| `sdk-widget/` | The same display via `@ivicos-gmbh/widget-sdk`. A single file to copy into your own project, not a ready-made setup. |

Reach for `hello-widget` to see the mechanics, or to get something registered and running quickly.
Start from `sdk-widget` for a real widget: the SDK handles origin pinning, the handshake, the
10-second timeout and automatic height reporting for you.

### Trying `hello-widget`

1. Upload `hello-widget/index.html` to any static HTTPS host (GitHub Pages, Vercel, Netlify, S3,
   your own nginx). **HTTPS is mandatory**, and the page must not answer with `X-Frame-Options` or a
   restrictive `Content-Security-Policy: frame-ancestors` — otherwise the browser silently refuses
   to embed it:

   ```bash
   curl -sI https://your-url.example.com/ | grep -i "x-frame-options\|content-security-policy"
   ```

2. Submit it under **Campus Settings → External widgets → Submit a widget**. Use exactly
   `hello-widget` as the Widget ID — or change `WIDGET_ID` in the HTML file to whichever ID you use.
   **The two must match character for character**, or the host never answers and the widget times
   out after 10 seconds.

3. Wait for approval, enable the widget, and open it in a room or on the Personal Dashboard.

Opened directly in a browser rather than embedded, the file says so explicitly instead of hanging —
the quickest way to confirm it is being served at all.

### Using `sdk-widget`

`main.ts` is a file to copy, not a runnable project — there is deliberately no `package.json` or
build config to keep in sync. Drop it into a project with whatever build setup you already use
(Vite, webpack, esbuild, tsc), install the SDK as described under [Install](../README.md#install) in
the main README, and load the bundle from an HTML page containing a `<div id="root">`.

The full field-by-field description lives under [Using the context](../README.md#using-the-context),
and the method list under [API reference](../README.md#api-reference).

This example opts into a back face: `main.ts` passes `backFace: true` to `init()`, and
`backside.html` sits alongside it as a copyable file. It is deliberately plain HTML — no SDK, no
handshake — to show the back face does not require the SDK. When you host the widget, serve that file
at `<your-widget-url>/backside` (query string and hash preserved). To preview without Campus, open
`backside.html` directly in a browser or serve the folder statically, e.g.
`python3 -m http.server --directory examples/sdk-widget` then visit
`http://localhost:8000/backside.html`.
