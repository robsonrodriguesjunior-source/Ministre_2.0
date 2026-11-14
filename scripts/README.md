# Scripts do servidor

| Script | Para quê |
|---|---|
| `deploy.ps1` | Publica a versão do GitHub em `C:\ministre` (API, app web e página de download). |
| `backup/backup.ps1` | Backup diário criptografado (banco + fotos + `.env`) para `C:\ministre-backups` e OneDrive. |
| `backup/restore-db.ps1` | Testa a restauração num banco temporário ou restaura de verdade (`-Production -Confirm RESTAURAR`). |
| `backup/zip.php` | Cria, confere e abre os `.zip` com AES-256 (usado pelos dois acima). |
| `server/api.cmd` | Liga a API (PHP 8.3 em `127.0.0.1:8000`). |
| `server/scheduler.cmd` | Agendador do Laravel (lembretes, resumo semanal, fila dos avisos). |

Passo a passo de publicação e restauração: `README.md` na raiz.

## Tarefas do Windows (todas como SYSTEM)

| Tarefa | Executa | Quando |
|---|---|---|
| **Ministre API** | `cmd /c "C:\ministre\scripts\server\api.cmd"` | ao ligar o servidor |
| **Ministre Agendador** | `cmd /c "C:\ministre\scripts\server\scheduler.cmd"` | a cada 1 minuto |
| **Ministre Backup** | `powershell -NoProfile -ExecutionPolicy Bypass -File "C:\ministre\scripts\backup\backup.ps1"` | todo dia às 4h (o backup do servidor FiveM roda às 2h) |

`api.cmd` e `scheduler.cmd` definem `OPENSSL_CONF` só para o próprio processo: o PHP no Windows precisa dele para assinar os avisos (Web Push), e assim nada muda no resto da VPS.

## Backup

- Senha: `C:\ministre-backups\backup-password.txt` (só Administradores e SYSTEM leem). **Tenha uma cópia fora da VPS.**
- Envio ao OneDrive usa o `rclone` e a conexão `onedrive` do FiveM Backup Center (`C:\FiveMBackupCenter_v2.1_Premium_UI\...\bin\rclone.exe`), na pasta separada `Ministre/Backups`.
- Falha: fica no `backup.log` e o comando `php artisan ministre:backup-failed` manda e-mail para `MINISTRE_ADMIN_EMAIL` quando o envio de e-mail (`MAIL_*`) estiver configurado.

## PHP 8.3 (`C:\php83`, só do Ministre)

- `php.ini`: `curl.cainfo` e `openssl.cafile` = `C:/php83/extras/ssl/cacert.pem` (certificados do curl.se, para enviar avisos por HTTPS); `post_max_size = 12M` e `upload_max_filesize = 10M` (fotos); OPcache ligado. O PHP do XAMPP não é afetado.
- Chaves dos avisos no celular (`VAPID_*`) e demais segredos ficam só em `C:\ministre\apps\api\.env` (nunca no GitHub).

## E-mail (ainda desligado)

Para ligar: preencha `MAIL_MAILER=smtp`, `MAIL_HOST`, `MAIL_PORT`, `MAIL_USERNAME`, `MAIL_PASSWORD` (ex.: Brevo) e `MINISTRE_ADMIN_EMAIL` em `C:\ministre\apps\api\.env` e rode o `deploy.ps1 -SkipWeb`.
