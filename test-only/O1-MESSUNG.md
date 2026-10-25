# O1: Messung im lokalen Testsystem

Stand: 25.10.2026. Bundle-Version: **2026-10-25.01 (O1)**.
Diese Instrumentierung aendert weder SQL noch Spielregeln. O1 bleibt IN ARBEIT,
bis echte lokale Messwerte und der Spieltest dokumentiert sind.

## Aktivieren

Test-PR pruefen und mergen, lokal main aktualisieren. Beide bisherigen Test-Terminals
beenden und im Testrepo starten:

```powershell
powershell.exe -NoProfile -ExecutionPolicy Bypass -File .\test-only\Start-Test.ps1 -Metrics
```

Das Startskript kopiert das eingecheckte Bundle mit Sicherung wie bisher und startet
nur den lokalen swift-handler mit `GAME_COMMAND_METRICS_RATE=1`. Das erzeugt einen
kompakten JSON-Datensatz je HTTP-Auftrag (OPTIONS ausgenommen). Ohne `-Metrics`
bleibt die Messung aus. Abschalten: beide Test-Terminals beenden, normal neu starten.
Die separate Env-Datei liegt ignoriert in `test-only/.runtime/metrics.env`.

Keine SQL ausfuehren, keine Cloud-Funktion deployen. Auth bleibt unveraendert.

## Messwerte einsammeln

Erst anmelden, laden, einen kleinen Bauauftrag starten und neu laden. Funktioniert
das erwartungsgemaess, Szenarien unten einzeln durchfuehren. Ungefilterte Logs und
Zugangsdaten nicht ins Repo stellen. Je Szenario den passenden Zeitraum exportieren:

```powershell
powershell.exe -NoProfile -ExecutionPolicy Bypass -File .\test-only\Export-Metrics.ps1 -Since 10m
```

Der Export behaelt ausschliesslich Metrikzeilen und speichert sie in `.runtime`.
Standardcontainer: `supabase_edge_runtime_WahuelapaTest`; bei abweichendem Namen
`-Container NAME` uebergeben. Erneute Auswertung einer Messdatei:

```powershell
node test-only/summarize-metrics.mjs test-only/.runtime/metrics-ZEITSTEMPEL.jsonl
```

Die Auswertung gruppiert nach Auftrag/Aktion und zeigt p50/p95/p99 (nearest rank),
Fehlerquote fuer HTTP >=400, Antwortbytes, Snapshotbytes pro Versuch und Retryverteilung.
Mit wenigen Werten sind insbesondere p95/p99 wenig aussagekraeftig. Sampling fuer
Vergleichslaeufe gleich lassen; Standard des Handlers ist aus, Werte 0 bis 1.

## Reproduzierbare Szenarien und Protokoll

Jedes Szenario isoliert ausfuehren, Hintergrundclients und deren Syncs dokumentieren.
Pro Szenario drei Minuten aufwaermen, anschliessend zehn Minuten messen; klein starten.
Keine Zugangsdaten fuer Spieler neu anlegen oder vorhandene Passwoerter aendern.
Fuer Wiederholungen gleicher Kampf-/Routenszenarien ist derselbe isolierte DB-Stand
noetig. Vor einem Restore alle Clients beenden und den Restore-Plan separat pruefen.

| Szenario | Ablauf / zu dokumentierender Zustand |
|---|---|
| Normaler Sync | Ein angemeldeter Browser, keine faelligen Kaempfe; Anzahl automatischer Syncs und Messdauer erfassen. |
| Bauen/Forschen | Gleiches Ausgangslager, gleicher Planet, gleiche Stufe; erlaubte Auftraege starten, jeweils Neuladen pruefen. |
| Routen nachholen | Identischer Routen-/Schiffsstand, gleiche Abwesenheitsdauer, dann Sync; Stopps und Nachholzeit festhalten. |
| PvE | Identische Station, Flotte, Forschung und Regelversion; Sync beim Eintreffen, Kampfbericht und Rueckkehr pruefen. |
| Grosser PvP-Kampf | Flotten, Tech, Seed/Regelversion und Ankunftszeit festhalten; Eingaben nur mit Testdaten vorbereiten. |
| Zwei Spieler | Zwei vorhandene Testkonten in getrennten Browserprofilen; synchron bauen/syncen, Fehler und Wiederholungen pruefen. |

Vorher/nachher dieselbe Hardware, derselbe Datenstand, dasselbe Szenario und dieselbe
Samplingrate verwenden. Eine kleine kuenstliche Testfixture ersetzt diese Messung nicht.

Folgende Vorlage pro Lauf in OPTIMIERUNGSPLAN.md ergaenzen:

```text
Datum / Szenario / Verantwortlich:
Quellcommit / Bundle-SHA256 / SQL-Stand:
Windows / CPU / RAM / Docker-Limits / Supabase-Version:
DB-Backup-Referenz (ohne private Pfade oder Inhalte):
Spieler / Planeten / Historienmenge / aktive Missionen:
Flotten / Tech / Kampfregel / Routen / Nachholzeit:
Clients / Warm-up / Messzeit / Anzahl Requests:
p50 / p95 / p99 / Fehlerquote / Snapshotbytes / Retryverteilung:
Anmelden / Laden / Aktion / Neuladen / Ergebnis:
Grenzen / Vergleichbarkeit / naechster Schritt:
```

## Interpretation und Grenzen

- `totalMs`: Zeit im HTTP-Handler bis zur fertigen Response, ohne Netzwerk/Gateway
  und ohne das Schreiben der Logzeile. Keine Browser-Ende-zu-Ende-Latenz.
- `auth`, `snapshot`, `commit`, `read`: jeweilige Aufrufe inklusive Client-Transport;
  keine isolierte SQL-Ausfuehrungszeit.
- `simulation`: gesamter processWorld-Aufruf einschliesslich Savevalidierung.
  `pvp` und `pve` messen die tatsaechlichen Kampfresolver und sind darin enthalten.
  Phasen deshalb nicht einfach addieren.
- `events`: verarbeitete Ereignisse der globalen World-Schleife; keine vollstaendige
  Zaehlung aller internen Produktions-/Routenschritte. Kampfcounter zaehlen Resolver.
- `projection` und `serialization`: Antwortprojektion und JSON-Ausgabe.
- `snapshotBytes`: UTF-8-Bytes des erneut serialisierten Snapshot-JSON; keine
  komprimierten Netzwerkbytes. Die zusaetzliche Arbeit wird unter `snapshotBytes`
  in Millisekunden erfasst und findet nur bei ausgewaehlten Requests statt.
- `attempts` maximal fuenf je Auftrag; Konfliktversuche, Zeiten und Ereignisse bleiben
  getrennt. Summen umfassen auch verworfene Simulationsversuche.
- Eine neue zufaellige Korrelations-ID je HTTP-Aufruf, keine Spieler-/Request-ID,
  Tokens, Namen, E-Mails, Saves oder Fehlermeldungen im Metrikdatensatz.
- Logging ist gesampelt und auf eine Zeile je ausgewaehltem Auftrag begrenzt, kein
  globales Rate-Limit. Fuer laengeren Betrieb niedrigere Rate bewusst konfigurieren.
- Kein Lasttest und keine Kapazitaetsgarantie durch Unit-Tests. O3 erst anhand der
  tatsaechlichen Baseline auswaehlen; bei unerwarteten Effekten Messung ausschalten.

## Rebuild und Rollback

Das Bundle wird mit esbuild **0.25.12**, `--bundle --format=esm --platform=neutral
--target=es2022 --external:npm:*` aus `supabase/functions/game-command/index.ts`
gebaut. Die drei Dashboard-Dateien muessen bytegleich sein. Das Headerkommentar
benennt O1 2026-10-25.01; der normale Website-Build regeneriert dieses Bundle nicht.

Rollback ohne DB-Eingriff: vorherigen Branch/Bundle auschecken und Update-Test.ps1
ausfuehren; die Function-Sicherung liegt wie bisher im lokalen Docker-Projekt unter
backups/edge. Bei laufender Edge-Funktion Neuladen pruefen, ggf. Serve neu starten.
Test-only-Tools bleiben im Testrepo; keine pauschale Live-Uebernahme.

News-Entwurf (nur Vorbereitung, keine Veroeffentlichung):
"🔧 Auf dem Testserver bereiten wir gezielte Performance-Messungen vor. Damit sehen
wir, welche Schritte beim Laden, Bauen und bei Kaempfen Zeit brauchen. Spielregeln
und Bedienung bleiben gleich. Die Ergebnisse folgen nach den lokalen Testlaeufen."
