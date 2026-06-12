# Elbliebe — Date-Ideen für Dresden

**Live:** https://zeroks77.github.io/elbliebe/

Date-Ideen passend zu dem, was gerade in und um Dresden los ist (Filmnächte am Elbufer,
Palais Sommer, Elbhangfest u. v. m.), mit Stimmungs-Filtern und einem Einladungs-Generator:
animierte, live „gezeichnete" SVG-Motive (Blüte, Herz, Tulpe), fallende Blütenblätter und
Teilen per Share-Funktion oder Zwischenablage.

Eine einzige HTML-Datei, kein Server, keine Tracker — alles passiert lokal im Browser.
Termine vor dem Date bitte auf den offiziellen Veranstaltungsseiten prüfen.

## Automatische Events (GitHub Actions)

Die Datei `events.json` wird täglich um ~06:17 Uhr automatisch über die
**Ticketmaster Discovery API** (und optional **Eventbrite**) aktualisiert.
Die Seite mischt diese Live-Events mit der kuratierten Highlight-Liste.

**Einrichtung der API-Keys** (einmalig, kostenlos):
1. Ticketmaster-Key holen: https://developer.ticketmaster.com → registrieren → „Discovery API"-Key kopieren
2. (optional) Eventbrite-Token: https://www.eventbrite.com/platform/api → „Private Token"
3. Im GitHub-Repo unter **Settings → Secrets and variables → Actions → New repository secret**:
   - `TICKETMASTER_KEY` = dein Ticketmaster-Key
   - `EVENTBRITE_TOKEN` = dein Eventbrite-Token (optional)
4. Unter **Actions → „Events aktualisieren" → Run workflow** einmal manuell starten.

Ohne Keys bleibt die kuratierte Liste aktiv — die Seite funktioniert immer.
