# repo-health-issue.ps1
# Creates a repo health issue for a target repository.
#
# Example:
#   pwsh -ExecutionPolicy Bypass -File .\scripts\repo-health-issue.ps1 -Repo helix

param(
    [string]$Org = "oaslananka-lab",

    [Parameter(Mandatory=$true)]
    [string]$Repo
)

$ErrorActionPreference = "Stop"

$FullName = "$Org/$Repo"

$OpenPrs = gh pr list `
    --repo $FullName `
    --state open `
    --limit 50 `
    --json number,title,mergeStateStatus,url | ConvertFrom-Json

$Runs = gh run list `
    --repo $FullName `
    --limit 20 `
    --json databaseId,name,conclusion,headBranch,url | ConvertFrom-Json

$FailedRuns = $Runs | Where-Object {
    $_.conclusion -eq "failure" -or $_.conclusion -eq "cancelled"
}

$Body = @()
$Body += "# Repository Health Follow-up"
$Body += ""
$Body += "Automated health summary for $FullName."
$Body += ""
$Body += "## Open PRs"
$Body += ""

if (-not $OpenPrs -or $OpenPrs.Count -eq 0) {
    $Body += "- None"
} else {
    foreach ($Pr in $OpenPrs) {
        $Body += "- PR #$($Pr.number) [$($Pr.mergeStateStatus)] $($Pr.title)"
        $Body += "  - $($Pr.url)"
    }
}

$Body += ""
$Body += "## Recent failed or cancelled runs"
$Body += ""

if (-not $FailedRuns -or $FailedRuns.Count -eq 0) {
    $Body += "- None"
} else {
    foreach ($Run in $FailedRuns) {
        $Body += "- Run #$($Run.databaseId): $($Run.name) on $($Run.headBranch)"
        $Body += "  - $($Run.url)"
    }
}

$Body += ""
$Body += "## Maintainer checklist"
$Body += ""
$Body += "- [ ] Review open dependency PRs"
$Body += "- [ ] Close obsolete PRs"
$Body += "- [ ] Fix failed runs"
$Body += "- [ ] Merge safe patch/docs PRs after checks pass"
$Body += "- [ ] Verify release/package state if needed"

$TempFile = New-TemporaryFile
$Body -join "`n" | Set-Content -Encoding UTF8 $TempFile

gh issue create `
    --repo $FullName `
    --title "Repository health follow-up" `
    --body-file $TempFile `
    --label "type:maintenance,needs:triage" | Out-Host

Remove-Item $TempFile -Force
