# capability-audit.ps1
# Audits GitHub capabilities for repositories in an organization.
#
# Examples:
#   pwsh -ExecutionPolicy Bypass -File .\scripts\capability-audit.ps1 -Repo kicad-mcp-pro
#   pwsh -ExecutionPolicy Bypass -File .\scripts\capability-audit.ps1 -All
#
# Read-only.

param(
    [string]$Org = "oaslananka-lab",
    [string]$Repo,
    [switch]$All,
    [switch]$ShowDetails,
    [int]$RunLimit = 50
)

$ErrorActionPreference = "Continue"

function Invoke-GhApiJson {
    param([Parameter(Mandatory=$true)][string[]]$Args)

    $raw = & gh api @Args 2>&1
    $exit = $LASTEXITCODE
    $text = ($raw | Out-String).Trim()

    if ($exit -ne 0) {
        return [pscustomobject]@{ ok = $false; status = "error"; message = $text; data = $null }
    }

    if ([string]::IsNullOrWhiteSpace($text)) {
        return [pscustomobject]@{ ok = $true; status = "ok"; message = ""; data = $null }
    }

    try {
        return [pscustomobject]@{ ok = $true; status = "ok"; message = ""; data = ($text | ConvertFrom-Json) }
    } catch {
        return [pscustomobject]@{ ok = $true; status = "raw"; message = $text; data = $text }
    }
}

function Invoke-GhGraphQlJson {
    param([string]$Owner, [string]$Name, [string]$Query)

    $raw = & gh api graphql `
        -H "GraphQL-Features: issues_copilot_assignment_api_support,coding_agent_model_selection" `
        -f owner=$Owner `
        -f name=$Name `
        -f query=$Query 2>&1

    $exit = $LASTEXITCODE
    $text = ($raw | Out-String).Trim()

    if ($exit -ne 0) {
        return [pscustomobject]@{ ok = $false; status = "error"; message = $text; data = $null }
    }

    try {
        return [pscustomobject]@{ ok = $true; status = "ok"; message = ""; data = ($text | ConvertFrom-Json) }
    } catch {
        return [pscustomobject]@{ ok = $false; status = "parse_error"; message = $text; data = $null }
    }
}

function Get-TargetRepos {
    if ($All) {
        $raw = gh repo list $Org --limit 300 --json name,isArchived,isPrivate,visibility,url 2>$null
        if ($LASTEXITCODE -ne 0) {
            throw "Could not list repositories for $Org"
        }

        return @($raw | ConvertFrom-Json | Where-Object { -not $_.isArchived })
    }

    if (-not $Repo) {
        throw "Use -Repo <name> or -All"
    }

    return @([pscustomobject]@{ name = $Repo; isArchived = $false; url = "https://github.com/$Org/$Repo" })
}

function Get-CountOrStatus {
    param($Result, [string]$DisabledHint)

    if (-not $Result.ok) {
        $msg = $Result.message
        if ($msg -match "disabled") { return [pscustomobject]@{ status = "disabled"; count = $null; message = $DisabledHint } }
        if ($msg -match "no analysis found") { return [pscustomobject]@{ status = "no_analysis"; count = $null; message = "No analysis found" } }
        if ($msg -match "404") { return [pscustomobject]@{ status = "unavailable_or_disabled"; count = $null; message = $msg } }
        if ($msg -match "403") { return [pscustomobject]@{ status = "forbidden"; count = $null; message = $msg } }
        return [pscustomobject]@{ status = "error"; count = $null; message = $msg }
    }

    if ($null -eq $Result.data) { return [pscustomobject]@{ status = "ok"; count = 0; message = "" } }
    if ($Result.data -is [array]) { return [pscustomobject]@{ status = "ok"; count = $Result.data.Count; message = "" } }
    return [pscustomobject]@{ status = "ok"; count = 1; message = "" }
}

function Get-RepoLabels {
    param([string]$FullName)

    $raw = gh label list --repo $FullName --limit 500 --json name 2>$null
    if ($LASTEXITCODE -ne 0) {
        return @()
    }

    try {
        return @($raw | ConvertFrom-Json | ForEach-Object { $_.name })
    } catch {
        return @()
    }
}

function Get-OpenPrBranches {
    param([string]$FullName)

    $raw = gh pr list --repo $FullName --state open --limit 100 --json number,headRefName,title,url 2>$null
    if ($LASTEXITCODE -ne 0) {
        return [pscustomobject]@{ ok = $false; count = $null; branches = @(); prs = @() }
    }

    $prs = @($raw | ConvertFrom-Json)
    $branches = @($prs | ForEach-Object { $_.headRefName })
    return [pscustomobject]@{ ok = $true; count = $prs.Count; branches = $branches; prs = $prs }
}

function Get-ActiveFailedRuns {
    param([string]$FullName, [array]$OpenPrBranches)

    $raw = gh run list --repo $FullName --limit $RunLimit --json databaseId,name,status,conclusion,headBranch,event,createdAt,url 2>$null
    if ($LASTEXITCODE -ne 0) {
        return [pscustomobject]@{ ok = $false; activeFailed = @(); ignoredClosedPrFailures = 0; ignoredResolvedMainFailures = 0 }
    }

    $runs = @($raw | ConvertFrom-Json)
    $branchMap = @{}
    foreach ($b in $OpenPrBranches) { if ($b) { $branchMap[$b] = $true } }

    $latestSuccess = @{}
    foreach ($run in $runs) {
        if ($run.conclusion -eq "success" -and $run.name -and $run.headBranch -and $run.createdAt) {
            $key = "$($run.name)||$($run.headBranch)"
            if (-not $latestSuccess.ContainsKey($key) -or ([datetime]$run.createdAt -gt [datetime]$latestSuccess[$key])) {
                $latestSuccess[$key] = $run.createdAt
            }
        }
    }

    $active = @()
    $ignoredClosed = 0
    $ignoredResolvedMain = 0

    foreach ($run in $runs) {
        $isFailure = ($run.conclusion -eq "failure" -or $run.conclusion -eq "cancelled" -or $run.conclusion -eq "timed_out")
        if (-not $isFailure) { continue }

        $isMain = ($run.headBranch -eq "main")
        $isOpenPrBranch = $branchMap.ContainsKey($run.headBranch)
        $isClosedPrFailure = (-not $isMain -and -not $isOpenPrBranch)

        $key = "$($run.name)||$($run.headBranch)"
        $isResolvedMain = $false
        if ($isMain -and $latestSuccess.ContainsKey($key)) {
            $isResolvedMain = ([datetime]$latestSuccess[$key] -gt [datetime]$run.createdAt)
        }

        if ($isClosedPrFailure) { $ignoredClosed++; continue }
        if ($isResolvedMain) { $ignoredResolvedMain++; continue }

        if ($isMain -or $isOpenPrBranch) { $active += $run }
    }

    return [pscustomobject]@{
        ok = $true
        activeFailed = $active
        ignoredClosedPrFailures = $ignoredClosed
        ignoredResolvedMainFailures = $ignoredResolvedMain
    }
}

function Get-CopilotAssignable {
    param([string]$Owner, [string]$Name)

    $query = @(
        'query($owner: String!, $name: String!) {',
        '  repository(owner: $owner, name: $name) {',
        '    suggestedActors(capabilities: [CAN_BE_ASSIGNED], first: 100) {',
        '      nodes { login __typename ... on Bot { id } ... on User { id } }',
        '    }',
        '  }',
        '}'
    ) -join "`n"

    $result = Invoke-GhGraphQlJson -Owner $Owner -Name $Name -Query $query
    if (-not $result.ok) {
        return [pscustomobject]@{ ok = $false; assignable = $false; login = $null; message = $result.message }
    }

    $nodes = @($result.data.data.repository.suggestedActors.nodes)
    $agent = $nodes | Where-Object { $_.login -eq "copilot-swe-agent" } | Select-Object -First 1
    $agentLogin = $null
    if ($agent) { $agentLogin = $agent.login }

    return [pscustomobject]@{ ok = $true; assignable = ($null -ne $agent); login = $agentLogin; message = "" }
}

Write-Host "== Oaslananka Lab Capability Audit ==" -ForegroundColor Cyan
Write-Host ""

$userResult = Invoke-GhApiJson -Args @("user")
if ($userResult.ok -and $userResult.data) {
    Write-Host "Active GitHub user: $($userResult.data.login)"
    Write-Host "GitHub plan:        $($userResult.data.plan.name)"
} else {
    Write-Host "Active GitHub user: could not read" -ForegroundColor Yellow
}

$orgActions = Invoke-GhApiJson -Args @("/orgs/$Org/actions/permissions")
$orgWorkflow = Invoke-GhApiJson -Args @("/orgs/$Org/actions/permissions/workflow")
$copilotSeats = Invoke-GhApiJson -Args @("/orgs/$Org/copilot/billing/seats")
$copilotCoding = Invoke-GhApiJson -Args @("-H", "X-GitHub-Api-Version: 2026-03-10", "/orgs/$Org/copilot/coding-agent/permissions")

Write-Host ""
Write-Host "Organization: $Org" -ForegroundColor Yellow
Write-Host "Actions repos:       $(if ($orgActions.ok) { $orgActions.data.enabled_repositories } else { 'unknown' })"
Write-Host "Allowed actions:     $(if ($orgActions.ok) { $orgActions.data.allowed_actions } else { 'unknown' })"
Write-Host "Workflow perms:      $(if ($orgWorkflow.ok) { $orgWorkflow.data.default_workflow_permissions } else { 'unknown' })"
Write-Host "Copilot seats:       $(if ($copilotSeats.ok) { $copilotSeats.data.total_seats } else { 'unknown' })"
Write-Host "Copilot agent repos: $(if ($copilotCoding.ok) { $copilotCoding.data.enabled_repositories } else { 'unknown' })"

$targets = Get-TargetRepos
$report = @()

foreach ($target in $targets) {
    $name = $target.name
    $fullName = "$Org/$name"

    Write-Host ""
    Write-Host "## $fullName" -ForegroundColor Yellow

    $repoInfo = Invoke-GhApiJson -Args @("/repos/$fullName")
    $actionsPerm = Invoke-GhApiJson -Args @("/repos/$fullName/actions/permissions")

    $workflowRaw = gh workflow list --repo $fullName 2>$null
    $workflowExit = $LASTEXITCODE
    $workflows = @()
    if ($workflowExit -eq 0) {
        $workflows = @($workflowRaw | Where-Object { $_ -and ($_ -notmatch "^NAME\s+STATE\s+ID") })
    }

    $prInfo = Get-OpenPrBranches -FullName $fullName
    $runInfo = Get-ActiveFailedRuns -FullName $fullName -OpenPrBranches $prInfo.branches

    $dependabotAlerts = Get-CountOrStatus -Result (Invoke-GhApiJson -Args @("/repos/$fullName/dependabot/alerts")) -DisabledHint "Dependabot alerts unavailable"
    $codeScanningAlerts = Get-CountOrStatus -Result (Invoke-GhApiJson -Args @("/repos/$fullName/code-scanning/alerts")) -DisabledHint "Code scanning unavailable"
    $secretScanningAlerts = Get-CountOrStatus -Result (Invoke-GhApiJson -Args @("/repos/$fullName/secret-scanning/alerts")) -DisabledHint "Secret scanning disabled"

    $copilotAssignable = Get-CopilotAssignable -Owner $Org -Name $name

    $requiredLabels = @("type:maintenance", "needs:triage", "agent:candidate", "dependencies")
    $existingLabels = @(Get-RepoLabels -FullName $fullName)
    $labelSet = @{}
    foreach ($labelName in $existingLabels) { $labelSet[$labelName] = $true }
    $missingLabels = @($requiredLabels | Where-Object { -not $labelSet.ContainsKey($_) })

    $repoVisibility = if ($repoInfo.ok) { $repoInfo.data.visibility } else { "unknown" }
    $autoMerge = if ($repoInfo.ok) { $repoInfo.data.allow_auto_merge } else { $null }
    $deleteBranch = if ($repoInfo.ok) { $repoInfo.data.delete_branch_on_merge } else { $null }
    $squashMerge = if ($repoInfo.ok) { $repoInfo.data.allow_squash_merge } else { $null }
    $actionsEnabled = if ($actionsPerm.ok) { $actionsPerm.data.enabled } else { $null }

    Write-Host "visibility:             $repoVisibility"
    Write-Host "actions enabled:        $actionsEnabled"
    Write-Host "auto merge:             $autoMerge"
    Write-Host "delete branch on merge: $deleteBranch"
    Write-Host "squash merge:           $squashMerge"
    Write-Host "workflows:              $($workflows.Count)"
    Write-Host "open PRs:               $($prInfo.count)"
    Write-Host "active failed runs:     $($runInfo.activeFailed.Count)"
    Write-Host "Dependabot alerts:      $($dependabotAlerts.status) $(if ($null -ne $dependabotAlerts.count) { '(' + $dependabotAlerts.count + ')' })"
    Write-Host "Code scanning:          $($codeScanningAlerts.status) $(if ($null -ne $codeScanningAlerts.count) { '(' + $codeScanningAlerts.count + ')' })"
    Write-Host "Secret scanning:        $($secretScanningAlerts.status) $(if ($null -ne $secretScanningAlerts.count) { '(' + $secretScanningAlerts.count + ')' })"
    Write-Host "Copilot agent:          $(if ($copilotAssignable.assignable) { 'assignable' } else { 'not assignable' })"

    if ($missingLabels.Count -gt 0) {
        Write-Host "missing labels:         $($missingLabels -join ', ')" -ForegroundColor DarkYellow
    }

    if ($ShowDetails -and $workflows.Count -gt 0) {
        Write-Host "workflow list:"
        foreach ($workflow in $workflows) { Write-Host "  $workflow" }
    }

    $report += [pscustomobject]@{
        repo = $fullName
        visibility = $repoVisibility
        actionsEnabled = $actionsEnabled
        autoMerge = $autoMerge
        deleteBranchOnMerge = $deleteBranch
        squashMerge = $squashMerge
        workflows = $workflows.Count
        openPrs = $prInfo.count
        activeFailedRuns = $runInfo.activeFailed.Count
        ignoredClosedPrFailures = $runInfo.ignoredClosedPrFailures
        ignoredResolvedMainFailures = $runInfo.ignoredResolvedMainFailures
        dependabotAlerts = $dependabotAlerts
        codeScanning = $codeScanningAlerts
        secretScanning = $secretScanningAlerts
        copilotAgentAssignable = $copilotAssignable.assignable
        missingLabels = $missingLabels
        url = if ($repoInfo.ok) { $repoInfo.data.html_url } else { $target.url }
    }
}

$timestamp = Get-Date -Format "yyyyMMdd-HHmmss"
$out = "reports/capability-audit-$timestamp.json"
$report | ConvertTo-Json -Depth 30 | Set-Content -Encoding UTF8 $out

Write-Host ""
Write-Host "Report written to $out" -ForegroundColor Green

$problemCount = @($report | Where-Object {
    $_.actionsEnabled -ne $true -or
    $_.activeFailedRuns -gt 0 -or
    $_.openPrs -gt 0 -or
    $_.copilotAgentAssignable -ne $true -or
    $_.missingLabels.Count -gt 0
}).Count

Write-Host "Repositories with follow-up items: $problemCount"
