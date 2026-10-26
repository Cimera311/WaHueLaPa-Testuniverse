# Routen-Nachholung: Produktionswerte wiederverwenden

TEST ONLY · Entwurf am 26.10.2026. Keine Live-Aktivierung.

**BLOCKIERT durch getrennte PC-Verbindung:** Quellcode und gezielte Tests sind gesichert.
Das lokal gebaute Bundle/Releasearchiv 2026-10-26.01 konnte vor dem Verbindungsabbruch
nicht in den Branch uebernommen werden; der letzte Gesamttest ist nicht bestaetigt.
Diesen PR noch nicht aktivieren. Die untenstehende Aktivierung gilt erst nach
vollstaendiger Archivierung und finalen Checks.

## Änderung

advance() berechnete stats() fuer Energieverhaeltnis, Produktionsraten und Lagerkapazitaet bei jedem Routenereignis erneut, teils mehrfach pro Planet. Die Werte haengen nicht von Cargo oder aktuellen Ressourcen ab. Ein lokaler Map-Cache innerhalb genau eines advance()-Aufrufs verwendet die Werte erneut.

Nach Forschung wird der gesamte Cache verworfen, nach Ausbau/Rueckbau der betroffene Planet. Nach dem externen Bergungs-Callback wird ebenfalls alles verworfen. Neue Planeten erhalten beim ersten Zugriff eigene Werte. Kein Cache ueber Commands, Spieler oder advance()-Aufrufe hinweg; keine neuen Felder in Saves. Ereignisreihenfolge, Rundenzahl, Ladung, Treibstoff und Rundungsoperationen bleiben erhalten.

## Nachweis und Grenzen

- Eingefrorene Kopien der 14 lokalen Spielstaende, ein gepaarter Lauf jeweils 24 Stunden vorwaerts unter Node 24 auf demselben Windows-Rechner. Keine World-Commits oder Veraenderung der echten Missionen.
- Gesamtdauer: bisher 10667,25 ms, neu 6038,52 ms, 43,4 % weniger. Teuerster Spielstand mit sechs aktiven Routen: 6312,82 -> 4088,70 ms.
- Alle kompletten Nachhol-Spielstaende deepStrictEqual, einschliesslich Ressourcen, Statistiken, Reports, Flotten und Forecasts.
- Einzelmessungen von Wandzeit, kein CPU-Profil, keine wiederholten Quantile und kein Cloud-/Mehrspieler-Lastnachweis. Reihenfolge und JIT koennen Zeiten beeinflussen. Der globale Snapshot-/Commit-Pfad und alle Ereignisse bestehen weiterhin. Selbst 4 Sekunden koennen das gehostete CPU-Limit ueberschreiten.
- Reproduzierbarer Vergleich im Git-Checkout: node test-only/compare-route-catchup.mjs e9fdb0160eb1b0ffe941fb8d47aaf5b8cd3ac50d. Er liest nur die lokale Testdatenbank in einer zurueckgerollten Transaktion und vergleicht 1h/24h je Spielstand. Ausgabe enthaelt nur anonyme Indizes und Zeiten.

## Aktivierung nach Merge

1. Test-PR pruefen und selbst mergen; lokal main mit git pull --ff-only aktualisieren.
2. powershell.exe -NoProfile -ExecutionPolicy Bypass -File .\test-only\Update-Test.ps1 -ReloadEdge
3. Browser Strg+F5. Wenn Umgebung gestoppt: Start-Test.ps1 -Metrics -CompactSnapshot.

Vollstaendige Game-command 2026-10-26.01 muss vor Freigabe als TS/TXT im Releasearchiv und im Dashboard ergaenzt werden. Das lokale Update kopiert das ganze Bundle nach swift-handler/index.ts; vorhandene Auth-Einstellungen bleiben erhalten. **Keine SQL erforderlich. Kein Cloud-Deploy fuer diesen Test.** Fuer eine spaetere Live-Uebernahme ist ein separater PR noetig; Test-Flugfaktor 0,1 nicht mitnehmen.

Manuell nach Aktivierung: laufende Route, Rundenstatistik, Ressourcen, Pause/Fortsetzen und Neuladen pruefen; danach Ausbau/Forschung waehrend laufender Route. Die lokale Benutzerabnahme dieses neuen Bundles steht noch aus.

Rollback: vorheriges Bundle 2026-10-25.03 komplett lokal zurueckkopieren und Runtime neu starten; Browser und Server gemeinsam auf vorherigen Code wechseln. Kein Datenrestore und keine neue SQL.

## News-Entwurf

⚙️ Handelsrouten werden im Testsystem effizienter nachberechnet. Unveraenderte Produktionswerte werden waehrend der Nachholung wiederverwendet; bei Forschung und Gebaeudeaenderungen werden sie neu berechnet. Ladung, Treibstoffkosten und Flugzeiten bleiben gleich. Noch nicht live veroeffentlicht.
