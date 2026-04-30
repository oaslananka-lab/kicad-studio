# enable-auto-delete-branches.ps1
# Enables "Automatically delete head branches" for repos in the organization.
#
# Safe repo hygiene setting:
# merged PR head branches are deleted automatically.
#
# Examples:
#   pwsh -ExecutionPolicy Bypass -File .\scripts\enable-auto-delete-branches.ps1 -DryRun
#   pwsh -ExecutionPolicy Bypass -File .\scripts\enable-auto-delete-branches.ps1

param(
    [string]$Org = "oaslananka-lab",
    [switch]$DryRun
)

$ErrorActionPreference = "Stop"

$Repos = gh repo list $Org --limit 200 --json name,isArchived | ConvertFrom-Json | Where-Object { -not $_.isArchived }

foreach ($Repo in $Repos) {
    $FullName = "$Org/$($Repo.name)"
    Write-Host "==> $FullName"

    if ($DryRun) {
        Write-Host "Dry run: would enable delete_branch_on_merge"
        continue
    }

    gh api `
        --method PATCH `
        -H "Accept: application/vnd.github+json" `
        "/repos/$FullName" `
        -f delete_branch_on_merge=true *> $null

    Write-Host "Enabled delete_branch_on_merge"
}

Write-Host ""
Write-Host "Done."
