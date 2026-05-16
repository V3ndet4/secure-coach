param(
  [string]$Message = "Update Secure Coach app"
)

$ErrorActionPreference = "Stop"

function Invoke-Checked {
  param(
    [Parameter(Mandatory = $true)][string]$FilePath,
    [string[]]$ArgumentList = @()
  )

  & $FilePath @ArgumentList
  if ($LASTEXITCODE -ne 0) {
    throw "Command failed: $FilePath $($ArgumentList -join ' ')"
  }
}

$repoRoot = Split-Path -Parent $PSScriptRoot
Set-Location $repoRoot

Invoke-Checked "git" @("-c", "safe.directory=C:/Users/vasic/secure-coach", "config", "core.hooksPath", ".githooks")
Invoke-Checked "node" @("--check", "app.js")
Invoke-Checked "node" @("--check", "service-worker.js")

$changes = git -c safe.directory=C:/Users/vasic/secure-coach status --porcelain
if (-not $changes) {
  Write-Host "No local changes to commit. Pushing main to origin anyway..."
  Invoke-Checked "git" @("-c", "safe.directory=C:/Users/vasic/secure-coach", "push", "origin", "main")
  exit 0
}

Invoke-Checked "git" @("-c", "safe.directory=C:/Users/vasic/secure-coach", "add", ".")
Invoke-Checked "git" @("-c", "safe.directory=C:/Users/vasic/secure-coach", "commit", "-m", $Message)

