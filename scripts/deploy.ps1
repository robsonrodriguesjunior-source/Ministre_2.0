<#
  Publica o Ministre na VPS a partir do GitHub (seção 9.1 da especificação).

  Produção fica em C:\ministre (clone do GitHub). Rode como Administrador:
    powershell -ExecutionPolicy Bypass -File C:\ministre\scripts\deploy.ps1
  Opções:
    -SkipWeb   só a API
    -SkipApi   só o app web (app.ministreapp.com.br)

  Passos: git pull -> composer install --no-dev -> migrate --force -> caches -> reinicia a API
          -> npm ci -> expo export (web) -> copia para C:\Sites\ministre\app -> confere se está no ar.
#>
param([switch]$SkipWeb, [switch]$SkipApi)

$ErrorActionPreference = 'Stop'
$root = Split-Path -Parent $PSScriptRoot
$php = 'C:\php83\php.exe'
$composer = 'C:\php83\composer.phar'
$api = Join-Path $root 'apps\api'
$mobile = Join-Path $root 'apps\mobile'
$site = 'C:\Sites\ministre\app'
$env:OPENSSL_CONF = 'C:\php83\extras\ssl\openssl.cnf' # assinatura dos avisos (Web Push)

function Step([string]$message) { Write-Host "`n==> $message" -ForegroundColor Cyan }
function Run([string]$exe, [string[]]$argList) {
  & $exe @argList
  if ($LASTEXITCODE -ne 0) { throw "Falhou: $exe $($argList -join ' ')" }
}

Step 'Baixando a versao nova do GitHub'
Run 'git' @('-C', $root, 'pull', '--ff-only')

if (-not $SkipApi) {
  Push-Location $api
  try {
    Step 'Dependencias da API'
    Run $php @($composer, 'install', '--no-dev', '--optimize-autoloader', '--no-interaction', '--no-progress')

    Step 'Banco de dados (so o que for novo; nada e apagado)'
    Run $php @('artisan', 'migrate', '--force')

    Step 'Otimizando'
    Run $php @('artisan', 'optimize:clear')
    Run $php @('artisan', 'optimize')
    if (-not (Test-Path 'public\storage')) { Run $php @('artisan', 'storage:link') }
  } finally { Pop-Location }

  Step 'Reiniciando a API'
  Stop-ScheduledTask -TaskName 'Ministre API' -ErrorAction SilentlyContinue
  Get-CimInstance Win32_Process -Filter "Name='php.exe'" |
    Where-Object { $_.CommandLine -match '127\.0\.0\.1:8000|--port=8000' } |
    ForEach-Object { try { Stop-Process -Id $_.ProcessId -Force -ErrorAction Stop } catch {} }
  Start-Sleep -Seconds 1
  Start-ScheduledTask -TaskName 'Ministre API'
}

if (-not $SkipWeb) {
  Push-Location $mobile
  try {
    Step 'Dependencias do app'
    Run 'npm.cmd' @('ci', '--no-audit', '--no-fund', '--loglevel=error')

    Step 'Gerando a versao web'
    if (Test-Path 'dist') { Remove-Item 'dist' -Recurse -Force }
    Run 'npx.cmd' @('expo', 'export', '--platform', 'web', '--output-dir', 'dist')

    Step 'Publicando em app.ministreapp.com.br'
    robocopy 'dist' $site /MIR /NFL /NDL /NJH /NJS /NP | Out-Null
    if ($LASTEXITCODE -ge 8) { throw "Falhou ao copiar para $site (robocopy $LASTEXITCODE)" }
    $global:LASTEXITCODE = 0
  } finally { Pop-Location }
}

Step 'Publicando a pagina de download (ministreapp.com.br)'
robocopy (Join-Path $root 'apps\site') 'C:\Sites\ministre\site' /MIR /NFL /NDL /NJH /NJS /NP | Out-Null
if ($LASTEXITCODE -ge 8) { throw "Falhou ao copiar a pagina de download (robocopy $LASTEXITCODE)" }
$global:LASTEXITCODE = 0

# App Android de teste (APK): fica fora do Git, em C:\Android\builds\Ministre.apk (gerado na VPS).
$apk = 'C:\Android\builds\Ministre.apk'
if (Test-Path $apk) {
  New-Item -ItemType Directory -Force 'C:\Sites\ministre\site\baixar' | Out-Null
  Copy-Item $apk 'C:\Sites\ministre\site\baixar\Ministre.apk' -Force
  Write-Host "    APK publicado em ministreapp.com.br/baixar/Ministre.apk"
}

Step 'Conferindo se esta no ar'
$ok = $true
foreach ($url in @('https://api.ministreapp.com.br/api/v1/health', 'https://app.ministreapp.com.br/', 'https://ministreapp.com.br/')) {
  $tries = 0
  while ($true) {
    try {
      $r = Invoke-WebRequest -UseBasicParsing -TimeoutSec 15 $url
      Write-Host "  OK  $url ($($r.StatusCode))" -ForegroundColor Green
      break
    } catch {
      $tries++
      if ($tries -ge 10) { Write-Host "  FALHOU  $url" -ForegroundColor Red; $ok = $false; break }
      Start-Sleep -Seconds 2
    }
  }
}
if (-not $ok) { throw 'Publicado, mas algo nao respondeu. Veja C:\ministre\apps\api\storage\logs.' }
Write-Host "`nPronto! Versao $(git -C $root rev-parse --short HEAD) no ar." -ForegroundColor Green
