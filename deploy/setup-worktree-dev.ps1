param(
  [string]$MainRepoPath = ""
)

$ErrorActionPreference = "Stop"

$currentDir = (Get-Location).Path

if (-not $MainRepoPath) {
  $commonGitDir = (& git rev-parse --git-common-dir 2>$null)
  if ($commonGitDir) {
    $resolvedGitDir = (Resolve-Path $commonGitDir.Trim()).Path
    $MainRepoPath = Split-Path -Parent $resolvedGitDir
  }
}

if (-not $MainRepoPath -or -not (Test-Path -LiteralPath $MainRepoPath)) {
  throw "No se pudo determinar el repositorio principal. Especifique -MainRepoPath."
}

if ((Resolve-Path $MainRepoPath).Path -eq (Resolve-Path $currentDir).Path) {
  Write-Host "El directorio actual es el repositorio principal. No se requiere inicializacion de worktree."
  exit 0
}

$mainNodeModules = Join-Path $MainRepoPath "node_modules"
$targetNodeModules = Join-Path $currentDir "node_modules"

if (-not (Test-Path -LiteralPath $targetNodeModules)) {
  if (Test-Path -LiteralPath $mainNodeModules) {
    cmd /c mklink /J "$targetNodeModules" "$mainNodeModules" | Out-Null
    Write-Host "node_modules enlazado mediante junction desde $mainNodeModules"
  } else {
    Write-Warning "No se encontro node_modules en $mainNodeModules. Ejecute npm install en el repo principal."
  }
} else {
  Write-Host "node_modules ya existe en el worktree."
}

$mainEnvLocal = Join-Path $MainRepoPath ".env.development.local"
$targetEnvLocal = Join-Path $currentDir ".env.development.local"

if (-not (Test-Path -LiteralPath $targetEnvLocal)) {
  if (Test-Path -LiteralPath $mainEnvLocal) {
    Copy-Item -LiteralPath $mainEnvLocal -Destination $targetEnvLocal
    Write-Host ".env.development.local copiado desde el repositorio principal."
  } else {
    Write-Warning "No se encontro $mainEnvLocal en el repositorio principal."
  }
} else {
  Write-Host ".env.development.local ya existe en el worktree."
}

$mainEnv = Join-Path $MainRepoPath ".env"
$targetEnv = Join-Path $currentDir ".env"

if (-not (Test-Path -LiteralPath $targetEnv) -and (Test-Path -LiteralPath $mainEnv)) {
  Copy-Item -LiteralPath $mainEnv -Destination $targetEnv
  Write-Host ".env copiado desde el repositorio principal."
}
