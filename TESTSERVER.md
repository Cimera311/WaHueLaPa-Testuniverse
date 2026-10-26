# Lokale Testumgebung unter Windows

Die Testdatenbank ist eine eigenstaendige Kopie. Start und Code-Update importieren
keine Daten, setzen keine Datenbank zurueck und deployen nichts in die Cloud.
Auth, Spielstaende und swift-handler verwenden hier die lokale Supabase-Instanz.
Der spaetere Betrieb mit Cloud-Auth ist ein separates Vorhaben.

## Einmaliger Wechsel von der manuellen Einrichtung

1. PR im **Testrepo** mergen. Beide alten Terminalprozesse (`http-server` und
   `functions serve`) mit Strg+C beenden. Docker darf weiterlaufen.
2. Im Testrepo die beiden bisherigen lokalen Anpassungen sichern und main holen:

```powershell
Set-Location "C:\Users\Manfred\Documents\GitHub\WaHueLaPa-Testuniverse"
git stash push -m "Lokale Verbindung vor Startskript" -- src/cloud.js src/cloud-config.js
git switch main
git pull --ff-only
```

Bei einem Git-Fehler anhalten und den Fehler klaeren; kein Reset/Force verwenden.
Den Stash behalten, aber nicht wieder einspielen: Diese Konfiguration liefert jetzt
der lokale Webserver. Andere lokale Aenderungen werden durch diese Befehle nicht verworfen.

## Starten

```powershell
powershell.exe -NoProfile -ExecutionPolicy Bypass -File .\test-only\Start-Test.ps1
```

Der Bypass gilt nur fuer diesen Prozess; keine globale Policy wird geaendert.
Das Skript verwendet Node und die bereits installierte Supabase-CLI im Docker-Ordner;
es installiert oder aktualisiert keine Pakete. Standardordner:
`<Dokumente>\Docker\Subabase\WahuelapaTest` (Schreibweise **Subabase**).
Bei abweichendem Ordner `-SupabaseDir "D:\Docker\Subabase\WahuelapaTest"` angeben.
Projekt-ID muss `WahuelapaTest` sein, API-Port 54321.

Der Ablauf:

1. Lokale Game-command aus dem aktuell ausgecheckten Repo kopieren, falls sie anders ist.
   Die vorherige Datei bleibt unter `<SupabaseDir>\backups\edge` gesichert.
2. Docker Desktop bei Bedarf starten und auf die Engine warten, dann `supabase start`.
3. Lokale API-Adresse pruefen und Publishable Key aus `supabase status -o json` lesen.
   Falls die CLI ihn dort nicht liefert, fragt das Skript nach dem **lokalen**
   `sb_publishable_...` aus der Startausgabe. Alternativ `-PublishableKey "sb_publishable_..."`.
   Secret-/Service-Role-Schluessel werden nicht akzeptiert.
4. Der Teststarter erzeugt die Edge-Runtime ueber die installierte CLI und setzt danach
   bei jedem Start 30 Sekunden Soft-/60 Sekunden Hard-CPU-Limit. Er trennt ausschliesslich
   seinen eigenen CLI-Prozessbaum per taskkill /T /F, damit dessen Aufraeumen den
   Container beim Neustart nicht entfernt. Danach prueft er die Werte und die
   Erreichbarkeit von swift-handler. Erst bei Erfolg startet die Website. Das zweite
   Fenster zeigt docker logs --follow; Auth-Pruefung bleibt im Handler erhalten.
5. Im ersten Terminal startet der Webserver ohne Zusatzpakete auf
   **http://localhost:3000/**. Beide Fenster offen lassen.

Der Browser bekommt `/src/cloud-config.js` mit lokalen Werten. Die bekannte URL-Pruefung
in `/src/cloud.js` wird nur bei der Auslieferung lokal angepasst. Beide Quelldateien
bleiben auf der Festplatte unveraendert. Eine unbekannte neue URL-Pruefung fuehrt zu
einem Fehler, damit nach einem groesseren Umbau bewusst nachgebessert wird.
Die fluechtige oeffentliche Konfiguration in `test-only/.runtime/` ist von Git und
vom Webserver ausgeschlossen. Der Server liefert nur index.html, src und assets;
keine SQL-Dumps, .git-Dateien, Hilfsskripte oder alte START_HERE-Bundles.

## Code aktualisieren oder einen Branch testen

- Original → Test: manuelle Action **Sync LIVE to TEST (manual)** auf **main** ausfuehren.
  Sie behaelt `test-only`, `.github`, TESTSERVER.md und die Testkonfiguration bei.
  `test-only/overrides/src/cloud-config.js` stellt die sichere, leere Grundkonfiguration
  wieder her. Tests und Build laufen vor dem Sync-Commit.
- Danach lokal `git pull --ff-only` auf main. Experimente vorher in einem eigenen
  Branch sichern; die Sync-Action ersetzt normalen Spielcode im Test-main.
- Zum Testen eines Branches diesen bewusst in GitHub Desktop auschecken. Das
  Startskript macht selbst keinen Pull, Checkout oder Merge.
- Bei bereits laufender Umgebung die Game-command aktualisieren:

```powershell
powershell.exe -NoProfile -ExecutionPolicy Bypass -File .\test-only\Update-Test.ps1 -ReloadEdge
```

Das Skript kopiert `supabase/dashboard/game-command.ts` komplett nach
`<SupabaseDir>\supabase\functions\swift-handler\index.ts` und prueft SHA256.
Mit `-ReloadEdge` wird nur der lokale Test-Edge-Container neu gestartet, damit Windows-Dateiaenderungen sicher in einem frischen Worker ankommen. Ohne Schalter wird nur kopiert. Bei Problemen dieses Fenster mit Strg+C
beenden und den bisherigen Serve-Befehl erneut starten. Browser mit Strg+F5 laden.
Bei Aenderungen an den Hilfsskripten beide Terminalprozesse beenden und neu starten.

**Grenzen:** Falls ein Branch neue SQL oder eine neu generierte Game-command braucht,
muessen diese branchspezifischen Schritte vorher erledigt werden. Der Kopierbefehl
baut das Dashboard-Bundle nicht aus den Spielmodulen neu. Keine SQL wird automatisch
ausgefuehrt. Nach einem Datenbankumbau ist ein Branchwechsel allein kein Rollback.

## Beenden und pruefen

Beide Terminalprozesse mit Strg+C beenden. Supabase/Docker duerfen weiterlaufen.
Optional im Docker-Projekt `npx.cmd supabase stop` ausfuehren; kein `--no-backup`,
kein `db reset`, keine Docker-Volumes loeschen.

Nach Start/Update: anmelden, Spielstand laden, kleinen Bauauftrag starten, neu laden
und den Auftrag pruefen. Danach Flotten, Forschung, Handel, PvE und PvP gezielt testen.
Bei Fehlern Browsermeldung und Edge-Terminal ansehen. CLI-Statusausgaben koennen
private Schluessel enthalten; diese vor dem Teilen entfernen.

GitHub Pages kann nicht fuer andere Spieler auf die Docker-Instanz dieses PCs zeigen:
localhost bezeichnet immer den Rechner des jeweiligen Besuchers. Die eingecheckte
Konfiguration hat deshalb keinen Backend-Zugang; Pages ist bis zu einer separaten
Hosting-Konfiguration kein spielbarer gemeinsamer Testrealm. Fuer diesen Test den
lokalen Start verwenden. Der Webserver bindet nur an diesen PC, LAN-Zugriff folgt separat.

## Automatische Pruefungen

`node --test test-only/*.test.mjs` prueft die lokale Konfiguration, den URL-Adapter,
HTTP-Auslieferung, MIME-Typen und gesperrte Pfade. CI prueft zusaetzlich unter Windows
PowerShell-Syntax und das Kopieren/Sichern in temporaeren Verzeichnissen. Die
Spieltests und der Build bleiben aktiv. Das ersetzt keinen echten Docker-Start,
keine Anmeldung, keine Spielbefehle und keinen Mehrspieler-Lasttest.

## CPU-Limit im lokalen Test

Standard: Start-Test.ps1 -Metrics -CompactSnapshot setzt bei jedem Start **30/60 Sekunden**
Soft-/Hard-Limit, auch nach Neuerstellung des Containers. Anpassbar mit
-CpuSoftSeconds 30 -CpuHardSeconds 60; ganze Sekunden, soft <= hard, maximal 300.
Zum Vergleich mit der bisherigen Grenze: -CpuSoftSeconds 1 -CpuHardSeconds 2.

Die CLI erzeugt die Grenzen fest im Main-Worker. Der Teststarter passt nur
/root/index.ts im geprueften Container supabase_edge_runtime_WahuelapaTest an,
sichert dort index.cpu-default.ts und startet nur diesen Container neu.
Name, Projektlabel und Arbeitsordner muessen stimmen. Unbekannte/mehrdeutige
Runtime-Syntax fuehrt zum Startfehler. Die Hauptdatei bleibt im Container; sie
kann private Konfiguration enthalten und wird nicht in Logs, Arbeitsdateien oder Git kopiert.

Das ist ein versionsabhaengiger lokaler Testadapter, keine Cloud-Konfiguration.
Ein manuelles supabase functions serve umgeht ihn und setzt wieder die CLI-Defaults.
Fuer Updates Update-Test.ps1 -ReloadEdge verwenden; fuer einen neuen Start immer
Start-Test.ps1. Kein separater CLI-Serve-Prozess erforderlich. Strg+C im zweiten
Fenster beendet nur die Loganzeige; die Runtime bleibt in Docker. Strg+C im ersten
Fenster beendet den Webserver. Ein neuer Start erzeugt eine frische Runtime.
Datenbank, Spielregeln, Missionstimer und Live werden nicht veraendert.

Messungen mit erhoehten Grenzen separat kennzeichnen: erfolgreiche lokale Laeufe
beweisen keine Eignung fuer die gehostete Cloud mit deren CPU-Limit.

News-Entwurf (nur Test, nicht veroeffentlicht): 🔧 Der lokale Teststart aktiviert und
prueft jetzt automatisch hoehere CPU-Grenzen. Lange Nachberechnungen koennen damit
untersucht werden, ohne dass die Einstellung beim Neustart verloren geht.
