# Prompt para colar no Claude do VS Code

> Copie **tudo** que está entre as linhas `=====` e cole no chat do Claude no VS Code, com a pasta do projeto aberta.

=====

Olá, Claude! Vamos construir juntos o **Ministre**, um aplicativo **nativo** (iOS e Android, nas lojas) para organizar as escalas do **Ministério de Louvor** da igreja: quem toca e canta em cada culto, o repertório com cifras, ensaios, avisos e confirmação de presença. No futuro ele vai atender todos os departamentos da igreja, então a estrutura já precisa nascer pronta para isso.

O sistema já existiu e foi perdido quando a VPS deu problema e não havia backup. Só sobrou o **design**, que está nesta pasta. Vamos refazer tudo do zero, e desta vez com backup.

## Antes de escrever qualquer código
1. Leia, nesta ordem:
   - `CLAUDE.md` (regras do projeto e forma de trabalhar);
   - `docs/ESPECIFICACAO.md` (o que o app faz, telas, banco, API, servidor e backups);
   - `docs/design/LEIA-ME-DESIGN.md` e depois **todos** os arquivos de `docs/design/`: `telas-direcoes.html` é a fonte do visual e `apresentacao/*.html` dos fluxos. Abra os HTML e estude o CSS: as medidas, cores e textos devem ser reproduzidos fielmente no React Native.
2. Verifique as ferramentas da minha máquina (Windows + PowerShell): `node -v`, `npm -v`, `git --version`, `php -v`, `composer -V` e se o MySQL do XAMPP está rodando. Se faltar alguma, me diga **exatamente** o que instalar e onde baixar, e espere eu confirmar.
3. Me mostre um **resumo curto** do que entendeu e o plano de etapas abaixo, ajustado se achar necessário. Liste as dúvidas que tiver. **Espere minha aprovação.**

## Stack (já decidida)
- **App:** Expo (React Native) + TypeScript + Expo Router, TanStack Query, Zustand, Reanimated, bottom-sheet, fonte Figtree. Builds com EAS.
- **API:** Laravel 12 + Sanctum + MySQL/MariaDB (o XAMPP que já uso), testes com Pest.
- **Servidor:** minha VPS Windows com XAMPP (Apache + PHP + MariaDB), com HTTPS.
- **Código no GitHub** (meu repositório já existe; peça a URL na Etapa 0) e **backup diário criptografado do banco** fora da VPS.
- Monorepo: `apps/mobile`, `apps/api`, `scripts/`, `docs/`.

## Plano de etapas
Siga uma etapa por vez. No fim de cada uma: rode os testes e o typecheck, faça commit e push, me explique como testar no meu celular (Expo Go) e **pare até eu dizer "pode seguir"**.

- **Etapa 0: Fundação.** Git iniciado e ligado ao meu repositório no GitHub, `.gitignore` caprichado, estrutura do monorepo, README com o passo a passo para rodar tudo. Projeto Laravel criado e conectado ao MariaDB local (banco `ministre`). Projeto Expo criado com Expo Router e TypeScript. O app abre no meu celular mostrando uma tela "Ministre" no fundo escuro e consegue chamar `GET /api/v1/health`.
- **Etapa 1: Design system.** `tokens.ts` com as cores, tipografia e espaçamentos da especificação (seção 3); a fonte Figtree carregada; todos os componentes da seção 3.3 (Button com a animação de confirmar e a vibração, Card, Pill, Avatar e AvatarStack, DateBadge, Segmented com indicador deslizante, QuickAction, ListRow, EventRow, WeekStrip, BottomSheet, Skeleton, EmptyState, IconButton). A **TabBar** com o botão + central que gira e abre o painel "O que você quer fazer?". Uma tela interna `/_catalogo` mostrando todos os componentes para eu conferir com o design.
- **Etapa 2: Contas e ministério (API + app).** Banco completo (migrations da seção 6), cadastro, login, esqueci a senha, onboarding (criar ministério ou entrar com convite), permissões de líder e membro (Policies), convites por código e link, seed de demonstração (seção 8). Testes Pest de autenticação e permissões.
- **Etapa 3: Escalas.** Telas **Início**, **Agenda** e **Escala** (abas Equipe, Repertório e Roteiro) idênticas ao design; confirmar e "Não posso"; **Nova escala** em 3 passos com o bloqueio de quem está indisponível; publicar, editar, duplicar; **Indisponibilidade**; "Lembrar pendentes". Testes das regras de escala.
- **Etapa 4: Repertório e Modo Palco.** Lista e detalhe de músicas; editor ChordPro com pré-visualização; transposição; **Modo Palco** com rolagem automática, tela sempre acesa, deslizar entre músicas e cache offline.
- **Etapa 5: Avisos e notificações.** Avisos com push e contador de leitura; central de notificações; push pelo Expo; lembretes automáticos pelo agendador (2 dias antes, no dia, resumo semanal do líder); preferências de notificação.
- **Etapa 6: Perfil e Gestão.** Perfil, foto, seletor de ministério, estatísticas, **excluir conta**; Gestão do ministério (membros, funções, tipos de culto, dados do ministério, indisponibilidades da equipe).
- **Etapa 7: Produção.** Me guie passo a passo, com comandos prontos para PowerShell, para: colocar a API na minha VPS Windows/XAMPP com VirtualHost e **HTTPS** (win-acme); proteger o MariaDB e o phpMyAdmin; rodar o agendador; `scripts/deploy.ps1`; **`scripts/backup/backup-db.ps1`** (dump diário criptografado, 30 dias de retenção, cópia fora da VPS) e **`restore-db.ps1`**, e **testar a restauração** comigo; configurar o EAS e gerar os builds de Android e iOS.

## Como falar comigo
- Sempre em **português**, de forma simples: não sou programador.
- Quando eu precisar fazer algo (instalar um programa, criar uma conta, rodar um comando, testar no celular), me dê o passo a passo numerado e os comandos prontos para copiar.
- Se algo na especificação estiver confuso ou parecer errado, pergunte antes de seguir.

Pode começar pela leitura dos arquivos e pelo passo "Antes de escrever qualquer código".

=====
