param(
  [string]$RemoteHost = "129.121.52.187",
  [int]$Port = 22022,
  [string]$RemoteUser = "root",
  [string]$IdentityFile = "$env:USERPROFILE\.ssh\codex_crecer_vps_ed25519",
  [switch]$DryRun
)

$ErrorActionPreference = "Stop"
$remoteTarget = "$RemoteUser@$RemoteHost"
$sshArguments = @(
  "-o", "BatchMode=yes",
  "-o", "StrictHostKeyChecking=yes",
  "-p", "$Port",
  "-i", $IdentityFile
)

$dryRunValue = if ($DryRun) { "1" } else { "0" }

$bashScript = @'
set -eu

echo "=== ESTADO DE DISCO INICIAL ==="
df -h /root/pb
for p in /root/pb/pb_data/storage /root/pb/deploy_backups /root/pb/milestones; do
  if [ -e "$p" ]; then
    du -sh "$p"
  fi
done

search_roots=()
has_search_roots=0
for root in /root/pb/pb_data/storage /root/pb/deploy_backups /root/pb/milestones; do
  if [ -d "$root" ]; then
    search_roots+=("$root")
    has_search_roots=1
  fi
done

target_dirs=()
has_targets=0
if [ "$has_search_roots" -eq 1 ]; then
  while IFS= read -r match; do
    if [ -n "$match" ]; then
      target_dirs+=("$match")
      has_targets=1
    fi
  done < <(find "${search_roots[@]}" -type d \( -name "cysemissions001" -o -name "cysrptemis00001" \) 2>/dev/null || true)
fi

echo ""
echo "=== DIRECTORIOS DETECTADOS ==="
if [ "$has_targets" -eq 0 ]; then
  echo "No se encontraron directorios de emisiones PDF obsoletas."
else
  for dir in "${target_dirs[@]}"; do
    du -sh "$dir"
  done
fi

dry_run="__DRY_RUN__"
if [ "$dry_run" = "1" ]; then
  echo ""
  echo "Modo DryRun: no se eliminaron archivos ni se ejecuto mantenimiento."
  exit 0
fi

if [ "$has_targets" -eq 1 ]; then
  echo ""
  echo "=== ELIMINANDO DIRECTORIOS ==="
  for dir in "${target_dirs[@]}"; do
    case "$dir" in
      */cysemissions001|*/cysrptemis00001)
        echo "Eliminando: $dir"
        rm -rf "$dir"
        ;;
      *)
        echo "Directorio fuera de patron seguro omitido: $dir"
        ;;
    esac
  done
fi

echo ""
echo "=== COMPACTACION WAL SQLITE ==="
if [ -f /root/pb/pb_data/data.db ]; then
  if command -v sqlite3 >/dev/null 2>&1; then
    sqlite3 /root/pb/pb_data/data.db "PRAGMA wal_checkpoint(TRUNCATE);"
    echo "PRAGMA wal_checkpoint(TRUNCATE) ejecutado con exito."
  else
    echo "sqlite3 no disponible en el sistema remoto."
  fi
fi

echo ""
echo "=== ESTADO DE DISCO FINAL ==="
df -h /root/pb
for p in /root/pb/pb_data/storage /root/pb/deploy_backups /root/pb/milestones; do
  if [ -e "$p" ]; then
    du -sh "$p"
  fi
done
'@

$bashScript = $bashScript.Replace("__DRY_RUN__", $dryRunValue)
$encoded = [Convert]::ToBase64String([System.Text.Encoding]::UTF8.GetBytes($bashScript))
& ssh @sshArguments $remoteTarget "echo $encoded | base64 -d | bash"
if ($LASTEXITCODE -ne 0) { throw "Fallo la ejecucion del script de limpieza remota." }
