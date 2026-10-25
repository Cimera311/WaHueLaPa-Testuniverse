param(
    [string]$Since = '15m',
    [string]$Container = 'supabase_edge_runtime_WahuelapaTest'
)
$ErrorActionPreference = 'Stop'
$repoDir = Split-Path $PSScriptRoot -Parent
$runtime = Join-Path $PSScriptRoot '.runtime'
New-Item -ItemType Directory -Force -Path $runtime | Out-Null
# Keep only metric records, never persist unfiltered Edge logs.
$raw = & docker logs --since $Since $Container 2>&1
if ($LASTEXITCODE -ne 0) { throw 'Edge-Logs nicht lesbar. Containernamen und Docker pruefen.' }
$records = @($raw | ForEach-Object {
    $line = [string]$_
    $start = $line.IndexOf('{"kind":"game_command_metrics"')
    if ($start -ge 0) { $line.Substring($start) }
})
if (!$records.Count) { throw 'Keine O1-Messwerte gefunden. Test mit -Metrics starten und Aktionen ausfuehren.' }
$target = Join-Path $runtime ('metrics-' + (Get-Date -Format 'yyyyMMdd-HHmmss') + '.jsonl')
[IO.File]::WriteAllLines($target, $records, (New-Object Text.UTF8Encoding($false)))
& node (Join-Path $PSScriptRoot 'summarize-metrics.mjs') $target
if ($LASTEXITCODE -ne 0) { throw 'Auswertung fehlgeschlagen.' }
Write-Host "Messdatei: $target"
Write-Host 'Umgebung, Szenario, Warm-up und Zeitraum gemaess O1-MESSUNG.md dokumentieren.'
