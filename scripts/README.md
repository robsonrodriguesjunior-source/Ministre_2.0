# Scripts do servidor

Deploy e backup completos chegam na Etapa 7.

## `server/` — o que roda na VPS (Windows)

| Arquivo | Tarefa do Windows | Quando |
|---|---|---|
| `server/api.cmd` | **Ministre API** (SYSTEM) | ao ligar o servidor: API em `127.0.0.1:8000`, o Apache repassa `api.ministreapp.com.br` |
| `server/scheduler.cmd` | **Ministre Agendador** (SYSTEM) | a cada 1 minuto: `schedule:run` (lembretes, resumo semanal e a fila que manda os avisos para o celular) |

Os dois definem `OPENSSL_CONF` só para o próprio processo: o PHP no Windows precisa dele para assinar os avisos (Web Push), e assim nada muda no resto da VPS.

## PHP 8.3 (`C:\php83`, só do Ministre)

- `php.ini`: `curl.cainfo` e `openssl.cafile` apontam para `C:/php83/extras/ssl/cacert.pem` (lista de certificados do curl.se), necessária para enviar os avisos por HTTPS. O PHP do XAMPP não é afetado.
- Chaves dos avisos no celular: `VAPID_PUBLIC_KEY` e `VAPID_PRIVATE_KEY` ficam só no `.env` da API (nunca no GitHub).
