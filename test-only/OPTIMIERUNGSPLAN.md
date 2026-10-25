# Serveroptimierung – Arbeitsplan und Agentenübergabe

Stand: 25.10.2026 · Arbeitsrepo: **Cimera311/WaHueLaPa-Testuniverse**

Diese Datei ist das gemeinsame Arbeitsprotokoll. Jeder bearbeitete Schritt erhält hier Status, Änderungen, Nachweise und eine konkrete Übergabe. Die Datei liegt im beim LIVE→TEST-Sync geschützten Ordner `test-only`.

## Ziel und Ausgangspunkt

Mehr gleichzeitig aktive Spieler sollen zuverlässig spielen können, ohne dass ein großer Kampf oder ein einzelner langsamer Auftrag die gesamte Welt blockiert. Optimierung erfolgt schrittweise auf dem Testsystem; erfolgreiche Änderungen werden anschließend gezielt für das Live-Repo vorbereitet. Keine Garantie „nie wieder Serverprobleme“: Ziel sind messbare Kapazität, Fehlerisolation und Wiederherstellbarkeit.

Grundlage: [Architekturanalyse vom 25.10.2026](../docs/multiplayer-plan-2026-10-25.md), [Betriebsanleitung](../TESTSERVER.md), [Projektregeln](../AGENTS.md).

Die damalige Analyse fand einen globalen Snapshot–Simulation–Commit-Pfad: Ein Spielerauftrag lädt und verarbeitet große Teile der Welt, konkurriert über einen globalen Epoch und kann die gesamte Arbeit mehrfach wiederholen. Synchrone Kämpfe vergrößern dieses Konfliktfenster. Vor Änderungen die tatsächlichen Funktionen und SQL-Definitionen erneut prüfen; Analysewerte sind historische Befunde, keine aktuellen Messungen.

## Bestätigter Stand

- Testrepo und separate lokale Supabase-Installation eingerichtet.
- Cloud-Daten in die lokale Testdatenbank kopiert; keine laufende Synchronisation.
- Lokale Anmeldung, Laden und Bauauftrag nach Neuladen durch Sebastian bestätigt.
- Startskript inklusive automatisch geöffnetem Edge-Fenster durch Sebastian erfolgreich gestartet.
- [Testrepo PR #2](https://github.com/Cimera311/WaHueLaPa-Testuniverse/pull/2): Start-/Update-Skripte und geschützte Konfiguration; gemergter Ausgangsstand `38334d7da199ce555893e9b5d7fe8fc375cd478a`.
- Damalige Prüfung: 518 Spieltests, 3 Webservertests, Build und vier GitHub-Checks erfolgreich. Diese Ergebnisse gelten nicht automatisch für spätere Änderungen.
- Noch **nicht** nachgewiesen: Mehrspieler-Kapazität, Lastfestigkeit, Wartungsmodus, asynchrone Kampfjobs, eigener Produktionsserver.
- Weitere Agenten können außerhalb dieses Chats arbeiten. Vor Arbeitsbeginn offene PRs und Branches prüfen; fehlender Eintrag hier beweist nicht, dass niemand begonnen hat.

## Umgebung und Grenzen

| Zweck | Adresse / Pfad |
|---|---|
| Testrepo auf Windows | `C:\Users\Manfred\Documents\GitHub\WaHueLaPa-Testuniverse` |
| Lokales Supabase-Projekt | `C:\Users\Manfred\Documents\Docker\Subabase\WahuelapaTest` |
| Lokale Projekt-ID | `WahuelapaTest` |
| Testspiel | http://localhost:3000/ |
| Supabase API | http://127.0.0.1:54321 |
| Supabase Studio | http://127.0.0.1:54323 |
| DB-Container | `supabase_db_WahuelapaTest` |
| Edge Function | `swift-handler` |
| Function-Quelle | `supabase/dashboard/game-command.ts` |
| Lokales Function-Ziel | `<Supabase-Projekt>/supabase/functions/swift-handler/index.ts` |

Start aus dem Testrepo:

```powershell
powershell.exe -NoProfile -ExecutionPolicy Bypass -File .\test-only\Start-Test.ps1
```

Nur lokale Function aktualisieren:

```powershell
powershell.exe -NoProfile -ExecutionPolicy Bypass -File .\test-only\Update-Test.ps1
```

Das Update kopiert das vorhandene Dashboard-Bundle und sichert die bisherige lokale Function. Es generiert das Bundle nicht aus geänderten Spielmodulen und führt keine SQL-Migrationen aus. Source, Dashboard-Bundle, SQL und getesteten Commit immer gemeinsam dokumentieren.

Der aktuelle Test verwendet **lokale Authentifizierung**. Cloud-Auth mit eigener Spieldatenbank ist erst das spätere Ziel. Der CLI-Entwicklungsstack ist keine fertige Produktionsinstallation. GitHub Pages hat derzeit keinen konfigurierten gemeinsamen Test-Backend-Zugang. Ein Agent hat nicht automatisch Zugriff auf Sebastians Windows-PC oder dessen localhost; Remote-Supabase-Werkzeuge können dagegen das Live-Projekt betreffen.

## Arbeitsregeln für übernehmende Agenten

1. Diese Datei, AGENTS.md, TESTSERVER.md und den relevanten Quellcode lesen. Aktuellen Branch/Commit, offene PRs und tatsächliches DB-Ziel feststellen.
2. Ein begrenztes Arbeitspaket auswählen. Zuständigen Agenten/Chat, Branch, Basiscommit und Status in der Tabelle eintragen. Bei überlappenden Änderungen zuerst abstimmen. Parallel bearbeitete Dokumenteinträge beim Zusammenführen erhalten.
3. Vor DB-Änderungen einen lokalen Sicherungs-/Restore-Punkt festhalten. Backups, Spielerdaten, Tokens, Passwörter und komplette Statusausgaben gehören nicht ins Repo.
4. Kleine überprüfbare Änderungen mit eigenem PR. Jede Implementierung aktualisiert **diese Datei im selben PR**: Was ist geändert, was wurde wirklich getestet, was fehlt?
5. Automatische Tests, echte lokale Spieltests und Lasttests getrennt berichten. „Implementiert“ ist nicht „lokal abgenommen“ und nicht „live“.
6. Blockierte oder abgebrochene Arbeit ebenfalls dokumentieren. Keine abgeschlossenen Einträge löschen; Korrekturen mit Datum ergänzen.
7. Test-only-Werkzeuge bleiben im Testrepo. Live-Übernahme erfolgt als gezielter separater PR mit benötigtem SQL, Bundle-Version und Rollback; keine pauschale Kopie des Testrepos.
8. Sebastian prüft und mergt nach AGENTS.md selbst. Keine Veröffentlichung von News ohne Auftrag.

**Sync beachten:** Die manuelle LIVE→TEST-Action ersetzt normalen Spielcode im Test-main. Sie erhält diesen Ordner, aber nicht sämtliche Optimierungen außerhalb davon. Während nicht nach Live übernommener Teständerungen keinen unkoordinierten Sync ausführen. Experimente auf eigenen Branches erhalten; erforderliche Live-Fixes gezielt integrieren.

## Status und Reihenfolge

Statuswerte: **OFFEN**, **IN ARBEIT**, **PR BEREIT**, **LOKAL ABGENOMMEN**, **LIVE ÜBERNOMMEN**, **BLOCKIERT**. „OFFEN“ bedeutet hier: keine abgeschlossene Umsetzung in diesem Protokoll belegt.

| ID | Arbeitspaket | Abhängigkeit | Status | Verantwortlich / Branch / PR |
|---|---|---|---|---|
| T0 | Isolierter Testbetrieb und Startwerkzeuge | – | LOKAL ABGENOMMEN | Einrichtungschat / Test-PR #2 |
| O1 | Messpunkte und reproduzierbare Baseline | T0 | IN ARBEIT | Codex / `codex/o1-command-metrics` / [PR #6](https://github.com/Cimera311/WaHueLaPa-Testuniverse/pull/6); lokale Baseline offen |
| O2 | Serverseitiger Wartungsmodus und Restore-Probe | T0 | OFFEN | – |
| O3 | Snapshot/Payload und Lesezugriffe entlasten | O1 | OFFEN | – |
| O4 | Spielerbezogene Commands und atomare Idempotenz | O1, O2; O3 auswerten | OFFEN | – |
| O5 | Dauerhafte Ereignisse und Worker | O4-Verträge festgelegt | OFFEN | – |
| O6 | Kämpfe als dauerhafte Jobs | O5 | OFFEN | – |
| O7 | Globale JSON-Zustände gezielt aufteilen | O4/O5; nach Messung | OFFEN | – |
| R1 | Realm-Kandidaten schrittweise aktivieren | Eigenes Schema-/Versionskonzept | OFFEN | Inventar existiert; noch keine pauschale Aktivierung |
| S1 | Eigener Server mit Cloud-Auth | Stabile Verträge, Restore und Betriebsplan | OFFEN | – |

**Empfohlener nächster Auftrag: O1.** Erst Engpässe getrennt messen, dann eine kleine Entlastung mit Vorher-/Nachher-Vergleich auswählen. O2 kann als separates, abgestimmtes Paket vorbereitet werden. Reihenfolge bei neuen Erkenntnissen begründet ändern und hier protokollieren.

## O1 – Messung und Baseline

- Phasen getrennt erfassen: Auth, Snapshot, Validierung/Simulation, Kämpfe, Commit, Antwortaufbau; zusätzlich Gesamtzeit, Bytes, Retries, Ereigniszahl und Ergebnisstatus.
- Request-/Korrelations-ID und Aktionstyp verwenden. Bei Retry zwischen Einzelversuch und Gesamtauftrag unterscheiden. Keine Tokens, E-Mails oder kompletten Saves loggen.
- Logging begrenzen und abschaltbar machen. Messung darf die Spielregeln und Antworten nicht unbeabsichtigt ändern.
- Reproduzierbare Szenarien: normaler Sync, Bauen/Forschen, Routen-Nachholen, PvE, großer PvP-Kampf, parallele Aufträge zweier Spieler.
- Umgebung, Commit, Bundle, DB-Stand, Spieler-/Historienmenge, Aufwärmphase und Laufdauer dokumentieren.

**Abnahme:** nachvollziehbare Baseline mit p50/p95/p99, Fehlerrate, Snapshot-Bytes und Retry-Verteilung; Messpunkte durch passenden Test geprüft; normaler Spielablauf lokal bestätigt. Historische Live-Werte nicht als lokale Baseline ausgeben.

## O2 – Wartungsmodus und Wiederherstellung

- Wartung serverseitig durchsetzen; alle schreibenden RPCs, Commands und später Worker berücksichtigen. Ein Browser-Overlay allein genügt nicht.
- In-flight-Aufträge und Beginn/Ende der Wartung definieren. Laufende Arbeiten kontrolliert abschließen oder sicher ablehnen.
- UI zeigt verständliche Wartungsmeldung; kein endloser Retry-Sturm. Adminzugang/Bypass ausdrücklich festlegen.
- Timerpolitik entscheiden: Weltzeit nachholen oder echte Pause; alle abhängigen Zeitpunkte konsistent behandeln.
- Lokales Backup in isolierter Zielumgebung wiederherstellen und relevante Counts, Constraints, Saves, aktive Flotten und Receipts vergleichen.

**Abnahme:** auch direkte Requests können Wartung nicht umgehen; Wiederöffnung und Restore getestet. Rollback und Umgang mit bereits laufenden Aufträgen dokumentiert.

## O3 – Payload und Lesezugriffe

- Zuerst alle Verbraucher des Snapshots und von `projectPvP` erfassen.
- Abgeschlossene Kampfdetails über Berichts-/Replay-Zugriffe bereitstellen, statt sie ständig im Simulations-Snapshot mitzuführen.
- Aktive Missionen, Rückkehrer und „wartet auf Lagerplatz“ erhalten. Keine Historienlöschung als vermeintliche Optimierung.
- Revision-basierte Reads, gezielte Caches und Client-Deduplizierung prüfen; Identität/Realm und Invalidierung berücksichtigen.

**Abnahme:** gleiche Spielresultate und vollständige Berichte bei kleinerem Payload; reproduzierbarer Vorher-/Nachher-Vergleich. Alten Pfad kontrolliert rückschaltbar halten.

## O4 – Spielerbezogene Commands

- Zuerst eigene Gebäude, Forschung, Werft, Reparatur und Verschrottung isolieren; vorzugsweise Spielergranularität statt zu früher Planetengranularität.
- Request-ID, Ressourcenänderung, Revision und Ergebnis-Receipt atomar behandeln. Gleicher Auftrag nach Timeout darf nicht doppelt abbuchen.
- **Keinen zweiten Writer am bisherigen globalen Writer vorbeiführen.** Gemeinsame Sperr-/Revisionsordnung während des Übergangs festlegen.
- Fällige eingehende Ereignisse vor einem Auftrag korrekt verarbeiten; spielerweite Forschung und mehrere Planeten berücksichtigen.

**Abnahme:** zwei Spieler können unabhängig bauen; Zwei-Geräte-Rennen, Retry nach Timeout, doppelte IDs und Gleichzeitigkeit mit alten Schreibwegen getestet. Keine verlorenen Ressourcen/Updates.

## O5 – Dauerhafte Ereignisse

- Persistente Ereignisse mit Fälligkeit, Status, Versuchen, Lease und Version modellieren; Realm-Isolation festlegen.
- Claim in kurzer DB-Transaktion; Verarbeitung und Finalisierung wiederholbar. Keine lange Transaktion während teurer Berechnung.
- Reihenfolge für gleiche Zeitpunkte definieren; Queue-Alter, Wiederholungen und Fehlerzustände beobachten.
- Kein offener Browser als Voraussetzung für fällige Vorgänge.

**Abnahme:** Worker-Neustart, doppelte Zustellung, abgelaufene Lease und fehlerhaftes Ereignis verlieren keine Aufträge und blockieren nicht die gesamte Welt.

## O6 – Asynchrone Kampfjobs

- Betroffene Flotten/Zustände reservieren; unveränderlichen Input, Seed, Regelversion und Teilnehmerrevisionen sichern.
- Rechnen außerhalb der DB-Transaktion; Ergebnis genau einmal atomar übernehmen. Aktuelle Lease und Versionen vor Finalisierung prüfen.
- Unterstützer, Reparaturdock, PvE, wartende Rückkehrer und gleichzeitige Angriffe auf dasselbe Ziel einbeziehen.
- Rückflug auf logischer Ereigniszeit aufbauen. Rechenzeit nicht pauschal von beliebigen Timern abziehen.
- Anzeige „Kampf wird berechnet“ anbieten; Browser ist nicht autoritativer Kampfworker.

**Abnahme:** identische Resultate bei gleichem Input/Seed, kein doppelter Loot/Verlust, Wiederaufnahme nach Crash. Großer Kampf beeinträchtigt unabhängige Commands innerhalb des vorher festgelegten Budgets.

## O7 – Datenmodell gezielt entkoppeln

- Nach Messung Social-Missionen, Piratenzustände, Trades und aktive Flotten aus globalen JSON-Zeilen in geeignete Datensätze überführen.
- Bestehende Spieler-Saves zunächst behalten, soweit möglich. Indizes anhand realer Abfragepläne auswählen.
- Berichtsaufbewahrung separat entscheiden; keine ungefragte Löschung von Berichten oder angeblich unbenutzten Indizes.

**Abnahme:** Flotten-, Ressourcen- und Ranking-Invarianten erhalten; Migration und Rückfall mit Testdaten erprobt.

## R1 – Realm-Konfiguration

Das Inventar `REALM-CANDIDATE[id]` und der auskommentierte Katalog in `src/realm-config.js` sind vorbereitet; sie aktivieren noch keine neuen Regeln.

- Kandidaten einzeln anhand der Originalstellen prüfen; kommentierte Kopien können veralten.
- Validiertes, versioniertes Schema und serverseitigen Resolver festlegen.
- Browser-Prognose und Server verwenden dieselben aufgelösten Regeln.
- Bei neuen Aufträgen Kosten/Dauer/Regelversion festhalten; bestehende Aufträge behalten ihren Vertrag.
- Betriebsparameter, Sicherheitsprüfungen und historische Kompensationen nicht mit frei änderbarer Spielbalance vermischen.

**Abnahme:** Defaults reproduzieren bestehendes Verhalten; laufende Aufträge und existierende Welten bleiben konsistent. Jede Aktivierung erhält eigenes Test-/Änderungsprotokoll.

## S1 – Eigener Server, Supabase Cloud nur für Auth

- Auth-Transport von Game API und sämtlichen Bericht-/Galaxie-/Community-/Ranking-Zugriffen trennen.
- Cloud-Identität auf dem Server prüfen und lokale Realm-Berechtigung kontrollieren.
- Lokale Spieleridentitäten mit Cloud-UUID planen: Fremdschlüssel auf lokale `auth.users` entstehen nicht automatisch durch Cloud-Login.
- DB-Identität bei Connection-Pooling transaktionslokal halten. Keine Service-Role im Browser.
- Produktionsbetrieb separat aufbauen: Backups/Restore, Monitoring, Updates und Ressourcenlimits.
- Umschaltung: Schreibwartung, Worker kontrolliert stoppen, finales Backup/Restore, Datenvergleich, Auth-/Spieltests, dann öffnen.
- Nach neuen lokalen Schreibzugriffen ist einfaches Zurückschalten auf die alte Cloud-DB kein verlustfreier Rollback.

**Abnahme:** dokumentierter Probelauf einschließlich Auth-Ausfall/Schlüsselrotation, Restore und Rückfallstrategie. Keine parallelen produktiven Writer.

## Gemeinsame Test- und Freigabekriterien

Pro Änderung passende Tests auswählen; keine Zahl von Tests als Kapazitätsbeweis verwenden.

| Ebene | Erforderlicher Nachweis |
|---|---|
| Automatisch | Relevante Unit-/Integrationstests, Build, CI; konkrete Befehle und Ergebnisse |
| Lokales Spiel | Anmeldung, Laden, betroffene Aktion, Neuladen; erwartetes und tatsächliches Ergebnis |
| Konkurrenz | Zwei Spieler/Clients, Retry nach Timeout, Idempotenz und Konflikte |
| Last | Nur isoliert; zunächst kleine Last, dann 10/25/50/100 aktive Spieler nach Tragfähigkeit |
| Wiederherstellung | Backup-/Restore oder passender Rückfalltest bei Schema-/Persistenzänderungen |
| Live-Übernahme | Getrennter PR, SQL-Reihenfolge, Bundle-Version, Rollback und Freigabestatus |

Vorgeschlagene, **noch nicht erreichte oder zugesagte** Zielwerte aus dem Konzept:
bei 50 aktiven Spielern p95 normaler Commands <500 ms, p99 <1 s; keine serverbedingten
5xx im 30-Minuten-Szenario; keine Doppelbuchungen/verlorenen Aufträge; großer Kampf
verschlechtert p95 unabhängiger Commands höchstens um 20 %. Vor Bewertung Hardware,
Datenvolumen und Szenarien festschreiben. Lokale Ergebnisse nicht ungeprüft auf die
Cloud-Micro-Instanz übertragen.

## Fortschrittsprotokoll

Neue Einträge unten anhängen. Statusübersicht oben im selben Commit aktualisieren.
Bei fehlendem Nachweis ausdrücklich „nicht getestet“ schreiben. Zu einem alten Eintrag
Korrektur ergänzen statt dessen Historie zu überschreiben.

### 2026-10-25 – T0: Testumgebung aufgebaut

- Verantwortlich: Einrichtungschat mit Sebastian.
- Änderung: lokale Datenkopie, swift-handler, geschützte Laufzeitkonfiguration und Start-/Update-Skripte.
- Referenz: Test-PR #2, Merge-Ausgangspunkt `38334d7da199ce555893e9b5d7fe8fc375cd478a`.
- Automatisch: 518 Spieltests, 3 lokale Webservertests, Build, Windows-Skripttests; alle damaligen CI-Checks grün.
- Manuell: Sebastian bestätigt Anmeldung/Laden, Bauauftrag nach Neuladen und automatischen Start.
- Grenze: kein Mehrspieler-/Lasttest; keine Serveroptimierung dadurch nachgewiesen.
- Nächster Schritt: O1 übernehmen, aktuelle parallele Arbeiten prüfen.

### 2026-10-25 – Übergabeplan angelegt

- Änderung: diese Arbeitsdatei mit Reihenfolge, Abnahmekriterien und Protokollvorlage.
- Status: Dokumentation vorbereitet; keine Umsetzung von O1–S1 behauptet.
- Prüfung: Abgleich mit vorhandener Architekturanalyse, Testrepo-Inventar und bestätigtem Einrichtungsverlauf.
- SQL / Edge / Live: keine Änderungen erforderlich.

### Vorlage für jeden weiteren Arbeitsschritt

```markdown
### YYYY-MM-DD – ID: Kurzbezeichnung
- Verantwortlich / Chat:
- Status vorher → nachher:
- Basiscommit / Branch:
- PR / Implementierungscommit:
- Ziel und Umfang:
- Geänderte Dateien / SQL / Bundle-Version:
- Was wurde konkret geändert und warum:
- Abweichung vom Plan / Entscheidung:
- Automatische Prüfung (Befehl, Ergebnis, Nachweis):
- Lokaler Spieltest (wer, wann, Szenario, Ergebnis):
- Messung vorher/nachher (Umgebung, Datenstand, Last, Dauer, Kennzahlen):
- Nicht getestet / bekannte Grenzen:
- Lokale Aktivierung (exakte Reihenfolge):
- Backup / Rollback:
- Live-Übernahme (nicht begonnen / PR / aktiviert mit Nachweis):
- Offene Punkte / Blocker:
- Nächster konkreter Schritt:
```

## Kopierbarer Auftrag für den nächsten Agenten

> Lies zuerst AGENTS.md, TESTSERVER.md und test-only/OPTIMIERUNGSPLAN.md im Repo
> Cimera311/WaHueLaPa-Testuniverse. Prüfe aktuelle Branches und offene PRs.
> Übernimm das nächste freie, passende Arbeitspaket und dokumentiere Zuständigkeit,
> Branch und Basiscommit. Implementiere es begrenzt im Testsystem. Aktualisiere
> Status und Fortschrittsprotokoll im selben PR mit Änderungen, Tests, Messwerten,
> offenen Punkten und nächstem Schritt. Unterscheide vorbereitet, automatisch
> geprüft, lokal abgenommen und live übernommen. Keine Live-Datenänderung oder
> Veröffentlichung allein aufgrund dieses Übergabeauftrags.

### 2026-10-25 - O1: Messpunkte und lokale Auswertung vorbereitet

- Verantwortlich: Codex, Chat zur ersten Optimierung; Branch codex/o1-command-metrics.
- Status: OFFEN -> IN ARBEIT. O1-Abnahme bleibt bis zu echter lokaler Baseline und Spieltest offen.
- Basiscommit: 1227e162e51c04f4d493ad8b9075c3a732782174. Offene PRs bei Start: keine; vorhandene Branches ohne O1-Ueberlappung.
- Umfang: optionale Messung fuer Auth, Snapshot, Simulation inkl. Validierung, PvP/PvE-Resolver, Commit, Save-Read, Projektion und Serialisierung. Ein Datensatz pro gesampeltem HTTP-Auftrag, einzelne Konfliktversuche mit Zeiten/Bytes/Ereignissen.
- Dateien: src/server-metrics.js, server-service.js, server-world.js, pirates-world.js; Function-Entrypoint und drei Dashboard-Bundles; tests/server-metrics.test.js; Start-Test.ps1, Export-Metrics.ps1, summarize-metrics.mjs und O1-MESSUNG.md.
- Bundle: O1 2026-10-25.01; vollstaendig neu aus den Modulen gebaut mit esbuild 0.25.12. SQL: keine.
- Logging: standardmaessig aus, lokale Aktivierung mit -Metrics; feste Labels und generierte Korrelations-ID. Keine Spieler-IDs, Tokens, Saves oder Fehlermeldungen in Metriken.
- Automatisch: gezielte 12 Tests fuer Messung/Save-Diagnose bestanden; PvP/PvE 37 bestehende Tests bestanden; Website-Build und PowerShell-Syntax bestanden. Abschluss: node --test --test-concurrency=2 tests/*.test.js: 526/526 erfolgreich; node --test test-only/*.test.mjs: 3/3 erfolgreich (inkl. HTTP). Test-Tools.ps1: Kopieren, Sicherung, Idempotenz und falsches Projekt erfolgreich geprueft. Releasearchiv: 3/3 erfolgreich. GitHub-Checks separat am PR pruefen.
- Lokaler Spieltest / echte Baseline / Last / Konkurrenz zweier echter Spieler: nicht getestet. DB und laufende Testinstallation nicht veraendert. Testfixture mit erzwungenen Konflikten ist kein Mehrspieler-Lastnachweis.
- Aktivierung: Test-PR pruefen/mergen, lokal aktualisieren, beide Testprozesse beenden; Start-Test.ps1 -Metrics; anmelden/laden/bauen/neuladen; Szenarien und Logexport nach O1-MESSUNG.md.
- Messkosten: Snapshot-Bytes benoetigen zusaetzliche Serialisierung nur bei ausgewaehlten Requests; deren Zeit wird separat erfasst. Simulationszeit enthaelt Kampfzeit; nicht addieren. Ereigniscounter umfasst die globale World-Schleife, nicht jeden internen Routenschritt.
- Backup/Rollback: keine DB-Migration. Update-Test sichert vorherige lokale Function; Messung durch normalen Neustart ausschalten oder vorheriges Bundle zurueckkopieren.
- Live-Uebernahme: nicht begonnen. News nur als Entwurf in O1-MESSUNG.md.
- Naechster konkreter Schritt: lokale Abnahme und Baseline fuer Sync/Bauen/Routen/PvE/PvP/zwei Spieler; danach O3 anhand gemessener Bytes und Laufzeiten auswaehlen.

### 2026-10-25 - O1: Abschluss der automatischen Vorbereitung

- PR: https://github.com/Cimera311/WaHueLaPa-Testuniverse/pull/6 (Sebastian mergt selbst).
- Bundle-Quellcommit: 3e02972e4fc6c3fade199b63fe440036e4a7a5c0; Archivcommit: 53238d529e0ad01d8e8173a14e96f24cc134df4a.
- Bundle 2026-10-25.01: SHA256 596cb558cdef5a7bc6a0b0f7db197ad8a1bc9b2d42ec29e8d37c93522c644e0f. Drei Dashboard-Dateien und archiviertes TS/TXT bytegleich.
- Alle 526 Spieltests sowie drei lokale Webservertests erfolgreich. Website-Build, PowerShell-Parser und Test-Tools.ps1 erfolgreich. Testumgebung fuer automatische Tests: Windows, Node 24.22.1; kuenstliche Fixtures/SQL-Tests, kein echter Supabase-Lastlauf.
- Lokale Archivchecks wurden mit den aufgezeichneten LF-Bytes ausgefuehrt; die aus dem Windows-Checkout kopierten historischen Archive enthielten CRLF. Historische Releases und Pruefsummen werden im PR nicht geaendert.
- Parallel eingegangener main-Stand 01fbcf81e0bad553eeecb91cb4119dd30bb9c1f9 aendert nur index.html/src/style.css; keine Dateikollision mit O1. GitHub prueft den Merge-Stand.
- O1 bleibt IN ARBEIT bis lokale Anmeldung/Aktion/Neuladen und Baseline dokumentiert sind. Diese Vorbereitung verspricht keine kuerzeren Ladezeiten.
