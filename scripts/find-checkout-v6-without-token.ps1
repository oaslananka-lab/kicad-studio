# find-checkout-v6-without-token.ps1
# Finds workflow files that use actions/checkout@v6 without an explicit token input.
#
# Run from a cloned target repository root, for example:
#   cd C:\Users\Admin\Desktop\GIT_PROJECTS\GITHUB\helix
#   pwsh -ExecutionPolicy Bypass -File ..\repo-steward\scripts\find-checkout-v6-without-token.ps1

$ErrorActionPreference = "Stop"

$WorkflowDir = ".github/workflows"

if (-not (Test-Path $WorkflowDir)) {
    Write-Host "No .github/workflows directory found."
    exit 0
}

$Files = Get-ChildItem $WorkflowDir -Recurse -File -Include "*.yml","*.yaml"
$Found = $false

foreach ($File in $Files) {
    $Text = Get-Content $File.FullName -Raw

    if ($Text -match "actions/checkout@v6") {
        if ($Text -notmatch "token:\s*") {
            Write-Host "checkout@v6 without explicit token: $($File.FullName)" -ForegroundColor Yellow
            $Found = $true
        }
    }
}

if (-not $Found) {
    Write-Host "No checkout@v6 without explicit token detected."
}
