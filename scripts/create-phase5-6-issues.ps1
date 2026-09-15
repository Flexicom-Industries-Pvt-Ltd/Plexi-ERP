$repo = "Flexicom-Industries-Pvt-Ltd/Plexi-ERP"
$assignee = "Debsmit16"
$project = 4
$owner = "Flexicom-Industries-Pvt-Ltd"
$projectId = "PVT_kwDOEvYx6M4Bgs4s"
$statusFieldId = "PVTSSF_lADOEvYx6M4Bgs4szhfrbrI"
$todoOptionId = "f75ad846"

function New-PhaseIssue($title, $bodyFile) {
  $body = Get-Content -Path $bodyFile -Raw -Encoding UTF8
  $url = gh issue create --repo $repo --assignee $assignee --title $title --body $body
  $itemJson = gh project item-add $project --owner $owner --url $url --format json
  $itemId = ($itemJson | ConvertFrom-Json).id
  gh project item-edit --id $itemId --project-id $projectId --field-id $statusFieldId --single-select-option-id $todoOptionId | Out-Null
  Write-Output $url
}

# Phase 5 and 6 issue bodies live in scripts/issue-bodies/p39.md .. p46.md
# Use ASCII hyphens only in body files (no em dashes or special Unicode).

$issues = @(
  @{ Title = "[P39] Quality Control: Database schema and module foundation"; File = "scripts/issue-bodies/p39.md" },
  @{ Title = "[P40] Quality Control: Inspection queue and decision UI"; File = "scripts/issue-bodies/p40.md" },
  @{ Title = "[P41] Quality Control: Rework workflow"; File = "scripts/issue-bodies/p41.md" },
  @{ Title = "[P42] Quality Control: Scrap and waste tracking"; File = "scripts/issue-bodies/p42.md" },
  @{ Title = "[P43] Recycling: Scrap to RP granules"; File = "scripts/issue-bodies/p43.md" },
  @{ Title = "[P44] Maintenance: Machine downtime and service log"; File = "scripts/issue-bodies/p44.md" },
  @{ Title = "[P45] Finished Goods: FG stock from bales and bags"; File = "scripts/issue-bodies/p45.md" },
  @{ Title = "[P46] Dispatch: Orders, picking, and loading"; File = "scripts/issue-bodies/p46.md" }
)

foreach ($issue in $issues) {
  New-PhaseIssue $issue.Title $issue.File
}

Write-Output "Done. Created issues on project board (Todo)."
