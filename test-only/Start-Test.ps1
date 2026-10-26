param(
    [string]$SupabaseDir = (Join-Path ([Environment]::GetFolderPath('MyDocuments')) 'Docker\Subabase\WahuelapaTest'),
    [string]$PublishableKey = '',
    [switch]$Metrics,
    [switch]$CompactSnapshot,
    [ValidateRange(1,300)][int]$CpuSoftSeconds = 30,
    [ValidateRange(1,300)][int]$CpuHardSeconds = 60
)
$ErrorActionPreference = 'Stop'
if ($CpuSoftSeconds -gt $CpuHardSeconds) { throw 'CpuSoftSeconds darf CpuHardSeconds nicht ueberschreiten.' }
$repoDir = Split-Path $PSScriptRoot -Parent
$SupabaseDir = (Resolve-Path -LiteralPath $SupabaseDir).Path
$cli = Join-Path $SupabaseDir 'node_modules\.bin\supabase.cmd'
if (!(Test-Path -LiteralPath $cli)) { throw 'Supabase CLI fehlt im Docker-Projekt. Bestehende Installation pruefen.' }
Get-Command node, docker -ErrorAction Stop | Out-Null
if (Get-NetTCPConnection -LocalPort 3000 -State Listen -ErrorAction SilentlyContinue) {
    throw 'Port 3000 ist belegt. Alten Webserver mit Strg+C beenden, dann erneut starten.'
}
# Copy from the currently checked-out branch; no automatic git pull/checkout.
& (Join-Path $PSScriptRoot 'Update-Test.ps1') -SupabaseDir $SupabaseDir
& docker info *> $null
if ($LASTEXITCODE -ne 0) {
    $desktop = Join-Path $env:ProgramFiles 'Docker\Docker\Docker Desktop.exe'
    if (!(Test-Path -LiteralPath $desktop)) { throw 'Docker Desktop bitte starten.' }
    Start-Process -FilePath $desktop
    Write-Host 'Warte auf Docker Desktop ...'
    $ready = $false
    for ($attempt=0; $attempt -lt 45; $attempt++) {
        Start-Sleep -Seconds 2
        & docker info *> $null
        if ($LASTEXITCODE -eq 0) { $ready = $true; break }
    }
    if (!$ready) { throw 'Docker ist noch nicht bereit. Nach dem Start erneut ausfuehren.' }
}
Push-Location $SupabaseDir
try {
    & $cli start
    if ($LASTEXITCODE -ne 0) { throw 'Supabase konnte nicht gestartet werden.' }
    $statusText = (& $cli status -o json | Out-String)
    if ($LASTEXITCODE -ne 0) { throw 'Lokaler Supabase-Status nicht verfuegbar.' }
    $status = $statusText | ConvertFrom-Json
    if ($status.API_URL -notin @('http://127.0.0.1:54321','http://localhost:54321')) {
        throw 'Unerwartete API-Adresse. Erwartet: lokale Supabase auf Port 54321.'
    }
    if (!$PublishableKey) {
        # Accept public publishable keys only, never ANON_KEY/service-role fallbacks.
        foreach ($property in $status.PSObject.Properties) {
            if ($property.Value -is [string] -and $property.Value -match '^sb_publishable_[A-Za-z0-9_-]+$') {
                $PublishableKey = $property.Value; break
            }
        }
    }
    if (!$PublishableKey) { $PublishableKey = Read-Host 'Lokalen Publishable Key aus supabase start einfuegen (sb_publishable_...)' }
    if ($PublishableKey -notmatch '^sb_publishable_[A-Za-z0-9_-]+$') { throw 'Ein oeffentlicher sb_publishable_ Key ist erforderlich.' }
    $runtimeDir = Join-Path $PSScriptRoot '.runtime'
    New-Item -ItemType Directory -Force -Path $runtimeDir | Out-Null
    $runtimeConfig = Join-Path $runtimeDir 'cloud-config.json'
    $config = @{enabled=$true; commandFunction='swift-handler'; url=$status.API_URL; publishableKey=$PublishableKey; redirectUrl='http://localhost:3000/'}
    [IO.File]::WriteAllText($runtimeConfig, ($config | ConvertTo-Json), (New-Object Text.UTF8Encoding($false)))
    $metricsFile = Join-Path $PSScriptRoot '.runtime\metrics.env'
    [IO.File]::WriteAllText($metricsFile, "GAME_COMMAND_METRICS_RATE=$(if ($Metrics) { 1 } else { 0 })" + [Environment]::NewLine + "GAME_COMMAND_SNAPSHOT=$(if ($CompactSnapshot) { 'compact' } else { 'legacy' })" + [Environment]::NewLine, (New-Object Text.UTF8Encoding($false)))
    if ($Metrics) { Write-Host 'O1-Messung aktiv.' }
    if ($CompactSnapshot) { Write-Host 'O3 kompakter Snapshot aktiv; Test-SQL muss installiert sein.' }
    & node (Join-Path $PSScriptRoot 'start-test-edge.mjs') $SupabaseDir $metricsFile $CpuSoftSeconds $CpuHardSeconds
    if ($LASTEXITCODE -ne 0) { throw 'Test-Edge nicht bereit. Webserver wird nicht gestartet.' }
    # Follow Docker logs instead of keeping a CLI supervisor alive.
    $logSince = (Get-Date).ToUniversalTime().ToString('o')
    $command = "docker logs --follow --since '$logSince' supabase_edge_runtime_WahuelapaTest"
    $encoded = [Convert]::ToBase64String([Text.Encoding]::Unicode.GetBytes($command))
    Start-Process powershell.exe -ArgumentList @('-NoProfile','-NoExit','-EncodedCommand',$encoded)
    Write-Host 'CPU-Limits verifiziert; zweites Fenster zeigt Edge-Logs. Website wird gestartet.'
    & node (Join-Path $PSScriptRoot 'local-server.mjs') $runtimeConfig
    if ($LASTEXITCODE -ne 0) { throw 'Lokaler Webserver wurde mit einem Fehler beendet.' }
} finally {
    Pop-Location
}
