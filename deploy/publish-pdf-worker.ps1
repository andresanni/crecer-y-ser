param(
  [string]$RemoteHost = "129.121.52.187",
  [int]$Port = 22022,
  [string]$RemoteUser = "root",
  [string]$IdentityFile = "$env:USERPROFILE\.ssh\codex_crecer_vps_ed25519"
)

$ErrorActionPreference = "Stop"
$releaseId = Get-Date -Format "yyyyMMdd-HHmmss"
$stage = "/root/cys-pdf-$releaseId"
$target = "$RemoteUser@$RemoteHost"
$archive = Join-Path ([System.IO.Path]::GetTempPath()) "cys-pdf-$releaseId.tar.gz"
$sshArgs = @("-o", "BatchMode=yes", "-o", "StrictHostKeyChecking=yes", "-p", "$Port", "-i", $IdentityFile)
$scpArgs = @("-o", "BatchMode=yes", "-o", "StrictHostKeyChecking=yes", "-P", "$Port", "-i", $IdentityFile)
Push-Location (Split-Path -Parent $PSScriptRoot)
try {
  & node scripts/build-pdf-worker.mjs
  if ($LASTEXITCODE -ne 0) { throw "Falló el build del generador." }
  & tar -czf $archive package.json package-lock.json scripts/local-pdf-plugin.ts scripts/pdf-worker.ts src/modules/boletines/documentos public/boletines dist-render
  if ($LASTEXITCODE -ne 0) { throw "Falló el empaquetado." }
  & ssh @sshArgs $target "install -d -m 0700 '$stage'"
  if ($LASTEXITCODE -ne 0) { throw "No se pudo crear el staging." }
  & scp @scpArgs $archive "${target}:$stage/worker.tar.gz"
  if ($LASTEXITCODE -ne 0) { throw "Falló la transferencia." }
  & scp @scpArgs deploy/install-pdf-worker.sh deploy/pdf-worker.service deploy/Caddyfile deploy/test-production-worker.mjs "${target}:$stage/"
  if ($LASTEXITCODE -ne 0) { throw "Falló la transferencia de configuración." }
  & ssh @sshArgs $target "sed -i 's/\r$//' '$stage/install-pdf-worker.sh' && bash '$stage/install-pdf-worker.sh' '$stage' '$releaseId'"
  if ($LASTEXITCODE -ne 0) { throw "El generador no superó el arranque." }
  & ssh @sshArgs $target "install -m 0644 '$stage/test-production-worker.mjs' /tmp/cys-worker-test.mjs && runuser -u cys-pdf -- env PLAYWRIGHT_BROWSERS_PATH=/opt/cys-pdf/browsers HOME=/var/lib/cys-pdf /opt/cys-node/bin/node /tmp/cys-worker-test.mjs"
  if ($LASTEXITCODE -ne 0) { throw "El generador no superó la impresión y el ZIP sintéticos." }
  & ssh @sshArgs $target "caddy validate --config '$stage/Caddyfile' --adapter caddyfile && cp -a /etc/caddy/Caddyfile '$stage/Caddyfile.previous' && install -m 0644 '$stage/Caddyfile' /etc/caddy/Caddyfile && systemctl reload caddy"
  if ($LASTEXITCODE -ne 0) { throw "No se pudo actualizar el proxy." }
  Write-Output "Generador publicado: /opt/cys-pdf/releases/$releaseId"
} finally {
  Pop-Location
}
