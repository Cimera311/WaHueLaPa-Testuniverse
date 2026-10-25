# O3: Kompakter Snapshot im lokalen Testsystem

Stand: 25.10.2026. Game-command **2026-10-25.02**, Snapshot-Vertrag **compact-v1**.
O3 ist vorbereitet und automatisch geprueft; lokale Aktivierung/HTTP-Abnahme und
vergleichbare Laufzeitmessungen stehen noch aus. Keine Live-Aktivierung.

## Was sich aendert

Der alte Snapshot laedt alle offenen Angriffe und die gesamte 30-Tage-PvP-Historie.
Historische Flotten, Kampfeingaben und Berichte aller Spieler gelangen deshalb bei
jedem Bauauftrag in Simulation und Commit. O3 fuehrt einen separaten, optionalen
Service-RPC `imperium_pvp_snapshot_compact` ein. Der bisherige RPC bleibt unveraendert.

| Daten / Verbraucher | Kompakter Pfad |
|---|---|
| Globale Ereignisse / Flottenlimits / PvE-Angriffsslots | Alle nicht zurueckgekehrten PvP-Angriffe aller Spieler bleiben vollstaendig in `attacks`. |
| Kampf / Unterstuetzer / gebundene Rueckkehrer | Weiterhin vollstaendige aktive Missionen, einschliesslich `returning` mit `awaitingUnload`. |
| Berichtskarten in projectPvP | Bis zu vier eigene/verteidigte/unterstuetzte abgeschlossene Berichte separat in `attackReports`; gleiche 30-Tage-Grenze. |
| In diesem Aufruf entstehende Kampfberichte/Rueckkehr | Bleiben in den aktiven Daten und werden normal mitgespeichert. |
| Commit | `attackReports` und `snapshotFormat` werden nicht an den Writer gesendet. |
| Berichtarchiv / Replay | Bestehende game_reports-/battle_log-RPCs und gespeicherte Historie bleiben erhalten. |
| Saves / Planeten / Social / Piraten / Epoch / Idempotenz | Bestehende Daten und Schreibwege, keine Entkopplung des globalen Writers. |

`projectPvP` kombiniert aktive Ergebnisse und historische Karten; bei gleichem
Ankunftszeitpunkt gilt die bereits im alten SQL-Snapshot vorgegebene UUID-Reihenfolge.
Die SQL-Auswahl der historischen vier Karten verwendet denselben Tiebreaker. Aktive
Berichte koennen die alten Karten wie bisher aus der finalen Vierer-Liste verdraengen.
Keine Angriffe werden geloescht, keine Berichte archiviert oder neu berechnet.

Auf Sebastians Wunsch vom 25.10. werden in der schnellen Vorschau nur die letzten
vier Angriffsberichte gezeigt (vorher wurden bis zu 30 uebertragen und fuenf
gezeigt). Das vollstaendige Archiv wird erst beim Oeffnen der Berichtssektion
geladen. Eifrige Archivabfragen bei Angriff/Verteidigung, nach Angriffstart und
Syncs ausserhalb der Berichtssektion entfallen; ebenso die zusaetzlichen Abfragen
pro aktiver Mission. Der Link zu allen Einsatzberichten oeffnet die Berichtssektion
mit Missionsfilter. Pagination/Archivsuche und Replay bleiben dort erreichbar.
Der Gleichheitsvergleich verwendet in beiden Snapshotpfaden die gewollte neue
Vierer-Vorschau; diese UI-Aenderung gegenueber dem vorherigen Bundle ist beabsichtigt.

## Nachweise vom 25.10.2026

Gleicher lokaler Weltstand in einer REPEATABLE-READ-Transaktion, fuer alle 14 Saves
jeweils alter und kompakter Snapshot (Abruf 22:01 Uhr Europe/Berlin). Vergleichszeit auf denselben Weltzeitpunkt
gesetzt; SQL-Installation und Snapshot-Nebeneffekte per ROLLBACK zurueckgenommen.
Danach normale Sync-Simulation und Browserprojektion in beiden Pfaden verglichen.

- Alter Snapshot: **1.173.390 Bytes** je Spieler.
- Kompakt: **531.231 bis 537.690 Bytes**, **54,18 bis 54,73 % weniger**.
- Simulierte Commit-Welt: ca. **1,173 MB -> 0,531 MB**, **rund 54,93 % weniger**.
- Alle 14 Simulationsergebnisse und Browserprojektionen waren identisch.
- Der echte Vergleich enthielt 217 abgeschlossene, aber keine aktiven PvP-Angriffe.
  Eigene historische Karten: 0 bis 4 je Spieler. Aktive Flotten, neu abgeschlossene
  Rueckkehr, Unterstuetzer, gleichzeitige Karten und Konfliktretries sind deshalb
  zusaetzlich durch synthetische Unit-/SQL-Integrationstests abgedeckt.
- Ein lokaler vollstaendiger pg_dump-Restore-Punkt wurde vor dem SQL-Vergleich
  erstellt (4.168.534 komprimierte Bytes, ignorierter Arbeitsbereich). Keine
  Wiederherstellungsprobe daraus behauptet; Backup und Spielerdaten nicht im PR.
- Das sind JSON-Payload-Bytes, keine gemessene Halbierung von Latenz oder Serverlast.
  Der globale Epoch und die Verarbeitung aller Saves bleiben bestehen.

## Aktivieren nach dem Merge

Nur das Testrepo und die lokale Datenbank `supabase_db_WahuelapaTest` verwenden.
Lokal main aktualisieren, beide Testprozesse beenden. Die neue SQL ist einmalig
vor dem ersten Start mit `-CompactSnapshot` erforderlich (wiederholbar):

```powershell
Get-Content -Raw .\supabase\pvp-snapshot-compact.sql | docker exec -i supabase_db_WahuelapaTest psql -X -U postgres -d postgres -v ON_ERROR_STOP=1
```

Nur bei erfolgreichem SQL-Abschluss starten:

```powershell
powershell.exe -NoProfile -ExecutionPolicy Bypass -File .\test-only\Start-Test.ps1 -Metrics -CompactSnapshot
```

Start-Test kopiert wie bisher das vollstaendige Dashboard-Bundle und sichert die
vorherige Function. Es setzt `GAME_COMMAND_SNAPSHOT=compact` nur fuer den lokalen
Serve-Prozess. Auth bleibt unveraendert; kein Cloud-Deployment.
Ein fehlender/falscher compact-v1-Vertrag fuehrt zu einer klaren 503 statt still
verschiedene Pfade zu mischen.

Danach anmelden, laden, Berichtskarten/Replay vergleichen, bauen, neu laden,
PvE starten/ankommen/rueckkehren lassen. Einen aktiven Rueckkehrer mit gebundener
Ladung gezielt testen; erst danach O3 lokal abnehmen. Noch kein Live-PR.

## Vergleich und Auswertung

Vor dem kontrollierten Messlauf Datenstand, Hardware, offene Clients, Warm-up und
Szenarien notieren. Fuer eine erste Byte-/Gleichheitspruefung ohne Commit:

```powershell
node test-only/compare-snapshots.mjs --all
```

Das Werkzeug installiert den neuen RPC nur in einer temporaeren Transaktion und
rollt alle Aenderungen zurueck. Es schreibt keine Saves/Reports und zeigt nur
anonymisierte Mengen/Bytes an. Der Vergleich sperrt waehrend der Abfrage wie die
normalen Snapshots den Welt-Epoch; nicht waehrend eines Lasttests ausfuehren.
Ohne `--all` wird nur ein vorhandener Spieler geprueft. Laufende Auftraege werden
im Speicher simuliert, aber deren Ergebnisse nie committed.

Fuer HTTP-Laufzeiten erst einen normalen Legacy-Start mit `-Metrics`, dann einen
vergleichbaren Start mit `-Metrics -CompactSnapshot` verwenden. Gleiche Szenarien,
Warm-up und Dauer; historische Werte nicht mit kontrollierter Last vermischen.
Der Logexport bleibt wie in O1. Die Auswertung trennt jetzt
`legacy/Auftrag/Aktion` und `compact/Auftrag/Aktion`, damit beide nicht vermischt
werden. Alte Logs ohne Modusfeld zaehlen als legacy.

## Rollback

Beide Testprozesse beenden und **ohne `-CompactSnapshot`** mit `-Metrics` neu starten.
Dadurch wird der unveraenderte alte Snapshot verwendet; die zusaetzliche SQL-Funktion
kann ungenutzt bestehen bleiben. Das neue Bundle unterstuetzt beide Pfade.
Optional erst nach Abschalten aller Compact-Clients:

```sql
drop function if exists public.imperium_pvp_snapshot_compact(uuid,uuid);
```

Keine Datenrueckspielung erforderlich, da Format und Writer der gespeicherten Welt
unveraendert bleiben. Bei Rueckkehr zum alten Code das vorherige Bundle kopieren;
keine alten Schema-/Einrichtungsskripte erneut ausfuehren.

Die neue Funktion bildet den bestehenden Snapshot-Vertrag inklusive Social/Piraten
explizit nach. Kuenftige Snapshot-Erweiterungen muessen deshalb beide RPCs gemeinsam
pflegen und gegen dieselben Szenarien vergleichen. Dieser Schritt optimiert nur
Payload/Historiendurchlauf, nicht die globale Konkurrenzordnung.

News-Entwurf (nur vorbereitet):
"🔧 Auf dem Testserver koennen Spielaktionen jetzt einen kleineren Weltsnapshot
verwenden. Abgeschlossene PvP-Angriffe werden dabei gezielt als eigene Berichte
bereitgestellt. Aktive Flotten und die gespeicherte Kampf-/Berichtshistorie bleiben
erhalten. Die Uebersicht zeigt die letzten vier Angriffsberichte; weitere Berichte laden
erst beim Oeffnen der Berichtssektion. Die Vergleiche zeigen rund 54 % weniger Snapshot-Daten; den
Einfluss auf Ladezeiten pruefen wir im anschliessenden lokalen Spieltest."
