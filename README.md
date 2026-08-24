# @ivicos-gmbh/widget-sdk

*[Deutsch](#deutsch) | [English](#english)*

---

## Deutsch

SDK zum Erstellen von Widgets, die sich in [ivCampus](https://ivicos-campus.app) einbetten lassen — innerhalb
eines Raums oder des persönlichen Dashboards. Ein Widget ist eine beliebige Seite, die du unter deiner eigenen
HTTPS-URL hostest; ivCampus bettet sie in ein sandboxed `<iframe>` ein, und dieses SDK übernimmt Handshake,
Kontext, Größenanpassung und den RPC-Transport zwischen deiner Seite und dem Host.

Dieses Dokument ist der vollständige Leitfaden für externe Entwickler:innen: was ein Widget kann und nicht kann,
wie du eines baust und wie du es auf einer echten ivCampus-Organisation live bekommst.

### Status — Zuerst lesen

Dies ist eine frühe Phase des Widget-Systems, mit echten Einschränkungen. Konkret:

- Widgets sind **standardmäßig nur zur Anzeige gedacht**. Sie erhalten immer einen schreibgeschützten
  Anzeigekontext (Theme, Sprache, in welchem Raum/Bereich/Campus sie sich befinden, den Anzeigenamen der
  betrachtenden Person, Avatar und groben Präsenzstatus). Ein Widget, dessen Manifest einen Datenzugriffs-Scope
  deklariert, kann zusätzlich `sdk.data.getRoom()` (allgemeine Rauminformationen) und/oder
  `sdk.data.getPersonalRoom()` (den eigenen persönlichen Raum der betrachtenden Person) aufrufen — jeweils
  erfordert dies, dass dem Widget der entsprechende Scope bei der Prüfung gewährt wurde. Fehlt
  `room:read:basic`, wird der gesamte Aufruf abgelehnt; fehlt `room:read:members` (bei vorhandenem
  `room:read:basic`), gelingt der Aufruf trotzdem, nur ohne `whitelist`/`creatorId` im Ergebnis — siehe
  [Raumdaten](#raumdaten) weiter unten für das genaue Verhalten. Widgets können weiterhin nichts zurück an
  ivCampus schreiben.
- Es gibt **kein Self-Service-Publishing**. Jedes Widget durchläuft eine manuelle Prüfung, bevor es für
  irgendjemanden nutzbar ist (siehe [Dein Widget einreichen](#dein-widget-einreichen) weiter unten).
- Das SDK wird über **GitHub Packages** veröffentlicht, nicht über die öffentliche npm-Registry — siehe
  [Installation](#installation).

Nichts davon ist ein Bug, den man umgehen sollte; entwickle gegen das, was tatsächlich vorhanden ist.

### Installation

Veröffentlicht über [GitHub Packages](https://github.com/features/packages) (npm-kompatibel), nicht über
`registry.npmjs.org`. Das bedeutet, dass jede:r Konsument:in — ob öffentliches Repo oder nicht — ein
persönliches GitHub-Zugriffstoken benötigt, nicht nur einen Paketnamen; es gibt kein anonymes `npm install`
für die npm-Registry von GitHub Packages, selbst bei öffentlichen Paketen.

1. Konfiguriere die Registry für deinen Paketmanager. Erzeuge zuerst ein klassisches GitHub Personal Access
   Token mit dem Scope `read:packages`. Trenne Registry-Mapping (ohne Geheimnisse, darf committed werden)
   und Auth-Token (nie in eine projektbezogene Datei committen — nur `~/.npmrc`/`~/.yarnrc.yml` oder
   Umgebungsvariablen-Ersetzung).

   **npm / pnpm** — Registry-Mapping in die projektbezogene `.npmrc` (sicher zu committen):

   ```
   @ivicos-gmbh:registry=https://npm.pkg.github.com
   ```

   Auth-Token nur in `~/.npmrc` (nicht committen):

   ```
   //npm.pkg.github.com/:_authToken=<dein-token>
   ```

   Für CI darfst du in der projektbezogenen `.npmrc` eine Ersetzung verwenden
   (`//npm.pkg.github.com/:_authToken=${NPM_TOKEN}`) — die Datei darf committed werden, das Token
   selbst muss aus der Umgebung kommen.

   **Yarn Classic (v1)** — gleiches Registry-Mapping in der projektbezogenen `.npmrc`. Auth und
   `always-auth=true` gehören in `~/.npmrc`. Ohne `always-auth` sendet Yarn den Auth-Header beim
   Herunterladen des Tarballs nicht mit, und du bekommst einen kryptischen "invalid tar file"-Fehler
   statt eines klaren Auth-Fehlers:

   ```
   //npm.pkg.github.com/:_authToken=<dein-token>
   always-auth=true
   ```

   **Yarn Berry (v2+)** — `.npmrc` wird komplett ignoriert. Scope/Registry in die projektbezogene
   `.yarnrc.yml` (sicher zu committen); Token in `~/.yarnrc.yml` oder per Env-Ersetzung:

   Projekt-`.yarnrc.yml`:

   ```yaml
   npmScopes:
     ivicos-gmbh:
       npmRegistryServer: 'https://npm.pkg.github.com'
       npmAlwaysAuth: true
   ```

   `~/.yarnrc.yml` (nicht committen):

   ```yaml
   npmScopes:
     ivicos-gmbh:
       npmAuthToken: '<dein-token>'
   ```

   Oder im Projekt mit Env: `npmAuthToken: '${NPM_AUTH_TOKEN}'`.

2. Installiere ganz normal:

   ```json
   "@ivicos-gmbh/widget-sdk": "^0.2.0"
   ```

   Echte Semver-Bereiche funktionieren hier — das ist eine echte Registry, kein reiner Git-SHA-Pin.

**Alternative: gepinnte Git-Abhängigkeit.** Falls du kein GitHub-Packages-Token einrichten willst, kannst du
dieses Repo weiterhin direkt über Git konsumieren, gepinnt auf einen Tag oder Commit-SHA:

```json
"@ivicos-gmbh/widget-sdk": "git+ssh://git@github.com/ivicos-GmbH/widget-sdk.git#<tag-oder-sha>"
```

Der kompilierte `lib/`-Output ist in diesem Repo committet (wird nicht bei der Installation gebaut), gerade
damit das unter npm, yarn und pnpm unabhängig von der Installationsmethode identisch funktioniert — pnpm
blockiert insbesondere Lifecycle-Skripte von Abhängigkeiten (`prepare`/`postinstall`) standardmäßig als Schutz
vor Supply-Chain-Angriffen, was sonst stillschweigend einen Build-bei-Installation-Schritt überspringen und dich
mit einem "module not found"-Fehler zurücklassen würde, der auf den ersten Blick nichts mit pnpm zu tun hat. Hier
gibt es nichts zu bauen; die Dateien sind bereits vorhanden.

### Schnellstart

```ts
import { WidgetSDK } from '@ivicos-gmbh/widget-sdk';

const sdk = new WidgetSDK();

// widgetId MUSS exakt der ID entsprechen, unter der du dieses Widget registrierst (siehe unten) - eine
// Abweichung hier ist der häufigste Grund, warum ein Widget stillschweigend nie gerendert wird.
const context = await sdk.init({ widgetId: 'my-widget' });

document.body.textContent = `Hallo, ${context.displayName}`;

sdk.onContextChange((context) => {
    // Theme, Sprache oder Raum haben sich geändert (z. B. hat die Person den Raum gewechselt)
});

sdk.onVisibilityChange((visible) => {
    if (!visible) {
        // Polling/Animation pausieren - das Widget-Panel ist im Hintergrund, nicht geschlossen
    }
});

// Die Inhaltshöhe wird automatisch über einen ResizeObserver auf document.body gemeldet.
// Rufe dies nur selbst auf, wenn du das überschreiben musst (z. B. eine bewusst fixe Höhe).
sdk.reportResize(320);
```

`sdk.init()` löst sich auf, sobald der Host den Handshake abgeschlossen **und** den ersten Kontext gesendet hat
— du musst nicht separat auf beides warten. Antwortet der Host nie (falsche `widgetId`, Seite nicht tatsächlich
als registriertes Widget eingebettet usw.), lehnt `init()` nach 10 Sekunden mit einer aussagekräftigen
Fehlermeldung ab, statt endlos zu hängen.

### Das `WidgetContext`-Objekt

Alles, was du bekommst, vollständig:

```ts
interface WidgetContext {
    theme: 'light' | 'dark';
    locale: string;        // z. B. "en", "de"
    campusId: string;
    areaId?: string;       // vorhanden, wenn in einem bestimmten Bereich eingebettet
    roomId?: string;       // vorhanden, wenn in einem bestimmten Raum eingebettet (Room-Placement)
    displayName: string;   // Anzeigename der betrachtenden Person
    avatar?: string;       // optionale Avatar-Bild-URL der betrachtenden Person
    status?: string;       // optionaler grober Präsenzstatus der betrachtenden Person (z. B. "online", "away")
}
```

Das ist die gesamte Oberfläche. Keine User-ID, keine E-Mail, kein Auth-Token, kein Bearer-Credential
irgendeiner Art, kein Zugriff auf irgendeine ivCampus-API. Braucht dein Widget ein Backend, ist es **dein
eigenes Backend** — die Widget-Seite spricht mit welchem Server auch immer du kontrollierst, mit welchem
Auth-Modell auch immer du dafür baust; ivCampus ist an dieser Stelle nicht involviert.

`status` (und `avatar`) werden genauso aktualisiert wie der Rest des Kontexts — über `onContextChange`-Pushes
und `getContext()`/den aufgelösten Wert von `init()` — es gibt keine separate Presence-API.

#### Raumdaten

Wenn das Manifest deines Widgets den Scope `room:read:basic` deklariert, kannst du Folgendes abfragen:

```ts
// Allgemeine Rauminformationen
const room = await sdk.data.getRoom();

// Der eigene persönliche Raum der betrachtenden Person
const personalRoom = await sdk.data.getPersonalRoom();
```

`WidgetRoomInfo` sieht so aus:

```ts
interface WidgetRoomInfo {
    id: string;
    name: string;
    iconKey: string;
    isPrivate: boolean;
    isAudioOnly: boolean;
    isOpenForVisitors: boolean;
    whitelist?: string[] | null;  // nur vorhanden mit `room:read:members`
    creatorId?: string;           // nur vorhanden mit `room:read:members`
}
```

**Das Scope-Verhalten ist nicht einheitlich** — lies das genau, bevor du annimmst, dass ein abgelehnter Aufruf
bedeutet, dass dein Widget etwas falsch gemacht hat:

- Fehlt `room:read:basic` (der Basis-Scope, den `getRoom()` überhaupt benötigt): der Aufruf wird
  **abgelehnt**.
- Fehlt `room:read:members`, während `room:read:basic` vorhanden ist: der Aufruf **gelingt**, nur
  `whitelist`/`creatorId` fehlen im Ergebnis, statt dass der Request abgelehnt wird.

Der Zugriff auf den persönlichen Raum (`getPersonalRoom()`) ist überhaupt nicht durch einen Scope-String
geschützt. Es hängt davon ab, ob das Token des Widgets eine auflösbare Referenz auf die betrachtende Person
trägt (vergeben als Teil der Widget-Session durch den Identity-Provider) — es gibt keinen
`personalRoom:read`-Scope, den du in deinem Manifest deklarieren müsstest.

**Hinweis:** Die DTO-Feldnamen spiegeln die aktuelle Implementierung von campus-api wider, können sich aber
noch ändern — betrachte die Form nicht als dauerhaft eingefroren. Es wird erwartet, dass die API-Oberfläche
(die Methoden selbst) stabil bleibt.

### Hosting-Anforderungen

Jede HTTPS-URL, die du kontrollierst, funktioniert, mit zwei harten Anforderungen:

1. **HTTPS, keine Ausnahmen.** Reine `http://`-URLs werden bei der Registrierung abgelehnt.
2. **Deine Seite muss das Einbetten in einen Frame erlauben.** Sendet dein Host eine restriktive
   `Content-Security-Policy: frame-ancestors`- oder `X-Frame-Options`-Header, verweigert der Browser
   stillschweigend das Rendern deines Widgets innerhalb von ivCampus — es wird kein Fehler angezeigt, es
   erscheint einfach nicht. Prüfe vor der Registrierung deine eigenen Response-Header:
   ```bash
   curl -sI https://deine-widget-url.example.com/ | grep -i "x-frame-options\|content-security-policy"
   ```
   Ist eine der beiden vorhanden und restriktiv, musst du sie für das Einbetten lockern. Die meisten
   einfachen statischen Hoster (GitHub Pages, Vercel, Netlify, S3, dein eigenes nginx ohne
   Zusatzkonfiguration) setzen diese standardmäßig nicht und funktionieren out of the box.

Kein bestimmter Hosting-Anbieter ist erforderlich oder bevorzugt — nimm, was du bereits nutzt.

### Das Protokoll, falls du dieses SDK nicht verwendest

Manche Widgets sind einfach genug, dass man keinen Build-Schritt haben möchte. Du kannst dasselbe Protokoll
auch von Hand in reinem `<script>` implementieren — dieses SDK ist ein dünner Komfort-Wrapper, keine Black
Box. Die vollständigen Message-Formen:

**Beim Laden senden:**
```js
window.parent.postMessage(
    { source: 'ivicos-widget-sdk', type: 'ready', widgetId: 'my-widget', sdkVersion: 1 },
    '*' // hier unvermeidbar - du kennst die Origin des Hosts noch nicht, und diese Nachricht enthält keine Geheimnisse
);
```

**Auf die Antwort des Hosts warten und dessen Origin ab der ersten akzeptierten Nachricht fixieren:**
```js
let hostOrigin = null;
window.addEventListener('message', (event) => {
    if (event.source !== window.parent) return;
    const msg = event.data;
    if (!msg || msg.source !== 'ivicos-widget-host') return;

    if (hostOrigin === null) {
        hostOrigin = event.origin; // fixieren
    } else if (event.origin !== hostOrigin) {
        return; // alles von einer anderen Origin danach ablehnen, selbst wenn event.source noch passt
    }

    if (msg.type === 'handshake') {
        window.parent.postMessage({ source: 'ivicos-widget-sdk', type: 'handshake-ack', nonce: msg.nonce }, hostOrigin);
    }
    if (msg.type === 'context') {
        // msg.context ist das oben beschriebene WidgetContext-Objekt
    }
    if (msg.type === 'visibility-change') {
        // msg.visible: boolean
    }
    if (msg.type === 'session-ending') {
        // die Session des Widgets endet; aufräumen und auf die Zerstörung vorbereiten
    }
});
```

**Melde deine Inhaltshöhe, wann immer sie sich ändert** (sonst verwendet der Host eine kleine feste
Standardgröße):
```js
window.parent.postMessage({ source: 'ivicos-widget-sdk', type: 'resize', height: document.body.scrollHeight }, hostOrigin);
```

Das Fixieren der Origin ist nicht optional — wird dieser Schritt übersprungen (z. B. indem jede Nachricht
akzeptiert wird, bei der `event.source === window.parent`), könnte jeder Code, den die Host-Seite später von
einer anderen Origin lädt, sich als der Host ausgeben. Genau das übernimmt das SDK automatisch für dich.

### Dein Widget einreichen

1. Jemand mit der Rolle Manager oder Owner in einer ivCampus-Organisation (die **sponsernde Organisation** —
   die Verantwortlichkeit für dein Widget führt auf sie zurück) öffnet **Org Settings → Integrations → Submit
   a widget** und füllt aus:

   | Feld | Einschränkung |
   |---|---|
   | Widget ID | nur Kleinbuchstaben/Zahlen/Bindestriche, muss über die gesamte Registry eindeutig sein |
   | Name | Freitext, nur zur Anzeige |
   | Version | muss wie `X.Y.Z` aussehen (z. B. `1.0.0`) — wird aktuell gegen nichts geprüft, braucht nur diese Form |
   | Widget URL | deine HTTPS-Iframe-URL |
   | Icon URL | jede erreichbare URL, wird nicht als tatsächliches Bild validiert |
   | Description | Freitext |
   | Placement | Room, Personal Dashboard oder beides |

2. Die Einreichung ist sofort für die sponsernde Organisation sichtbar (als "pending review") und für
   niemanden sonst — es kann von niemandem aktiviert oder genutzt werden, bevor es geprüft wurde.
3. Es gibt aktuell keinen Self-Service- oder automatischen Freigabeschritt. Jemand auf ivCampus-Seite prüft
   und aktiviert das Widget manuell; dafür gibt es noch kein Dashboard oder Benachrichtigung, also frag
   direkt nach, wenn du darauf wartest.
4. Nach der Freigabe kann die sponsernde Organisation es über denselben Integrations-Screen aktivieren, und
   es wird in dem/den Placement(s) nutzbar, für die du es registriert hast.

**Die eine Sache, die exakt stimmen muss: deine registrierte Widget-ID und die `widgetId`, mit der sich deine
Seite selbst ankündigt (in `sdk.init({ widgetId: '...' })`, oder der rohen `ready`-Nachricht, falls du das SDK
nicht verwendest), müssen Zeichen für Zeichen übereinstimmen.** Falls nicht, gibt es bei der Einreichung
keinen Fehler — das Widget bleibt einfach hängen und lädt nicht, mit Timeout nach 10 Sekunden und einer
generischen "this widget did not respond"-Meldung ohne weitere Details, woran es liegt. Das ist die häufigste
Art, wie ein korrekt gebautes Widget kaputt erscheint.

### Lokale Entwicklung

Teste dein Widget gegen einen echten Host, bevor du es einreichst, statt blind zu debuggen:

1. Baue und hoste dein Widget dort, wo es letztendlich deployed werden soll (oder unter jeder beliebigen
   Wegwerf-HTTPS-URL — sie muss noch nicht der finale Ort sein).
2. Registriere es wie oben beschrieben, mit einer Test-/persönlichen ivCampus-Organisation, falls vorhanden.
3. Beobachte die eigene `onContextChange`-/Konsolenausgabe deines Widgets sowie die Network- und
   Console-Tabs der Browser-Devtools auf Handshake- oder Origin-Fehler.

### Sicherheitsmodell

- Läuft innerhalb eines `sandbox="allow-scripts allow-forms allow-same-origin"`-Iframes, den der Host
  kontrolliert. Insbesondere **nicht** gewährt: Popups (`window.open` wird blockiert), Top-Level-Navigation
  der übergeordneten Seite und kein Zugriff auf ivCampus-Cookies/localStorage/DOM außerhalb deines eigenen
  Iframes.
- Erhält niemals die echten ivCampus-Zugangsdaten der Endnutzerin/des Endnutzers, in keiner Form.
- Alle Nachrichten werden gegen `event.source === window.parent` und, nach der ersten akzeptierten
  Nachricht, gegen eine fixierte erwartete Origin validiert — siehe
  [den Protokoll-Abschnitt](#das-protokoll-falls-du-dieses-sdk-nicht-verwendest) oben oder `src/sdk.ts` für
  die genaue Implementierung.

### Build (für Beiträge zum SDK selbst)

```bash
yarn install
yarn build   # tsc -> lib/ (echter ESM-Output - siehe Git-Historie, falls das je auf CJS zurückfällt)
yarn test    # type-checkt + lintet src/ und test/, führt dann die Vitest-Suite aus
```

`lib/` ist committet (siehe [Installation](#installation) für den Grund), was bedeutet, dass es sich **nicht**
automatisch neu erzeugt — änderst du etwas in `src/`, musst du `yarn build` ausführen und die resultierenden
Änderungen in `lib/` im selben Commit committen. Nichts schlägt laut fehl, wenn du es vergisst;
Konsument:innen bekommen einfach stillschweigend weiterhin den alten kompilierten Output. CI erzwingt dies bei
jedem Push/PR, indem ein frischer Build gegen das Committete verglichen wird.

---

## English

SDK for building widgets that embed into [ivCampus](https://ivicos-campus.app) — inside a Room
or the Personal Dashboard. A widget is any page you host at your own HTTPS URL; ivCampus embeds
it in a sandboxed `<iframe>` and this SDK handles the handshake, context, resizing, and RPC
transport between your page and the host.

This document is the complete guide for external developers: what a widget can and can't do,
how to build one, and how to get it live on a real ivCampus org.

### Status — read this first

This is an early phase of the widget system, with real constraints. Concretely:

- Widgets are **display-only by default**. They always receive read-only display context (theme,
  locale, which room/area/campus they're in, the viewer's display name, avatar, and coarse
  presence status). A widget whose manifest declares a data-access scope can additionally call
  `sdk.data.getRoom()` (common room info) and/or `sdk.data.getPersonalRoom()` (the viewer's own
  personal room) — each requires the widget to have been granted the matching scope at review
  time. Missing `room:read:basic` rejects the whole call; missing `room:read:members` (with
  `room:read:basic` granted) still succeeds, just without `whitelist`/`creatorId` in the result —
  see [Room data](#room-data) below for the exact behavior. Widgets still cannot write anything
  back to ivCampus.
- There is **no self-serve publishing**. Every widget goes through manual review before it's
  usable by anyone (see [Submitting your widget](#submitting-your-widget) below).
- The SDK is published to **GitHub Packages**, not the public npm registry — see
  [Install](#install).

None of this is a bug to work around; build against what's actually there.

### Install

Published to [GitHub Packages](https://github.com/features/packages) (npm-compatible), not
`registry.npmjs.org`. This means every consumer — public repo or not — needs a GitHub personal
access token, not just a package name; there's no anonymous `npm install` for GitHub Packages'
npm registry, even for public packages.

1. Configure the registry for your package manager. Generate a classic GitHub personal access
   token with the `read:packages` scope first. Keep the registry mapping (no secrets — safe to
   commit) separate from the auth token (never commit to a project-level file — use `~/.npmrc`/
   `~/.yarnrc.yml`, or an environment variable substitution).

   **npm / pnpm** — registry mapping in the project's `.npmrc` (safe to commit):

   ```
   @ivicos-gmbh:registry=https://npm.pkg.github.com
   ```

   Auth token only in `~/.npmrc` (do not commit):

   ```
   //npm.pkg.github.com/:_authToken=<your-token>
   ```

   For CI you may use a substitution in the project `.npmrc`
   (`//npm.pkg.github.com/:_authToken=${NPM_TOKEN}`) — the file may be committed, but the token
   itself must come from the environment.

   **Yarn Classic (v1)** — same registry mapping in the project `.npmrc`. Put auth and
   `always-auth=true` in `~/.npmrc`. Without `always-auth`, Yarn won't send the auth header when
   downloading the tarball, and you'll get a cryptic "invalid tar file" error instead of a clear
   auth failure:

   ```
   //npm.pkg.github.com/:_authToken=<your-token>
   always-auth=true
   ```

   **Yarn Berry (v2+)** — `.npmrc` is ignored entirely. Put scope/registry in the project's
   `.yarnrc.yml` (safe to commit); put the token in `~/.yarnrc.yml` or via env substitution:

   Project `.yarnrc.yml`:

   ```yaml
   npmScopes:
     ivicos-gmbh:
       npmRegistryServer: 'https://npm.pkg.github.com'
       npmAlwaysAuth: true
   ```

   `~/.yarnrc.yml` (do not commit):

   ```yaml
   npmScopes:
     ivicos-gmbh:
       npmAuthToken: '<your-token>'
   ```

   Or in the project with env: `npmAuthToken: '${NPM_AUTH_TOKEN}'`.

2. Install normally:

   ```json
   "@ivicos-gmbh/widget-sdk": "^0.2.0"
   ```

   Real semver ranges work here — this is a real registry, unlike a raw git-SHA pin.

**Alternative: pinned git dependency.** If you'd rather not set up a GitHub Packages token, you
can still consume this repo directly via git, pinned to a tag or commit SHA:

```json
"@ivicos-gmbh/widget-sdk": "git+ssh://git@github.com/ivicos-GmbH/widget-sdk.git#<tag-or-sha>"
```

The compiled `lib/` output is committed to this repo (not built on install), specifically so
this works identically under npm, yarn, and pnpm regardless of install method — pnpm in
particular blocks dependency lifecycle scripts (`prepare`/`postinstall`) by default as a
supply-chain safeguard, which would otherwise silently skip a build-on-install step and leave
you with a "module not found" error that has nothing obviously to do with pnpm. There's nothing
to build here; the files are already there.

### Quick start

```ts
import { WidgetSDK } from '@ivicos-gmbh/widget-sdk';

const sdk = new WidgetSDK();

// widgetId MUST exactly match the id you register this widget under (see below) - a
// mismatch here is the single most common reason a widget silently never renders.
const context = await sdk.init({ widgetId: 'my-widget' });

document.body.textContent = `Hello, ${context.displayName}`;

sdk.onContextChange((context) => {
    // theme, locale, or room changed under you (e.g. the user switched rooms)
});

sdk.onVisibilityChange((visible) => {
    if (!visible) {
        // pause polling/animation - the widget's panel is backgrounded, not closed
    }
});

// Content height is reported automatically via a ResizeObserver on document.body.
// Only call this yourself if you need to override that (e.g. a deliberately fixed height).
sdk.reportResize(320);
```

`sdk.init()` resolves once the host has completed the handshake **and** pushed the first
context — you don't need to separately wait for both. If the host never responds (wrong
`widgetId`, page not actually embedded as a registered widget, etc.), `init()` rejects after
10 seconds with a descriptive error rather than hanging forever.

### The `WidgetContext` object

Everything you get, in full:

```ts
interface WidgetContext {
    theme: 'light' | 'dark';
    locale: string;        // e.g. "en", "de"
    campusId: string;
    areaId?: string;       // present when embedded inside a specific area
    roomId?: string;       // present when embedded inside a specific room (Room placement)
    displayName: string;   // the viewing user's display name
    avatar?: string;       // optional avatar image URL for the viewing user
    status?: string;       // optional coarse presence status for the viewing user (e.g. "online", "away")
}
```

That's the entire surface. No user ID, no email, no auth token, no bearer credential of any
kind, no access to any ivCampus API. If your widget needs a backend, it's **your own backend** —
the widget page talks to whatever server you control, using whatever auth model you build for
it; ivCampus is not in that loop.

`status` (and `avatar`) update the same way the rest of the context does — via `onContextChange`
pushes and `getContext()`/the resolved value of `init()` — there's no separate presence API.

#### Room data

If your widget's manifest declares the `room:read:basic` scope, you can query:

```ts
// Common room info
const room = await sdk.data.getRoom();

// The viewing user's own personal room
const personalRoom = await sdk.data.getPersonalRoom();
```

`WidgetRoomInfo` looks like:

```ts
interface WidgetRoomInfo {
    id: string;
    name: string;
    iconKey: string;
    isPrivate: boolean;
    isAudioOnly: boolean;
    isOpenForVisitors: boolean;
    whitelist?: string[] | null;  // only present with `room:read:members`
    creatorId?: string;           // only present with `room:read:members`
}
```

**Scope behavior is not uniform** — read this carefully before assuming a rejected call means
your widget did something wrong:

- Missing `room:read:basic` (the baseline scope `getRoom()` needs at all): the call **rejects**.
- Missing `room:read:members` while `room:read:basic` is present: the call **succeeds**, just
  with `whitelist`/`creatorId` omitted from the result rather than the request being rejected.

Personal-room access (`getPersonalRoom()`) isn't gated by a scope string at all. It depends on
whether the widget's token carries a resolvable reference to the viewing user (granted as part
of the widget's session by the identity provider) — there is no `personalRoom:read` scope to
declare in your manifest for it.

**Note:** The DTO field names reflect campus-api's current implementation but may still evolve —
don't treat the shape as permanently frozen. The API surface (the methods themselves) is expected
to remain stable.

### Hosting requirements

Any HTTPS URL you control works, with two hard requirements:

1. **HTTPS, no exceptions.** Plain `http://` URLs are rejected at registration time.
2. **Your page must allow being framed.** If your host sends a restrictive
   `Content-Security-Policy: frame-ancestors` or `X-Frame-Options` header, the browser will
   silently refuse to render your widget inside ivCampus — no error shown to the end user, it
   just won't appear. Before registering, check your own response headers:
   ```bash
   curl -sI https://your-widget-url.example.com/ | grep -i "x-frame-options\|content-security-policy"
   ```
   If either is present and restrictive, you'll need to relax it for embedding to work. Most
   plain static hosts (GitHub Pages, Vercel, Netlify, S3, your own nginx with no extra config)
   don't set these by default and work fine out of the box.

No specific hosting provider is required or preferred — pick whatever you already use.

### The protocol, if you're not using this SDK

Some widgets are simple enough not to want a build step. You can implement the same protocol by
hand in plain `<script>` — this SDK is a thin convenience wrapper, not a black box. The full
message shapes:

**On load, send:**
```js
window.parent.postMessage(
    { source: 'ivicos-widget-sdk', type: 'ready', widgetId: 'my-widget', sdkVersion: 1 },
    '*' // unavoidable here - you don't know the host's origin yet, and this message carries no secrets
);
```

**Listen for the host's reply, and pin its origin from the first accepted message:**
```js
let hostOrigin = null;
window.addEventListener('message', (event) => {
    if (event.source !== window.parent) return;
    const msg = event.data;
    if (!msg || msg.source !== 'ivicos-widget-host') return;

    if (hostOrigin === null) {
        hostOrigin = event.origin; // pin it
    } else if (event.origin !== hostOrigin) {
        return; // reject anything from a different origin after that, even if event.source still matches
    }

    if (msg.type === 'handshake') {
        window.parent.postMessage({ source: 'ivicos-widget-sdk', type: 'handshake-ack', nonce: msg.nonce }, hostOrigin);
    }
    if (msg.type === 'context') {
        // msg.context is the WidgetContext object described above
    }
    if (msg.type === 'visibility-change') {
        // msg.visible: boolean
    }
    if (msg.type === 'session-ending') {
        // the widget's session is ending; clean up and prepare for destruction
    }
});
```

**Report your content height whenever it changes** (or the host defaults to a small fixed size):
```js
window.parent.postMessage({ source: 'ivicos-widget-sdk', type: 'resize', height: document.body.scrollHeight }, hostOrigin);
```

The origin-pinning step is not optional — skipping it (e.g. accepting any message where
`event.source === window.parent`) means any code the host page later loads from a different
origin could impersonate the host. This is exactly what the SDK does for you automatically.

### Submitting your widget

1. Someone with a Manager or Owner role on an ivCampus org (the **sponsoring org** — your
   widget's accountability traces back to them) opens **Org Settings → Integrations → Submit a
   widget** and fills in:

   | Field | Constraint |
   |---|---|
   | Widget ID | lowercase letters/numbers/hyphens only, must be unique across the whole registry |
   | Name | free text, purely for display |
   | Version | must look like `X.Y.Z` (e.g. `1.0.0`) — not currently checked against anything, just needs the shape |
   | Widget URL | your HTTPS iframe URL |
   | Icon URL | any reachable URL, not validated as an actual image |
   | Description | free text |
   | Placement | Room, Personal Dashboard, or both |

2. The submission is immediately visible to the sponsoring org (as "pending review") and to no
   one else — it can't be enabled or used by anyone until it's reviewed.
3. There is currently no self-serve or automatic approval step. Someone on the ivCampus side
   reviews and enables the widget manually; there's no dashboard or notification for this yet,
   so follow up directly if you're waiting on one.
4. Once approved, the sponsoring org can enable it via the same Integrations screen, and it
   becomes usable in the placement(s) you registered it for.

**The one thing to get exactly right: your registered Widget ID and the `widgetId` your page
announces itself as (in `sdk.init({ widgetId: '...' })`, or the raw `ready` message if not using
the SDK) must match, character for character.** If they don't, nothing errors on submission —
the widget will simply sit there failing to load, timing out after 10 seconds with a generic
"this widget did not respond" message and no further detail about why. This is the single most
common way a correctly-built widget appears broken.

### Local development

Test your widget against a real host before submitting, rather than debugging blind:

1. Build and host your widget wherever you'll eventually deploy it (or any throwaway HTTPS URL —
   it doesn't need to be its final location yet).
2. Register it as above, using a test/personal ivCampus org if you have one.
3. Watch your widget's own `onContextChange`/console output, and the browser's devtools Network
   and Console tabs, for handshake or origin errors.

### Security model

- Runs inside a `sandbox="allow-scripts allow-forms allow-same-origin"` iframe the host
  controls. Notably **not** granted: popups (`window.open` is blocked), top-level navigation of
  the parent page, and no access to any ivCampus cookie/localStorage/DOM outside your own iframe.
- Never receives the end user's real ivCampus credentials, in any form.
- All messages are validated against `event.source === window.parent` and, after the first
  accepted message, a pinned expected origin — see [the protocol section](#the-protocol-if-youre-not-using-this-sdk)
  above, or `src/sdk.ts` for the exact implementation.

### Build (for contributing to the SDK itself)

```bash
yarn install
yarn build   # tsc -> lib/ (real ESM output - see git history if this ever regresses to CJS)
yarn test    # type-checks + lints src/ and test/, then runs the Vitest suite
```

`lib/` is committed (see [Install](#install) for why), which means it does **not** regenerate
itself automatically — if you change anything in `src/`, you must run `yarn build` and
commit the resulting changes in `lib/` in the same commit. Nothing will fail loudly if you
forget; consumers will just silently keep getting the old compiled output. CI enforces this on
every push/PR by diffing a fresh build against what's committed.
