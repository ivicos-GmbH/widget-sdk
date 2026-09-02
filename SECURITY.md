# Security Policy

*[Deutsch](#deutsch) | [English](#english)*

---

## English

### Reporting a vulnerability

**Do not open a public GitHub issue for security problems.**

Email **[support@ivicos.eu](mailto:support@ivicos.eu)** with `widget-sdk security` in the subject
line. Please include:

- what you found and where (file and line, or the message sequence that triggers it),
- how to reproduce it,
- what an attacker gets out of it.

We aim to acknowledge within 5 working days. Please give us a reasonable window to ship a fix
before disclosing publicly.

### What is in scope

This package is a client-side SDK. It runs inside the widget's own sandboxed `<iframe>`, talks to
exactly one window (`window.parent`) over `postMessage`, and holds no credentials. The parts most
worth your attention:

- **Origin pinning** in `onMessage` (`src/sdk.ts`) — the first accepted host message pins
  `hostOrigin`, and every later message must match it exactly. Any way to get the SDK to accept a
  message from a different origin, or to re-pin to an attacker-controlled one, is a real finding.
- **Outbound targeting** — anything that sends to `'*'` after the origin is known.
- **Context handling** — `WidgetContext` is display data and carries no tokens; a way to make the
  SDK surface something it should not is in scope.

### What is not in scope

- The ivCampus platform itself, its submission/review flow, and anything server-side. Report those
  to the same address, but they are not bugs in this repository.
- What a widget author does with the context after receiving it. Rendering `displayName` or
  `room.name` as raw HTML is an XSS in that widget, not in this SDK.
- The `'*'` target origin on the initial `ready` message. It is unavoidable — the host's origin is
  not known yet — and that message carries only `widgetId` and `sdkVersion`.

### Supported versions

Only the latest published version receives fixes. There are no long-term support branches.

---

## Deutsch

### Schwachstellen melden

**Bitte keine öffentlichen GitHub-Issues für Sicherheitsprobleme.**

Schreib an **[support@ivicos.eu](mailto:support@ivicos.eu)** mit `widget-sdk security` im Betreff.
Bitte gib an: was du gefunden hast und wo (Datei und Zeile oder die auslösende Nachrichtenfolge),
wie es sich reproduzieren lässt, und was eine angreifende Person davon hat.

Wir bestätigen den Eingang in der Regel innerhalb von 5 Werktagen. Bitte gib uns ein angemessenes
Zeitfenster für einen Fix, bevor du das Problem veröffentlichst.

### Im Geltungsbereich

Dieses Paket ist ein clientseitiges SDK. Es läuft im sandboxed `<iframe>` des Widgets, spricht per
`postMessage` mit genau einem Fenster (`window.parent`) und hält keinerlei Zugangsdaten. Besonders
relevant:

- **Origin-Pinning** in `onMessage` (`src/sdk.ts`) — die erste akzeptierte Host-Nachricht legt
  `hostOrigin` fest, jede weitere muss exakt übereinstimmen. Jeder Weg, das SDK eine Nachricht von
  einer anderen Origin akzeptieren oder neu pinnen zu lassen, ist ein echter Fund.
- **Ausgehende Nachrichten** — alles, was nach dem Pinning noch an `'*'` sendet.
- **Kontext-Handling** — `WidgetContext` sind Anzeigedaten ohne Tokens; ein Weg, das SDK etwas
  preisgeben zu lassen, was es nicht sollte, gehört hierher.

### Nicht im Geltungsbereich

- ivCampus selbst, der Einreichungs- und Prüfprozess und alles Serverseitige. Melde das gern an
  dieselbe Adresse, es sind aber keine Fehler in diesem Repository.
- Was Widget-Entwickler:innen mit dem Kontext tun. `displayName` oder `room.name` als rohes HTML zu
  rendern ist ein XSS im jeweiligen Widget, nicht in diesem SDK.
- Die Ziel-Origin `'*'` der ersten `ready`-Nachricht. Sie ist unvermeidbar — die Origin des Hosts
  ist zu diesem Zeitpunkt noch unbekannt — und die Nachricht enthält nur `widgetId` und `sdkVersion`.

### Unterstützte Versionen

Fixes gibt es nur für die jeweils neueste veröffentlichte Version. Es gibt keine LTS-Branches.
