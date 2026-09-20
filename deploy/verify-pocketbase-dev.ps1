param(
  [string]$PocketBaseRoot = "C:\pocketbase",
  [string]$BaseUri = "http://127.0.0.1:8090",
  [switch]$ExpectSyntheticSeed
)

$ErrorActionPreference = "Stop"
$credentialPath = Join-Path $PocketBaseRoot "dev-credentials.txt"
$teacherKeyPath = Join-Path $PocketBaseRoot "teacher-link-dev.key"
$values = @{}
Get-Content -LiteralPath $credentialPath | ForEach-Object {
  $parts = $_.Split("=", 2)
  if ($parts.Count -eq 2) {
    $values[$parts[0]] = $parts[1]
  }
}

$health = Invoke-RestMethod -Uri "$BaseUri/api/health"
$adminAuth = Invoke-RestMethod -Method Post -Uri "$BaseUri/api/admins/auth-with-password" -ContentType "application/json" -Body (@{
  identity = $values["ADMIN_EMAIL"]
  password = $values["ADMIN_PASSWORD"]
} | ConvertTo-Json)
$appAuth = Invoke-RestMethod -Method Post -Uri "$BaseUri/api/collections/users/auth-with-password" -ContentType "application/json" -Body (@{
  identity = $values["APP_EMAIL"]
  password = $values["APP_PASSWORD"]
} | ConvertTo-Json)
$adminHeaders = @{ Authorization = $adminAuth.token }
$appHeaders = @{ Authorization = $appAuth.token }
$anonymousStudents = Invoke-RestMethod -Uri "$BaseUri/api/collections/alumnos/records?page=1&perPage=1&skipTotal=0"
$authenticatedStudents = Invoke-RestMethod -Uri "$BaseUri/api/collections/alumnos/records?page=1&perPage=1&skipTotal=0" -Headers $appHeaders
$teacherGateway = Invoke-WebRequest -Uri "$BaseUri/api/cys/docente/contexto" -SkipHttpErrorCheck
$directorGateway = Invoke-WebRequest -Uri "$BaseUri/api/cys/directivo/instancias/aaaaaaaaaaaaaaa/bbbbbbbbbbbbbbb" -SkipHttpErrorCheck
$listener = Get-NetTCPConnection -LocalPort 8090 -State Listen -ErrorAction SilentlyContinue

$checks = [ordered]@{
  health = $health.code -eq 200
  adminLogin = [bool]$adminAuth.token
  applicationLogin = [bool]$appAuth.token
  anonymousDataHidden = $anonymousStudents.totalItems -eq 0
  authenticatedDataAvailable = $authenticatedStudents.totalItems -gt 0
  teacherGatewayProtected = $teacherGateway.StatusCode -eq 401
  directorGatewayProtected = $directorGateway.StatusCode -eq 401
  loopbackOnly = $listener -and @($listener | Where-Object { $_.LocalAddress -ne "127.0.0.1" }).Count -eq 0
  teacherKeyValid = (Get-Content -Raw -LiteralPath $teacherKeyPath).Trim().Length -eq 32
}

if ($ExpectSyntheticSeed) {
  $expected = [ordered]@{
    users = 1
    ciclos_lectivos = 1
    niveles = 2
    escalas_calificacion = 1
    valores_escala = 5
    cursos = 2
    periodos = 2
    materias = 5
    curso_materias = 8
    criterios_evaluacion = 40
    alumnos = 6
    responsables = 6
    alumno_responable = 6
    inscripciones = 6
    tokens_acceso_docente = 0
    instancias_carga_boletin = 0
  }
  $seedMatches = $true
  foreach ($collection in $expected.Keys) {
    $records = Invoke-RestMethod -Uri "$BaseUri/api/collections/$collection/records?page=1&perPage=1&skipTotal=0" -Headers $adminHeaders
    if ($records.totalItems -ne $expected[$collection]) {
      $seedMatches = $false
    }
  }
  $checks.syntheticSeed = $seedMatches
}

$checks | ConvertTo-Json

if (@($checks.Values | Where-Object { $_ -ne $true }).Count -gt 0) {
  throw "Una o mas verificaciones del PocketBase local fallaron."
}
