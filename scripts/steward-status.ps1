# steward-status.ps1
# Simple multi-repo status helper.
# Usage:
#   pwsh -ExecutionPolicy Bypass -File .\scripts\steward-status.ps1

$ErrorActionPreference = "Continue"

Write-Host "== Oaslananka Lab Repo Steward Status ==" -ForegroundColor Cyan
Write-Host ""

$Repos = gh repo list oaslananka-lab --limit 200 --json name,isArchived,url | ConvertFrom-Json
$Repos = $Repos | Where-Object { -not $_.isArchived }

foreach ($Repo in $Repos) {
    $FullName = "oaslananka-lab/$($Repo.name)"
    Write-Host "## $FullName" -ForegroundColor Yellow

    $Prs = gh pr list --repo $FullName --state open --limit 20 --json number,title,isDraft,mergeStateStatus,url 2>$null | ConvertFrom-Json
    $FailedRuns = gh run list --repo $FullName --limit 10 --json databaseId,name,conclusion,headBranch,url 2>$null | ConvertFrom-Json
    $FailedRuns = $FailedRuns | Where-Object { $_.conclusion -eq "failure" }

    Write-Host "Open PRs: $($Prs.Count)"
    foreach ($Pr in $Prs) {
        Write-Host "  PR #$($Pr.number) [$($Pr.mergeStateStatus)] $($Pr.title)"
        Write-Host "    $($Pr.url)"
    }

    Write-Host "Recent failed runs: $($FailedRuns.Count)"
    foreach ($Run in $FailedRuns) {
        Write-Host "  Run #$($Run.databaseId) $($Run.name) on $($Run.headBranch)"
        Write-Host "    $($Run.url)"
    }

    Write-Host ""
}
