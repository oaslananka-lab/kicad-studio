# daily-health.ps1
# Runs the repo-steward daily health checks and writes a timestamped report.
#
# Usage:
#   pwsh -ExecutionPolicy Bypass -File .\scripts\daily-health.ps1
#   pwsh -ExecutionPolicy Bypass -File .\scripts\daily-health.ps1 -ShowDetails
#
# This script is read-only. It does not change repository settings.

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

function Write-Section {
    param([string]$Title)

    $line = ""
    $line += "`n"
    $line += "================================================================================`n"
    $line += "$Title`n"
    $line += "================================================================================`n"
    $line | Tee-Object -FilePath $OutFile -Append
}

function Run-And-Capture {
    param(
        [string]$Title,
        [scriptblock]$Command
    )

    Write-Section $Title
    & $Command 2>&1 | Tee-Object -FilePath $OutFile -Append
}

"Daily health report: $Timestamp" | Set-Content -Encoding UTF8 $OutFile
"Organization: $Org" | Tee-Object -FilePath $OutFile -Append
"Root: $Root" | Tee-Object -FilePath $OutFile -Append

Run-And-Capture "1. Steward status" {
    pwsh -ExecutionPolicy Bypass -File (Join-Path $PSScriptRoot "steward-status.ps1")
}

Run-And-Capture "2. PR triage" {
    pwsh -ExecutionPolicy Bypass -File (Join-Path $PSScriptRoot "steward-pr-triage.ps1") -All
}

Run-And-Capture "3. Capability audit" {
    if ($ShowDetails) {
        pwsh -ExecutionPolicy Bypass -File (Join-Path $PSScriptRoot "capability-audit.ps1") -All -ShowDetails
    } else {
        pwsh -ExecutionPolicy Bypass -File (Join-Path $PSScriptRoot "capability-audit.ps1") -All
    }
}

Write-Section "4. Summary"

$LatestCapability = Get-ChildItem $ReportsDir -Filter "capability-audit-*.json" |
    Sort-Object LastWriteTime -Descending |
    Select-Object -First 1

$LatestTriage = Get-ChildItem $ReportsDir -Filter "pr-triage-*.json" |
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

    "Latest capability report: $($LatestCapability.Name)" | Tee-Object -FilePath $OutFile -Append
    "Repos with open PRs: $($reposWithOpenPrs.Count)" | Tee-Object -FilePath $OutFile -Append
    "Repos with active failed runs: $($reposWithActiveFailures.Count)" | Tee-Object -FilePath $OutFile -Append
    "Public repos without CodeQL/code scanning analysis: $($reposWithoutCodeScanning.Count)" | Tee-Object -FilePath $OutFile -Append
    "Repos with CodeQL/code scanning alerts: $($reposWithCodeAlerts.Count)" | Tee-Object -FilePath $OutFile -Append
    "Repos with Dependabot alerts: $($reposWithDependabotAlerts.Count)" | Tee-Object -FilePath $OutFile -Append
    "Public repos with secret scanning disabled: $($reposWithSecretScanningDisabled.Count)" | Tee-Object -FilePath $OutFile -Append
    "Repos with missing standard labels: $($reposWithMissingLabels.Count)" | Tee-Object -FilePath $OutFile -Append

    if ($reposWithOpenPrs.Count -gt 0) {
        "`nOpen PR follow-ups:" | Tee-Object -FilePath $OutFile -Append
        foreach ($r in $reposWithOpenPrs) {
            "- $($r.repo): openPrs=$($r.openPrs)" | Tee-Object -FilePath $OutFile -Append
        }
    }

    if ($reposWithActiveFailures.Count -gt 0) {
        "`nActive failed run follow-ups:" | Tee-Object -FilePath $OutFile -Append
        foreach ($r in $reposWithActiveFailures) {
            "- $($r.repo): activeFailedRuns=$($r.activeFailedRuns)" | Tee-Object -FilePath $OutFile -Append
        }
    }

    if ($reposWithCodeAlerts.Count -gt 0) {
        "`nCode scanning alert follow-ups:" | Tee-Object -FilePath $OutFile -Append
        foreach ($r in $reposWithCodeAlerts) {
            "- $($r.repo): alerts=$($r.codeScanning.count)" | Tee-Object -FilePath $OutFile -Append
        }
    }

    if ($reposWithDependabotAlerts.Count -gt 0) {
        "`nDependabot alert follow-ups:" | Tee-Object -FilePath $OutFile -Append
        foreach ($r in $reposWithDependabotAlerts) {
            "- $($r.repo): alerts=$($r.dependabotAlerts.count)" | Tee-Object -FilePath $OutFile -Append
        }
    }
} else {
    "No capability audit JSON report found." | Tee-Object -FilePath $OutFile -Append
}

if ($LatestTriage) {
    "Latest PR triage report: $($LatestTriage.Name)" | Tee-Object -FilePath $OutFile -Append
}

Write-Host ""
Write-Host "Daily health report written to $OutFile" -ForegroundColor Green
