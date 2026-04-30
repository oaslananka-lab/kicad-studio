# daily-health.ps1
# Runs repo-steward daily checks and writes a timestamped report.
#
# Example:
#   pwsh -ExecutionPolicy Bypass -File .\scripts\daily-health.ps1
#
# Read-only.

param(
    [string]$Org = "oaslananka-lab",
    [switch]$ShowDetails
)

$ErrorActionPreference = "Continue"

$Root = Split-Path -Parent $PSScriptRoot
$ReportsDir = Join-Path $Root "reports"
New-Item -ItemType Directory -Force -Path $ReportsDir | Out-Null

$Timestamp = Get-Date -Format "yyyyMMdd-HHmmss"
$OutFile = Join-Path $ReportsDir "daily-health-$Timestamp.txt"

function Add-Line {
    param([string]$Text)
    $Text | Tee-Object -FilePath $OutFile -Append
}

function Add-Section {
    param([string]$Title)
    Add-Line ""
    Add-Line "================================================================================"
    Add-Line $Title
    Add-Line "================================================================================"
}

function Run-And-Capture {
    param([string]$Title, [scriptblock]$Command)
    Add-Section $Title
    & $Command 2>&1 | Tee-Object -FilePath $OutFile -Append
}

"Daily health report: $Timestamp" | Set-Content -Encoding UTF8 $OutFile
Add-Line "Organization: $Org"
Add-Line "Root: $Root"

Run-And-Capture "1. PR triage" {
    pwsh -ExecutionPolicy Bypass -File (Join-Path $PSScriptRoot "steward-pr-triage.ps1") -All
}

Run-And-Capture "2. Capability audit" {
    if ($ShowDetails) {
        pwsh -ExecutionPolicy Bypass -File (Join-Path $PSScriptRoot "capability-audit.ps1") -All -ShowDetails
    } else {
        pwsh -ExecutionPolicy Bypass -File (Join-Path $PSScriptRoot "capability-audit.ps1") -All
    }
}

Run-And-Capture "3. App audit" {
    pwsh -ExecutionPolicy Bypass -File (Join-Path $PSScriptRoot "app-audit.ps1")
}

Add-Section "4. Summary"

$LatestCapability = Get-ChildItem $ReportsDir -Filter "capability-audit-*.json" |
    Sort-Object LastWriteTime -Descending |
    Select-Object -First 1

$LatestTriage = Get-ChildItem $ReportsDir -Filter "pr-triage-*.json" |
    Sort-Object LastWriteTime -Descending |
    Select-Object -First 1

$LatestAppAudit = Get-ChildItem $ReportsDir -Filter "app-audit-*.json" |
    Sort-Object LastWriteTime -Descending |
    Select-Object -First 1

if ($LatestCapability) {
    $cap = Get-Content $LatestCapability.FullName -Raw | ConvertFrom-Json

    $reposWithOpenPrs = @($cap | Where-Object { $_.openPrs -gt 0 })
    $reposWithActiveFailures = @($cap | Where-Object { $_.activeFailedRuns -gt 0 })
    $reposWithoutCodeScanning = @($cap | Where-Object { $_.visibility -eq "public" -and $_.codeScanning.status -in @("no_analysis", "unavailable_or_disabled", "error") })
    $reposWithCodeAlerts = @($cap | Where-Object { $_.codeScanning.status -eq "ok" -and $_.codeScanning.count -gt 0 })
    $reposWithDependabotAlerts = @($cap | Where-Object { $_.dependabotAlerts.status -eq "ok" -and $_.dependabotAlerts.count -gt 0 })
    $reposWithSecretScanningDisabled = @($cap | Where-Object { $_.visibility -eq "public" -and $_.secretScanning.status -eq "disabled" })
    $reposWithMissingLabels = @($cap | Where-Object { $_.missingLabels -and $_.missingLabels.Count -gt 0 })

    Add-Line "Latest capability report: $($LatestCapability.Name)"
    Add-Line "Repos with open PRs: $($reposWithOpenPrs.Count)"
    Add-Line "Repos with active failed runs: $($reposWithActiveFailures.Count)"
    Add-Line "Public repos without CodeQL/code scanning analysis: $($reposWithoutCodeScanning.Count)"
    Add-Line "Repos with CodeQL/code scanning alerts: $($reposWithCodeAlerts.Count)"
    Add-Line "Repos with Dependabot alerts: $($reposWithDependabotAlerts.Count)"
    Add-Line "Public repos with secret scanning disabled: $($reposWithSecretScanningDisabled.Count)"
    Add-Line "Repos with missing standard labels: $($reposWithMissingLabels.Count)"

    if ($reposWithOpenPrs.Count -gt 0) {
        Add-Line ""
        Add-Line "Open PR follow-ups:"
        foreach ($r in $reposWithOpenPrs) { Add-Line "- $($r.repo): openPrs=$($r.openPrs)" }
    }

    if ($reposWithActiveFailures.Count -gt 0) {
        Add-Line ""
        Add-Line "Active failed run follow-ups:"
        foreach ($r in $reposWithActiveFailures) { Add-Line "- $($r.repo): activeFailedRuns=$($r.activeFailedRuns)" }
    }

    if ($reposWithCodeAlerts.Count -gt 0) {
        Add-Line ""
        Add-Line "Code scanning alert follow-ups:"
        foreach ($r in $reposWithCodeAlerts) { Add-Line "- $($r.repo): alerts=$($r.codeScanning.count)" }
    }

    if ($reposWithDependabotAlerts.Count -gt 0) {
        Add-Line ""
        Add-Line "Dependabot alert follow-ups:"
        foreach ($r in $reposWithDependabotAlerts) { Add-Line "- $($r.repo): alerts=$($r.dependabotAlerts.count)" }
    }
} else {
    Add-Line "No capability audit JSON report found."
}

if ($LatestTriage) {
    Add-Line "Latest PR triage report: $($LatestTriage.Name)"
}

if ($LatestAppAudit) {
    $apps = Get-Content $LatestAppAudit.FullName -Raw | ConvertFrom-Json
    $highApps = @($apps | Where-Object { $_.risk -eq "high" -or $_.risk -eq "medium-high" })
    Add-Line "Latest app audit report: $($LatestAppAudit.Name)"
    Add-Line "High-risk GitHub App installations: $($highApps.Count)"
    foreach ($app in $highApps) {
        Add-Line "- $($app.app_slug): $($app.risk) ($($app.risk_reasons -join ', '))"
    }
}

Write-Host ""
Write-Host "Daily health report written to $OutFile" -ForegroundColor Green
