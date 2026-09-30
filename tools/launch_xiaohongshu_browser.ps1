<#
.SYNOPSIS
Launch a dedicated Edge profile for manual Xiaohongshu login and expose a
loopback-only Chrome DevTools endpoint for local read-only research.

.DESCRIPTION
This script never receives, stores, exports, or prints passwords, cookies,
QR codes, verification codes, or authentication tokens. Complete login
interactively in the opened browser. The browser profile is stored under
.claude/xiaohongshu-browser-profile/ and stays separate from your normal
browser profile.

The remote-debugging endpoint binds only to 127.0.0.1. Do not change it to
0.0.0.0 or forward this port to another device or network.
#>

[CmdletBinding()]
param(
    [ValidateRange(1024, 65535)]
    [int]$Port = 9222,

    [switch]$ResetProfile,

    [switch]$Stop
)

$ErrorActionPreference = 'Stop'
$projectRoot = Split-Path -Parent $PSScriptRoot
$profileRoot = Join-Path $projectRoot '.claude\xiaohongshu-browser-profile'

# Wrap the pipeline result in @() again: with exactly one browser match,
# PowerShell otherwise stores a scalar string and [0] would become just "C".
$edgeCandidates = @(
    @(
        (Join-Path ${env:ProgramFiles(x86)} 'Microsoft\Edge\Application\msedge.exe'),
        (Join-Path $env:ProgramFiles 'Microsoft\Edge\Application\msedge.exe'),
        (Join-Path ${env:LocalAppData} 'Microsoft\Edge\Application\msedge.exe'),
        (Join-Path $env:ProgramFiles 'Google\Chrome\Application\chrome.exe'),
        (Join-Path ${env:ProgramFiles(x86)} 'Google\Chrome\Application\chrome.exe'),
        (Join-Path ${env:LocalAppData} 'Google\Chrome\Application\chrome.exe')
    ) | Where-Object { Test-Path $_ }
)

if (-not $edgeCandidates) {
    throw 'Microsoft Edge was not found. Install Edge or update $edgeCandidates with the browser executable path.'
}

$endpoint = "http://127.0.0.1:$Port/json/version"

if ($Stop) {
    $processes = Get-CimInstance Win32_Process -Filter "Name = 'msedge.exe'" |
        Where-Object {
            $_.CommandLine -match [regex]::Escape("--remote-debugging-port=$Port")
        }

    if ($processes) {
        $processes | ForEach-Object {
            try {
                Stop-Process -Id $_.ProcessId -Force -ErrorAction Stop
            } catch {
                # Edge can close child processes while the list is being iterated.
            }
        }
        Write-Host "Stopped the dedicated Edge session on port $Port."
    } else {
        Write-Host "No dedicated Edge session was found on port $Port."
    }
    exit 0
}

if ($ResetProfile) {
    if (Test-Path $profileRoot) {
        Remove-Item $profileRoot -Recurse -Force
        Write-Host 'Deleted the dedicated Xiaohongshu browser profile. You will need to log in again next time.'
    } else {
        Write-Host 'No dedicated browser profile exists, so there is nothing to delete.'
    }
    exit 0
}

try {
    $existing = Invoke-RestMethod -Uri $endpoint -TimeoutSec 2
    Write-Host "The dedicated browser is already running: $endpoint"
    Write-Host "Browser: $($existing.Browser)"
    exit 0
} catch {
    # Expected when the dedicated browser is not running yet.
}

New-Item -ItemType Directory -Path $profileRoot -Force | Out-Null

$arguments = @(
    '--remote-debugging-address=127.0.0.1',
    "--remote-debugging-port=$Port",
    "--user-data-dir=$profileRoot",
    '--no-first-run',
    '--no-default-browser-check',
    'https://www.xiaohongshu.com/explore'
)

Start-Process -FilePath $edgeCandidates[0] -ArgumentList $arguments | Out-Null

Write-Host 'Opened a dedicated Edge profile. Log in to Xiaohongshu manually in that browser window.'
Write-Host 'This script never reads, stores, exports, or prints passwords, verification codes, cookies, tokens, QR codes, or payment data.'
Write-Host "The browser listens only on this local endpoint: $endpoint"
Write-Host 'Keep the browser window open after login, then tell Claude that the browser is logged in and open.'
Write-Host "Stop the browser session: powershell -ExecutionPolicy Bypass -File `"$PSCommandPath`" -Stop"
Write-Host "Delete the dedicated login profile: powershell -ExecutionPolicy Bypass -File `"$PSCommandPath`" -ResetProfile"
