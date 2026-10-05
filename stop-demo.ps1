$stateFile = Join-Path $PSScriptRoot ".demo-state/processes.json"
if (-not (Test-Path -LiteralPath $stateFile)) {
  Write-Host "No demo services were started by Start Demo.cmd."
  exit 0
}

$raw = Get-Content -LiteralPath $stateFile -Raw
$processIds = @($raw | ConvertFrom-Json)
foreach ($processId in $processIds) {
  $process = Get-Process -Id ([int]$processId) -ErrorAction SilentlyContinue
  if ($process) {
    Stop-Process -Id $process.Id -Force
    Write-Host "Stopped demo service process $processId."
  }
}
Remove-Item -LiteralPath $stateFile -Force
Write-Host "Demo services stopped."
