param([switch]$IfRunning)
$ErrorActionPreference = 'Stop'
# Fixed TEST container; never restart the database or any production service.
$container = 'supabase_edge_runtime_WahuelapaTest'
$previousErrorPreference = $ErrorActionPreference
try {
    $ErrorActionPreference = 'Continue'
    $running = & docker inspect --format '{{.State.Running}}' $container 2>$null
    $inspectExit = $LASTEXITCODE
} finally { $ErrorActionPreference = $previousErrorPreference }
if ($inspectExit -ne 0 -or (($running | Out-String).Trim() -ne 'true')) {
    if ($IfRunning) { return }
    throw 'Lokale Test-Edge-Runtime laeuft nicht. Testserver zuerst starten.'
}
& docker restart $container | Out-Null
if ($LASTEXITCODE -ne 0) { throw 'Lokale Test-Edge-Runtime konnte nicht neu gestartet werden.' }
Write-Host 'Lokale Test-Edge-Runtime neu gestartet; neuer Worker liest die aktuelle Game-command.'
