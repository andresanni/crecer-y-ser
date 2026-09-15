param(
  [string]$RemoteHost = "129.121.52.187",
  [int]$Port = 22022,
  [string]$RemoteUser = "root",
  [string]$IdentityFile = "$env:USERPROFILE\.ssh\codex_crecer_vps_ed25519"
)

$ErrorActionPreference = "Stop"
$releaseId = Get-Date -Format "yyyyMMdd-HHmmss"
$remoteStage = "/root/cys-workflow-$releaseId"
$remoteTarget = "$RemoteUser@$RemoteHost"
$repositoryRoot = Split-Path -Parent $PSScriptRoot

$sshArguments = @(
  "-o", "BatchMode=yes",
  "-o", "StrictHostKeyChecking=yes",
  "-p", "$Port",
  "-i", $IdentityFile
)
$scpArguments = @(
  "-o", "BatchMode=yes",
  "-o", "StrictHostKeyChecking=yes",
  "-P", "$Port",
  "-i", $IdentityFile
)

& ssh @sshArguments $remoteTarget "install -d -m 0700 '$remoteStage'"
if ($LASTEXITCODE -ne 0) { throw "No se pudo crear el staging remoto." }

$artifacts = @(
  @{ Source = Join-Path $repositoryRoot "pb_hooks\lib\teacherAccess.js"; Target = "teacherAccess.js" },
  @{ Source = Join-Path $repositoryRoot "pb_hooks\teacher_access.pb.js"; Target = "teacher_access.pb.js" },
  @{ Source = Join-Path $repositoryRoot "pb_migrations\1789342800_created_gradebook_workflows.js"; Target = "1789342800_created_gradebook_workflows.js" },
  @{ Source = Join-Path $PSScriptRoot "apply-pocketbase-workflow.sh"; Target = "apply-pocketbase-workflow.sh" }
)

foreach ($artifact in $artifacts) {
  & scp @scpArguments $artifact.Source "${remoteTarget}:$remoteStage/$($artifact.Target)"
  if ($LASTEXITCODE -ne 0) { throw "No se pudo copiar $($artifact.Source)." }
}

& ssh @sshArguments $remoteTarget "chmod 0700 '$remoteStage/apply-pocketbase-workflow.sh' && '$remoteStage/apply-pocketbase-workflow.sh' '$remoteStage' '$releaseId'"
if ($LASTEXITCODE -ne 0) { throw "El despliegue remoto no superó la verificación." }

Write-Output "PocketBase actualizado. Respaldo: /root/pb/deploy_backups/$releaseId"
