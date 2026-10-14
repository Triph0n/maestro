$ErrorActionPreference = "Stop"

$project = if ($PSScriptRoot) { $PSScriptRoot } else { Split-Path -Parent $MyInvocation.MyCommand.Path }
$hostName = "127.0.0.1"
$port = 43175
$url = "http://${hostName}:${port}/"

function Test-MaestroServer {
  try {
    $client = [System.Net.Sockets.TcpClient]::new()
    $connect = $client.BeginConnect($hostName, $port, $null, $null)
    $ready = $connect.AsyncWaitHandle.WaitOne(250)
    if ($ready) {
      $client.EndConnect($connect)
      $client.Close()
      return $true
    }
    $client.Close()
  } catch {
    return $false
  }

  return $false
}

if (-not (Test-MaestroServer)) {
  $npm = if (Get-Command npm.cmd -ErrorAction SilentlyContinue) {
    (Get-Command npm.cmd).Source
  } elseif (Test-Path "C:\Program Files\nodejs\npm.cmd") {
    "C:\Program Files\nodejs\npm.cmd"
  } else {
    "npm.cmd"
  }

  if (-not (Test-Path (Join-Path $project "dist\index.html"))) {
    $buildCmd = "cd /d `"$project`" && `"$npm`" run build"
    Start-Process -FilePath $env:ComSpec -ArgumentList "/c", $buildCmd -Wait -WindowStyle Hidden -WorkingDirectory $project
  }

  $command = "cd /d `"$project`" && `"$npm`" run preview -- --host $hostName --port $port --strictPort"
  Start-Process -FilePath $env:ComSpec -ArgumentList "/c", $command -WindowStyle Hidden -WorkingDirectory $project

  for ($i = 0; $i -lt 40; $i++) {
    if (Test-MaestroServer) {
      break
    }
    Start-Sleep -Milliseconds 250
  }
}

Start-Process $url
