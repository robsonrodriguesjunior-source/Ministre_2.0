# Ministre: regras do projeto

App nativo (Expo/React Native) + API (Laravel 12/MySQL) para escalas do Ministério de Louvor.
A especificação completa está em `docs/ESPECIFICACAO.md`; leia antes de qualquer tarefa. O design está em `docs/design/`, a partir de `docs/design/LEIA-ME-DESIGN.md`.

## Idioma
- Converse com o dono do projeto **em português do Brasil**, em linguagem simples: ele não é programador.
- Todo texto visível no app em pt-BR. Código, nomes de variáveis e commits em inglês; comentários podem ser em português.

## Estrutura
- `apps/mobile`: Expo + TypeScript + Expo Router. Tokens de design em `src/theme/tokens.ts`; **nunca** use cor ou tamanho solto num componente, sempre um token.
- `apps/api`: Laravel 12. Controllers finos; regras em `app/Actions` ou `app/Services`; validação em Form Requests; autorização em Policies; respostas em API Resources.
- `scripts/`: PowerShell para o servidor Windows (deploy e backup).

## Ambiente
- Desenvolvimento: **Windows**, VS Code, XAMPP local (PHP + MariaDB), Composer, Node LTS, Git. Celular com **Expo Go** na mesma rede Wi-Fi.
- Escreva os comandos para o **PowerShell**. Caminho do PHP do XAMPP: `C:\xampp\php\php.exe` (confira se o `php` está no PATH).
- Produção: VPS Windows com XAMPP. Veja a seção 9 da especificação.

## Comandos
- API: `cd apps/api` → `php artisan serve --host=0.0.0.0 --port=8000` · `php artisan test` · `php artisan migrate:fresh --seed`
- App: `cd apps/mobile` → `npx expo start` · `npx tsc --noEmit` · `npx expo lint`
- No celular, a URL da API em desenvolvimento é o IP da máquina na rede (ex.: `http://192.168.0.10:8000`), em `apps/mobile/.env` como `EXPO_PUBLIC_API_URL`.

## Forma de trabalhar
- Trabalhe **por etapas** (seção "Plano de etapas" do prompt inicial). No fim de cada etapa:
  1. rode os testes e o typecheck e corrija o que falhar;
  2. faça commit e `git push` para o GitHub;
  3. explique ao dono, em poucas linhas, o que ficou pronto e **como testar no celular**;
  4. **pare e espere** o "pode seguir".
- Antes de instalar uma biblioteca nova que não esteja na especificação, explique o motivo em uma frase.
- Fidelidade ao design: antes de construir uma tela, abra o HTML de referência correspondente e copie medidas, cores e textos.
- Segurança: nunca commitar `.env`, senhas, chaves, dumps de banco ou a pasta `vendor`/`node_modules`. Mantenha o `.gitignore` em dia.
- Não use letra de música real com direitos autorais nos dados de exemplo.
- Se algo na especificação estiver ambíguo ou parecer errado, **pergunte** em vez de inventar.

## Commits
Mensagens curtas no imperativo, em inglês, com prefixo: `feat(mobile): home next-service card`, `feat(api): event assignments`, `chore: backup script`.
