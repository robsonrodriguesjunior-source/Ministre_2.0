<#
  Restaura um backup do Ministre (seção 9.2). Rode como Administrador.

  TESTE (padrão, não toca na produção): abre o backup, sobe um MariaDB temporário separado (porta 3399),
  importa e compara tabela por tabela com o banco de produção. Depois apaga tudo o que criou.
    powershell -ExecutionPolicy Bypass -File C:\ministre\scripts\backup\restore-db.ps1
    ... -Backup C:\ministre-backups\ministre_2026-11-15_0400.zip    (um arquivo específico)
    ... -FromCloud                                                   (baixa o mais recente do OneDrive)

  PRODUÇÃO (substitui os dados atuais pelos do backup; antes faz um backup de segurança):
    ... -Production -Confirm RESTAURAR
#>
param(
  [string]$Backup,
  [switch]$FromCloud,
  [switch]$Production,
  [string]$Confirm,
  [string]$Root = 'C:\ministre'
)

$ErrorActionPreference = 'Stop'
$backups = 'C:\ministre-backups'
$passwordFile = Join-Path $backups 'backup-password.txt'
$php = 'C:\php83\php.exe'
$mysqlBin = 'C:\xampp\mysql\bin'
$rclone = 'C:\FiveMBackupCenter_v2.1_Premium_UI\FiveMBackupCenter_v2.1_Premium_UI\bin\rclone.exe'
$rcloneConf = 'C:\FiveMBackupCenter_v2.1_Premium_UI\FiveMBackupCenter_v2.1_Premium_UI\config\rclone.conf'
$cloud = 'onedrive:Ministre/Backups'
$api = Join-Path $Root 'apps\api'
$zipTool = Join-Path $Root 'scripts\backup\zip.php'
$work = Join-Path $env:TEMP ('ministre-restore-' + (Get-Date -Format 'yyyyMMdd_HHmmss'))
$testPort = 3399

function Say([string]$message, [string]$color = 'Gray') { Write-Host $message -ForegroundColor $color }
function EnvValue([string]$key) {
  $line = Get-Content (Join-Path $api '.env') | Where-Object { $_ -match "^$key=" } | Select-Object -First 1
  return ($line -replace "^$key=", '').Trim().Trim('"')
}
function Cnf([string]$path, [string]$user, [string]$password, [int]$port) {
  $lines = @('[client]', "user=$user", 'host=127.0.0.1', "port=$port")
  if ($password) { $lines += "password=$password" }
  $lines | Set-Content -Path $path -Encoding ASCII
}
function Query([string]$cnf, [string]$db, [string]$sql) {
  $out = & "$mysqlBin\mysql.exe" "--defaults-extra-file=$cnf" --batch --skip-column-names $db -e $sql
  if ($LASTEXITCODE -ne 0) { throw "Consulta falhou: $sql" }
  return $out
}
function Import([string]$cnf, [string]$db, [string]$file) {
  & "$mysqlBin\mysql.exe" "--defaults-extra-file=$cnf" --default-character-set=utf8mb4 $db -e "source $($file -replace '\\', '/')"
  if ($LASTEXITCODE -ne 0) { throw "Falhou ao importar $file" }
}

New-Item -ItemType Directory -Force $work | Out-Null
$tempServer = $null
try {
  # ---- Qual backup ----
  if ($FromCloud) {
    Say 'Baixando o backup mais recente do OneDrive...'
    $latest = & $rclone --config $rcloneConf lsf $cloud --include 'ministre_*.zip' | Sort-Object | Select-Object -Last 1
    if (-not $latest) { throw 'Nenhum backup encontrado no OneDrive' }
    & $rclone --config $rcloneConf copy "$cloud/$latest" $work
    if ($LASTEXITCODE -ne 0) { throw 'Download do OneDrive falhou' }
    $Backup = Join-Path $work $latest
  } elseif (-not $Backup) {
    $Backup = (Get-ChildItem $backups -Filter 'ministre_*.zip' | Sort-Object Name | Select-Object -Last 1).FullName
    if (-not $Backup) { throw "Nenhum backup em $backups" }
  }
  Say "Backup: $Backup" 'Cyan'

  # ---- Abre (precisa da senha certa) ----
  $files = Join-Path $work 'files'
  & $php $zipTool unpack $Backup $passwordFile $files | Out-Null
  if ($LASTEXITCODE -ne 0) { throw 'Não foi possível abrir o backup (senha errada ou arquivo corrompido)' }
  $db = EnvValue 'DB_DATABASE'
  $dump = Join-Path $files "$db.sql"
  if (-not (Test-Path $dump)) { throw "O backup não tem $db.sql" }
  Say "Aberto: banco ($([math]::Round((Get-Item $dump).Length / 1KB)) KB), configuração e $((Get-ChildItem (Join-Path $files 'storage-public') -Recurse -File -ErrorAction SilentlyContinue).Count) arquivos enviados." 'Green'

  $prodCnf = Join-Path $work 'prod.cnf'
  Cnf $prodCnf (EnvValue 'DB_USERNAME') (EnvValue 'DB_PASSWORD') 3306

  if ($Production) {
    # ---- Restauração de verdade ----
    if ($Confirm -ne 'RESTAURAR') { throw 'Para substituir os dados da produção, use: -Production -Confirm RESTAURAR' }
    Say 'Fazendo um backup de segurança do estado atual antes de restaurar...' 'Yellow'
    & powershell -NoProfile -ExecutionPolicy Bypass -File (Join-Path $Root 'scripts\backup\backup.ps1')
    if ($LASTEXITCODE -ne 0) { throw 'O backup de segurança falhou; nada foi alterado' }

    Say 'Importando o banco na produção...' 'Yellow'
    Import $prodCnf $db $dump
    $public = Join-Path $files 'storage-public'
    if (Test-Path $public) {
      robocopy $public (Join-Path $api 'storage\app\public') /E /NFL /NDL /NJH /NJS /NP | Out-Null
      if ($LASTEXITCODE -ge 8) { throw 'Falhou ao restaurar as fotos' }
    }
    & $php (Join-Path $api 'artisan') optimize:clear | Out-Null
    & $php (Join-Path $api 'artisan') optimize | Out-Null
    Say "Restaurado. A configuração do backup ficou em $files\api.env (use só se o .env atual tiver se perdido)." 'Green'
    $work = $null # mantém a pasta com o api.env
    exit 0
  }

  # ---- Teste: MariaDB temporário, isolado da produção ----
  Say "Subindo um MariaDB temporário na porta $testPort (a produção não é tocada)..."
  $data = Join-Path $work 'data'
  & "$mysqlBin\mysql_install_db.exe" "--datadir=$data" "--port=$testPort" | Out-Null
  if ($LASTEXITCODE -ne 0) { throw 'Não foi possível preparar o MariaDB temporário' }
  $tempServer = Start-Process -FilePath "$mysqlBin\mysqld.exe" -ArgumentList @("--datadir=`"$data`"", "--port=$testPort", '--bind-address=127.0.0.1', '--skip-name-resolve', '--console') -PassThru -WindowStyle Hidden
  $testCnf = Join-Path $work 'test.cnf'
  Cnf $testCnf 'root' '' $testPort
  $up = $false
  for ($i = 0; $i -lt 30 -and -not $up; $i++) {
    Start-Sleep -Seconds 1
    & "$mysqlBin\mysqladmin.exe" "--defaults-extra-file=$testCnf" ping 2>$null | Out-Null
    $up = ($LASTEXITCODE -eq 0)
  }
  if (-not $up) { throw 'O MariaDB temporário não respondeu' }

  Query $testCnf '' "CREATE DATABASE restore_test CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci" | Out-Null
  Import $testCnf 'restore_test' $dump

  # ---- Compara tabela por tabela ----
  $tables = Query $testCnf 'restore_test' 'SHOW TABLES'
  $diff = 0
  Say ''
  Say ('{0,-28} {1,10} {2,10}' -f 'Tabela', 'Backup', 'Produção') 'Cyan'
  foreach ($t in $tables) {
    $restored = [int](Query $testCnf 'restore_test' "SELECT COUNT(*) FROM ``$t``")
    $live = [int](Query $prodCnf $db "SELECT COUNT(*) FROM ``$t``")
    $mark = if ($restored -eq $live) { '' } else { $diff++; '  <- mudou desde o backup' }
    Say ('{0,-28} {1,10} {2,10}{3}' -f $t, $restored, $live, $mark)
  }
  Say ''
  if ($tables.Count -lt 10) { throw "O backup restaurado tem só $($tables.Count) tabelas" }
  if ($diff -eq 0) {
    Say "RESTAURAÇÃO TESTADA: $($tables.Count) tabelas, todas iguais à produção." 'Green'
  } else {
    Say "RESTAURAÇÃO TESTADA: $($tables.Count) tabelas abertas; $diff mudaram depois do backup (normal se o app foi usado desde então)." 'Yellow'
  }
  exit 0
} catch {
  Say "FALHOU: $($_.Exception.Message)" 'Red'
  exit 1
} finally {
  if ($tempServer) {
    & "$mysqlBin\mysqladmin.exe" "--defaults-extra-file=$(Join-Path $work 'test.cnf')" shutdown 2>$null | Out-Null
    Start-Sleep -Seconds 2
    if (-not $tempServer.HasExited) { Stop-Process -Id $tempServer.Id -Force -ErrorAction SilentlyContinue }
  }
  if ($work -and (Test-Path $work)) { Remove-Item $work -Recurse -Force -ErrorAction SilentlyContinue }
}
