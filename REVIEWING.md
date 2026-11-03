# Reviewing external widgets

*[Deutsch](#deutsch) | [English](#english)*

---

## Deutsch

Diese Anleitung ist für die Personen bei ivicos, die eingereichte Widgets prüfen. Wie Entwickler:innen ein Widget bauen und einreichen, steht im [README](README.md).

### Der Ablauf im Überblick

1. Ein:e Entwickler:in testet das Widget in der Test-Organisation der Testumgebung und klickt auf **Zur Prüfung einreichen**.
2. Du prüfst es in der Testumgebung und entscheidest.
3. Nach der Freigabe kann jede Organisation der Testumgebung es aktivieren.
4. Du exportierst es und importierst es in die Produktion.

Testumgebung und Produktion sind vollständig getrennt. Was du in der einen freigibst, sperrst oder löschst, ändert nichts in der anderen.

### Bevor du anfängst

Du siehst den Tab **CAMPUS Konfiguration → Externe Widgets** nur, wenn alles davon zutrifft:

- Dein Konto steht auf der Liste der prüfenden Personen.
- Du bist in der Prüf-Organisation der jeweiligen Umgebung angemeldet.
- Du bist dort Manager oder Owner.

Wechselst du in eine andere Organisation, kannst du dort nicht prüfen.

### Ein Widget prüfen

1. **Öffne die Warteschlange.** In **Externe Widgets** zeigt die **Überprüfungs-Warteschlange** alle wartenden Einreichungen. Klicke auf **Überprüfen** und wähle ein Widget aus.
2. **Lies die Angaben.** Prüfe Name, Beschreibung, Widget-URL, Website und vor allem die erlaubten Origins.
3. **Öffne die Vorschau.** Klicke auf **Widget-Vorschau**. Erst dann wird die Seite des Widgets geladen. Dabei erfährt der Server des Widgets deine IP-Adresse und deinen Browser.
4. **Probiere es aus.** Das Widget läuft in einer echten Dashboard-Karte, erhält aber Platzhalterdaten („Preview user“, „Preview room“) statt deiner Daten. Die Vorschau ändert weder den Status noch aktiviert sie das Widget für irgendjemanden.
5. **Entscheide** und **informiere die Entwickler:innen**, wie unten beschrieben.

### Was du beurteilst

Gib ein Widget nur frei, wenn alle vier Punkte erfüllt sind.

**Es funktioniert**
- Es lädt in der Vorschau und zeigt mit den Platzhalterdaten sinnvolle Inhalte.
- Falls vorhanden, funktionieren Rückseite und Vergrößern.
- Links öffnen sich in einem neuen Tab, und nur zu den angegebenen Zielen.

**Die erlaubten Origins sind begründet**
- Du verstehst bei jeder Origin, wozu das Widget sie braucht. Mit der Freigabe erlaubst du, dass es Nutzer:innen dorthin schicken darf.
- Ein Platzhalter wie `https://*.example.com` braucht einen guten Grund.
- Die Origin der Widget-URL ist immer erlaubt, auch ohne Eintrag. Prüfe also auch, wem diese Adresse gehört.

**Datenschutz und Daten**
- Du weißt, wer die Seite betreibt.
- Das Widget erhält Namen, Avatar und Status seiner Nutzer:innen sowie den Raum, in dem es läuft. Du weißt, was der Betreiber damit macht.
- Eine Datenschutzerklärung ist vorhanden. Kläre vor der Freigabe, ob ein Auftragsverarbeitungsvertrag nötig ist.

**Qualität und Eignung**
- Name, Symbol und Beschreibung sind verständlich und passend für ivCAMPUS-Kunden.
- Das Erscheinungsbild ist ordentlich, auch in der normalen Kartengröße.

**Wichtig:** Geprüft wird die Einreichung, nicht jede spätere Version der Seite. Betreiber können die Seite hinter der URL jederzeit ändern. Gib deshalb nur Betreibern frei, denen du vertraust.

### Deine Entscheidung

| Aktion | Wann | Was passiert |
|---|---|---|
| **Freigeben** | Alle vier Punkte sind erfüllt. | Jede Organisation dieser Umgebung kann es aktivieren. |
| **Ablehnen** | Es muss noch etwas geändert werden. | Es geht zurück auf **Im Test (nur diese Organisation)** und kann erneut eingereicht werden. Das gilt für Widgets aus der Test-Organisation; andere werden **Gesperrt**. |
| **Sperren** | Ein Widget soll sofort überall verschwinden, kann aber wiederkommen. | Es wird nirgends mehr gerendert. Mit **Wiederherstellen** ist es wieder freigegeben. |
| **Löschen** | Es soll endgültig weg. Nur bei freigegebenen oder gesperrten Widgets möglich. | Es lässt sich nicht rückgängig machen. Die ID bleibt für die einreichende Organisation reserviert. |

Bist du unsicher, **sperre statt zu löschen**.

Meldet die Seite, dass das Widget seit dem Öffnen geändert wurde, lade neu und prüfe die neue Version. So gibst du nichts frei, das du nicht gesehen hast.

### Die Entwickler:innen informieren

Das passiert jetzt automatisch. Die Entwickler:innen bekommen eine E-Mail, wenn du freigibst, wiederherstellst, ablehnst, sperrst, löschst oder ein Widget importierst, und du bekommst eine, wenn etwas in die Warteschlange kommt. E-Mails gibt es nur in der Testumgebung und in der Produktion. Wer das Widget angelegt hat, ist die Kontaktperson, egal wer auf **Zur Prüfung einreichen** geklickt hat. Die E-Mail geht an die Adresse des Kontos oder, falls gesetzt, an eine Benachrichtigungsadresse, die nur die Person selbst sehen kann. Die Freigabe in der Testumgebung sagt, dass das Widget für Kund:innen noch nicht live ist; beim Import folgt eine weitere E-Mail.

**Ablehnen** und **Sperren** verlangen eine Begründung (höchstens 1000 Zeichen). Die Entwickler:innen lesen sie im Wortlaut in der E-Mail, schreibe sie also so, dass sie ohne Rückfrage verständlich ist. **Löschen** hat keine Begründung. Schlägt dort die E-Mail fehl, steht das nur in den Logs, ohne Warnung.

**Nur von Hand schreiben, wenn die gelbe Warnleiste erscheint.** Sie erscheint nach einer Entscheidung oder einem Import, wenn die Entwickler:innen nicht per E-Mail erreicht werden konnten oder keine Kontaktperson bekannt ist. Schreibe dann von support@ivicos.eu aus, bei einer Ablehnung zum Beispiel so:

> Betreff: Dein Widget „NAME“: Änderungen nötig
>
> Hallo NAME,
>
> wir haben dein Widget geprüft und können es noch nicht freigeben:
>
> - WAS GEÄNDERT WERDEN MUSS
>
> Es steht wieder auf „Im Test“. Korrigiere es bitte in der Test-Organisation und reiche es erneut zur Prüfung ein.

### In die Produktion bringen

Nur freigegebene Widgets lassen sich exportieren.

1. **Exportieren:** Öffne das freigegebene Widget in der Testumgebung und klicke auf **Exportieren**. Du erhältst eine JSON-Datei. Sie enthält unter `developerContact` die persönliche Adresse und die Sprache der Entwickler:innen. Gib die Datei nicht weiter und lösche sie nach dem Import.
2. **Prüf-Organisation der Produktion:** Melde dich in der Produktion an und wechsle in die Prüf-Organisation.
3. **Importieren:** Klicke in **Externe Widgets** auf **Widget importieren** und wähle die Datei aus.
4. **Lies den Dialog:** Er zeigt jedes Feld. Beachte diese Hinweise:
   - **Ersetzt das vorhandene Widget:** Prüfe die aufgeführten Änderungen.
   - **Origin fehlt in der Frame-Allowlist:** Lass die Origin von einer Entwicklerin oder einem Entwickler ergänzen und den Client neu ausrollen. Sonst bleibt das Widget leer, sobald die Frame-Richtlinie erzwungen wird.
   - **Wer benachrichtigt wird:** Der Dialog nennt, wer per E-Mail erfährt, dass das Widget live ist. Steht dort, dass niemand benachrichtigt wird, schreibe selbst.
   - **ID ist reserviert:** Der Import ist nicht möglich, auch wenn das vorhandene Widget gelöscht wurde. Das Widget muss eine neue ID erhalten, und die Entwickler:innen müssen sie auch in ihrer Seite ändern.
5. **Bestätigen:** **Importieren und freigeben** gibt das Widget sofort frei. Eine zweite Prüfung gibt es nicht, der Import ist diese Prüfung.

Danach kann jede Organisation in der Produktion es aktivieren.

### Wenn sich ein freigegebenes Widget ändert

Die Entwickler:innen bearbeiten es in der Test-Organisation. Es verschwindet dann aus allen anderen Organisationen der Testumgebung, bis es erneut freigegeben ist. Prüfe es wie eine neue Einreichung, exportiere es wieder und importiere es in die Produktion. Der Import ersetzt die vorhandene Version; bis dahin läuft in der Produktion die alte.

---

## English

This guide is for the people at ivicos who review submitted widgets. How developers build and submit a widget is in the [README](README.md).

### The process at a glance

1. A developer tests the widget in the testing organisation on the test environment and clicks **Submit for review**.
2. You review it on the test environment and decide.
3. Once approved, every organisation on the test environment can turn it on.
4. You export it and import it into production.

The test environment and production are completely separate. Approving, suspending or deleting in one changes nothing in the other.

### Before you start

You only see the **CAMPUS settings → External widgets** tab if all of these are true:

- Your account is on the list of reviewers.
- You're signed into that environment's reviewer organisation.
- You're a manager or owner there.

If you switch to another organisation, you can't review from there.

### Reviewing a widget

1. **Open the queue.** In **External widgets**, the **Review queue** shows every waiting submission. Click **Review** and select a widget.
2. **Read the details.** Check the name, description, widget URL, website and, above all, the allowed origins.
3. **Open the preview.** Click **Preview widget**. Only then does the widget's page load, and its server learns your IP address and browser.
4. **Try it out.** The widget runs in a real dashboard card, but gets placeholder data ("Preview user", "Preview room") instead of your details. Previewing doesn't change the status or turn the widget on for anyone.
5. **Decide** and **tell the developer**, as described below.

### What to judge

Only approve a widget if all four are met.

**It works**
- It loads in the preview and shows sensible content with the placeholder data.
- If it has them, the back face and enlarge work.
- Links open in a new tab, and only to the declared destinations.

**The allowed origins are justified**
- You understand why the widget needs each origin. Approving means it may send users there.
- A wildcard like `https://*.example.com` needs a good reason.
- The widget URL's own origin is always allowed, even if it isn't listed, so check who owns that address too.

**Privacy and data**
- You know who runs the page.
- The widget receives its users' names, avatars and status, plus the room it runs in. You know what the operator does with them.
- A privacy policy exists. Settle whether a data processing agreement is needed before approving.

**Quality and fit**
- The name, icon and description are clear and suitable for ivCAMPUS customers.
- It looks tidy, including at normal card size.

**Important:** you're reviewing the submission, not every later version of the page. An operator can change the page behind the URL at any time, so only approve operators you trust.

### Your decision

| Action | When | What happens |
|---|---|---|
| **Approve** | All four are met. | Every organisation on this environment can turn it on. |
| **Deny** | Something still has to change. | It goes back to **Testing (this org only)** and can be submitted again. That applies to widgets from the testing organisation; others become **Suspended**. |
| **Suspend** | A widget must disappear everywhere right away, but may come back. | It stops rendering everywhere. **Restore** approves it again. |
| **Delete** | It should go for good. Only possible for approved or suspended widgets. | This can't be undone. Its ID stays reserved for the organisation that submitted it. |

If you're unsure, **suspend instead of deleting**.

If the page says the widget changed since you opened it, reload and review the new version, so you don't approve something you haven't seen.

### Telling the developer

This is automatic now. The developer gets an email when you approve, restore, deny, suspend, delete or import a widget, and you get one when something enters the queue. Emails are on only for the test environment and production. The widget's creator is the contact, whoever clicked **Submit for review**. The email goes to the account address, or to a notification address if the creator set one, which nobody else can see. The approval on the test environment says the widget isn't live for customers yet; another email follows on import.

**Deny** and **Suspend** require a reason (up to 1000 characters). The developer reads it word for word in the email, so write it to be clear without a follow-up. **Delete** has no reason. If its email fails, it only goes to the logs, with no warning.

**Write by hand only when the yellow warning bar appears.** It appears after a decision or an import when the developer could not be emailed, or no developer is known. Then write from support@ivicos.eu, for a denial for example like this:

> Subject: Your widget "NAME": changes needed
>
> Hello NAME,
>
> we reviewed your widget and can't approve it yet:
>
> - WHAT HAS TO CHANGE
>
> It's back in testing. Please fix it in the testing organisation and submit it for review again.

### Bringing it to production

Only approved widgets can be exported.

1. **Export:** open the approved widget on the test environment and click **Export**. You get a JSON file. It holds the developer's personal address and language in `developerContact`. Don't share it, and delete it after import.
2. **Production's reviewer organisation:** sign into production and switch to the reviewer organisation.
3. **Import:** in **External widgets**, click **Import widget** and choose the file.
4. **Read the dialog:** it shows every field. Watch for these messages:
   - **Replaces the existing widget:** check the listed changes.
   - **Origin missing from the frame allowlist:** have a developer add the origin and redeploy the client. Otherwise the widget stays blank once the frame policy is enforced.
   - **Who will be emailed:** the dialog says who is told the widget is live. If it says nobody will be emailed, write to the developer yourself.
   - **ID is reserved:** the import isn't possible, even if the existing widget was deleted. The widget needs a new ID, and its developer must change it in their page too.
5. **Confirm:** **Import and approve** approves the widget immediately. There's no second review step; the import is that step.

After that, every organisation in production can turn it on.

### When an approved widget changes

The developer edits it in the testing organisation. It then disappears from every other organisation on the test environment until it's approved again. Review it like a new submission, then export it and import it into production again. The import replaces the existing version; until then, production keeps running the old one.
