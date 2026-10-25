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
    # Mock Docker completely; these checks must never reach a real engine.
    $global:WahuelapaReloadCalls = New-Object 'System.Collections.Generic.List[string]'
    $global:WahuelapaReloadRunning = $true
    $global:WahuelapaReloadFail = $false
    function docker {
        param([Parameter(ValueFromRemainingArguments=$true)][object[]]$Arguments)
        $global:WahuelapaReloadCalls.Add(($Arguments -join ' '))
        $global:LASTEXITCODE = 0
        if ($Arguments[0] -eq 'inspect') { return ([string]$global:WahuelapaReloadRunning).ToLowerInvariant() }
        if ($Arguments[0] -eq 'restart') { if ($global:WahuelapaReloadFail) { $global:LASTEXITCODE = 1 }; return }
        throw 'Unexpected mocked Docker command'
    }
    Set-Content -LiteralPath (Join-Path $fixture 'supabase\config.toml') -Value 'project_id = "WahuelapaTest"'
    & (Join-Path $PSScriptRoot 'Update-Test.ps1') -SupabaseDir $fixture
    if ($global:WahuelapaReloadCalls.Count -ne 0) { throw 'Copy-only update restarted Docker' }
    & (Join-Path $PSScriptRoot 'Update-Test.ps1') -SupabaseDir $fixture -ReloadEdge
    if ($global:WahuelapaReloadCalls.Count -ne 2 -or $global:WahuelapaReloadCalls[1] -ne 'restart supabase_edge_runtime_WahuelapaTest') { throw 'Reload targeted wrong service' }
    $global:WahuelapaReloadCalls.Clear(); $global:WahuelapaReloadRunning = $false
    & (Join-Path $PSScriptRoot 'Restart-TestEdge.ps1') -IfRunning
    if ($global:WahuelapaReloadCalls.Count -ne 1) { throw 'Stopped container was restarted' }
    $rejected = $false
    try { & (Join-Path $PSScriptRoot 'Restart-TestEdge.ps1') } catch { $rejected = $true }
    if (!$rejected) { throw 'Explicit reload accepted a stopped container' }
    $global:WahuelapaReloadRunning = $true; $global:WahuelapaReloadFail = $true; $rejected = $false
    try { & (Join-Path $PSScriptRoot 'Restart-TestEdge.ps1') } catch { $rejected = $true }
    if (!$rejected) { throw 'Failed reload was silently accepted' }
    Write-Host 'PowerShell copy, backup, idempotence, target protection and mocked Edge reload checks passed.'
 } finally {
    Remove-Variable -Name WahuelapaReloadCalls,WahuelapaReloadRunning,WahuelapaReloadFail -Scope Global -ErrorAction SilentlyContinue
    $tempRoot = [IO.Path]::GetFullPath([IO.Path]::GetTempPath()).TrimEnd('\') + '\'
    if (![IO.Path]::GetFullPath($fixture).StartsWith($tempRoot, [StringComparison]::OrdinalIgnoreCase)) { throw 'Unsafe fixture cleanup path' }
    Remove-Item -LiteralPath $fixture -Recurse -Force
}
