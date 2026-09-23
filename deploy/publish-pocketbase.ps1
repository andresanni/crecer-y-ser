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
  @{ Source = Join-Path $repositoryRoot "pb_hooks\lib\contactService.js"; Target = "contactService.js" },
  @{ Source = Join-Path $repositoryRoot "pb_hooks\contacto.pb.js"; Target = "contacto.pb.js" },
  @{ Source = Join-Path $repositoryRoot "pb_migrations\1789330000_created_initial_collections.js"; Target = "1789330000_created_initial_collections.js" },
  @{ Source = Join-Path $repositoryRoot "pb_migrations\1789334557_hardened_teacher_access_tokens.js"; Target = "1789334557_hardened_teacher_access_tokens.js" },
  @{ Source = Join-Path $repositoryRoot "pb_migrations\1789338120_close_public_gradebook_rules.js"; Target = "1789338120_close_public_gradebook_rules.js" },
  @{ Source = Join-Path $repositoryRoot "pb_migrations\1789342800_created_gradebook_workflows.js"; Target = "1789342800_created_gradebook_workflows.js" },
  @{ Source = Join-Path $repositoryRoot "pb_migrations\1789346400_simplified_unidirectional_gradebook_workflow.js"; Target = "1789346400_simplified_unidirectional_gradebook_workflow.js" },
  @{ Source = Join-Path $repositoryRoot "pb_migrations\1789471993_removed_teacher_access_expiration.js"; Target = "1789471993_removed_teacher_access_expiration.js" },
  @{ Source = Join-Path $repositoryRoot "pb_migrations\1789474000_added_recoverable_teacher_links.js"; Target = "1789474000_added_recoverable_teacher_links.js" },
  @{ Source = Join-Path $repositoryRoot "pb_migrations\1789477600_removed_teacher_link_state.js"; Target = "1789477600_removed_teacher_link_state.js" },
  @{ Source = Join-Path $PSScriptRoot "pocketbase.service"; Target = "pocketbase.service" },
  @{ Source = Join-Path $PSScriptRoot "apply-pocketbase-workflow.sh"; Target = "apply-pocketbase-workflow.sh" }
)

foreach ($artifact in $artifacts) {
  & scp @scpArguments $artifact.Source "${remoteTarget}:$remoteStage/$($artifact.Target)"
  if ($LASTEXITCODE -ne 0) { throw "No se pudo copiar $($artifact.Source)." }
}

& ssh @sshArguments $remoteTarget "sed -i 's/\r$//' '$remoteStage/apply-pocketbase-workflow.sh' && chmod 0700 '$remoteStage/apply-pocketbase-workflow.sh' && '$remoteStage/apply-pocketbase-workflow.sh' '$remoteStage' '$releaseId'"
if ($LASTEXITCODE -ne 0) { throw "El despliegue remoto no superó la verificación." }

Write-Output "PocketBase actualizado. Respaldo: /root/pb/deploy_backups/$releaseId"
