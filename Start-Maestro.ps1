$ErrorActionPreference = "Stop"

$project = Split-Path -Parent $MyInvocation.MyCommand.Path
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
  $npm = (Get-Command npm.cmd -ErrorAction Stop).Source
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
