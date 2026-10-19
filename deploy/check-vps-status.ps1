param(
  [string]$Target = "Production",
  [string]$HostName = "alumnos-api.duckdns.org",
  [string]$CustomUrl = ""
)

$ErrorActionPreference = "Stop"

$url = if ($CustomUrl) {
  $CustomUrl
} elseif ($Target -eq "Local") {
  "http://127.0.0.1:8090"
} else {
  "https://$HostName"
}

Write-Host "=================================================="
Write-Host " PocketBase - Diagnostico de Estado de Servidor"
Write-Host " Destino: $url ($Target)"
Write-Host "=================================================="

if ($url -like "https://*") {
  $domain = ([System.Uri]$url).Host
  try {
    $ipAddresses = [System.Net.Dns]::GetHostAddresses($domain)
    $ipList = ($ipAddresses | ForEach-Object { $_.IPAddressToString }) -join ", "
    Write-Host "DNS:        $domain -> $ipList"
  } catch {
    Write-Warning "Fallo resolucion DNS para $($domain): $_"
  }
}

$healthUrl = "$url/api/health"
$stopwatch = [System.Diagnostics.Stopwatch]::StartNew()
try {
  $response = Invoke-RestMethod -Uri $healthUrl -Method Get -TimeoutSec 10
  $stopwatch.Stop()
  $latency = $stopwatch.ElapsedMilliseconds
  Write-Host "Servicio:   OPERATIVO (HTTP 200 - $($response.message))"
  Write-Host "Latencia:   $latency ms"
  Write-Host "Backup OK:  $($response.data.canBackup)"
} catch {
  $stopwatch.Stop()
  Write-Host "Servicio:   NO DISPONIBLE / ERROR"
  Write-Error "Fallo la conexion con $($healthUrl) ($($stopwatch.ElapsedMilliseconds) ms): $_"
  exit 1
}

if ($url -like "https://*") {
  $pdfUrl = "$url/api/cys/pdf/generar"
  $stopwatchPdf = [System.Diagnostics.Stopwatch]::StartNew()
  try {
    $pdfHeaders = @{ "Origin" = "https://crecer-y-ser-ten.vercel.app" }
    $pdfResponse = Invoke-WebRequest -Uri $pdfUrl -Method Options -Headers $pdfHeaders -TimeoutSec 10 -UseBasicParsing
    $stopwatchPdf.Stop()
    Write-Host "Worker PDF: DISPONIBLE (HTTP $($pdfResponse.StatusCode) - $($stopwatchPdf.ElapsedMilliseconds) ms)"
  } catch {
    $stopwatchPdf.Stop()
    Write-Host "Worker PDF: NO RESPONDE ($($stopwatchPdf.ElapsedMilliseconds) ms)"
  }
}

Write-Host "--------------------------------------------------"
Write-Host "Estado general del backend: OPERATIVO"
Write-Host "=================================================="
