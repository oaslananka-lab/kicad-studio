# steward-pr-triage.ps1
# Deep PR/run triage for one repo or all repos in oaslananka-lab.
#
# Examples:
#   pwsh -ExecutionPolicy Bypass -File .\scripts\steward-pr-triage.ps1 -Repo helix
#   pwsh -ExecutionPolicy Bypass -File .\scripts\steward-pr-triage.ps1 -Repo vscode-toon-tools
#   pwsh -ExecutionPolicy Bypass -File .\scripts\steward-pr-triage.ps1 -All
#
# This script is read-only.

param(
    [string]$Org = "oaslananka-lab",
    [string]$Repo,
    [switch]$All,
    [int]$Limit = 50
)

$ErrorActionPreference = "Continue"

function Get-Repos {
    if ($All) {
        return gh repo list $Org --limit 200 --json name,isArchived | ConvertFrom-Json | Where-Object { -not $_.isArchived }
    }

    if (-not $Repo) {
        throw "Use -Repo <name> or -All"
    }

    return @([pscustomobject]@{ name = $Repo; isArchived = $false })
}

function Get-CheckSummary {
    param($Pr)

    $nodes = @()
    if ($Pr.statusCheckRollup -and $Pr.statusCheckRollup.Count -gt 0) {
        $nodes = $Pr.statusCheckRollup
    }

    if (-not $nodes -or $nodes.Count -eq 0) {
        return "no checks"
    }

    $failed = @()
    $pending = @()
    $passed = @()

    foreach ($c in $nodes) {
        $name = $c.name
        if (-not $name) { $name = $c.context }

        $state = $c.state
        $conclusion = $c.conclusion

        if ($state -eq "SUCCESS" -or $conclusion -eq "SUCCESS") {
            $passed += $name
        } elseif ($state -eq "PENDING" -or $state -eq "QUEUED" -or $state -eq "IN_PROGRESS" -or $conclusion -eq $null) {
            $pending += $name
        } else {
            $failed += "$name=$state$conclusion"
        }
    }

    return "passed=$($passed.Count), pending=$($pending.Count), failed=$($failed.Count)"
}

$Repos = Get-Repos
$Report = @()

foreach ($R in $Repos) {
    $FullName = "$Org/$($R.name)"

    Write-Host ""
    Write-Host "## $FullName" -ForegroundColor Yellow

    $PrsRaw = gh pr list `
        --repo $FullName `
        --state open `
        --limit $Limit `
        --json number,title,author,headRefName,baseRefName,isDraft,mergeStateStatus,reviewDecision,labels,url,statusCheckRollup,createdAt,updatedAt 2>$null

    if ($LASTEXITCODE -ne 0) {
        Write-Host "Could not read PRs for $FullName" -ForegroundColor Red
        continue
    }

    $Prs = $PrsRaw | ConvertFrom-Json

    if (-not $Prs -or $Prs.Count -eq 0) {
        Write-Host "Open PRs: 0"
    } else {
        Write-Host "Open PRs: $($Prs.Count)"
        foreach ($Pr in $Prs) {
            $labels = ($Pr.labels | ForEach-Object { $_.name }) -join ", "
            $checkSummary = Get-CheckSummary -Pr $Pr

            $recommendation = "inspect"
            $titleLower = $Pr.title.ToLowerInvariant()

            if ($Pr.isDraft) {
                $recommendation = "draft: wait or ask agent"
            } elseif ($Pr.mergeStateStatus -eq "CLEAN" -and $checkSummary -match "failed=0" -and $titleLower -match "bump|deps|dependabot") {
                $recommendation = "candidate: review then merge/automerge"
            } elseif ($Pr.mergeStateStatus -eq "BEHIND") {
                $recommendation = "update branch/rebase"
            } elseif ($checkSummary -match "failed=[1-9]") {
                $recommendation = "needs CI fix"
            } elseif ($Pr.mergeStateStatus -eq "UNKNOWN") {
                $recommendation = "checks unknown: open PR"
            }

            Write-Host "  PR #$($Pr.number) [$($Pr.mergeStateStatus)] $($Pr.title)"
            Write-Host "    head: $($Pr.headRefName) -> $($Pr.baseRefName)"
            Write-Host "    author: $($Pr.author.login) draft=$($Pr.isDraft) review=$($Pr.reviewDecision)"
            Write-Host "    checks: $checkSummary"
            Write-Host "    labels: $labels"
            Write-Host "    recommendation: $recommendation"
            Write-Host "    $($Pr.url)"

            $Report += [pscustomobject]@{
                repo = $FullName
                number = $Pr.number
                title = $Pr.title
                head = $Pr.headRefName
                base = $Pr.baseRefName
                mergeState = $Pr.mergeStateStatus
                reviewDecision = $Pr.reviewDecision
                isDraft = $Pr.isDraft
                checks = $checkSummary
                labels = $labels
                recommendation = $recommendation
                url = $Pr.url
            }
        }
    }

    $RunsRaw = gh run list `
        --repo $FullName `
        --limit 10 `
        --json databaseId,name,status,conclusion,headBranch,event,createdAt,url 2>$null

    if ($LASTEXITCODE -eq 0) {
        $Runs = $RunsRaw | ConvertFrom-Json
        $Failed = $Runs | Where-Object { $_.conclusion -eq "failure" -or $_.conclusion -eq "cancelled" }

        if ($Failed.Count -gt 0) {
            Write-Host "Recent failed/cancelled runs: $($Failed.Count)" -ForegroundColor Red
            foreach ($Run in $Failed) {
                Write-Host "  Run #$($Run.databaseId) [$($Run.conclusion)] $($Run.name) on $($Run.headBranch)"
                Write-Host "    event=$($Run.event) created=$($Run.createdAt)"
                Write-Host "    $($Run.url)"
            }
        } else {
            Write-Host "Recent failed/cancelled runs: 0"
        }
    }
}

$timestamp = Get-Date -Format "yyyyMMdd-HHmmss"
$OutFile = "reports/pr-triage-$timestamp.json"
$Report | ConvertTo-Json -Depth 20 | Set-Content -Encoding UTF8 $OutFile

Write-Host ""
Write-Host "Report written to $OutFile" -ForegroundColor Green
