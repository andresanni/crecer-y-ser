param(
  [string]$PocketBaseRoot = "C:\pocketbase"
)

$ErrorActionPreference = "Stop"
$repositoryRoot = Split-Path -Parent $PSScriptRoot
$manifest = Get-Content -Raw -LiteralPath (Join-Path $PSScriptRoot "pocketbase-version.json") | ConvertFrom-Json
$executable = Join-Path $PocketBaseRoot "pocketbase.exe"
$dataDirectory = Join-Path $PocketBaseRoot "pb_data"
$secretPath = Join-Path $PocketBaseRoot "teacher-link-dev.key"
$hooksDirectory = Join-Path $repositoryRoot "pb_hooks"
$migrationsDirectory = Join-Path $repositoryRoot "pb_migrations"

if (-not (Test-Path -LiteralPath $executable)) {
  throw "No se encontro pocketbase.exe en $PocketBaseRoot."
}

$version = & $executable --version
if ($version -notmatch " $([regex]::Escape($manifest.version))$") {
  throw "La version local debe ser PocketBase $($manifest.version). Version detectada: $version"
}

if (-not (Test-Path -LiteralPath (Join-Path $dataDirectory "data.db"))) {
  throw "Falta pb_data\data.db. La cadena actual no admite inicializar una base vacia."
}

if (-not (Test-Path -LiteralPath $hooksDirectory)) {
  throw "No se encontro el directorio de hooks: $hooksDirectory."
}

if (-not (Test-Path -LiteralPath $migrationsDirectory)) {
  throw "No se encontro el directorio de migraciones: $migrationsDirectory."
}

if (-not (Test-Path -LiteralPath $secretPath)) {
  $alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789"
  $bytes = [byte[]]::new(32)
  [System.Security.Cryptography.RandomNumberGenerator]::Fill($bytes)
  $secret = -join ($bytes | ForEach-Object { $alphabet[$_ % $alphabet.Length] })
  [System.IO.File]::WriteAllText($secretPath, $secret, [System.Text.UTF8Encoding]::new($false))
  $acl = [System.Security.AccessControl.FileSecurity]::new()
  $acl.SetAccessRuleProtection($true, $false)
  $identity = [System.Security.Principal.WindowsIdentity]::GetCurrent().Name
  $rule = [System.Security.AccessControl.FileSystemAccessRule]::new($identity, "FullControl", "Allow")
  $acl.AddAccessRule($rule)
  Set-Acl -LiteralPath $secretPath -AclObject $acl
}

$teacherLinkKey = (Get-Content -Raw -LiteralPath $secretPath).Trim()
if ($teacherLinkKey.Length -ne 32) {
  throw "La clave local debe tener exactamente 32 caracteres."
}

$env:CYS_TEACHER_LINK_KEY = $teacherLinkKey

& $executable serve `
  --http="127.0.0.1:8090" `
  --origins="http://localhost:5173,http://127.0.0.1:5173" `
  --dir="$dataDirectory" `
  --hooksDir="$hooksDirectory" `
  --migrationsDir="$migrationsDirectory" `
  --automigrate=true

exit $LASTEXITCODE
