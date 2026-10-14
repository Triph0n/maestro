$port = 43175
$connections = Get-NetTCPConnection -LocalPort $port -ErrorAction SilentlyContinue
if ($connections) {
  $pids = $connections | Select-Object -ExpandProperty OwningProcess -Unique
  foreach ($processId in $pids) {
    try {
      Stop-Process -Id $processId -Force -ErrorAction SilentlyContinue
      Write-Host "Maestro server (PID $processId) byl uspesne zastaven."
    } catch {
      Write-Warning "Nepodarilo se zastavit PID ${processId}: $_"
    }
  }
} else {
  Write-Host "Maestro server na portu $port nebezi."
}
