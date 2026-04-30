# app-audit.ps1
# Audits GitHub Apps installed on the organization and classifies permission risk.
#
# Example:
#   pwsh -ExecutionPolicy Bypass -File .\scripts\app-audit.ps1
#
# Read-only.

param(
    [string]$Org = "oaslananka-lab",
    [switch]$ShowPermissions,
    [switch]$ShowEvents
)

$ErrorActionPreference = "Continue"

function Get-AppRisk {
    param($Installation)

    $perms = $Installation.permissions
    $keys = @()
    if ($perms) {
        $keys = @($perms.PSObject.Properties.Name)
    }

    $highReasons = @()
    $mediumReasons = @()

    foreach ($key in $keys) {
        $value = [string]$perms.$key

        if ($value -eq "write" -and $key -match "secrets|variables|workflows|contents|actions|deployments|pages|administration|environments") {
            $highReasons += "$key=$value"
        } elseif ($value -eq "write" -and $key -match "pull_requests|issues|checks|statuses|security_events") {
            $mediumReasons += "$key=$value"
        }
    }

    if ($Installation.repository_selection -eq "all" -and $highReasons.Count -gt 0) {
        return [pscustomobject]@{
            level = "high"
            reasons = $highReasons
        }
    }

    if ($highReasons.Count -gt 0) {
        return [pscustomobject]@{
            level = "medium-high"
            reasons = $highReasons
        }
    }

    if ($mediumReasons.Count -gt 0) {
        return [pscustomobject]@{
            level = "medium"
            reasons = $mediumReasons
        }
    }

    return [pscustomobject]@{
        level = "low"
        reasons = @()
    }
}

$raw = gh api "/orgs/$Org/installations" --paginate 2>$null
if ($LASTEXITCODE -ne 0) {
    throw "Could not read app installations for $Org. Make sure your token has org owner/read permissions."
}

$data = $raw | ConvertFrom-Json
$installations = @($data.installations)
$report = @()

Write-Host "== GitHub App Audit: $Org ==" -ForegroundColor Cyan
Write-Host ""

foreach ($app in $installations) {
    $risk = Get-AppRisk -Installation $app
    $permKeys = @()
    if ($app.permissions) {
        $permKeys = @($app.permissions.PSObject.Properties | ForEach-Object { "$($_.Name):$($_.Value)" })
    }

    Write-Host "$($app.app_slug)" -ForegroundColor Yellow
    Write-Host "  id:          $($app.id)"
    Write-Host "  access:      $($app.repository_selection)"
    Write-Host "  risk:        $($risk.level)"
    if ($risk.reasons.Count -gt 0) {
        Write-Host "  reasons:     $($risk.reasons -join ', ')"
    }
    Write-Host "  url:         $($app.html_url)"

    if ($ShowPermissions) {
        Write-Host "  permissions:"
        foreach ($p in $permKeys) {
            Write-Host "    - $p"
        }
    }

    if ($ShowEvents) {
        Write-Host "  events:"
        foreach ($event in @($app.events)) {
            Write-Host "    - $event"
        }
    }

    $report += [pscustomobject]@{
        id = $app.id
        app_slug = $app.app_slug
        account = $app.account.login
        target_type = $app.target_type
        repository_selection = $app.repository_selection
        risk = $risk.level
        risk_reasons = $risk.reasons
        permissions = $app.permissions
        events = $app.events
        html_url = $app.html_url
    }
}

$timestamp = Get-Date -Format "yyyyMMdd-HHmmss"
$out = "reports/app-audit-$timestamp.json"
$report | ConvertTo-Json -Depth 20 | Set-Content -Encoding UTF8 $out

Write-Host ""
Write-Host "Report written to $out" -ForegroundColor Green

$high = @($report | Where-Object { $_.risk -eq "high" -or $_.risk -eq "medium-high" })
if ($high.Count -gt 0) {
    Write-Host "High-risk installations: $($high.Count)" -ForegroundColor DarkYellow
    foreach ($item in $high) {
        Write-Host "  - $($item.app_slug): $($item.risk) ($($item.risk_reasons -join ', '))"
    }
}
