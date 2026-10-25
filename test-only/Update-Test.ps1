param(
    [string]$SupabaseDir = (Join-Path ([Environment]::GetFolderPath('MyDocuments')) 'Docker\Subabase\WahuelapaTest'),
    [switch]$ReloadEdge
)
$ErrorActionPreference = 'Stop'
$repoDir = Split-Path $PSScriptRoot -Parent
$SupabaseDir = (Resolve-Path -LiteralPath $SupabaseDir).Path
$toml = Join-Path $SupabaseDir 'supabase\config.toml'
if (!(Test-Path -LiteralPath $toml) -or !((Get-Content -Raw -LiteralPath $toml) -match '(?m)^project_id\s*=\s*"WahuelapaTest"\s*$')) {
    throw 'Ziel muss das initialisierte lokale Projekt WahuelapaTest sein.'
}
$source = Join-Path $repoDir 'supabase\dashboard\game-command.ts'
if (!(Test-Path -LiteralPath $source)) { throw 'Game-command fehlt im ausgecheckten Repo.' }
$targetDir = Join-Path $SupabaseDir 'supabase\functions\swift-handler'
$target = Join-Path $targetDir 'index.ts'
New-Item -ItemType Directory -Force -Path $targetDir | Out-Null
$sourceHash = (Get-FileHash -LiteralPath $source -Algorithm SHA256).Hash
if ((Test-Path -LiteralPath $target) -and (Get-FileHash -LiteralPath $target -Algorithm SHA256).Hash -eq $sourceHash) {
    Write-Host 'Lokale Game-command ist bereits aktuell.'
} else {
    if (Test-Path -LiteralPath $target) {
        $backupDir = Join-Path $SupabaseDir 'backups\edge'
        New-Item -ItemType Directory -Force -Path $backupDir | Out-Null
        Copy-Item -LiteralPath $target -Destination (Join-Path $backupDir ("swift-handler-" + (Get-Date -Format 'yyyyMMdd-HHmmss-fff') + '.ts'))
    }
    Copy-Item -LiteralPath $source -Destination $target
    if ((Get-FileHash -LiteralPath $target -Algorithm SHA256).Hash -ne $sourceHash) { throw 'Kopie stimmt nicht mit Quelldatei ueberein.' }
    Write-Host 'Lokale Game-command aktualisiert. Bei laufendem Server -ReloadEdge fuer einen frischen Worker verwenden.'
}
Write-Host "SHA256: $sourceHash"
if ($ReloadEdge) { & (Join-Path $PSScriptRoot 'Restart-TestEdge.ps1') }
Write-Host 'Datenbank und Cloud wurden nicht veraendert. Keine SQL-Migrationen ausgefuehrt.'
