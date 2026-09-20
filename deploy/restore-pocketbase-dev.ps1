param(
  [Parameter(Mandatory = $true)]
  [string]$BackupPath,
  [string]$PocketBaseRoot = "C:\pocketbase",
  [SecureString]$Passphrase
)

$ErrorActionPreference = "Stop"
$resolvedBackup = [System.IO.Path]::GetFullPath($BackupPath)
$resolvedRoot = [System.IO.Path]::GetFullPath($PocketBaseRoot)
$dataDirectory = Join-Path $resolvedRoot "pb_data"
$credentialPath = Join-Path $resolvedRoot "dev-credentials.txt"
$teacherKeyPath = Join-Path $resolvedRoot "teacher-link-dev.key"

if (-not (Test-Path -LiteralPath $resolvedBackup)) {
  throw "No se encontro el backup indicado."
}

if (Test-Path -LiteralPath $dataDirectory) {
  throw "Ya existe $dataDirectory. La restauracion nunca reemplaza datos existentes."
}


if ((Test-Path -LiteralPath $credentialPath) -or (Test-Path -LiteralPath $teacherKeyPath)) {
  throw "Ya existen credenciales o una clave docente en el destino."
}

if (-not $Passphrase) {
  $Passphrase = Read-Host "Frase de recuperacion del backup" -AsSecureString
}

$credential = [System.Management.Automation.PSCredential]::new("backup", $Passphrase)
$plainPassphrase = $credential.GetNetworkCredential().Password
$temporaryRoot = Join-Path ([System.IO.Path]::GetTempPath()) ("cys-pocketbase-restore-" + [guid]::NewGuid().ToString("N"))
$zipPath = Join-Path $temporaryRoot "pocketbase-dev.zip"
$extractRoot = Join-Path $temporaryRoot "extracted"
New-Item -ItemType Directory -Path $temporaryRoot,$extractRoot -Force | Out-Null

try {
  $stream = [System.IO.File]::OpenRead($resolvedBackup)
  $reader = [System.IO.BinaryReader]::new($stream)
  try {
    $magic = [System.Text.Encoding]::ASCII.GetString($reader.ReadBytes(8))
    if ($magic -ne "CYSPB002") {
      throw "El archivo no es un backup valido de Crecer y Ser."
    }
    $iterations = $reader.ReadInt32()
    if ($iterations -lt 100000 -or $iterations -gt 2000000) {
      throw "El parametro de derivacion del backup no es valido."
    }
    $salt = $reader.ReadBytes(16)
    $iv = $reader.ReadBytes(16)
    $tag = $reader.ReadBytes(32)
    $ciphertext = $reader.ReadBytes([int]($stream.Length - $stream.Position))
  } finally {
    $reader.Dispose()
    $stream.Dispose()
  }

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
  $magicBytes = [System.Text.Encoding]::ASCII.GetBytes($magic)
  $iterationBytes = [System.BitConverter]::GetBytes($iterations)
  $authenticatedData = [byte[]]::new($magicBytes.Length + $iterationBytes.Length + $salt.Length + $iv.Length + $ciphertext.Length)
  $offset = 0
  foreach ($part in @($magicBytes, $iterationBytes, $salt, $iv, $ciphertext)) {
    [System.Buffer]::BlockCopy($part, 0, $authenticatedData, $offset, $part.Length)
    $offset += $part.Length
  }
  $hmac = [System.Security.Cryptography.HMACSHA256]::new($authenticationKey)
  $expectedTag = $hmac.ComputeHash($authenticatedData)
  $hmac.Dispose()
  $tagMatches = $tag.Length -eq $expectedTag.Length
  $difference = 0
  if ($tagMatches) {
    for ($index = 0; $index -lt $tag.Length; $index++) {
      $difference = $difference -bor ($tag[$index] -bxor $expectedTag[$index])
    }
    $tagMatches = $difference -eq 0
  }
  if (-not $tagMatches) {
    throw "La frase de recuperacion es incorrecta o el backup fue alterado."
  }

  $aes = [System.Security.Cryptography.Aes]::Create()
  $aes.KeySize = 256
  $aes.Mode = [System.Security.Cryptography.CipherMode]::CBC
  $aes.Padding = [System.Security.Cryptography.PaddingMode]::PKCS7
  $aes.Key = $encryptionKey
  $aes.IV = $iv
  $decryptor = $aes.CreateDecryptor()
  try {
    $plaintext = $decryptor.TransformFinalBlock($ciphertext, 0, $ciphertext.Length)
  } catch [System.Security.Cryptography.CryptographicException] {
    throw "El backup no pudo descifrarse."
  } finally {
    $decryptor.Dispose()
    $aes.Dispose()
  }

  [System.IO.File]::WriteAllBytes($zipPath, $plaintext)
  Expand-Archive -LiteralPath $zipPath -DestinationPath $extractRoot
  $extractedData = Join-Path $extractRoot "pb_data"
  if (-not (Test-Path -LiteralPath (Join-Path $extractedData "data.db"))) {
    throw "El backup no contiene pb_data/data.db."
  }
  $extractedCredentials = Join-Path $extractRoot "dev-credentials.txt"
  $extractedTeacherKey = Join-Path $extractRoot "teacher-link-dev.key"
  if (-not (Test-Path -LiteralPath $extractedCredentials) -or -not (Test-Path -LiteralPath $extractedTeacherKey)) {
    throw "El backup no contiene las credenciales locales necesarias."
  }
  $unexpectedRoot = @(Get-ChildItem -LiteralPath $extractRoot -Force | Where-Object { $_.Name -notin @("pb_data", "dev-credentials.txt", "teacher-link-dev.key") })
  if ($unexpectedRoot.Count -gt 0) {
    throw "El backup contiene entradas no permitidas."
  }
  $unexpected = @(Get-ChildItem -LiteralPath $extractedData -Force | Where-Object { $_.Name -notin @("data.db", "storage") })
  if ($unexpected.Count -gt 0) {
    throw "El backup contiene archivos no permitidos."
  }

  New-Item -ItemType Directory -Force -Path $resolvedRoot | Out-Null
  Move-Item -LiteralPath $extractedData -Destination $dataDirectory
  Move-Item -LiteralPath $extractedCredentials -Destination $credentialPath
  Move-Item -LiteralPath $extractedTeacherKey -Destination $teacherKeyPath
  $acl = [System.Security.AccessControl.DirectorySecurity]::new()
  $acl.SetAccessRuleProtection($true, $false)
  $identity = [System.Security.Principal.WindowsIdentity]::GetCurrent().Name
  $inheritance = [System.Security.AccessControl.InheritanceFlags]'ContainerInherit, ObjectInherit'
  $rule = [System.Security.AccessControl.FileSystemAccessRule]::new($identity, "FullControl", $inheritance, "None", "Allow")
  $acl.AddAccessRule($rule)
  Set-Acl -LiteralPath $dataDirectory -AclObject $acl
  $fileAcl = [System.Security.AccessControl.FileSecurity]::new()
  $fileAcl.SetAccessRuleProtection($true, $false)
  $fileRule = [System.Security.AccessControl.FileSystemAccessRule]::new($identity, "FullControl", "Allow")
  $fileAcl.AddAccessRule($fileRule)
  Set-Acl -LiteralPath $credentialPath -AclObject $fileAcl
  Set-Acl -LiteralPath $teacherKeyPath -AclObject $fileAcl

  [pscustomobject]@{
    Restored = $dataDirectory
    Source = $resolvedBackup
    SHA256 = (Get-FileHash -Algorithm SHA256 -LiteralPath $resolvedBackup).Hash
  } | Format-List
} finally {
  $plainPassphrase = $null
  foreach ($sensitiveBytes in @($derivedKey, $encryptionKey, $authenticationKey, $plaintext, $authenticatedData, $expectedTag)) {
    if ($sensitiveBytes) {
      [System.Array]::Clear($sensitiveBytes, 0, $sensitiveBytes.Length)
    }
  }
  if (Test-Path -LiteralPath $temporaryRoot) {
    Remove-Item -LiteralPath $temporaryRoot -Recurse -Force
  }
}
