# release-verify-template.ps1
# Template only. Copy and adapt per repository/package type.

param(
    [Parameter(Mandatory=$true)]
    [string]$Version,

    [Parameter(Mandatory=$false)]
    [string]$PackageName
)

$ErrorActionPreference = "Stop"

Write-Host "== GitHub Release =="
gh release view "v$Version"

if ($PackageName) {
    Write-Host "== Package verification placeholder =="
    Write-Host "Package: $PackageName"
    Write-Host "Add PyPI/npm/GHCR/VSIX verification here."
}

Write-Host "Release verification completed."
