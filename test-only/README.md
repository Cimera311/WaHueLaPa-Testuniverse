# Dateien fuer das Testrepo

Dieser Ordner bleibt bei **Sync LIVE to TEST (manual)** erhalten.

- `Start-Test.ps1`: Docker/Supabase, lokale Game-command und Website starten.
- `Update-Test.ps1`: aktuelle Dashboard-Game-command aus dem ausgecheckten Branch
  lokal kopieren; vorherige Version sichern und Hash pruefen.
- `local-server.mjs`: lokale Browser-Konfiguration liefern, ohne Spielquellen zu aendern.
- `overrides/`: Pfade relativ zur Repo-Wurzel; werden nach jedem Sync uebernommen.
  `overrides/src/cloud-config.js` verhindert eine voreingestellte Live-Verbindung.
- `.runtime/`: ignorierte lokale Laufzeitdaten; keine privaten Schluessel speichern.

Vollstaendige Anleitung: [TESTSERVER.md](../TESTSERVER.md).

## Serveroptimierung und Agentenübergabe

[OPTIMIERUNGSPLAN.md](OPTIMIERUNGSPLAN.md) enthält die nächsten Arbeitspakete,
Abnahmekriterien und das gemeinsame Fortschrittsprotokoll. Vor einer Optimierung
lesen; Änderungen, Tests und offene Punkte im selben PR dort dokumentieren.
