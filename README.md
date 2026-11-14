# Ministre

App das escalas do Ministério de Louvor (Android e iOS) + API.

- `apps/mobile`: app em Expo (React Native) + TypeScript + Expo Router.
- `apps/api`: API em Laravel 12 + Sanctum + MariaDB.
- `scripts/`: scripts do servidor Windows (deploy e backup).
- `docs/`: especificação (`ESPECIFICACAO.md`) e design (`design/`).

Regras do projeto: `CLAUDE.md`.

## Ferramentas (já instaladas na VPS)

| Ferramenta | Onde |
|---|---|
| PHP 8.3 (só do Ministre) | `C:\php83\php.exe` |
| Composer (portátil) | `C:\php83\composer.bat` |
| Node.js + npm | no PATH do Windows |
| MariaDB | XAMPP (`C:\xampp\mysql`), banco `ministre`, usuário `ministre` |

O PHP 8.3 fica separado do PHP do XAMPP de propósito: os outros sistemas da VPS continuam no PHP do XAMPP, sem mudança. Para remover o PHP do Ministre, basta apagar `C:\php83`.

## Rodar a API (PowerShell)

```powershell
cd C:\Users\Administrator\Desktop\Sistemas\Ministre_v2\apps\api
C:\php83\composer.bat install          # só na primeira vez
copy .env.example .env                  # só na primeira vez; depois ajuste DB_PASSWORD
C:\php83\php.exe artisan key:generate  # só na primeira vez
C:\php83\php.exe artisan migrate
C:\php83\php.exe artisan serve --host=0.0.0.0 --port=8000
```

Teste no navegador: `http://IP-DA-VPS:8000/api/v1/health`

Testes automáticos: `C:\php83\php.exe vendor\bin\pest`

## Rodar o app (PowerShell)

```powershell
cd C:\Users\Administrator\Desktop\Sistemas\Ministre_v2\apps\mobile
npm install                 # só na primeira vez
copy .env.example .env      # só na primeira vez; coloque o IP da VPS
npx expo start
```

No celular Android, abra o **Expo Go** e leia o QR code que aparece no terminal.

Verificações: `npx tsc --noEmit` (tipos) e `npx expo lint` (lint).
