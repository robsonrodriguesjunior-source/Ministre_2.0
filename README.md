# Ministre

App das escalas do Ministério de Louvor + API.

- `apps/mobile`: app em Expo (React Native) + TypeScript + Expo Router. Hoje publicado como app web instalável (PWA) em **app.ministreapp.com.br**.
- `apps/api`: API em Laravel 12 + Sanctum + MariaDB, em **api.ministreapp.com.br**.
- `apps/site`: página de download com QR code em **ministreapp.com.br**.
- `scripts/`: publicação (deploy), backup/restauração e o que roda na VPS — veja `scripts/README.md`.
- `docs/`: especificação (`ESPECIFICACAO.md`) e design (`design/`).

Regras do projeto: `CLAUDE.md`.

## Onde fica cada coisa na VPS

| O quê | Onde |
|---|---|
| **Produção** (clone do GitHub; só muda pelo `deploy.ps1`) | `C:\ministre` |
| Desenvolvimento (banco SQLite próprio, nunca toca na produção) | `C:\Users\Administrator\Desktop\Sistemas\Ministre_v2` |
| App web publicado / página de download | `C:\Sites\ministre\app` / `C:\Sites\ministre\site` |
| Backups criptografados (30 dias) + log | `C:\ministre-backups` (cópia no OneDrive: `Ministre/Backups`, 90 dias) |
| PHP 8.3 (só do Ministre) + Composer portátil | `C:\php83` |
| MariaDB | XAMPP (`C:\xampp\mysql`), banco `ministre`, usuário `ministre` (acesso só a esse banco) |
| Apache do Ministre | `C:\xampp\apache\conf\extra\ministre.conf` (incluído no fim do `httpd.conf`) |

O PHP 8.3 fica separado do PHP do XAMPP de propósito: os outros sistemas da VPS continuam no PHP do XAMPP, sem mudança.

## Publicar uma versão nova

1. No desenvolvimento: testes (`C:\php83\php.exe artisan test`, `npx tsc --noEmit`, `npx expo lint`), commit e `git push`.
2. Na VPS, como Administrador:

```powershell
powershell -ExecutionPolicy Bypass -File C:\ministre\scripts\deploy.ps1
```

Ele baixa do GitHub, atualiza dependências, roda as migrações (só acrescenta, nunca apaga), otimiza, reinicia a API, gera e publica o app web e a página de download, e confere se tudo respondeu.

## Backup e restauração (leia isto antes de precisar)

- **Todo dia às 4h** a tarefa **Ministre Backup** copia o banco, as fotos enviadas e a configuração (`.env`), criptografa com **AES-256** e guarda na VPS e no OneDrive. O resultado de cada dia fica em `C:\ministre-backups\backup.log`.
- A **senha dos backups** está em `C:\ministre-backups\backup-password.txt`. **Guarde uma cópia fora da VPS** (gerenciador de senhas): sem ela, nenhum backup abre.
- O arquivo `.zip` abre também no **7-Zip** ou no **WinRAR** de qualquer computador, com essa senha.

### Testar a restauração (não toca na produção)

```powershell
powershell -ExecutionPolicy Bypass -File C:\ministre\scripts\backup\restore-db.ps1 -FromCloud
```

Baixa o backup mais recente do OneDrive, abre, monta um banco temporário separado, compara tabela por tabela com a produção e apaga tudo o que criou. Sem `-FromCloud`, usa o mais recente da VPS; com `-Backup <arquivo.zip>`, um específico.

### Restaurar de verdade

```powershell
powershell -ExecutionPolicy Bypass -File C:\ministre\scripts\backup\restore-db.ps1 -FromCloud -Production -Confirm RESTAURAR
```

Antes de substituir, faz um backup de segurança do estado atual. Restaura o banco e as fotos; a configuração do backup fica numa pasta indicada no final (use só se o `.env` tiver se perdido).

### Se a VPS inteira se perder

1. Num servidor novo: XAMPP (MariaDB + Apache), PHP 8.3 em `C:\php83`, Node.js e Git.
2. `git clone https://github.com/robsonrodriguesjunior-source/Ministre_2.0.git C:\ministre`.
3. Baixe o último `ministre_*.zip` do OneDrive (`Ministre/Backups`) e abra com a senha guardada: dentro estão `ministre.sql`, `api.env` e `storage-public`.
4. Crie o banco e o usuário `ministre` (a senha está no `api.env`), importe o `ministre.sql`, copie `api.env` para `C:\ministre\apps\api\.env` e `storage-public` para `C:\ministre\apps\api\storage\app\public`.
5. Recrie as tarefas do Windows e o Apache conforme `scripts/README.md` e rode o `deploy.ps1`.

## Desenvolvimento

```powershell
cd C:\Users\Administrator\Desktop\Sistemas\Ministre_v2\apps\api
C:\php83\php.exe artisan migrate:fresh --seed   # dados de exemplo no SQLite local (senha demo1234)
C:\php83\php.exe artisan test
```

```powershell
cd C:\Users\Administrator\Desktop\Sistemas\Ministre_v2\apps\mobile
npm install
npx tsc --noEmit
npx expo lint
```
