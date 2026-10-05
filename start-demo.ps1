$ErrorActionPreference = "Stop"
$projectRoot = Split-Path -Parent $MyInvocation.MyCommand.Path
$stateDir = Join-Path $projectRoot ".demo-state"
$logsDir = Join-Path $stateDir "logs"
New-Item -ItemType Directory -Force -Path $logsDir | Out-Null

function Get-NodeExecutable {
  if ($env:NODE_EXE -and (Test-Path -LiteralPath $env:NODE_EXE)) { return $env:NODE_EXE }
  $fromPath = Get-Command node.exe -ErrorAction SilentlyContinue
  if ($fromPath) { return $fromPath.Source }

  $nvmRoot = Join-Path $env:LOCALAPPDATA "Author Software\nvm\installs"
  if (Test-Path -LiteralPath $nvmRoot) {
    $versions = Get-ChildItem -LiteralPath $nvmRoot -Directory | Where-Object Name -Match '^v\d+\.\d+\.\d+$' |
      Sort-Object { [version]$_.Name.Substring(1) } -Descending
    foreach ($version in $versions) {
      $candidate = Join-Path $version.FullName "node.exe"
      if (Test-Path -LiteralPath $candidate) { return $candidate }
    }
  }
  throw "Node.js was not found. Install Node.js or set NODE_EXE to your node.exe path."
}

function Test-PortOpen([int]$port) {
  $client = [System.Net.Sockets.TcpClient]::new()
  try {
    $pending = $client.BeginConnect("127.0.0.1", $port, $null, $null)
    if (-not $pending.AsyncWaitHandle.WaitOne(300)) { return $false }
    $client.EndConnect($pending)
    return $true
  } catch { return $false }
  finally { $client.Dispose() }
}

function Wait-Port([int]$port, [int]$seconds, [System.Diagnostics.Process]$process) {
  for ($i = 0; $i -lt $seconds; $i++) {
    if (Test-PortOpen $port) { return $true }
    if ($process.HasExited) { return $false }
    Start-Sleep -Seconds 1
  }
  return (Test-PortOpen $port)
}

$nodeExe = Get-NodeExecutable
$pids = [System.Collections.Generic.List[int]]::new()
$stateFile = Join-Path $stateDir "processes.json"
if (Test-Path -LiteralPath $stateFile) {
  try {
    foreach ($priorId in @(Get-Content -LiteralPath $stateFile -Raw | ConvertFrom-Json)) {
      $prior = Get-Process -Id ([int]$priorId) -ErrorAction SilentlyContinue
      if ($prior -and $prior.ProcessName -eq "node") { $pids.Add($prior.Id) }
    }
  } catch { }
}

function Save-DemoProcesses {
  ConvertTo-Json -InputObject @($pids.ToArray()) | Set-Content -LiteralPath $stateFile
}

if (Test-PortOpen 5000) {
  Write-Host "Backend already has a listener on port 5000; reusing it."
} else {
  $backend = Start-Process -FilePath $nodeExe -ArgumentList @("--watch", "src/server.js") `
    -WorkingDirectory (Join-Path $projectRoot "backend") -WindowStyle Hidden -PassThru `
    -RedirectStandardOutput (Join-Path $logsDir "backend-out.log") `
    -RedirectStandardError (Join-Path $logsDir "backend-error.log")
  $pids.Add($backend.Id)
  Save-DemoProcesses
  if (-not (Wait-Port 5000 30 $backend)) {
    throw "The backend did not start on port 5000. See .demo-state/logs/backend-error.log."
  }
}

if (Test-PortOpen 5173) {
  Write-Host "A server already has a listener on port 5173; reusing that address."
} else {
  $viteCli = Join-Path $projectRoot "node_modules/vite/bin/vite.js"
  if (-not (Test-Path -LiteralPath $viteCli)) {
    throw "Frontend dependencies are missing. Install them once before the demo."
  }
  $viteArgs = '"' + $viteCli + '" --host 127.0.0.1 --strictPort'
  $frontend = Start-Process -FilePath $nodeExe -ArgumentList $viteArgs `
    -WorkingDirectory $projectRoot -WindowStyle Hidden -PassThru `
    -RedirectStandardOutput (Join-Path $logsDir "frontend-out.log") `
    -RedirectStandardError (Join-Path $logsDir "frontend-error.log")
  $pids.Add($frontend.Id)
  Save-DemoProcesses
  if (-not (Wait-Port 5173 30 $frontend)) {
    throw "The website did not start on port 5173. See .demo-state/logs/frontend-error.log."
  }
}

Save-DemoProcesses
Start-Process "http://localhost:5173"
Write-Host "Upang Delivers is ready at http://localhost:5173"
Write-Host "Use Stop Demo.cmd to stop services started by this launcher."
