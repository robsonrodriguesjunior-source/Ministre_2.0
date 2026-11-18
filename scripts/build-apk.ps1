<#
  Gera o APK de teste do Android (Ministre) na VPS.

  Por que numa pasta curta (C:\mb)? As ferramentas de C++ do Android não aceitam caminhos com
  mais de 260 letras, e a pasta do projeto já é longa. Então o app é copiado para C:\mb e
  montado lá. O resultado vai para C:\Android\builds\Ministre.apk (o deploy.ps1 publica ele
  em ministreapp.com.br/baixar/Ministre.apk).

  Uso (PowerShell):
    powershell -ExecutionPolicy Bypass -File scripts\build-apk.ps1
  Precisa de: Java 17 em C:\Android\jdk17, Android SDK em C:\Android\sdk e a chave em
  C:\Android\keys\ministre-keystore.properties (sem a chave, sai assinado com a chave de teste).
#>
$ErrorActionPreference = 'Stop'
$root = Split-Path -Parent $PSScriptRoot
$src = Join-Path $root 'apps\mobile'
$dst = 'C:\mb'
$out = 'C:\Android\builds'
$env:JAVA_HOME = 'C:\Android\jdk17'
$env:ANDROID_HOME = 'C:\Android\sdk'
$env:CI = '1'

function Step([string]$m) { Write-Host "`n==> $m" -ForegroundColor Cyan }
function Run([string]$exe, [string[]]$argList) {
  & $exe @argList
  if ($LASTEXITCODE -ne 0) { throw "Falhou: $exe $($argList -join ' ')" }
}

Step "Copiando o app para $dst"
robocopy $src $dst /MIR /XD node_modules .expo dist web-build android ios /NFL /NDL /NJH /NJS /NP | Out-Null
if ($LASTEXITCODE -ge 8) { throw "Falhou ao copiar (robocopy $LASTEXITCODE)" }
$global:LASTEXITCODE = 0

Push-Location $dst
try {
  Step 'Bibliotecas do app'
  Run 'npm.cmd' @('install', '--no-audit', '--no-fund', '--loglevel=error')

  Step 'Gerando o projeto Android'
  Run 'npx.cmd' @('expo', 'prebuild', '--platform', 'android', '--clean', '--no-install')

  # A VPS tem só 4 GB de memória: sem estes limites o Gradle, o Kotlin e vários compiladores C++ rodam juntos
  # e o Windows acaba a memória ("arquivo de paginação muito pequeno"). Aqui: uma tarefa e um compilador por vez.
  Step 'Limitando o uso de memória da montagem'
  $props = Join-Path $dst 'android\gradle.properties'
  $txt = (Get-Content $props -Raw) -replace '(?m)^org\.gradle\.(jvmargs|parallel|workers\.max)=.*\r?\n?', ''
  $txt += "`r`norg.gradle.jvmargs=-Xmx1536m -XX:MaxMetaspaceSize=512m`r`norg.gradle.parallel=false`r`norg.gradle.workers.max=1`r`nkotlin.compiler.execution.strategy=in-process`r`n"
  Set-Content $props $txt -Encoding ascii -NoNewline
  $gradle = Join-Path $dst 'android\build.gradle'
  Add-Content $gradle -Encoding ascii @'

// Ministre (build-apk.ps1): um compilador C++ por vez em todas as bibliotecas nativas (pouca memória na VPS).
subprojects { p ->
  ['com.android.library', 'com.android.application'].each { id ->
    p.plugins.withId(id) {
      p.android.defaultConfig.externalNativeBuild.cmake.arguments '-DCMAKE_JOB_POOLS=one=1', '-DCMAKE_JOB_POOL_COMPILE=one', '-DCMAKE_JOB_POOL_LINK=one'
    }
  }
}
'@

  # CMake 3.31 traz o ninja 1.12, que aceita caminhos com mais de 260 letras (precisa de LongPathsEnabled=1 no Windows).
  Add-Content (Join-Path $dst 'android\local.properties') -Encoding ascii "`r`ncmake.dir=C\:\\Android\\sdk\\cmake\\3.31.6`r`n"

  Step 'Montando o APK (a primeira vez demora)'
  $env:NODE_ENV = 'production'
  Run (Join-Path $dst 'android\gradlew.bat') @('-p', (Join-Path $dst 'android'), 'assembleRelease', '-PreactNativeArchitectures=arm64-v8a,armeabi-v7a', '--no-daemon')
} finally { Pop-Location }

$apk = Join-Path $dst 'android\app\build\outputs\apk\release\app-release.apk'
if (!(Test-Path $apk)) { throw "APK não encontrado: $apk" }
New-Item -ItemType Directory -Force $out | Out-Null
Copy-Item $apk (Join-Path $out 'Ministre.apk') -Force
$mb = [math]::Round((Get-Item (Join-Path $out 'Ministre.apk')).Length / 1MB, 1)
Write-Host "`nPronto! $out\Ministre.apk ($mb MB)" -ForegroundColor Green
