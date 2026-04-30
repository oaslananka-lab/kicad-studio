# inspect-pr-failures.ps1
# Inspects failed check runs for open PRs in a GitHub repository.
#
# Examples:
#   pwsh -ExecutionPolicy Bypass -File .\scripts\inspect-pr-failures.ps1 -Repo helix
#   pwsh -ExecutionPolicy Bypass -File .\scripts\inspect-pr-failures.ps1 -Repo helix -Pr 9
#   pwsh -ExecutionPolicy Bypass -File .\scripts\inspect-pr-failures.ps1 -Repo helix -Pr 9 -ShowLogs
#
# Notes:
# - Default mode prints failed check names and URLs.
# - -ShowLogs prints failed job logs through gh run view --log-failed.

param(
    [string]$Org = "oaslananka-lab",

    [Parameter(Mandatory=$true)]
    [string]$Repo,

    [int]$Pr = 0,

    [switch]$ShowLogs
)

$ErrorActionPreference = "Continue"

$FullName = "$Org/$Repo"

function Get-PrList {
    if ($Pr -gt 0) {
        $raw = gh pr view $Pr `
            --repo $FullName `
            --json number,title,headRefName,mergeStateStatus,statusCheckRollup,url
        if ($LASTEXITCODE -ne 0) {
            throw "Could not read PR #$Pr from $FullName"
        }
        return @($raw | ConvertFrom-Json)
    }

    $raw = gh pr list `
        --repo $FullName `
        --state open `
        --limit 100 `
        --json number,title,headRefName,mergeStateStatus,statusCheckRollup,url
    if ($LASTEXITCODE -ne 0) {
        throw "Could not read open PRs from $FullName"
    }
    return @($raw | ConvertFrom-Json)
}

$Prs = Get-PrList
$Report = @()

foreach ($p in $Prs) {
    Write-Host ""
    Write-Host "## $FullName PR #$($p.number): $($p.title)" -ForegroundColor Yellow
    Write-Host "State: $($p.mergeStateStatus)"
    Write-Host "Head:  $($p.headRefName)"
    Write-Host "URL:   $($p.url)"

    $checks = @($p.statusCheckRollup)
    if (-not $checks -or $checks.Count -eq 0) {
        Write-Host "No status checks reported."
        continue
    }

    $failed = @()

    foreach ($c in $checks) {
        $name = $c.name
        if (-not $name) { $name = $c.context }

        $state = $c.state
        $conclusion = $c.conclusion
        $url = $c.detailsUrl

        $isFailed = $false
        if ($state -and $state -notin @("SUCCESS", "PENDING", "QUEUED", "IN_PROGRESS", "EXPECTED", "NEUTRAL", "SKIPPED")) {
            $isFailed = $true
        }
        if ($conclusion -and $conclusion -notin @("SUCCESS", "NEUTRAL", "SKIPPED")) {
            $isFailed = $true
        }

        if ($isFailed) {
            $failed += [pscustomobject]@{
                name = $name
                state = $state
                conclusion = $conclusion
                url = $url
            }
        }
    }

    if ($failed.Count -eq 0) {
        Write-Host "No failed checks."
        continue
    }

    Write-Host "Failed checks: $($failed.Count)" -ForegroundColor Red

    foreach ($f in $failed) {
        Write-Host "  - $($f.name) state=$($f.state) conclusion=$($f.conclusion)"
        if ($f.url) {
            Write-Host "    $($f.url)"
        }

        $runId = $null
        if ($f.url -match "/actions/runs/([0-9]+)") {
            $runId = $Matches[1]
            Write-Host "    run id: $runId"
        }

        $Report += [pscustomobject]@{
            repo = $FullName
            pr = $p.number
            title = $p.title
            head = $p.headRefName
            check = $f.name
            state = $f.state
            conclusion = $f.conclusion
            runId = $runId
            url = $f.url
        }

        if ($ShowLogs -and $runId) {
            Write-Host ""
            Write-Host "---- failed logs for run $runId ----" -ForegroundColor Cyan
            gh run view $runId --repo $FullName --log-failed
            Write-Host "---- end logs for run $runId ----" -ForegroundColor Cyan
            Write-Host ""
        }
    }
}

$timestamp = Get-Date -Format "yyyyMMdd-HHmmss"
$out = "reports/pr-failures-$Repo-$timestamp.json"
$Report | ConvertTo-Json -Depth 20 | Set-Content -Encoding UTF8 $out

Write-Host ""
Write-Host "Report written to $out" -ForegroundColor Green
