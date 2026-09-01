# Sync Neon → Vercel environment variables for Plexi-ERP
#
# Prerequisites:
#   1. vercel login   (once)
#   2. cd Plexi-ERP
#
# Usage (from Plexi-ERP folder):
#   .\scripts\sync-vercel-env.ps1 -DatabaseUrl "<pooled Neon URL>" -DirectUrl "<direct Neon URL>"
#
# Or copy both strings from Neon Console → Flexicom ERP → Connect:
#   - DATABASE_URL  = "Pooled connection"
#   - DIRECT_URL    = "Direct connection"
#
# Targets: Production + Preview (covers main, staging, dev deploys)

param(
  [Parameter(Mandatory = $true)]
  [string]$DatabaseUrl,

  [Parameter(Mandatory = $true)]
  [string]$DirectUrl
)

$ErrorActionPreference = "Stop"
$projectId = "prj_NgxVVEGJNNjfXyJb0pF8ClxnDL6o"
$teamFlag = ""

function Set-VercelEnv {
  param([string]$Key, [string]$Value, [string]$Target)

  Write-Host "Setting $Key for $Target..."
  $Value | vercel env add $Key $Target $teamFlag --force 2>$null
  if ($LASTEXITCODE -ne 0) {
    $Value | vercel env add $Key $Target $teamFlag
  }
}

Write-Host "Linking project $projectId..."
vercel link --yes --project $projectId $teamFlag

foreach ($target in @("production", "preview")) {
  Set-VercelEnv -Key "DATABASE_URL" -Value $DatabaseUrl -Target $target
  Set-VercelEnv -Key "DIRECT_URL" -Value $DirectUrl -Target $target
}

Write-Host ""
Write-Host "Done. Redeploy plexi-erp on Vercel to run prisma migrate deploy on build."
Write-Host "Verify: vercel env ls $teamFlag"
