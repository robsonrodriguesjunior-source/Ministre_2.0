<#
  Backup diário do Ministre (seção 9.2 da especificação). Tarefa do Windows "Ministre Backup", todo dia às 4h.

  1. Copia o banco (mysqldump), as fotos enviadas (storage/app/public) e a configuração (.env);
  2. junta tudo num .zip criptografado com AES-256 (senha em C:\ministre-backups\backup-password.txt,
     fora do repositório) — abre no 7-Zip ou WinRAR com a mesma senha;
  3. confere se o arquivo abre e não está corrompido;
  4. guarda 30 dias em C:\ministre-backups e envia uma cópia para o OneDrive (Ministre/Backups, 90 dias);
  5. registra o resultado em C:\ministre-backups\backup.log; se falhar, avisa o administrador por e-mail.

  Nunca sobe nada sem criptografia: são dados pessoais (LGPD).
#>
param([string]$Root = 'C:\ministre')

$ErrorActionPreference = 'Stop'
$backups = 'C:\ministre-backups'
$passwordFile = Join-Path $backups 'backup-password.txt'
$log = Join-Path $backups 'backup.log'
$php = 'C:\php83\php.exe'
$mysqlBin = 'C:\xampp\mysql\bin'
$rclone = 'C:\FiveMBackupCenter_v2.1_Premium_UI\FiveMBackupCenter_v2.1_Premium_UI\bin\rclone.exe'
$rcloneConf = 'C:\FiveMBackupCenter_v2.1_Premium_UI\FiveMBackupCenter_v2.1_Premium_UI\config\rclone.conf'
$cloud = 'onedrive:Ministre/Backups'
$api = Join-Path $Root 'apps\api'
$zipTool = Join-Path $Root 'scripts\backup\zip.php'
$keepLocalDays = 30
$keepCloudDays = 90

function Log([string]$message) {
  $line = '{0:yyyy-MM-dd HH:mm:ss}  {1}' -f (Get-Date), $message
  Add-Content -Path $log -Value $line -Encoding UTF8
  Write-Host $line
}

function EnvValue([string]$key) {
  $line = Get-Content (Join-Path $api '.env') | Where-Object { $_ -match "^$key=" } | Select-Object -First 1
  if (-not $line) { throw "Falta $key no .env" }
  return ($line -replace "^$key=", '').Trim().Trim('"')
}

$stamp = Get-Date -Format 'yyyy-MM-dd_HHmm'
$work = Join-Path $env:TEMP "ministre-backup-$stamp"
$zip = Join-Path $backups "ministre_$stamp.zip"
$myCnf = Join-Path $work 'my.cnf'

New-Item -ItemType Directory -Force $backups | Out-Null
try {
  if (-not (Test-Path $passwordFile)) { throw "Senha do backup não encontrada: $passwordFile" }
  New-Item -ItemType Directory -Force (Join-Path $work 'files') | Out-Null

  # 1. Banco: a senha vai num arquivo temporário, não na linha de comando.
  $db = EnvValue 'DB_DATABASE'
  @('[client]', "user=$(EnvValue 'DB_USERNAME')", "password=$(EnvValue 'DB_PASSWORD')", 'host=127.0.0.1', 'port=3306') |
    Set-Content -Path $myCnf -Encoding ASCII
  $dump = Join-Path $work "files\$db.sql"
  & "$mysqlBin\mysqldump.exe" "--defaults-extra-file=$myCnf" --single-transaction --routines --triggers --default-character-set=utf8mb4 "--result-file=$dump" $db
  if ($LASTEXITCODE -ne 0) { throw "mysqldump falhou ($LASTEXITCODE)" }
  if ((Get-Item $dump).Length -lt 1000 -or -not (Select-String -Path $dump -Pattern 'Dump completed' -Quiet)) { throw 'O dump do banco saiu incompleto' }

  # Fotos enviadas e configuração (chaves do app e dos avisos).
  $public = Join-Path $api 'storage\app\public'
  if (Test-Path $public) { Copy-Item $public (Join-Path $work 'files\storage-public') -Recurse }
  Copy-Item (Join-Path $api '.env') (Join-Path $work 'files\api.env')

  # 2 e 3. Criptografa e confere.
  & $php $zipTool pack $zip $passwordFile (Join-Path $work 'files') | Out-Null
  if ($LASTEXITCODE -ne 0) { throw "Falhou ao criptografar ($LASTEXITCODE)" }
  & $php $zipTool check $zip $passwordFile | Out-Null
  if ($LASTEXITCODE -ne 0) { throw 'O backup criado não passou na conferência' }
  $sizeKb = [math]::Round((Get-Item $zip).Length / 1KB)

  # 4. Cópia fora da VPS.
  & $rclone --config $rcloneConf copy $zip $cloud --retries 3 --low-level-retries 5
  if ($LASTEXITCODE -ne 0) { throw "Envio para o OneDrive falhou ($LASTEXITCODE)" }
  & $rclone --config $rcloneConf delete $cloud --min-age "$($keepCloudDays)d" --include 'ministre_*.zip' | Out-Null

  Get-ChildItem $backups -Filter 'ministre_*.zip' | Where-Object { $_.LastWriteTime -lt (Get-Date).AddDays(-$keepLocalDays) } | Remove-Item -Force

  Log "OK  $(Split-Path $zip -Leaf) ($sizeKb KB) salvo na VPS e no OneDrive"
  exit 0
} catch {
  Log "FALHOU  $($_.Exception.Message)"
  # Avisa o administrador (e-mail configurado em MAIL_* e MINISTRE_ADMIN_EMAIL no .env).
  try { & $php (Join-Path $api 'artisan') ministre:backup-failed "$($_.Exception.Message)" | Out-Null } catch {}
  exit 1
} finally {
  if (Test-Path $work) { Remove-Item $work -Recurse -Force -ErrorAction SilentlyContinue }
}
