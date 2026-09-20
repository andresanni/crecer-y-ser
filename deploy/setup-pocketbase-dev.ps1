param(
  [string]$PocketBaseRoot = "C:\pocketbase",
  [string]$PocketBaseExecutable = "",
  [switch]$DownloadPocketBase,
  [switch]$DownloadOnly
)

$ErrorActionPreference = "Stop"
$repositoryRoot = Split-Path -Parent $PSScriptRoot
$manifestPath = Join-Path $PSScriptRoot "pocketbase-version.json"
$manifest = Get-Content -Raw -LiteralPath $manifestPath | ConvertFrom-Json
$resolvedRoot = [System.IO.Path]::GetFullPath($PocketBaseRoot)
$dataDirectory = Join-Path $resolvedRoot "pb_data"
$credentialPath = Join-Path $resolvedRoot "dev-credentials.txt"
$teacherKeyPath = Join-Path $resolvedRoot "teacher-link-dev.key"
$frontendEnvironmentPath = Join-Path $repositoryRoot ".env.development.local"
$migrationDirectory = Join-Path $repositoryRoot "pb_migrations"
$seedMigrationDirectory = Join-Path $PSScriptRoot "pocketbase-dev-seed"
$releaseBaseUrl = "https://github.com/pocketbase/pocketbase/releases/download/v$($manifest.version)"

function New-RandomSecret {
  param([int]$Length)

  $alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789!@#%_-"
  $bytes = [byte[]]::new($Length)
  $random = [System.Security.Cryptography.RandomNumberGenerator]::Create()
  $random.GetBytes($bytes)
  $random.Dispose()
  return -join ($bytes | ForEach-Object { $alphabet[$_ % $alphabet.Length] })
}

function Protect-LocalFile {
  param([string]$Path)

  $acl = [System.Security.AccessControl.FileSecurity]::new()
  $acl.SetAccessRuleProtection($true, $false)
  $identity = [System.Security.Principal.WindowsIdentity]::GetCurrent().Name
  $rule = [System.Security.AccessControl.FileSystemAccessRule]::new($identity, "FullControl", "Allow")
  $acl.AddAccessRule($rule)
  Set-Acl -LiteralPath $Path -AclObject $acl
}

if (Test-Path -LiteralPath $dataDirectory) {
  throw "Ya existe $dataDirectory. El setup nunca reemplaza ni reutiliza un directorio de datos existente."
}

if (Test-Path -LiteralPath $credentialPath) {
  throw "Ya existe $credentialPath. Retire las credenciales antiguas antes de reconstruir."
}

if (Test-Path -LiteralPath $teacherKeyPath) {
  throw "Ya existe $teacherKeyPath. Retire la clave antigua antes de reconstruir."
}

New-Item -ItemType Directory -Force -Path $resolvedRoot | Out-Null

if (-not $PocketBaseExecutable) {
  $PocketBaseExecutable = Join-Path $resolvedRoot "pocketbase.exe"
}
$PocketBaseExecutable = [System.IO.Path]::GetFullPath($PocketBaseExecutable)

if (-not (Test-Path -LiteralPath $PocketBaseExecutable)) {
  if (-not $DownloadPocketBase) {
    throw "No se encontro PocketBase. Descarguelo manualmente o use -DownloadPocketBase."
  }

  $architecture = [System.Runtime.InteropServices.RuntimeInformation]::OSArchitecture.ToString().ToLowerInvariant()
  $artifactKey = switch ($architecture) {
    "arm64" { "windows-arm64" }
    "x64" { "windows-amd64" }
    default { throw "Arquitectura de Windows no soportada por el manifiesto: $architecture" }
  }
  $artifact = $manifest.artifacts.$artifactKey
  $archivePath = Join-Path $resolvedRoot $artifact.file
  Invoke-WebRequest -Uri "$releaseBaseUrl/$($artifact.file)" -OutFile $archivePath
  $downloadHash = (Get-FileHash -Algorithm SHA256 -LiteralPath $archivePath).Hash.ToLowerInvariant()
  if ($downloadHash -ne $artifact.sha256) {
    [System.IO.File]::Delete($archivePath)
    throw "El checksum del ejecutable descargado no coincide con el manifiesto."
  }
  Expand-Archive -LiteralPath $archivePath -DestinationPath $resolvedRoot -Force
  [System.IO.File]::Delete($archivePath)
  $PocketBaseExecutable = Join-Path $resolvedRoot "pocketbase.exe"
}

$version = & $PocketBaseExecutable --version
if ($version -notmatch " $([regex]::Escape($manifest.version))$") {
  throw "La version requerida es $($manifest.version). Version detectada: $version"
}

if ($DownloadOnly) {
  [pscustomobject]@{
    PocketBaseVersion = $manifest.version
    PocketBaseExecutable = $PocketBaseExecutable
  } | Format-List
  exit 0
}

if (Test-Path -LiteralPath $frontendEnvironmentPath) {
  $frontendEnvironment = (Get-Content -Raw -LiteralPath $frontendEnvironmentPath).Trim()
  if ($frontendEnvironment -ne "VITE_POCKETBASE_URL=http://127.0.0.1:8090") {
    throw "El archivo .env.development.local existente no apunta al PocketBase local esperado."
  }
}

$setupRoot = Join-Path $resolvedRoot (".setup-" + [guid]::NewGuid().ToString("N"))
$workingData = Join-Path $setupRoot "pb_data"
$emptyHooks = Join-Path $setupRoot "empty-hooks"
$adminEmail = "admin@creceryser.local"
$applicationEmail = "desarrollo@creceryser.local"
$adminPassword = New-RandomSecret -Length 28
$applicationPassword = New-RandomSecret -Length 28
$teacherKey = New-RandomSecret -Length 32
$completed = $false

New-Item -ItemType Directory -Path $workingData,$emptyHooks -Force | Out-Null

try {
  & $PocketBaseExecutable migrate up --dir=$workingData --hooksDir=$emptyHooks --migrationsDir=$migrationDirectory --automigrate=false
  if ($LASTEXITCODE -ne 0) {
    throw "No se pudo crear el esquema de PocketBase."
  }

  & $PocketBaseExecutable admin create $adminEmail $adminPassword --dir=$workingData --hooksDir=$emptyHooks --migrationsDir=$migrationDirectory --automigrate=false
  if ($LASTEXITCODE -ne 0) {
    throw "No se pudo crear el administrador local."
  }

  $env:CYS_DEV_APP_EMAIL = $applicationEmail
  $env:CYS_DEV_APP_PASSWORD = $applicationPassword
  & $PocketBaseExecutable migrate up --dir=$workingData --hooksDir=$emptyHooks --migrationsDir=$seedMigrationDirectory --automigrate=false
  if ($LASTEXITCODE -ne 0) {
    throw "No se pudieron cargar los datos sinteticos."
  }

  Move-Item -LiteralPath $workingData -Destination $dataDirectory

  $credentialContent = @(
    "ADMIN_URL=http://127.0.0.1:8090/_/"
    "ADMIN_EMAIL=$adminEmail"
    "ADMIN_PASSWORD=$adminPassword"
    "APP_EMAIL=$applicationEmail"
    "APP_PASSWORD=$applicationPassword"
  ) -join [Environment]::NewLine
  [System.IO.File]::WriteAllText($credentialPath, $credentialContent + [Environment]::NewLine, [System.Text.UTF8Encoding]::new($false))
  [System.IO.File]::WriteAllText($teacherKeyPath, $teacherKey, [System.Text.UTF8Encoding]::new($false))
  Protect-LocalFile -Path $credentialPath
  Protect-LocalFile -Path $teacherKeyPath

  if (-not (Test-Path -LiteralPath $frontendEnvironmentPath)) {
    [System.IO.File]::WriteAllText($frontendEnvironmentPath, "VITE_POCKETBASE_URL=http://127.0.0.1:8090" + [Environment]::NewLine, [System.Text.UTF8Encoding]::new($false))
  }

  New-Item -ItemType Directory -Force -Path (Join-Path $resolvedRoot "backups") | Out-Null
  $completed = $true
} finally {
  Remove-Item Env:CYS_DEV_APP_EMAIL -ErrorAction SilentlyContinue
  Remove-Item Env:CYS_DEV_APP_PASSWORD -ErrorAction SilentlyContinue
  if (Test-Path -LiteralPath $setupRoot) {
    Remove-Item -LiteralPath $setupRoot -Recurse -Force
  }
  if (-not $completed -and (Test-Path -LiteralPath $dataDirectory)) {
    Remove-Item -LiteralPath $dataDirectory -Recurse -Force
  }
}

[pscustomobject]@{
  PocketBaseVersion = $manifest.version
  PocketBaseExecutable = $PocketBaseExecutable
  DataDirectory = $dataDirectory
  Credentials = $credentialPath
  TeacherKey = $teacherKeyPath
  FrontendEnvironment = $frontendEnvironmentPath
  Seed = "6 alumnos, 6 responsables, 2 cursos y 2 periodos"
} | Format-List
