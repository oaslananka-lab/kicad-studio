# steward-pr-triage.ps1
# Triage open PRs and active workflow failures for one repo or all repos.
#
# Examples:
#   pwsh -ExecutionPolicy Bypass -File .\scripts\steward-pr-triage.ps1 -Repo kicad-mcp-pro
#   pwsh -ExecutionPolicy Bypass -File .\scripts\steward-pr-triage.ps1 -All
#
# Read-only.

param(
    [string]$Org = "oaslananka-lab",
    [string]$Repo,
    [switch]$All,
    [int]$Limit = 50,
    [switch]$IncludeClosedPrFailures,
    [switch]$IncludeResolvedMainFailures
)

$ErrorActionPreference = "Continue"

function Get-Repos {
    if ($All) {
        $raw = gh repo list $Org --limit 300 --json name,isArchived 2>$null
        if ($LASTEXITCODE -ne 0) {
            throw "Could not list repositories for $Org"
        }
        return @($raw | ConvertFrom-Json | Where-Object { -not $_.isArchived })
    }

    if (-not $Repo) {
        throw "Use -Repo <name> or -All"
    }

    return @([pscustomobject]@{ name = $Repo; isArchived = $false })
}

function Get-CheckSummary {
    param($Pr)

    $nodes = @()
    if ($Pr.statusCheckRollup) {
        $nodes = @($Pr.statusCheckRollup)
    }

    if (-not $nodes -or $nodes.Count -eq 0) {
        return [pscustomobject]@{
            text = "no checks"
            passed = 0
            pending = 0
            failed = 0
            skipped = 0
            neutral = 0
            total = 0
        }
    }

    $passed = 0
    $pending = 0
    $failed = 0
    $skipped = 0
    $neutral = 0

    foreach ($c in $nodes) {
        $state = [string]$c.state
        $status = [string]$c.status
        $conclusion = [string]$c.conclusion

        if ($conclusion -eq "SUCCESS" -or $state -eq "SUCCESS") {
            $passed++
            continue
        }

        if ($conclusion -eq "SKIPPED") {
            $skipped++
            continue
        }

        if ($conclusion -eq "NEUTRAL") {
            $neutral++
            continue
        }

        if ($status -in @("QUEUED", "IN_PROGRESS", "PENDING") -or $state -in @("PENDING", "QUEUED", "IN_PROGRESS")) {
            $pending++
            continue
        }

        if ($conclusion -in @("FAILURE", "CANCELLED", "TIMED_OUT", "ACTION_REQUIRED", "STARTUP_FAILURE")) {
            $failed++
            continue
        }

        if ([string]::IsNullOrWhiteSpace($conclusion) -and $status -ne "COMPLETED") {
            $pending++
            continue
        }

        if ($conclusion -and $conclusion -ne "SUCCESS") {
            $failed++
            continue
        }

        $neutral++
    }

    $parts = @(
        "passed=$passed",
        "pending=$pending",
        "failed=$failed",
        "skipped=$skipped",
        "neutral=$neutral"
    )

    return [pscustomobject]@{
        text = ($parts -join ", ")
        passed = $passed
        pending = $pending
        failed = $failed
        skipped = $skipped
        neutral = $neutral
        total = $nodes.Count
    }
}

function Get-Recommendation {
    param($Pr, $CheckSummary)

    $titleLower = ([string]$Pr.title).ToLowerInvariant()

    if ($Pr.isDraft) {
        return "draft: wait or ask agent"
    }

    if ($CheckSummary.failed -gt 0) {
        return "needs CI fix"
    }

    if ($CheckSummary.pending -gt 0) {
        return "checks pending"
    }

    if ($Pr.mergeStateStatus -eq "BEHIND") {
        return "update branch/rebase"
    }

    if ($Pr.mergeStateStatus -eq "DIRTY") {
        return "merge conflict: manual fix"
    }

    if ($Pr.mergeStateStatus -eq "BLOCKED") {
        return "blocked: inspect required checks/reviews"
    }

    if ($Pr.mergeStateStatus -eq "CLEAN" -and $CheckSummary.failed -eq 0 -and $CheckSummary.pending -eq 0) {
        if ($titleLower -match "bump|deps|dependabot") {
            return "candidate: review then merge/automerge"
        }
        return "candidate: review"
    }

    if ($Pr.mergeStateStatus -eq "UNKNOWN") {
        return "checks unknown: inspect"
    }

    return "inspect"
}

function Get-RunKey {
    param($Run)
    return "$($Run.name)||$($Run.headBranch)"
}

function Is-ResolvedFailure {
    param($Run, $LatestSuccessByKey)

    if (-not $Run.createdAt) {
        return $false
    }

    $key = Get-RunKey -Run $Run
    if (-not $LatestSuccessByKey.ContainsKey($key)) {
        return $false
    }

    return ([datetime]$LatestSuccessByKey[$key] -gt [datetime]$Run.createdAt)
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

    $Prs = @($PrsRaw | ConvertFrom-Json)
    $OpenPrBranches = @{}
    foreach ($Pr in $Prs) {
        if ($Pr.headRefName) {
            $OpenPrBranches[$Pr.headRefName] = $true
        }
    }

    if (-not $Prs -or $Prs.Count -eq 0) {
        Write-Host "Open PRs: 0"
    } else {
        Write-Host "Open PRs: $($Prs.Count)"
        foreach ($Pr in $Prs) {
            $labels = ($Pr.labels | ForEach-Object { $_.name }) -join ", "
            $checkSummary = Get-CheckSummary -Pr $Pr
            $recommendation = Get-Recommendation -Pr $Pr -CheckSummary $checkSummary

            Write-Host "  PR #$($Pr.number) [$($Pr.mergeStateStatus)] $($Pr.title)"
            Write-Host "    head: $($Pr.headRefName) -> $($Pr.baseRefName)"
            Write-Host "    author: $($Pr.author.login) draft=$($Pr.isDraft) review=$($Pr.reviewDecision)"
            Write-Host "    checks: $($checkSummary.text)"
            Write-Host "    labels: $labels"
            Write-Host "    recommendation: $recommendation"
            Write-Host "    $($Pr.url)"

            $Report += [pscustomobject]@{
                repo = $FullName
                kind = "open_pr"
                number = $Pr.number
                title = $Pr.title
                head = $Pr.headRefName
                base = $Pr.baseRefName
                mergeState = $Pr.mergeStateStatus
                reviewDecision = $Pr.reviewDecision
                isDraft = $Pr.isDraft
                checks = $checkSummary.text
                checksPassed = $checkSummary.passed
                checksPending = $checkSummary.pending
                checksFailed = $checkSummary.failed
                checksSkipped = $checkSummary.skipped
                checksNeutral = $checkSummary.neutral
                labels = $labels
                recommendation = $recommendation
                url = $Pr.url
            }
        }
    }

    $RunsRaw = gh run list `
        --repo $FullName `
        --limit 100 `
        --json databaseId,name,status,conclusion,headBranch,event,createdAt,url 2>$null

    if ($LASTEXITCODE -eq 0) {
        $Runs = @($RunsRaw | ConvertFrom-Json)

        $LatestSuccessByKey = @{}
        foreach ($Run in $Runs) {
            if ($Run.conclusion -eq "success" -and $Run.name -and $Run.headBranch -and $Run.createdAt) {
                $key = Get-RunKey -Run $Run
                if (-not $LatestSuccessByKey.ContainsKey($key) -or ([datetime]$Run.createdAt -gt [datetime]$LatestSuccessByKey[$key])) {
                    $LatestSuccessByKey[$key] = $Run.createdAt
                }
            }
        }

        $Failed = @()
        $IgnoredClosed = 0
        $IgnoredResolvedMain = 0

        foreach ($Run in $Runs) {
            $isFailure = ($Run.conclusion -eq "failure" -or $Run.conclusion -eq "cancelled" -or $Run.conclusion -eq "timed_out")
            if (-not $isFailure) {
                continue
            }

            $isOpenPrBranch = $OpenPrBranches.ContainsKey($Run.headBranch)
            $isMain = ($Run.headBranch -eq "main")
            $isClosedPrFailure = (-not $isMain -and -not $isOpenPrBranch)
            $isResolvedMainFailure = ($isMain -and (Is-ResolvedFailure -Run $Run -LatestSuccessByKey $LatestSuccessByKey))

            if ($isClosedPrFailure -and -not $IncludeClosedPrFailures) {
                $IgnoredClosed++
                continue
            }

            if ($isResolvedMainFailure -and -not $IncludeResolvedMainFailures) {
                $IgnoredResolvedMain++
                continue
            }

            if ($isMain -or $isOpenPrBranch -or $IncludeClosedPrFailures) {
                $Failed += $Run
            }
        }

        if ($Failed.Count -gt 0) {
            Write-Host "Active failed/cancelled runs: $($Failed.Count)" -ForegroundColor Red
            foreach ($Run in $Failed) {
                Write-Host "  Run #$($Run.databaseId) [$($Run.conclusion)] $($Run.name) on $($Run.headBranch)"
                Write-Host "    event=$($Run.event) created=$($Run.createdAt)"
                Write-Host "    $($Run.url)"

                $Report += [pscustomobject]@{
                    repo = $FullName
                    kind = "active_failed_run"
                    runId = $Run.databaseId
                    name = $Run.name
                    conclusion = $Run.conclusion
                    headBranch = $Run.headBranch
                    event = $Run.event
                    createdAt = $Run.createdAt
                    url = $Run.url
                }
            }
        } else {
            Write-Host "Active failed/cancelled runs: 0"
        }

        if ($IgnoredClosed -gt 0 -and -not $IncludeClosedPrFailures) {
            Write-Host "Ignored historical failures from closed PR branches: $IgnoredClosed" -ForegroundColor DarkGray
        }

        if ($IgnoredResolvedMain -gt 0 -and -not $IncludeResolvedMainFailures) {
            Write-Host "Ignored resolved main failures: $IgnoredResolvedMain" -ForegroundColor DarkGray
        }
    }
}

$timestamp = Get-Date -Format "yyyyMMdd-HHmmss"
$OutFile = "reports/pr-triage-$timestamp.json"
$Report | ConvertTo-Json -Depth 20 | Set-Content -Encoding UTF8 $OutFile

Write-Host ""
Write-Host "Report written to $OutFile" -ForegroundColor Green
