# Isolated smoke test: no Docker, database or user directories touched.
$ErrorActionPreference = 'Stop'
$fixture = Join-Path ([IO.Path]::GetTempPath()) ('wahuelapa-tools-' + [guid]::NewGuid())
try {
    New-Item -ItemType Directory -Path (Join-Path $fixture 'supabase') -Force | Out-Null
    Set-Content -LiteralPath (Join-Path $fixture 'supabase\config.toml') -Value 'project_id = "WahuelapaTest"'
    & (Join-Path $PSScriptRoot 'Update-Test.ps1') -SupabaseDir $fixture
    $target = Join-Path $fixture 'supabase\functions\swift-handler\index.ts'
    $source = Join-Path (Split-Path $PSScriptRoot -Parent) 'supabase\dashboard\game-command.ts'
    if ((Get-FileHash $target).Hash -ne (Get-FileHash $source).Hash) { throw 'Copy mismatch' }
    & (Join-Path $PSScriptRoot 'Update-Test.ps1') -SupabaseDir $fixture
    if (Test-Path (Join-Path $fixture 'backups\edge')) { throw 'Unchanged copy created backup' }
    Set-Content -LiteralPath $target -Value 'old function'
    & (Join-Path $PSScriptRoot 'Update-Test.ps1') -SupabaseDir $fixture
    $backups = @(Get-ChildItem (Join-Path $fixture 'backups\edge'))
    if ($backups.Count -ne 1 -or (Get-Content -Raw $backups[0].FullName).Trim() -ne 'old function') { throw 'Backup missing' }
    Set-Content -LiteralPath (Join-Path $fixture 'supabase\config.toml') -Value 'project_id = "production"'
    $rejected = $false
    try { & (Join-Path $PSScriptRoot 'Update-Test.ps1') -SupabaseDir $fixture } catch { $rejected = $true }
    if (!$rejected) { throw 'Wrong project accepted' }
    Write-Host 'PowerShell copy, backup, idempotence and wrong-project checks passed.'
} finally { Remove-Item -LiteralPath $fixture -Recurse -Force }
