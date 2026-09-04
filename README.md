# @ivicos-gmbh/widget-sdk

*[Deutsch](#deutsch) | [English](#english)*

---

## Deutsche Anleitung

**Warum ein Widget für den ivCAMPUS bereitstellen?**
Der ivCAMPUS ist der Ort an dem Menschen sinnvollerweise zusammenarbeiten. Manche vergleichen den ivCAMPUS mit MS Teams andere sprechen vom logischen Evolutionären nächsten Schritt nach Slack. Wie auch immer man ihn einordnet. Für Verwaltungen ist er der souveräne Arbeitsplatz der Zukunft mit Blick auf alles was Wichtig ist: Die Kollegen, was im Büro los ist und den Status wichtiger Werkzeuge, angefangen bei Email, Kalender und Aufgaben bis hin zu den wichtigsten Informationen deiner Anwendung, die den Nutzer entweder bereits in einem 350x350px-Widget wichtig Information zu liefern oder aufgrund der dort angezeigten Inhalte veranlasst, in deine Applikation zu wechseln, um seine Arbeit zu erledigen. Gemeinsam helfen wir Nutzern gemeinsam einen produktiven Arbeitstag miteinander zu gestalten. 

**Was ist ein Widget?**
SDK zum Erstellen von Widgets, die sich in [ivCampus](https://ivicos-campus.app) einbetten lassen — innerhalb
eines Raums oder des persönlichen Dashboards. Ein Widget ist eine beliebige Seite, die du unter deiner eigenen
HTTPS-URL hostest; ivCampus bettet sie in ein sandboxed `<iframe>` ein, und dieses SDK übernimmt Handshake,
Kontext und den Nachrichtentransport zwischen deiner Seite und dem Host. Die Größe bestimmt der Host.

Dieses Dokument ist der Leitfaden für externe Entwickler:innen: Was ein Widget kann und nicht kann,
wie du eines baust und wie du es auf einer echten ivCampus-Organisation live bekommst.

### Status — Bitte dies zuerst lesen

Dies ist eine frühe Phase des Widget-Systems, mit echten Einschränkungen. Konkret:

- Widgets sind **nur zur Anzeige gedacht**. Sie erhalten einen schreibgeschützten Anzeigekontext (Theme,
  Sprache, Campus/Bereich, den Raum inklusive Name und Typ, den Anzeigenamen der betrachtenden Person, Avatar
  und groben Präsenzstatus) — und sonst nichts. Es gibt keine Daten-API, kein Token und keine Scopes: Alles,
  was ein Widget über ivCampus weiß, steht im Kontext. Widgets können auch nichts zurück an ivCampus schreiben.
  Nichts davon erfordert eine Berechtigung, einen Scope oder eine Zustimmungsabfrage: Jedes
  freigegebene Widget erhält exakt dieselben Felder. Wie du sie ausliest, zeigt
  [Den Kontext nutzen](#den-kontext-nutzen).
- Es gibt **kein Self-Service-Publishing**. Jedes Widget durchläuft eine manuelle Prüfung, bevor es für
  irgendjemanden nutzbar ist (siehe [Dein Widget einreichen](#dein-widget-einreichen) weiter unten).
- **Eine Freigabe ist nicht endgültig.** Ein freigegebenes Widget kann nachträglich gesperrt werden;
  es wird dann überall dort nicht mehr gerendert, wo es aktiviert war. Behandle das Verschwinden als
  normalen Zustand, nicht als Absturz. Auf diese Weise können wir dem Nutzer ein störungsfreies Erlebnis bieten, auch, wenn mal an einer Stelle etwas nicht funktioniert.
- Das SDK wird über **GitHub Packages** veröffentlicht, nicht über die öffentliche npm-Registry — siehe
  [Installation](#installation).

Nichts davon ist ein Bug, den man umgehen sollte; entwickle bitte einfach gegen das, was tatsächlich vorhanden ist. Du wirst sehen, dass das sinnvoll ist und für die Nutzer passend.

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

Lauffähige Beispiele liegen in [`examples/`](examples) — darunter ein komplettes Widget in einer
einzigen HTML-Datei ohne Build-Schritt.

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

// Die Größe bestimmt der Host: Dein Widget bekommt einen Bereich fester Größe, in dem deine
// eigene Seite ganz normal scrollt. Dafür musst du nichts aufrufen - siehe "Zur Größe deines
// Widgets" weiter unten.
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
    displayName: string;   // Anzeigename der betrachtenden Person
    avatar?: string;       // optionale Avatar-Bild-URL der betrachtenden Person
    status?: string;       // Präsenz: 'available' | 'away' | 'busy' | 'out-of-office' | 'on-the-phone'
    room?: {               // der Raum, in dem das Widget platziert ist
        id: string;
        name: string;
        type: 'personal' | 'common';  // eigener persönlicher Raum oder gemeinsamer Raum
    };
}
```

Das ist die gesamte Oberfläche. Keine User-ID, keine E-Mail, kein Auth-Token, kein Bearer-Credential
irgendeiner Art, kein Zugriff auf irgendeine ivCampus-API. Braucht dein Widget ein Backend, ist es **dein
eigenes Backend** — die Widget-Seite spricht mit welchem Server auch immer du kontrollierst, mit welchem
Auth-Modell auch immer du dafür baust; ivCampus ist an dieser Stelle nicht involviert.

`status` (und `avatar`) werden genauso aktualisiert wie der Rest des Kontexts — über `onContextChange`-Pushes
und `getContext()`/den aufgelösten Wert von `init()` — es gibt keine separate Presence-API.

`room` ist genau dann abwesend, wenn der Host noch keinen Raum kennt. Jede Platzierung liegt in einem Raum —
entweder im eigenen persönlichen Raum der betrachtenden Person (`type: 'personal'`) oder in einem gemeinsamen
Raum (`type: 'common'`). Wechselt die Person den Raum, kommt der neue `room`-Wert über `onContextChange`; ein
gesonderter Abruf ist nicht nötig und auch nicht möglich.

### Den Kontext nutzen

Alles Folgende erfordert **keine Berechtigung, keine Zustimmungsabfrage und keinen Scope**. Es gibt
nichts zu beantragen und keine API aufzurufen: Der Host pusht diese Felder an jedes freigegebene
Widget, für alle identisch, und `init()` reicht sie dir durch. Was nicht am `WidgetContext` steht,
kann kein Widget bekommen.

**Die betrachtende Person.**

```ts
const context = await sdk.init({ widgetId: 'my-widget' });

context.displayName;  // "Jane Doe" - kann leer sein, solange der Host ihn noch auflöst
context.avatar;       // "https://.../avatar.png", oder undefined, wenn kein Bild gesetzt ist
context.status;       // 'available' | 'away' | 'busy' | 'out-of-office' | 'on-the-phone', oder undefined
```

**Es gibt keine User-ID.** `displayName` ist eine Beschriftung, kein Identifier: nicht eindeutig,
nicht stabil, und zwei Personen im selben Raum können denselben tragen. Nutze ihn niemals als
Schlüssel für Speicherung, Analytics oder irgendetwas, das eine Person über Sessions hinweg
wiedererkennen muss. Braucht dein Widget eine belastbare Identität, muss es diese selbst gegenüber
deinem eigenen Backend herstellen — ivCampus liefert keine.

**Der Raum.**

```ts
if (!context.room) {
    // Der Host hat noch keinen Raum im Zugriff. Selten - zeige einen neutralen Zustand statt abzustürzen.
    return;
}

context.room.id;    // stabiler Identifier dieses Raums - als Storage-Key geeignet
context.room.name;  // Anzeigename, z. B. "Team Standup". Fällt vor dem Laden auf die id zurück.
context.room.type;  // 'personal' | 'common'
```

`room.id` *ist* stabil — ein raumbezogenes Widget (Notizzettel, Umfrage, Warteschlange) kann seine
eigene Backend-Speicherung darauf schlüsseln. `room.type` sagt dir, in welcher Art von Raum du bist:
`'personal'` ist der eigene private Raum der betrachtenden Person — ein Widget auf dem persönlichen
Dashboard sieht immer diesen Wert — und `'common'` ein gemeinsamer Raum, den andere betreten können.
Entscheide damit, ob das Anzeigen persönlicher Inhalte angemessen ist:

```ts
if (context.room) {
    const isPrivate = context.room.type === 'personal';
    render(isPrivate ? myPrivateNotes() : sharedAgenda(context.room.id));
}
```

**Auf Änderungen reagieren.** Der gesamte Kontext wird erneut gepusht, sobald sich irgendein Teil
davon ändert — am häufigsten, weil die Person in einen anderen Raum gewechselt ist. Es gibt keinen
Aufruf zum Neuladen; abonniere stattdessen und behandle den Callback als einzige Quelle der Wahrheit:

```ts
let currentRoomId: string | undefined = context.room?.id;

const unsubscribe = sdk.onContextChange((next) => {
    if (next.room?.id !== currentRoomId) {
        currentRoomId = next.room?.id;
        loadDataFor(currentRoomId);   // Raumwechsel - neu laden
    }
});
```

Jede `on*`-Methode gibt eine Unsubscribe-Funktion zurück; rufe sie auf, wenn deine View verschwindet.

**Zwei Einschränkungen, die du kennen solltest, bevor du darauf aufbaust:**

- `theme` ist als `'light' | 'dark'` typisiert, der Host sendet aktuell aber immer `'light'` —
  ivCampus hat noch keinen Dark Mode. Lies das Feld trotzdem aus, statt hart zu kodieren, damit dein
  Widget mitzieht, sobald sich das ändert; der Dark-Pfad lässt sich heute allerdings nicht testen.
- `campusId` und `areaId` identifizieren die Organisation und den Bereich, in dem das Widget
  eingebettet ist. Es sind opake Strings, brauchbar als Scoping-Schlüssel für deine eigene
  Speicherung — mehr nicht; es gibt keine ivCampus-API, an die du sie übergeben könntest.

### API-Referenz

`new WidgetSDK()` — einmal pro Seite konstruieren. Alles Folgende ist eine Methode auf dieser Instanz.

| Methode | Rückgabe | Hinweise |
|---|---|---|
| `init(options)` | `Promise<WidgetContext>` | Meldet das Widget an und löst mit dem ersten Kontext auf. Muss vor allem anderen aufgerufen werden. Lehnt ab, wenn der Host den Handshake nicht innerhalb von 10 s abschließt oder danach nicht innerhalb von weiteren 10 s den ersten Kontext sendet. Ein zweiter Aufruf wirft. |
| `init({ backFace: true })` | | Teilt dem Host mit, dass dieses Widget zusätzlich eine Rückseite unter `<deine iframe-URL>/backside` bereitstellt, damit er die Umdrehen-Schaltfläche anbietet. |
| `getContext()` | `WidgetContext \| null` | Der zuletzt empfangene Kontext. `null`, bis `init()` sich auflöst — nimm bevorzugt den Wert aus `init()`. |
| `onContextChange(fn)` | `() => void` | Ruft `fn(context)` bei jedem Kontext-Push. Gibt eine Unsubscribe-Funktion zurück. |
| `onVisibilityChange(fn)` | `() => void` | Ruft `fn(visible)`, wenn das Widget-Panel in den Hintergrund gerät oder wieder erscheint. Hintergrund heißt **nicht** geschlossen — Polling und Animation pausieren, nicht abbauen. Gibt eine Unsubscribe-Funktion zurück. |
| `onSessionEnding(fn)` | `() => void` | Ruft `fn()` kurz bevor das Widget abgebaut wird. Die letzte Gelegenheit, ungesicherten Zustand zu schreiben. Gibt eine Unsubscribe-Funktion zurück. |
| `reportResize(height)` | `void` | Ohne Wirkung auf das Layout: Der Host bestimmt die Größe selbst — siehe unten. Die Nachricht bleibt Teil des Protokolls und wird weiterhin gesendet, vom Host aber ignoriert. Nur noch aus Kompatibilitätsgründen vorhanden. |
| `destroy()` | `void` | Entfernt den Message-Listener, trennt den ResizeObserver und verwirft alle Listener. Aufrufen, wenn deine Seite das Widget ohne vollen Reload abbaut (etwa bei einem SPA-Routenwechsel). |

Ebenfalls aus dem Paket exportiert: `SDK_VERSION` (die Protokollversion dieses Builds) sowie die
Typen `WidgetContext` und `InitOptions`.

**Zur Größe deines Widgets.** Die bestimmt der Host, nicht du. Dein Widget wird in einen Bereich
fester Größe eingebettet, und ist dein Inhalt höher, scrollt deine eigene Seite darin — genau wie in
jedem anderen eingebetteten iframe. Du musst dafür nichts tun und nichts melden.

Wie groß dieser Bereich ist, hängt vom Platz ab, an dem dein Widget läuft: auf dem Dashboard
aktuell rund 350×294 CSS-Pixel, im Raum die Größe des Anhang-Bereichs, die mit dem Fenster
variiert. Daraus folgen drei Dinge:

- **Gestalte responsiv.** Nimm die genannten Zahlen als heutigen Stand, nicht als Zusage.
- **Schalte dein eigenes Scrollen nicht ab.** `body { overflow: hidden }` ohne eigenen scrollbaren
  Bereich macht Inhalt unerreichbar, der sonst einfach scrollen würde.
- **`height: 100%` und `100vh` funktionieren** wie erwartet — dein Widget hat einen echten Viewport.

`init()` startet weiterhin einen `ResizeObserver` auf `document.body` und meldet die Höhe; der Host
verwendet sie nur nicht mehr fürs Layout. Frühere SDK-Versionen wurden gegen einen Host geschrieben,
der den iframe auf die gemeldete Höhe wachsen ließ — das ist nicht mehr der Fall.

**Ein fehlgeschlagenes `init()` behandeln.** `init()` lehnt ab, statt endlos zu hängen — fange das ab:

```ts
try {
    const context = await sdk.init({ widgetId: 'my-widget' });
    render(context);
} catch (err) {
    // Fast immer eine abweichende widgetId, oder die Seite wurde direkt statt eingebettet geöffnet.
    document.body.textContent = 'Diese Seite läuft als ivCampus-Widget.';
}
```

### Die Rückseite

Eine Widget-Karte im Dashboard lässt sich umdrehen. Vorne steht dein Widget. Hinten erklärst du es
— was es tut, wie man es benutzt, was deine Filter bedeuten, Links zu deiner eigenen
Dokumentation.

Liefere sie unter `/backside` aus, relativ zu der URL, die du registriert hast:

```
registrierte iframe-URL   https://example.com/my-widget
deine Rückseite           https://example.com/my-widget/backside
```

Und teile dem Host von der **Vorderseite** aus mit, dass es sie gibt:

```ts
const sdk = new WidgetSDK();
const context = await sdk.init({ widgetId: 'my-widget', backFace: true });
```

Ohne `backFace: true` erscheint nie eine Umdrehen-Schaltfläche — ein bestehendes Widget bleibt
also unberührt, bis es sich aktiv dafür entscheidet. Setzt du die Option, lieferst aber kein
`/backside` aus, sehen deine Nutzer auf der Rückseite deine 404-Seite; der Host kann das nicht
erkennen.

**Die Rückseite braucht dieses SDK nicht.** Eine statische HTML-Datei genügt. Willst du dort
ebenfalls Theme, Sprache oder den Namen der betrachtenden Person, rufe auch dort `init()` auf —
sie erhält denselben Kontext wie die Vorderseite.

**Die Anmeldung gehört nicht auf die Rückseite.** Lässt sich dein Widget ohne Konto nicht nutzen,
zeige deine Anmeldung auf der **Vorderseite** — das ist das Erste, was man sieht, und nach der
Anmeldung wird daraus dein Widget. Du darfst auch die Rückseite einer Anmeldung vorbehalten, es
ist deine Seite. Mach sie aber nie zum einzigen Weg hinein: Niemand hat einen Grund, dort zu
suchen.

**Was auf die Rückseite gehört:** Hinweise zur Nutzung, was dein Widget tut, Links zu deiner
Dokumentation oder deinem Support, optional eine Abmelden-Schaltfläche oder Einstellungen deines
Widgets.

**Was nicht:** deine eigentlichen Inhalte, alles, was man zum *Benutzen* des Widgets braucht, und
alles, was voraussetzt, gerade sichtbar zu sein. Der Host schickt beim Umdrehen an jede Seite ein
`visibility-change` — pausiere also dein Polling, wenn du weggedreht bist.

**Größe:** In einer Dashboard-Karte stehen der Rückseite etwa **294px** Höhe zur Verfügung (eine
350×350-Karte abzüglich ihrer 56px hohen Kopfzeile). Das reicht für einen Hinweistext und ein,
zwei Links. Für ein mehrstufiges Formular reicht es nicht.

### Zustand zwischen deinen beiden Seiten teilen

Deine Vorder- und Rückseite sind zwei getrennte Dokumente in zwei getrennten iframes — nicht zwei
Ansichten eines laufenden Skripts. Nichts im Arbeitsspeicher überträgt sich zwischen ihnen; nur
was diese Grenze tatsächlich überquert, tut das.

Brauchst du einen Zustand, auf den sich beide Seiten einigen — meistens „ist dieser Nutzer
angemeldet" — ist Speicher auf deiner eigenen Origin der Weg dorthin: deine Rückseite liegt
konstruktionsbedingt unter `/backside` auf derselben Origin wie deine Vorderseite, also ist
`localStorage` (oder ein Cookie), das eine Seite schreibt, für die andere sichtbar.

Zwei Dinge stolpern hier häufig:

**Einmaliges Lesen beim Laden reicht nicht.** Die Rückseite bleibt nach dem ersten Umdrehen
gemountet — sie wird nicht bei jedem Umdrehen neu erzeugt. Meldet sich der Nutzer also auf einer
Seite ab, während die andere noch offen ist, bemerkt diese es nicht, solange sie nicht zuhört.
Gleichen-Ursprungs-Geschwisterdokumente erhalten ein natives `storage`-Ereignis, sobald eines von
ihnen `localStorage` ändert — höre darauf, um live zu reagieren:

```ts
window.addEventListener('storage', (event) => {
    if (event.key === 'my-widget-signed-in') {
        // reagiere auf die Änderung der ANDEREN Seite - eigene Schreibvorgänge lösen dieses
        // Ereignis bei dir selbst nicht aus
    }
});
```

**Dein Widget ist auf einer fremden Seite eingebettet, sein Speicher kann also partitioniert oder
blockiert sein.** Browser schränken Speicher für ein iframe, dessen Top-Level-Seite eine andere
Site ist als die Origin des iframes, zunehmend ein — das trifft auf jedes Widget hier zu. Verhält
sich `localStorage` nicht wie erwartet, ist die standardbasierte Lösung die [Storage Access
API](https://developer.mozilla.org/en-US/docs/Web/API/Storage_Access_API):
`document.requestStorageAccess()`, aufgerufen aus einer echten Nutzerinteraktion (ein Klick, ein
Formular-Submit) — das iframe des Hosts trägt bereits das dafür nötige
`allow-storage-access-by-user-activation`-Sandbox-Token.

Nichts davon läuft über den Host. Der Host sieht, speichert oder leitet niemals etwas über den
Anmeldestatus deines Widgets weiter — er gibt dir nur das Umdrehen und die
`visibility-change`-Nachricht.

### Hosting-Anforderungen

Jede HTTPS-URL, die du kontrollierst, funktioniert, mit drei harten Anforderungen:

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
3. **Deine Origin wird bei der Freigabe festgeschrieben.** Die Origin, die du registrierst, wird
   beim Build von ivCampus in dessen eigenen `Content-Security-Policy: frame-src`-Header
   kompiliert. Eine Origin, die dort nicht steht, wird nicht gerendert — unabhängig davon, was in
   der Registry steht. Dein Widget später auf eine *andere* Origin umzuziehen, erfordert deshalb
   einen neuen ivCampus-Build und nicht nur eine Änderung am Manifest: Behandle deine Origin als
   langlebig und stimme jede Änderung mit [support@ivicos.eu](mailto:support@ivicos.eu) ab. Den
   Pfad innerhalb derselben Origin zu ändern, ist dagegen kostenlos.

Kein bestimmter Hosting-Anbieter ist erforderlich oder bevorzugt — nimm, was du bereits nutzt.
Eingebettet zu sein ändert außerdem, was deine Seite speichern und wie sie sich authentifizieren
kann — siehe [Cross-Origin-Einschränkungen](#cross-origin-einschränkungen).

### Cross-Origin-Einschränkungen

Dein Widget wird von deiner Origin ausgeliefert und in eine Seite eingebettet, die von der Origin
von ivCampus kommt — beide sind also immer cross-origin. **Das ist keine CORS-Frage.** Ob ein
Dokument in ein Iframe geladen werden darf, regeln die Framing-Regeln oben —
`frame-ancestors`/`X-Frame-Options` auf deiner Seite, `frame-src` auf der von ivCampus. Ein
`Access-Control-Allow-Origin`-Header auf deiner Widget-URL wird weder benötigt noch überhaupt
ausgewertet. (CORS gilt sehr wohl für `fetch()`-Aufrufe, die dein Widget an *dein eigenes* Backend
richtet, falls dieses auf einer anderen Origin liegt als die Widget-Seite. Das ist eine Sache
zwischen dir und deinem Server; ivCampus ist daran nicht beteiligt.)

Was Cross-Origin tatsächlich ändert, sind Speicherung und Authentifizierung.

**Deine Cookies sind Third-Party-Cookies.** Safari blockiert Cross-Site-Cookies vollständig; Firefox
und Chrome partitionieren sie nach Top-Level-Site. Ein Session-Cookie, das dein Backend setzt,
funktioniert einwandfrei, wenn du die URL deines Widgets direkt öffnest — und dann stillschweigend
nicht mehr, sobald dieselbe Seite innerhalb von ivCampus läuft. Das ist die häufigste Art, wie ein
Widget, das „in der Entwicklung lief“, im eingebetteten Zustand scheitert. Jedes Cookie, auf das du
angewiesen bist, muss mindestens `SameSite=None; Secure` sein — und selbst dann solltest du nicht
darauf zählen, dass Safari es mitsendet.

**`localStorage`, `sessionStorage` und IndexedDB sind partitioniert**, geschlüsselt nach
Top-Level-Site. Dein Widget bekommt durchaus echten Speicher — der Host gewährt `allow-same-origin`,
deine Seite behält also ihre eigene Origin statt einer opaken — aber es ist ein *separater Bucket*
als der, den dieselbe Seite nutzt, wenn jemand deine Website direkt besucht. Zustand wird nicht
übernommen, und dauerhaft ist er auch nicht.

**Die Storage Access API schränkt das ein, hebt es aber nicht auf.** Das Iframe des Hosts trägt das
`allow-storage-access-by-user-activation`-Sandbox-Token, `document.requestStorageAccess()` steht
Widgets also zur Verfügung — aber nur aus einer echten Nutzerinteraktion heraus (ein Klick, ein
Formular-Submit), und nur in Browsern, die die API überhaupt implementieren. Entwirf standardmäßig
für partitionierten Speicher; behandle eine gewährte Anfrage als etwas, das du dir nach einem Klick
zurückholst, nicht als etwas, das schon beim ersten gerenderten Frame deines Widgets vorhanden ist.
Das konkrete Muster dafür steht oben unter [Zustand zwischen deinen beiden Seiten
teilen](#zustand-zwischen-deinen-beiden-seiten-teilen).

**Ein interaktiver Login im Widget ist bewusst schwierig.** `allow-popups` wird nicht gewährt,
`window.open` ist also blockiert; `allow-top-navigation` ebenso wenig, du kannst die übergeordnete
Seite also nicht umleiten. Bleibt die Umleitung *innerhalb deines eigenen Iframes* — die
funktioniert, aber die meisten Identity-Provider (darunter Google und Microsoft) verweigern das
Framing grundsätzlich, sodass ein klassischer OAuth-Redirect zu ihnen schlicht nicht rendert.

**Was du stattdessen tun solltest.** Bevorzuge ein Auth-Modell, das ohne interaktiven Login im Frame
auskommt: Halte Zugangsdaten für die Lebensdauer des Widgets im Speicher und stelle sie bei jedem
Laden neu her; behandle jedes Laden als Kaltstart. Denk daran, dass ivCampus dir keine
Nutzeridentität liefert, auf der du aufbauen könntest ([Den Kontext nutzen](#den-kontext-nutzen)) —
brauchst du eine belastbare, muss dein eigenes Backend dieses Problem außerhalb des Widgets lösen.

### Das Protokoll, falls du dieses SDK nicht verwendest

Manche Widgets sind einfach genug, dass man keinen Build-Schritt haben möchte. Du kannst dasselbe Protokoll
auch von Hand in reinem `<script>` implementieren — dieses SDK ist ein dünner Komfort-Wrapper, keine Black
Box. Die vollständigen Message-Formen:

**Beim Laden senden:**
```js
window.parent.postMessage(
    { source: 'ivicos-widget-sdk', type: 'ready', widgetId: 'my-widget', sdkVersion: 2, hasBackFace: true },  // oder SDK_VERSION importieren
    '*' // hier unvermeidbar - du kennst die Origin des Hosts noch nicht, und diese Nachricht enthält keine Geheimnisse
);
```

Das Feld `hasBackFace` ist optional und wird weggelassen, wenn das Widget keine Rückseite bereitstellt. Setzt du es auf `true`, lädt der Host die Rückseite von `<iframeUrl>/backside` — dabei bleiben Query-String und Hash erhalten.

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

**Um die Größe musst du dich nicht kümmern.** Der Host gibt deiner Seite einen Bereich fester Größe,
in dem sie ganz normal scrollt. Die `resize`-Nachricht gehört weiterhin zum Protokoll und wird
angenommen, aber ignoriert — senden musst du sie nicht:
```js
// Optional, ohne Wirkung auf das Layout:
window.parent.postMessage({ source: 'ivicos-widget-sdk', type: 'resize', height: document.body.scrollHeight }, hostOrigin);
```

Das Fixieren der Origin ist nicht optional — wird dieser Schritt übersprungen (z. B. indem jede Nachricht
akzeptiert wird, bei der `event.source === window.parent`), könnte jeder Code, den die Host-Seite später von
einer anderen Origin lädt, sich als der Host ausgeben. Genau das übernimmt das SDK automatisch für dich.

### Dein Widget einreichen

1. Jemand mit der Rolle Manager oder Owner in einer ivCampus-Organisation (die **sponsernde
   Organisation** — die Verantwortlichkeit für dein Widget führt auf sie zurück) öffnet
   **Campus-Einstellungen → Externe Widgets → Widget einreichen** und füllt aus:

   | Feld | Einschränkung |
   |---|---|
   | Widget-ID | nur Kleinbuchstaben/Ziffern/Bindestriche, eindeutig über die gesamte Registry, und **nach der Einreichung unveränderlich** |
   | Name | Freitext, nur zur Anzeige |
   | Version | muss wie `X.Y.Z` aussehen (z. B. `1.0.0`) |
   | Widget-URL | deine HTTPS-Iframe-URL |
   | Icon-URL | öffentlich erreichbare HTTPS-URL zu deinem Icon |
   | Beschreibung | Freitext |
   | Placement | Raum, Persönliches Dashboard oder beides — mindestens eines ist erforderlich |

2. Die Einreichung ist sofort für die sponsernde Organisation sichtbar und für niemanden sonst. Sie
   kann von niemandem aktiviert oder genutzt werden, bevor sie geprüft wurde.

3. Verfolge sie auf demselben Screen unter **Deine Einreichungen**, wo der aktuelle Status steht:

   | Status | Bedeutung |
   |---|---|
   | Ausstehende Überprüfung | eingereicht, wartet auf ivCampus |
   | Freigegeben | live — die sponsernde Organisation kann es in den registrierten Placements aktivieren |
   | Gesperrt | zuvor freigegeben, inzwischen zurückgezogen; es wird für niemanden mehr gerendert |

   Die Prüfung erfolgt manuell, und eine Statusänderung löst keine Benachrichtigung aus — sieh also
   auf diesem Screen nach, oder frag bei [support@ivicos.eu](mailto:support@ivicos.eu) nach, wenn du
   schon länger wartest.

4. Die sponsernde Organisation kann ihre eigene Einreichung nachträglich ändern (Name, Version, URL,
   Icon, Beschreibung, Placements) oder ganz zurückziehen. Die Ausnahme ist die Widget-ID: Sie liegt
   fest, und eine andere ID ist ein anderes Widget.

**Die eine Sache, die exakt stimmen muss: deine registrierte Widget-ID und die `widgetId`, mit der sich deine
Seite selbst ankündigt (in `sdk.init({ widgetId: '...' })`, oder der rohen `ready`-Nachricht, falls du das SDK
nicht verwendest), müssen Zeichen für Zeichen übereinstimmen.** Stimmen sie nicht überein, lädt das
Widget nicht: es läuft nach 10 Sekunden in einen Timeout mit einer generischen "this widget did not
respond"-Meldung. Das ist die häufigste Art, wie ein korrekt gebautes Widget kaputt erscheint — prüf
zuerst diese beiden Werte.

### Lokale Entwicklung

Der schnellste Start ist [`examples/hello-widget`](examples/hello-widget) — ein vollständiges
Widget in einer einzigen HTML-Datei, ohne Build-Schritt und ohne Abhängigkeiten. Hoste es,
registriere es, und du siehst die ganze Schleife laufen. `examples/sdk-widget` zeigt dasselbe
über dieses SDK. Details in [examples/README.md](examples/README.md).

Teste dein Widget gegen einen echten Host, bevor du es einreichst, statt blind zu debuggen:

1. Baue und hoste dein Widget dort, wo es letztendlich deployed werden soll (oder unter jeder beliebigen
   Wegwerf-HTTPS-URL — sie muss noch nicht der finale Ort sein).
2. Registriere es wie oben beschrieben, mit einer Test-/persönlichen ivCampus-Organisation, falls vorhanden.
3. Beobachte die eigene `onContextChange`-/Konsolenausgabe deines Widgets sowie die Network- und
   Console-Tabs der Browser-Devtools auf Handshake- oder Origin-Fehler.

### Sicherheitsmodell

- Läuft innerhalb eines `sandbox="allow-scripts allow-forms allow-same-origin
  allow-storage-access-by-user-activation"`-Iframes, den der Host kontrolliert. Das letzte Token
  erlaubt lediglich, dass dein Widget `document.requestStorageAccess()` aus einer echten
  Nutzerinteraktion heraus aufrufen darf (siehe [Zustand zwischen deinen beiden Seiten
  teilen](#zustand-zwischen-deinen-beiden-seiten-teilen)) — es gewährt sonst nichts zusätzlich.
  Insbesondere weiterhin **nicht** gewährt: Popups (`window.open` wird blockiert), Top-Level-Navigation
  der übergeordneten Seite und kein Zugriff auf ivCampus-Cookies/localStorage/DOM außerhalb deines eigenen
  Iframes.
- Erhält niemals die echten ivCampus-Zugangsdaten der Endnutzerin/des Endnutzers, in keiner Form.
- Alle Nachrichten werden gegen `event.source === window.parent` und, nach der ersten akzeptierten
  Nachricht, gegen eine fixierte erwartete Origin validiert — siehe
  [den Protokoll-Abschnitt](#das-protokoll-falls-du-dieses-sdk-nicht-verwendest) oben oder `src/sdk.ts` für
  die genaue Implementierung.

**Ein Sicherheitsproblem gefunden?** Bitte melde es vertraulich — [SECURITY.md](SECURITY.md)
beschreibt, was im Geltungsbereich liegt und wohin du schreibst. Bitte kein öffentliches Issue für
Sicherheitsfehler.

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

**Why Provide a Widget for ivCAMPUS?**
ivCAMPUS is the place where people collaborate effectively. Some compare ivCAMPUS to Microsoft Teams; others call it the logical, evolutionary next step beyond Slack. However you choose to categorize it, for administrative departments, it is the ultimate workplace of the future, offering a view of everything that matters: Colleagues, what’s happening in the office, and the status of key tools—from email, calendars, and tasks all the way to the most important information from your application—which either provides users with essential information right within a 350x350px widget or, based on the content displayed there, prompts them to switch to your application to get their work done. Together, we help users shape a productive workday. 

**What is a widget?**
SDK for building widgets that embed into [ivCampus](https://ivicos-campus.app) — inside a Room
or the Personal Dashboard. A widget is any page you host at your own HTTPS URL; ivCampus embeds
it in a sandboxed `<iframe>` and this SDK handles the handshake, context, and message transport
between your page and the host. The host decides the size.

This document is the complete guide for external developers: what a widget can and can't do,
how to build one, and how to get it live on a real ivCampus org.

### Status — please read this first

This is an early phase of the widget system, with real constraints. Concretely:

- Widgets are **display-only**. They receive read-only display context (theme, locale, campus/area,
  the room they're in including its name and type, the viewer's display name, avatar, and coarse
  presence status) — and nothing else. There is no data API, no token and no scopes: everything a
  widget knows about ivCampus is in the context. Widgets also cannot write anything back to ivCampus.
  None of it requires a permission, a scope or a consent prompt: every approved widget receives
  exactly the same fields. See [Using the context](#using-the-context) for how to read them.
- There is **no self-serve publishing**. Every widget goes through manual review before it's
  usable by anyone (see [Submitting your widget](#submitting-your-widget) below).
- **Approval is not permanent.** An approved widget can be suspended afterwards, which stops it
  rendering everywhere it was enabled. Treat disappearing as a normal state, not a crash.
- The SDK is published to **GitHub Packages**, not the public npm registry — see
  [Install](#install).

None of this is a bug that should be worked around; please just develop based on what's actually there. 
You'll see that it makes sense and works well for users.

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

Runnable examples live in [`examples/`](examples), including a complete widget in a single HTML
file with no build step.

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

// The host decides your size: your widget gets a fixed-size area, and your own page scrolls
// inside it. Nothing to call for that - see "About your widget's size" below.
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
    displayName: string;   // the viewing user's display name
    avatar?: string;       // optional avatar image URL for the viewing user
    status?: string;       // presence: 'available' | 'away' | 'busy' | 'out-of-office' | 'on-the-phone'
    room?: {               // the room this widget is placed in
        id: string;
        name: string;
        type: 'personal' | 'common';  // the viewer's own personal room, or a shared one
    };
}
```

That's the entire surface. No user ID, no email, no auth token, no bearer credential of any
kind, no access to any ivCampus API. If your widget needs a backend, it's **your own backend** —
the widget page talks to whatever server you control, using whatever auth model you build for
it; ivCampus is not in that loop.

`status` (and `avatar`) update the same way the rest of the context does — via `onContextChange`
pushes and `getContext()`/the resolved value of `init()` — there's no separate presence API.

`room` is absent only if the host has no room in scope yet. Every placement is inside a room —
either the viewing user's own personal room (`type: 'personal'`) or a shared one
(`type: 'common'`). When the user moves between rooms, the new `room` value arrives via
`onContextChange`; there is no separate call to fetch it, and no way to ask for more than this.

### Using the context

Everything below needs **no permission, no consent prompt and no scope**. There is nothing to
request and no API to call: the host pushes these fields to every approved widget, identically, and
`init()` hands them to you. If a field is not on `WidgetContext`, no widget can get it.

**The viewing user.**

```ts
const context = await sdk.init({ widgetId: 'my-widget' });

context.displayName;  // "Jane Doe" - can be an empty string while the host is still resolving it
context.avatar;       // "https://.../avatar.png", or undefined if they have no picture set
context.status;       // 'available' | 'away' | 'busy' | 'out-of-office' | 'on-the-phone', or undefined
```

**There is no user ID.** `displayName` is a label, not an identifier: it is not unique, not stable,
and two people in the same room can share one. Never use it as a key for storage, analytics, or
anything that has to recognise a person across sessions. If your widget needs a verifiable identity,
it has to establish that itself against your own backend — ivCampus does not provide one.

**The room.**

```ts
if (!context.room) {
    // The host has no room in scope yet. Rare, but render a neutral state rather than crashing.
    return;
}

context.room.id;    // stable identifier for this room - safe to use as a storage key
context.room.name;  // display name, e.g. "Team Standup". Falls back to the id before it loads.
context.room.type;  // 'personal' | 'common'
```

`room.id` *is* stable, so a per-room widget (a scratchpad, a poll, a queue) can key its own backend
storage on it. `room.type` tells you what kind of space you are in: `'personal'` is the viewer's own
private room — a widget placed on the Personal Dashboard always sees this — and `'common'` is a
shared room others can walk into. Use it to decide whether showing personal content is appropriate:

```ts
if (context.room) {
    const isPrivate = context.room.type === 'personal';
    render(isPrivate ? myPrivateNotes() : sharedAgenda(context.room.id));
}
```

**Reacting to change.** The whole context is re-pushed whenever any part of it changes — most often
because the user walked into a different room. There is no call to re-fetch it; subscribe instead,
and treat the callback as your single source of truth:

```ts
let currentRoomId: string | undefined = context.room?.id;

const unsubscribe = sdk.onContextChange((next) => {
    if (next.room?.id !== currentRoomId) {
        currentRoomId = next.room?.id;
        loadDataFor(currentRoomId);   // the user moved rooms - reload
    }
});
```

Every `on*` method returns an unsubscribe function; call it when your view goes away.

**Two caveats worth knowing before you design around them:**

- `theme` is typed `'light' | 'dark'`, but the host currently always sends `'light'` — ivCampus has
  no dark mode yet. Read the field rather than hardcoding, so your widget follows along when that
  changes, but don't expect to be able to exercise the dark path today.
- `campusId` and `areaId` identify the organisation and the area the widget is embedded in. They are
  opaque strings, useful as scoping keys for your own storage, and nothing more — there is no
  ivCampus API you can pass them to.

### API reference

`new WidgetSDK()` — construct once per page. Everything below is a method on that instance.

| Method | Returns | Notes |
|---|---|---|
| `init(options)` | `Promise<WidgetContext>` | Announces the widget and resolves with the first context. Must be called before anything else. Rejects if the host fails to complete the handshake within 10s, or fails to follow it with a first context within a further 10s. Calling it twice throws. |
| `init({ backFace: true })` | | Tells the host this widget also serves a back face at `<your iframe URL>/backside`, so it offers the flip control. |
| `getContext()` | `WidgetContext \| null` | The most recently received context. `null` until `init()` resolves — prefer the value `init()` gives you. |
| `onContextChange(fn)` | `() => void` | Calls `fn(context)` on every context push. Returns an unsubscribe function. |
| `onVisibilityChange(fn)` | `() => void` | Calls `fn(visible)` when the widget's panel is backgrounded or shown again. Backgrounded is **not** closed — pause polling and animation, don't tear down. Returns an unsubscribe function. |
| `onSessionEnding(fn)` | `() => void` | Calls `fn()` shortly before the widget is torn down. Your last chance to flush unsaved state. Returns an unsubscribe function. |
| `reportResize(height)` | `void` | Has no effect on layout: the host decides the size itself — see below. The message stays part of the protocol and is still sent, but the host ignores it. Kept for compatibility only. |
| `destroy()` | `void` | Removes the message listener, disconnects the resize observer, drops all listeners. Call it if your page tears the widget down without a full reload (an SPA route change, for instance). |

Also exported from the package: `SDK_VERSION` (the protocol version this build speaks) and the
`WidgetContext` / `InitOptions` types.

**About your widget's size.** The host decides it, not you. Your widget is embedded in a
fixed-size area, and if your content is taller, your own page scrolls inside it — exactly like any
other embedded iframe. You don't have to do anything, or report anything, to get that.

How large that area is depends on where your widget runs: on the Dashboard it is currently around
350×294 CSS pixels; in a room it is the size of the attachment pane, which varies with the window.
Three things follow from this:

- **Design responsively.** Treat those numbers as today's state, not a promise.
- **Don't switch off your own scrolling.** `body { overflow: hidden }` without a scrollable area of
  your own makes content unreachable that would otherwise simply scroll.
- **`height: 100%` and `100vh` work** as you'd expect — your widget has a real viewport.

`init()` still starts a `ResizeObserver` on `document.body` and reports the height; the host just no
longer uses it for layout. Earlier SDK versions were written against a host that grew the iframe to
the reported height — that is no longer the case.

**Handling a failed init.** `init()` rejects rather than hanging forever, so wrap it:

```ts
try {
    const context = await sdk.init({ widgetId: 'my-widget' });
    render(context);
} catch (err) {
    // Almost always a widgetId mismatch, or the page opened directly instead of embedded.
    document.body.textContent = 'This page runs as an ivCampus widget.';
}
```

### The back face

A widget card in the dashboard can flip over. The front is your widget. The back is where you
explain it — what it does, how to use it, what your filters mean, links to your own docs.

Serve it at `/backside`, relative to the URL you registered:

```
registered iframe URL   https://example.com/my-widget
your back face          https://example.com/my-widget/backside
```

Then tell the host it exists, from the **front** page:

```ts
const sdk = new WidgetSDK();
const context = await sdk.init({ widgetId: 'my-widget', backFace: true });
```

Without `backFace: true` no flip control ever appears, so an existing widget is unaffected until
it opts in. If you set it but do not serve `/backside`, users will see your 404 page on the back
of the card — the host has no way to detect that.

**The back page does not need this SDK.** A static HTML file is fine. If you want the theme,
locale or the viewer's name there too, call `init()` from it as well and it receives the same
context the front does.

**Sign-in does not belong on the back face.** If your widget cannot be used without an account,
show your sign-in on the **front** — that is the first thing a user sees, and signing in there
turns the front into your widget. You are free to require a session on the back face as well; it
is your page. But never make the back face the only way in, because a user has no reason to look
there.

**What belongs on the back:** guidelines and usage notes, what your widget does, links to your
documentation or support, optionally a sign-*out* control or widget-specific settings.

**What does not:** your primary content, anything a user needs in order to *use* the widget, and
anything that assumes it is currently on screen. The host sends `visibility-change` to each face
as the card turns, so pause polling when you are flipped away.

**Size:** in a dashboard card the back face gets roughly **294px** of height (a 350×350 card less
its 56px header). That fits a block of guidance and a link or two. It does not fit a multi-step
form.

### Sharing state between your two faces

Your front and back pages are two separate documents in two separate iframes - not two views of
one running script. Nothing in memory carries over between them; only something that actually
crosses that boundary does.

If you need state both faces agree on - most commonly "is this user signed in" - storage on your
own origin is the way to do it: your back face lives at `/backside` on the same origin as your
front by construction, so `localStorage` (or a cookie) written by one face is visible to the
other.

Two things trip people up here:

**Reading it once at load isn't enough.** The back face stays mounted after the first flip - it
is not re-created on every flip - so if the user signs out on one face while the other is still
open, that other face won't notice unless it's listening. Same-origin sibling documents get a
native `storage` event whenever one of them changes `localStorage` - listen for it to react live:

```ts
window.addEventListener('storage', (event) => {
    if (event.key === 'my-widget-signed-in') {
        // react to the *other* face's change - your own writes don't fire this event on you
    }
});
```

**Your widget is embedded on someone else's page, so its storage may be partitioned or blocked.**
Browsers increasingly restrict storage for an iframe whose top-level page is a different site than
the iframe's own origin - which describes every widget here. If `localStorage` isn't behaving the
way you expect, the standards-based fix is the [Storage Access
API](https://developer.mozilla.org/en-US/docs/Web/API/Storage_Access_API):
`document.requestStorageAccess()`, called from a real user gesture (a click, a form submit) - the
host's iframe already carries the `allow-storage-access-by-user-activation` sandbox token needed
for it to work.

None of this is host-mediated. The host never sees, stores or forwards anything about your
widget's own sign-in state - it only ever gives you the flip and the `visibility-change` message.

### Hosting requirements

Any HTTPS URL you control works, with three hard requirements:

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
3. **Your origin is pinned at approval time.** The origin you register is compiled into
   ivCampus's own `Content-Security-Policy: frame-src` when the platform is built, so an
   origin that isn't on that list will not render no matter what the registry says. Moving
   your widget to a *different* origin after approval therefore needs an ivCampus rebuild,
   not just a manifest edit — treat your origin as long-lived, and coordinate any change with
   [support@ivicos.eu](mailto:support@ivicos.eu). Changing the path on the same origin is free.

No specific hosting provider is required or preferred — pick whatever you already use. Being embedded
also changes what your page can store and how it can authenticate — see
[Cross-origin constraints](#cross-origin-constraints).

### Cross-origin constraints

Your widget is served from your origin and embedded in a page served from ivCampus's, so the two are
always cross-origin. **This is not a CORS question.** Loading a document into an iframe is governed
by the framing rules above — `frame-ancestors`/`X-Frame-Options` on your side, `frame-src` on
ivCampus's — and no `Access-Control-Allow-Origin` header on your widget URL is needed or even looked
at. (CORS does apply to `fetch()` calls your widget makes to *your own* backend, if that backend
sits on a different origin than the widget page. That's between you and your server; ivCampus isn't
involved.)

What being cross-origin actually changes is storage and authentication.

**Your cookies are third-party cookies.** Safari blocks cross-site cookies outright; Firefox and
Chrome partition them by top-level site. A session cookie your backend sets works perfectly when you
open your widget's URL directly, and then silently doesn't when the identical page runs inside
ivCampus. This is the most common way a widget that "worked in development" fails once embedded. Any
cookie you depend on must at minimum be `SameSite=None; Secure` — and even then, don't count on
Safari sending it.

**`localStorage`, `sessionStorage` and IndexedDB are partitioned** by top-level site. Your widget
does get real storage — the host grants `allow-same-origin`, so your page keeps its own origin
rather than an opaque one — but it is a *separate bucket* from the one the same page uses when
someone visits your site directly. State does not carry across, and it isn't durable.

**The Storage Access API narrows this, but doesn't remove it.** The host's iframe carries the
`allow-storage-access-by-user-activation` sandbox token, so `document.requestStorageAccess()` is
available to widgets — but only from a real user gesture (a click, a form submit), and only in
browsers that implement the API at all. Design for partitioned storage as the default case; treat a
granted request as something you win back after a click, not something present before your widget
renders its first frame. See [Sharing state between your two faces](#sharing-state-between-your-two-faces)
above for the concrete pattern.

**Interactive login inside a widget is hard, by design.** `allow-popups` is not granted, so
`window.open` is blocked; `allow-top-navigation` is not granted either, so you can't redirect the
parent page. That leaves redirecting *within your own iframe*, which does work — but most identity
providers (Google and Microsoft among them) refuse to be framed at all, so a standard OAuth redirect
to them simply won't render.

**What to do instead.** Prefer an auth model that needs no interactive login in the frame: hold
credentials in memory for the widget's lifetime and re-establish them on each load, and treat every
load as a cold start. Remember that ivCampus gives you no user identity to build on
([Using the context](#using-the-context)) — if you need a verifiable one, that is a problem your own
backend has to solve outside the widget.

### The protocol, if you're not using this SDK

Some widgets are simple enough not to want a build step. You can implement the same protocol by
hand in plain `<script>` — this SDK is a thin convenience wrapper, not a black box. The full
message shapes:

**On load, send:**
```js
window.parent.postMessage(
    { source: 'ivicos-widget-sdk', type: 'ready', widgetId: 'my-widget', sdkVersion: 2, hasBackFace: true },  // or import SDK_VERSION
    '*' // unavoidable here - you don't know the host's origin yet, and this message carries no secrets
);
```

The `hasBackFace` field is optional and omitted entirely when the widget serves no back face. Set it to `true` and the host loads the back face from `<iframeUrl>/backside`, preserving any query string and hash.

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

**You don't need to manage your size.** The host gives your page a fixed-size area to live in, and
your page scrolls inside it normally. The `resize` message is still part of the protocol and is
accepted, but ignored — you don't have to send it:
```js
// Optional, and has no effect on layout:
window.parent.postMessage({ source: 'ivicos-widget-sdk', type: 'resize', height: document.body.scrollHeight }, hostOrigin);
```

The origin-pinning step is not optional — skipping it (e.g. accepting any message where
`event.source === window.parent`) means any code the host page later loads from a different
origin could impersonate the host. This is exactly what the SDK does for you automatically.

### Submitting your widget

1. Someone with a Manager or Owner role on an ivCampus org (the **sponsoring org** — your
   widget's accountability traces back to them) opens **Campus Settings → External widgets →
   Submit a widget** and fills in:

   | Field | Constraint |
   |---|---|
   | Widget ID | lowercase letters/numbers/hyphens only, unique across the whole registry, and **fixed once submitted** |
   | Name | free text, purely for display |
   | Version | must look like `X.Y.Z` (e.g. `1.0.0`) |
   | Widget URL | your HTTPS iframe URL |
   | Icon URL | publicly reachable HTTPS URL to your icon |
   | Description | free text |
   | Placement | Room, Personal dashboard, or both — at least one is required |

2. The submission is immediately visible to the sponsoring org and to no one else. It can't be
   enabled or used by anyone until it has been reviewed.

3. Track it under **Your submissions** on that same screen, which shows its current status:

   | Status | What it means |
   |---|---|
   | Pending review | submitted, waiting on ivCampus |
   | Approved | live — the sponsoring org can enable it in the placements you registered for |
   | Suspended | previously approved, since withdrawn; it stops rendering for everyone |

   Review is manual and nothing notifies you when the status changes, so check this screen — or ask
   at [support@ivicos.eu](mailto:support@ivicos.eu) if you have been waiting.

4. The sponsoring org can update its own submission afterwards (name, version, URL, icon,
   description, placements) or withdraw it entirely. The Widget ID is the exception: it is fixed,
   and a different ID is a different widget.

**The one thing to get exactly right: your registered Widget ID and the `widgetId` your page
announces itself as (in `sdk.init({ widgetId: '...' })`, or the raw `ready` message if not using
the SDK) must match, character for character.** If they don't, the widget won't load: it times out
after 10 seconds with a generic "this widget did not respond" message. This is the single most
common way a correctly-built widget appears broken — check those two values first.

### Local development

The fastest start is [`examples/hello-widget`](examples/hello-widget) — a complete widget in a
single HTML file, no build step and no dependencies. Host it, register it, and you can watch the
whole loop work. `examples/sdk-widget` does the same thing through this SDK. See
[examples/README.md](examples/README.md) for both.

Test your widget against a real host before submitting, rather than debugging blind:

1. Build and host your widget wherever you'll eventually deploy it (or any throwaway HTTPS URL —
   it doesn't need to be its final location yet).
2. Register it as above, using a test/personal ivCampus org if you have one.
3. Watch your widget's own `onContextChange`/console output, and the browser's devtools Network
   and Console tabs, for handshake or origin errors.

### Security model

- Runs inside a `sandbox="allow-scripts allow-forms allow-same-origin
  allow-storage-access-by-user-activation"` iframe the host controls. That last token only lets
  your widget call `document.requestStorageAccess()` from a real user gesture (see
  [Sharing state between your two faces](#sharing-state-between-your-two-faces)) — it grants
  nothing else. Still notably **not** granted: popups (`window.open` is blocked), top-level
  navigation of the parent page, and no access to any ivCampus cookie/localStorage/DOM outside
  your own iframe.
- Never receives the end user's real ivCampus credentials, in any form.
- All messages are validated against `event.source === window.parent` and, after the first
  accepted message, a pinned expected origin — see [the protocol section](#the-protocol-if-youre-not-using-this-sdk)
  above, or `src/sdk.ts` for the exact implementation.

**Found a security problem?** Report it privately — see [SECURITY.md](SECURITY.md) for what is in
scope and where to send it. Please don't open a public issue for security bugs.

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
