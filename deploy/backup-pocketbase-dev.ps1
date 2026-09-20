param(
  [string]$PocketBaseRoot = "C:\pocketbase",
  [string]$DestinationDirectory = "",
  [SecureString]$Passphrase
)

$ErrorActionPreference = "Stop"
$resolvedRoot = [System.IO.Path]::GetFullPath($PocketBaseRoot)
$dataDirectory = Join-Path $resolvedRoot "pb_data"
$dataFile = Join-Path $dataDirectory "data.db"
$credentialPath = Join-Path $resolvedRoot "dev-credentials.txt"
$teacherKeyPath = Join-Path $resolvedRoot "teacher-link-dev.key"

if (-not (Test-Path -LiteralPath $dataFile)) {
  throw "No se encontro $dataFile."
}

if (-not (Test-Path -LiteralPath $credentialPath) -or -not (Test-Path -LiteralPath $teacherKeyPath)) {
  throw "Faltan las credenciales o la clave docente local necesarias para un backup recuperable."
}

$listener = Get-NetTCPConnection -LocalPort 8090 -State Listen -ErrorAction SilentlyContinue
if ($listener) {
  throw "PocketBase esta activo en el puerto 8090. Detengalo antes de crear el backup."
}

if (-not $DestinationDirectory) {
  if (-not $env:OneDrive) {
    throw "No se detecto OneDrive. Indique -DestinationDirectory fuera del equipo."
  }
  $DestinationDirectory = Join-Path $env:OneDrive "Backups\Crecer-y-Ser"
}

if (-not $Passphrase) {
  $Passphrase = Read-Host "Frase de recuperacion del backup" -AsSecureString
}

$credential = [System.Management.Automation.PSCredential]::new("backup", $Passphrase)
$plainPassphrase = $credential.GetNetworkCredential().Password
if ($plainPassphrase.Length -lt 16) {
  throw "La frase de recuperacion debe tener al menos 16 caracteres."
}

$temporaryRoot = Join-Path ([System.IO.Path]::GetTempPath()) ("cys-pocketbase-backup-" + [guid]::NewGuid().ToString("N"))
$payloadRoot = Join-Path $temporaryRoot "payload"
$payloadData = Join-Path $payloadRoot "pb_data"
$zipPath = Join-Path $temporaryRoot "pocketbase-dev.zip"
$timestamp = Get-Date -Format "yyyyMMdd-HHmmss"
New-Item -ItemType Directory -Path $payloadData,$DestinationDirectory -Force | Out-Null

try {
  Copy-Item -LiteralPath $dataFile -Destination (Join-Path $payloadData "data.db")
  $storageDirectory = Join-Path $dataDirectory "storage"
  if (Test-Path -LiteralPath $storageDirectory) {
    Copy-Item -LiteralPath $storageDirectory -Destination (Join-Path $payloadData "storage") -Recurse
  }
  Copy-Item -LiteralPath $credentialPath -Destination (Join-Path $payloadRoot "dev-credentials.txt")
  Copy-Item -LiteralPath $teacherKeyPath -Destination (Join-Path $payloadRoot "teacher-link-dev.key")

  Compress-Archive -Path (Join-Path $payloadRoot "*") -DestinationPath $zipPath -CompressionLevel Optimal
  $plaintext = [System.IO.File]::ReadAllBytes($zipPath)
  $salt = [byte[]]::new(16)
  $iv = [byte[]]::new(16)
  $random = [System.Security.Cryptography.RandomNumberGenerator]::Create()
  $random.GetBytes($salt)
  $random.GetBytes($iv)
  $random.Dispose()
  $iterations = 600000
  $deriver = [System.Security.Cryptography.Rfc2898DeriveBytes]::new(
    [System.Text.Encoding]::UTF8.GetBytes($plainPassphrase),
    $salt,
    $iterations,
    [System.Security.Cryptography.HashAlgorithmName]::SHA256
  )
  $derivedKey = $deriver.GetBytes(64)
  $deriver.Dispose()
  $encryptionKey = [byte[]]::new(32)
  $authenticationKey = [byte[]]::new(32)
  [System.Buffer]::BlockCopy($derivedKey, 0, $encryptionKey, 0, 32)
  [System.Buffer]::BlockCopy($derivedKey, 32, $authenticationKey, 0, 32)
  $aes = [System.Security.Cryptography.Aes]::Create()
  $aes.KeySize = 256
  $aes.Mode = [System.Security.Cryptography.CipherMode]::CBC
  $aes.Padding = [System.Security.Cryptography.PaddingMode]::PKCS7
  $aes.Key = $encryptionKey
  $aes.IV = $iv
  $encryptor = $aes.CreateEncryptor()
  $ciphertext = $encryptor.TransformFinalBlock($plaintext, 0, $plaintext.Length)
  $encryptor.Dispose()
  $aes.Dispose()

  $magic = [System.Text.Encoding]::ASCII.GetBytes("CYSPB002")
  $iterationBytes = [System.BitConverter]::GetBytes($iterations)
  $authenticatedData = [byte[]]::new($magic.Length + $iterationBytes.Length + $salt.Length + $iv.Length + $ciphertext.Length)
  $offset = 0
  foreach ($part in @($magic, $iterationBytes, $salt, $iv, $ciphertext)) {
    [System.Buffer]::BlockCopy($part, 0, $authenticatedData, $offset, $part.Length)
    $offset += $part.Length
  }
  $hmac = [System.Security.Cryptography.HMACSHA256]::new($authenticationKey)
  $tag = $hmac.ComputeHash($authenticatedData)
  $hmac.Dispose()

  $outputPath = Join-Path $DestinationDirectory "crecer-y-ser-pocketbase-dev-$timestamp.cysbackup"
  $stream = [System.IO.File]::Open($outputPath, [System.IO.FileMode]::CreateNew)
  $writer = [System.IO.BinaryWriter]::new($stream)
  try {
    $writer.Write($magic)
    $writer.Write($iterations)
    $writer.Write($salt)
    $writer.Write($iv)
    $writer.Write($tag)
    $writer.Write($ciphertext)
  } finally {
    $writer.Dispose()
    $stream.Dispose()
  }

  [pscustomobject]@{
    Backup = $outputPath
    SHA256 = (Get-FileHash -Algorithm SHA256 -LiteralPath $outputPath).Hash
    Includes = "base saneada, almacenamiento, credenciales y clave exclusivamente locales"
    Excludes = "secretos de produccion, logs y backups internos"
  } | Format-List
} finally {
  $plainPassphrase = $null
  foreach ($sensitiveBytes in @($derivedKey, $encryptionKey, $authenticationKey, $plaintext, $authenticatedData)) {
    if ($sensitiveBytes) {
      [System.Array]::Clear($sensitiveBytes, 0, $sensitiveBytes.Length)
    }
  }
  if (Test-Path -LiteralPath $temporaryRoot) {
    Remove-Item -LiteralPath $temporaryRoot -Recurse -Force
  }
}
