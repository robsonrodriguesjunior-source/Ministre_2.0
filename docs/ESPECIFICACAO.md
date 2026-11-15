# Ministre: especificação do produto (v1, Ministério de Louvor)

> Documento-fonte para construir o Ministre do zero. Tudo que o app deve fazer, como deve parecer e como roda no servidor está aqui. Em caso de dúvida, pergunte ao dono do projeto antes de inventar.

---

## 1. O que é o Ministre

Um aplicativo **nativo** (iOS e Android, publicado nas lojas) para organizar as **escalas de um ministério da igreja**. A v1 atende só o **Ministério de Louvor**: quem toca e canta em cada culto, o que vai ser tocado, ensaios, avisos e confirmação de presença.

A referência de mercado é o app *Louve*. O Ministre tem **identidade visual própria** e não pode copiar telas, marca ou textos dele.

**Visão de futuro:** atender todos os departamentos da igreja (Recepção, Infantil, Mídia, Diaconia…). Por isso o modelo de dados já nasce com **Igreja → Ministérios (departamentos) → Membros**, e as funções exclusivas do Louvor (repertório, cifra, Modo Palco) ficam ligadas ao **tipo** do ministério.

### Perfis de acesso (por ministério)
| Papel | Pode |
|---|---|
| **Líder** (`leader`) | Tudo do ministério: criar, editar e publicar escalas; gerenciar membros, funções, tipos de culto e repertório; enviar avisos; lembrar pendentes. |
| **Membro** (`member`) | Ver agenda e escalas, confirmar ou recusar a própria presença, marcar indisponibilidade, ver repertório e cifras, usar o Modo Palco, ler avisos, editar o próprio perfil. |

Uma pessoa pode estar em vários ministérios e igrejas, com papéis diferentes em cada um. O app tem um **seletor de ministério** no Perfil, e o ministério ativo fica salvo.

---

## 2. Arquitetura e stack

```
ministre/
├─ apps/
│  ├─ mobile/      → App nativo: Expo (React Native) + TypeScript + Expo Router
│  └─ api/         → API REST: Laravel 12 (PHP 8.2+) + MySQL/MariaDB (XAMPP)
├─ docs/           → Esta especificação + referências de design
├─ scripts/        → Backup, deploy e utilitários (PowerShell para o Windows)
├─ CLAUDE.md
└─ README.md
```

### App (apps/mobile)
- **Expo SDK estável mais recente** (`npx create-expo-app@latest`), TypeScript estrito, **Expo Router** (rotas por arquivos).
- Estado do servidor: **TanStack Query**. Estado local: **Zustand**. Formulários: **react-hook-form + zod**.
- Animações: **react-native-reanimated** e **react-native-gesture-handler**. Painéis: **@gorhom/bottom-sheet**.
- Nativos: `expo-haptics` (vibração), `expo-notifications` (push), `expo-secure-store` (token), `expo-image-picker` + `expo-image` (fotos), `expo-keep-awake` (Modo Palco), `expo-font` + `@expo-google-fonts/figtree`, `expo-localization`.
- Ícones: **traço fino próprio**, como no design (`stroke-width 1.9`, cantos arredondados). Use `react-native-svg` com os paths de `telas-direcoes.html`; se faltar ícone, use `lucide-react-native`, que tem o mesmo estilo.
- Datas: `date-fns` com locale `pt-BR`; fuso `America/Sao_Paulo`.
- Build e publicação: **EAS Build** e **EAS Submit**; atualizações sem reinstalar via **EAS Update**.
- A URL da API vem de variável (`EXPO_PUBLIC_API_URL`), com um valor para desenvolvimento e outro para produção.

### API (apps/api)
- **Laravel 12**, PHP 8.2+ (o XAMPP atual traz PHP 8.2). Confira com `php -v`. Se a versão for menor, avise antes de continuar.
- Banco: **MariaDB/MySQL do XAMPP**, charset `utf8mb4`, todas as datas em **UTC**.
- Autenticação: **Laravel Sanctum** com tokens de API (Bearer). O app guarda o token no SecureStore.
- Autorização: **Policies** por ministério (líder ou membro). Toda consulta filtra pelo ministério do usuário; ninguém vê dados de outra igreja.
- Fila: driver `database`. Agendador: `schedule:run`, chamado pelo Agendador de Tarefas do Windows a cada minuto.
- Push: **Expo Push API** (`https://exp.host/--/api/v2/push/send`), enviado por jobs na fila.
- Arquivos (fotos de perfil): disco `public` (`storage/app/public`). Imagens redimensionadas para no máximo 512 px.
- Respostas em JSON com **API Resources**, rotas versionadas em `/api/v1`, paginação por cursor nas listas longas.
- Testes: **Pest** (Feature tests) cobrindo autenticação, permissões e as regras de escala.

### Por que essa stack
- O servidor de produção é uma **VPS Windows com XAMPP** (Apache + PHP + MariaDB). Laravel roda nele sem instalar nada além do Composer.
- Expo gera apps **nativos de verdade** para iOS e Android com um código só, e ainda permite atualizar o app sem passar pela loja a cada correção.

---

## 3. Identidade visual (design system)

> **Atualização 2026-11-15: visual "Light" (manual da marca).** A fonte visual agora é `MINISTRE_Light_Especificacao_Claude.docx` (raiz do repositório) e os logos oficiais em `Logo2026/`. Os valores de cor e fonte abaixo (tema escuro, Figtree) ficaram como histórico; os valores em vigor estão em `apps/mobile/src/theme/tokens.ts`: fundo `#FAFAF9`, superfície `#FFFFFF`, marfim `#F5F2E9`, texto forte `#0B1F3B`, texto secundário `#526174`, borda `#E1DDD5`, ação `#B83B10` (texto branco), laranja da marca `#E5571F` (só decoração), destaque suave `#FCEDE5`, sucesso `#166534`/`#EAF6EC`, erro `#B42318`/`#FDECEA`. Fonte **Inter** (400–700). Cards brancos com borda de 1 px, raio 16, sem sombra. "Confirmado" é verde. Logo: componente `Logo` (horizontal, vertical, símbolo), nunca redesenhado. Modo escuro fora desta etapa.

**Fonte principal (histórico, tema escuro):** `docs/design/telas-direcoes.html`. Abra esse arquivo, leia o CSS e reproduza **as mesmas medidas**. As telas do celular nele têm 320 px de largura; use essas medidas como pontos (pt) no React Native.

### 3.1 Tokens de cor (tema escuro, padrão)
Crie `apps/mobile/src/theme/tokens.ts` com exatamente:

| Token | Valor | Uso |
|---|---|---|
| `bg` | `#0C0C0D` | fundo das telas |
| `card` | `#18181A` | cartões, botões redondos, atalhos |
| `card2` | `#222225` | pílula neutra, segmento ativo |
| `line` | `#26262A` | divisórias e bordas |
| `lineStrong` | `#3A3A3F` | borda do botão secundário |
| `tabBar` | `#111113` | fundo da barra de abas |
| `ink` | `#FFFFFF` | texto principal |
| `inkSoft` | `#C9C9CE` | texto secundário em cartão |
| `dim` | `#9B9BA1` | rótulos, metadados |
| `tabInactive` | `#77777D` | abas inativas |
| `orange` | `#F7731C` | **só** ação principal, aba ativa, destaque |
| `orangeSoft` | `rgba(247,115,28,0.14)` | fundo da pílula "Confirmado" |
| `orangeBorder` | `rgba(247,115,28,0.55)` | borda do evento em que você está escalado |
| `onOrange` | `#0C0C0D` | texto sobre laranja |
| `stageBg` | `#050505` | fundo do Modo Palco |

**Regra de ouro:** um botão principal por tela, e só ele é laranja. O resto é preto, branco ou cinza.

Tema claro: **não entra na v1**. Deixe os tokens organizados para permitir um tema claro depois.

### 3.2 Tipografia
- **Uma família só: Figtree** (400, 500, 600, 700, 800).
- Escala: título de tela 28/800 (letter-spacing −0.5); título de cartão 22/800; título de seção 15/700; nome em lista 14/700; corpo 14.5/400; metadado 12.5–13/400 `dim`; rótulo de cartão 12/700 em maiúsculas, letter-spacing 0.7, laranja; pílula 11.5/700; rótulo da aba 10.5/600.
- Cifras no Modo Palco: fonte **monoespaçada** do sistema (Menlo no iOS, monospace no Android), 15/700, laranja.

### 3.3 Componentes (medidas de `telas-direcoes.html`)
| Componente | Especificação |
|---|---|
| `Screen` | fundo `bg`, padding horizontal 16, respeita a safe area |
| `Card` | `card`, raio 22, padding 16 |
| `Button` primário | altura 44, raio 12, `orange`, texto `onOrange` 14.5/700. Ao confirmar: encolhe para 0.96 e volta; o texto sobe e some e entra "✓ Confirmado"; vibração leve |
| `Button` secundário | altura 44, raio 12, borda 1.5 `lineStrong`, texto `ink` |
| `Button` fixo (CTA da tela) | o primário, preso acima da barra de abas (bottom 88), largura total menos 16 de cada lado |
| `IconButton` | círculo 38, `card`; ponto laranja de 7 px no canto quando há notificação |
| `Pill` | raio 20, padding 4×9, 11.5/700. `ok` = `orangeSoft` + `orange` com ✓ · `wait` = `card2` + `dim` · `declined` = `card2` + `dim`, riscado ou com ícone ⊘ |
| `Avatar` | círculo; foto real; sem foto, iniciais sobre tom terroso fixo por usuário. Empilhado: 26 px, borda 2 na cor do fundo, sobreposição −8 |
| `DateBadge` | 56×60, raio 16, `orange`, dia 24/800 e mês 11/800 em maiúsculas, texto `onOrange` |
| `Segmented` | fundo `card`, raio 12, padding 4, 3 opções; indicador `card2` raio 9 que **desliza** (0,25 s) |
| `QuickAction` | quadrado 52, raio 16, `card`, ícone laranja 22, rótulo 11.5/600 abaixo |
| `ListRow` (membro) | avatar 38, nome 14/700, função 12.5 `dim`, pílula à direita, divisória `line` |
| `EventRow` | `card` raio 16 padding 12; coluna de data 46 px (dia da semana 10.5/700 `dim`, dia 20/800); borda `orangeBorder` se você está escalado; opacidade 0.55 se não está |
| `WeekStrip` | 7 colunas; dia selecionado com fundo laranja e raio 14; ponto de 5 px laranja nos dias com evento |
| `TabBar` | altura 72, `tabBar`, borda superior `line`; 4 abas com ícone 22 e rótulo; ativa em laranja; **botão + central** de 50 px, laranja, elevado (−26) com anel de 5 px na cor `bg` |
| `BottomSheet` | `card`, raio 28 no topo, alça de 40×5; fundo escurece para rgba(0,0,0,.62) |
| `Skeleton` | blocos `card` pulsando no formato do conteúdo; nunca tela vazia carregando |
| `EmptyState` | ícone fino, frase curta e uma ação |

### 3.4 Animações (da apresentação, slide "movimento")
| Momento | O que a pessoa vê | Duração |
|---|---|---|
| Confirmar presença | O botão encolhe, vira "Presença confirmada" e o celular vibra de leve | 0,3 s |
| Trocar de aba ou segmento | O indicador desliza até a opção escolhida | 0,25 s |
| Abrir o botão + | O + gira 45° até virar ×, a tela escurece e o painel sobe | 0,35 s |
| Avançar um passo | A tela desliza para o lado e a barra de progresso enche | 0,3 s |
| Carregar dados | Skeleton no formato do conteúdo | até carregar |
| Arrastar música | A música levanta e as outras abrem espaço | 0,2 s |
| Entrada de listas | Itens sobem 20 px com fade, em cascata de 0,15 s | 0,7 s |

Respeite **"Reduzir movimento"** do sistema (`AccessibilityInfo.isReduceMotionEnabled`): as mudanças acontecem igual, só que sem animação.

### 3.5 Acessibilidade e texto
- Todo o texto em **português do Brasil**, frases curtas e diretas, sem jargão.
- Status sempre **por extenso** ("Confirmado", "Pendente", "Não pode"), nunca só uma bolinha colorida.
- Área de toque mínima de 44 pt. Rótulos de acessibilidade em todos os ícones.
- Contraste: texto `dim` só em tamanho ≥ 12.

---

## 4. Navegação

```
(auth)  Boas-vindas → Entrar | Criar conta | Esqueci a senha
        └─ Onboarding: "Entrar com convite" (código/link) | "Criar meu ministério"
(tabs)  Início · Agenda · [ + ] · Músicas · Perfil
pilha   Escala/[id] · Música/[id] · ModoPalco/[escalaId] · Avisos · Aviso/[id]
        Notificações · NovaEscala (modal) · NovoAviso (modal) · NovaMusica (modal)
        Indisponibilidade · Gestão (membros, funções, tipos de culto, ministério)
```

**Botão + central** abre um BottomSheet "O que você quer fazer?" com cartões em grade de 2 colunas (raio 22, borda `line`, ícone laranja, título e subtítulo):
- Líder: **Nova escala** (Montar o próximo culto) · **Novo aviso** (Falar com a equipe) · **Não posso ir** (Marcar indisponibilidade) · **Nova música** (Adicionar ao repertório)
- Membro: **Não posso ir** · **Minhas escalas** (atalho para a Agenda filtrada)

### Onde fica cada função (slide "mapa")
| Função | Onde fica |
|---|---|
| Início | Início, com o cartão do próximo culto |
| Escalas | Agenda |
| Músicas | Músicas (Repertório) + Modo Palco |
| Indisponibilidade | Botão + e Agenda |
| Avisos e notificações | Sino no topo do Início |
| Meu perfil | Perfil |
| Configurações e acessos | Perfil › Gestão do ministério (só líderes) |

---

## 5. Telas (comportamento detalhado)

### 5.1 Boas-vindas / Entrar / Criar conta
- Logo "Ministre" e a frase "As escalas do seu ministério, em ordem." Botões **Entrar** (primário) e **Criar conta** (secundário).
- Entrar: e-mail e senha, "Esqueci a senha" (código de 6 dígitos por e-mail), mostrar/ocultar senha.
- Criar conta: nome, e-mail, celular (opcional), senha, aceite dos Termos e da Política de Privacidade (LGPD).
- Depois do cadastro, o **onboarding** oferece:
  - **Tenho um convite**: digita o código (8 caracteres) ou abre o link `ministre://convite/CODIGO`; escolhe as próprias funções (Vocal, Violão…).
  - **Criar meu ministério**: nome da igreja, cidade, nome do ministério (sugestão "Louvor"), funções pré-marcadas (Ministro, Vocal, Violão, Guitarra, Baixo, Teclado, Bateria, Som, Projeção), tipos de culto pré-marcados (Culto da Família, Culto de Oração, Santa Ceia, Ensaio). Quem cria vira **Líder**.

### 5.2 Início
De cima para baixo:
1. **Cabeçalho:** avatar 40 · "Boa noite," (bom dia, boa tarde ou boa noite pela hora local) com o primeiro nome em 17/800 · sino (IconButton) com ponto laranja se houver não lidas.
2. **Cartão Próximo culto** (próxima escala em que a pessoa está, publicada): rótulo "PRÓXIMO CULTO", pílula `wait` "em N dias" ("hoje", "amanhã"), título, linha com ícone de calendário ("Domingo, 26 de outubro · 19h00"), linha com ícone de música ("Você: Violão"), divisória, avatares empilhados (até 4) + "N pessoas na equipe", e dois botões em grade 1.3fr/1fr: **Confirmar** (primário) e **Não posso** (secundário).
   - Já confirmado: no lugar dos botões, pílula "✓ Presença confirmada" e o link "Mudar resposta".
   - "Não posso" abre um BottomSheet com motivo opcional ("Viagem", "Trabalho", "Saúde", "Outro") e avisa o líder.
   - Sem escala futura: EmptyState "Você não está em nenhuma escala por enquanto."
   - Tocar no cartão abre a Escala.
3. **Atalhos** (4 QuickActions): Escalas → Agenda · Músicas → Repertório · Avisos → lista de avisos · Indisponível → Indisponibilidade.
4. **Esta semana**: lista curta com ensaio, músicas novas no repertório ("4 músicas · 2 novas para você ouvir") e o último aviso, cada um com ícone em quadrado 42 de borda `line` e seta ›.
5. **Último aviso**: título de seção com link "Ver todos" e cartão com avatar do autor, nome, texto em até 2 linhas e há quanto tempo.

Puxar para atualizar. Skeleton no primeiro carregamento.

### 5.3 Agenda
- Título "Agenda" 28/800. Linha do mês ("Outubro 2026") com setas ‹ ›.
- **WeekStrip** da semana atual: deslizar troca de semana; tocar no mês abre um calendário mensal.
- Seções **Esta semana**, **Próxima semana** e **Mais adiante**, com link "Indisponibilidade" à direita do primeiro título.
- Cada evento é um EventRow: escalado com a sua função e a pílula do seu status; não escalado aparece esmaecido com "Você não está escalado"; ensaios também aparecem.
- Filtro no topo: **Todas** / **Só as minhas**.
- Líder: escalas em **rascunho** aparecem com a pílula "Rascunho".
- Escala **Temporária** só aparece para quem está escalado (e para os líderes, com a indicação "Temporária"); a **Oficial** aparece para todos, esmaecida para quem não está escalado.
- O **ensaio** aparece dentro da escala ("Ensaio: sábado, 21 nov · 16h00"), no cartão do próximo culto e em "Esta semana" no Início.

### 5.4 Escala (detalhe)
- Barra: voltar (IconButton) · "Escala" · mais (⋯, só para líder: Editar, Duplicar para outra data, Cancelar culto, Excluir).
- Cabeçalho: DateBadge + título 20/800 + "Domingo · 19h00 · Templo".
- **Segmented: Equipe · Repertório**, que também troca deslizando o dedo. (O Roteiro foi retirado a pedido do dono em 15/11/2026.)
  - **Equipe:** lista de membros por função, com pílulas Confirmado, Pendente ou Não pode. O próprio usuário aparece como "Marcos (você)". CTA fixo: membro pendente vê **Confirmar minha presença**; líder vê **Lembrar N pendentes**, que manda push só para quem não respondeu, no máximo uma vez a cada 6 h.
  - **Repertório:** músicas numeradas (número grande e apagado), nome, "4 min · 72 bpm" e o **tom** num selo de borda laranja. Tocar abre a música no tom da escala. Cada música tem o botão **Ouvir**, que abre no YouTube, Spotify ou Deezer (sem player dentro do app). CTA: **Abrir Modo Palco**. O líder pode reordenar arrastando, tirar músicas e **Adicionar música**: da biblioteca ou uma nova pelo link (ela já fica salva na biblioteca).
  - Observações do líder: campo "Observações para a equipe" no passo 1 da escala; aparece no fim da aba Equipe.
- Observações do líder (texto livre) no fim da aba Equipe.

### 5.5 Nova escala (líder, assistente em 3 passos)
Modal em tela cheia: × para fechar (pergunta se quer descartar), título "Nova escala" e **barra de progresso em 3 segmentos** que enchem em laranja.

1. **Quando vai ser?** Chips de data com as próximas ocorrências dos dias de culto do ministério (DOM 26, QUA 29…) mais "Outra data" (calendário); chips de horário (09h00, 18h00, 19h00, 19h30, Outro). **Quem vê esta escala:** **Escala Oficial** (toda a equipe vê, mesmo quem não está escalado) ou **Escala Temporária** (só quem está escalado vê; os líderes sempre veem). Nome do culto, local (padrão do ministério), **Ensaio** (liga e escolhe o dia, na semana antes do culto, e a hora; o ensaio fica dentro da escala, não é uma escala à parte) e observações. (Tipos de culto e "É ensaio?" foram retirados a pedido do dono em 15/11/2026.)
2. **Quem vai servir?** Uma linha por função do ministério: função à esquerda, pessoa escolhida (avatar + nome) ou "+ Escolher" (borda tracejada laranja). Escolher abre um sheet com os membros que têm aquela função.
   - **Quem marcou indisponibilidade na data não aparece para seleção** e um aviso explica: "**Marina Costa** marcou que não pode neste dia."
   - Quem já está em outra escala no mesmo dia aparece com o aviso "já escalado às 09h00".
   - Uma pessoa pode ocupar mais de uma função (ex.: Vocal + Violão).
3. **O que vamos tocar?** Lista do repertório com checkbox redondo (laranja quando marcado), nome e "Tom G". Busca "Buscar outra música…". As escolhidas podem ser reordenadas e ter o tom trocado para esta escala.

Botão inferior: **Continuar** nos passos 1 e 2 e **Publicar escala** no 3; também há **Salvar rascunho**. Publicar manda push para todos os escalados ("Você foi escalado no Violão · Dom 26 out, 19h") e todos começam como **Pendente**.

Editar uma escala publicada usa o mesmo assistente. Quem for **adicionado** recebe push; quem for **removido** também é avisado.

### 5.6 Indisponibilidade
- Lista das minhas indisponibilidades futuras, com botão **Marcar indisponibilidade**.
- Formulário: dia único ou período (de/até), motivo opcional e "Repetir toda semana" (ex.: toda quarta).
- Se a data já tem escala em que estou: "Você está escalado no Culto de Oração (Qua 29). Quer avisar o líder que não pode?" Marca a escala como **Não pode** e notifica o líder.
- O líder vê, na Gestão, a lista de indisponibilidades da equipe por mês.

### 5.7 Músicas (Repertório)
- Busca no topo e filtros por chips: Todas · Mais tocadas · Novas · por tag (Adoração, Celebração, Ceia…).
- Item: nome 15/600, artista em `dim`, selo do tom, "72 bpm".
- **Música (detalhe):** nome, artista, tom original, BPM, duração, tags, botões **Ouvir no YouTube / Spotify / Deezer** que abrem no lugar de origem (sem player dentro do app), "Tocada N vezes · última em 12 out".
- **Importar pelo link (líder):** colar o link do YouTube, Spotify ou Deezer preenche sozinho **título, cantor e letra** (letra pelo LRCLIB, gratuito; nem toda música é encontrada) e, no Deezer, andamento e duração. Nenhuma plataforma informa o **tom**: ele é escolhido pelo líder. Tudo continua editável e fica salvo. Se o link já estiver na biblioteca, o app avisa em vez de duplicar.
  - **Cifra** renderizada: acorde em mono laranja acima da sílaba e letra em 18/600. Controles: **transpor** (− / tom / +, com preferência ♯ ou ♭), **tamanho da letra** (A− / A+), **só letra** (esconde as cifras).
- **Nova ou editar música (líder):** nome, artista, tom, BPM, duração, tags, links e o editor de cifra em **formato ChordPro** (`[G]Como um rio que [D]desce o monte`, `{c: Refrão}`), com pré-visualização ao vivo. Aceita também colar cifra em "acordes acima da letra" e converte para ChordPro.

### 5.8 Modo Palco
Aberto pela escala (aba Repertório) ou por uma música.
- Fundo `stageBg`, **tela não apaga** (`expo-keep-awake`) e barra de status escondida.
- Topo: "2 de 4" · selos **Tom G** (borda laranja) e **72 bpm** (borda `line`).
- Nome da música 30/800. A letra ocupa a tela com 23/600 e os acordes ficam acima em mono laranja. Seções (REFRÃO, PONTE) aparecem em 12/700 com letter-spacing 2 em `tabInactive`. As bordas de cima e de baixo têm degradê.
- **Rolagem automática** com play/pause num botão central de 72 px laranja. A velocidade padrão é calculada pela duração da música e é ajustável (−/+). A velocidade escolhida fica salva por música.
- Barra de progresso fina laranja. Botões ‹ › e **deslizar para o lado** trocam de música. Embaixo: "Próxima: Fiel em Tudo".
- Tocar na tela mostra e esconde os controles. Transpor e tamanho da letra num menu discreto.
- Funciona **offline**: ao abrir, baixa e guarda em cache todas as músicas da escala.

### 5.9 Avisos e notificações
- **Avisos** (líder escreve): título, texto, "Fixar no topo" e "Enviar push". A lista mostra autor, tempo e "lido por N de M" (só o líder vê).
- **Notificações** (sino): escalado, removido, lembrete de culto, alguém não pode (para o líder), novo aviso, escala alterada. Tocar leva à tela certa (deep link). "Marcar todas como lidas".
- **Lembretes automáticos** (agendador):
  - **2 dias antes** do culto, para quem ainda está Pendente;
  - no **dia do culto**, 3 h antes, para todos os escalados ("Hoje 19h · Culto da Família · Você: Violão");
  - um **resumo semanal** para o líder na segunda às 9h ("3 escalas esta semana, 2 pessoas pendentes").
- Preferências no Perfil: ligar ou desligar cada tipo.

### 5.10 Perfil
- Foto (trocar pela câmera ou galeria), nome, e-mail, celular, **minhas funções** no ministério ativo.
- **Seletor de ministério** quando a pessoa está em mais de um.
- Minhas estatísticas simples: "12 escalas este ano · 92% de presença confirmada".
- Notificações (preferências), Indisponibilidade, Termos e Privacidade, **Sair**.
- **Excluir minha conta** (obrigatório pela Apple e pela LGPD): confirmação digitando "EXCLUIR"; apaga os dados pessoais e anonimiza o histórico de escalas.
- **Gestão do ministério** (só líderes):
  - **Membros:** lista com papel e funções; convidar (gera código e link para compartilhar no WhatsApp); mudar papel (líder ou membro); editar funções; remover.
  - **Funções:** criar, renomear, ordenar e arquivar (Vocal, Violão…).
  - ~~Tipos de culto~~: retirado em 15/11/2026; os chips de data do passo 1 vêm dos **dias de culto** do Ministério.
  - **Ministério:** nome, foto/logo, local padrão, dias de culto.
  - **Indisponibilidades da equipe** por mês.

---

## 6. Modelo de dados (MySQL)

Todas as tabelas têm `id` (bigint), `created_at` e `updated_at`. Use soft delete onde fizer sentido (`songs`, `events`, `ministry_members`).

```
users                 name, email (único), phone?, password, avatar_path?, push_prefs (json), email_verified_at?, deleted_at?
churches              name, city?, slug (único), plan (free|pro), owner_user_id
ministries            church_id, name, type (worship|reception|kids|media|other), default_location?, settings (json)
ministry_members      ministry_id, user_id, role (leader|member), status (active|removed), joined_at   [único: ministry_id+user_id]
positions             ministry_id, name, sort_order, archived_at?          (Vocal, Violão…)
member_positions      ministry_member_id, position_id                       [pivô]
event_types           ministry_id, name, weekday?, default_time?, default_location?, is_rehearsal (bool)
events                ministry_id, event_type_id?, title, starts_at (UTC), ends_at?, location?, notes?,
                      status (draft|published|cancelled), is_rehearsal, created_by, published_at?
event_assignments     event_id, ministry_member_id, position_id, status (pending|confirmed|declined),
                      decline_reason?, responded_at?, reminded_at?          [único: event_id+member+position]
unavailabilities      ministry_member_id, starts_on (date), ends_on (date), reason?, recurrence_weekday?
songs                 ministry_id, title, artist?, original_key, bpm?, duration_sec?, chordpro (longtext),
                      tags (json), links (json), times_played (int), last_played_at?
event_songs           event_id, song_id, sort_order, key (tom nesta escala), notes?
rundown_items         event_id, sort_order, title, planned_time?, duration_min?, responsible_member_id?, notes?
announcements         ministry_id, author_id, title, body, pinned (bool), push_sent_at?
announcement_reads    announcement_id, user_id, read_at
notifications         user_id, ministry_id?, type, title, body, data (json: rota/ids), read_at?
device_tokens         user_id, expo_token (único), platform (ios|android), last_seen_at
invites               ministry_id, code (8, único), role, created_by, expires_at, max_uses?, uses
password_resets       email, code_hash, expires_at
```

Regras importantes:
- **Indisponibilidade bloqueia a escala:** o endpoint de criar ou editar uma atribuição recusa (422) membro indisponível na data, com mensagem clara.
- Ao **publicar**, crie as notificações e enfileire os pushes; rascunhos não notificam.
- `times_played` e `last_played_at` das músicas são atualizados quando o culto passa (job diário).
- Datas e horários: o app manda e recebe ISO 8601 com fuso; a API guarda em UTC.

---

## 7. API REST (`/api/v1`)

Autenticação por `Authorization: Bearer <token>`. O ministério ativo vai no cabeçalho `X-Ministry-Id`, validado contra as participações do usuário.

```
POST   /auth/register | /auth/login | /auth/logout | /auth/forgot | /auth/reset
GET    /me                      PATCH /me        POST /me/avatar      DELETE /me
GET    /me/ministries
POST   /devices                 (registra o token Expo)    DELETE /devices/{token}

POST   /churches                (cria igreja + ministério + funções + tipos padrão)
POST   /invites/{code}/accept   GET /invites/{code}   (prévia: nome da igreja e do ministério)

GET    /home                    (agregado da tela Início: próximo culto, semana, último aviso, não lidas)

GET    /events?from&to&mine     POST /events          GET|PATCH|DELETE /events/{id}
POST   /events/{id}/publish     POST /events/{id}/duplicate     POST /events/{id}/remind-pending
PUT    /events/{id}/assignments (substitui a equipe inteira, valida indisponibilidade)
PUT    /events/{id}/songs       PUT /events/{id}/rundown
POST   /assignments/{id}/confirm    POST /assignments/{id}/decline  {reason?}
GET    /events/availability?date=YYYY-MM-DD   (membros por função com flag indisponível ou já escalado)

GET|POST /unavailabilities      DELETE /unavailabilities/{id}

GET    /songs?q&tag&sort        POST /songs     GET|PATCH|DELETE /songs/{id}

GET    /announcements           POST /announcements     GET|PATCH|DELETE /announcements/{id}
POST   /announcements/{id}/read

GET    /notifications           POST /notifications/read-all    POST /notifications/{id}/read

# Gestão (líder)
GET    /members                 PATCH /members/{id}   DELETE /members/{id}
POST   /invites                 GET /invites          DELETE /invites/{id}
CRUD   /positions   /event-types
PATCH  /ministry
GET    /team-unavailabilities?month=YYYY-MM
```

Erros: JSON `{ "message": "...", "errors": {campo: [...]} }` em português. Rate limit no login (5 tentativas por minuto) e no esqueci a senha.

---

## 8. Dados de exemplo (seed)

Use os nomes do design para o modo de demonstração (`php artisan db:seed --class=DemoSeeder`):
- Igreja "Igreja Exemplo", ministério "Louvor".
- Pessoas: **Marcos** (você, Violão), **Pr. Daniel** (Ministro, líder), **Ana Lima** (Vocal), **João Pedro** (Violão), **Marina Costa** (Teclado, indisponível no domingo), **Lucas Rocha** (Bateria), mais 2 vocais.
- Músicas fictícias com cifra em ChordPro: **Luz da Manhã** (G, 72 bpm, 4 min), **Rio de Graça** (A, 68, 5 min), **Fiel em Tudo** (D, 80, 4 min), **Coroado** (E, 64, 6 min), **Santo Lugar** (C). A letra de "Rio de Graça" está em `docs/design/apresentacao/palco.html`; as outras precisam de letras **inventadas**. Nunca use letra de música real com direitos autorais.
- Escalas: Ensaio geral (sáb 16h), Culto da Família (dom 19h, publicada, 5 de 7 confirmados), Culto de Oração (qua), Santa Ceia (dom seguinte).
- Aviso: Pr. Daniel, "Chegar 30 minutos antes no domingo."

---

## 9. Produção: VPS Windows com XAMPP

### 9.1 API no Apache do XAMPP
- Código em `C:\ministre\` (clone do GitHub). O DocumentRoot do VirtualHost aponta para `C:\ministre\apps\api\public`.
- `httpd-vhosts.conf` com `AllowOverride All` (o `.htaccess` do Laravel precisa de `mod_rewrite` ativo).
- **HTTPS é obrigatório** (o iOS bloqueia HTTP): domínio próprio (ex.: `api.ministre.com.br`, a confirmar) + certificado Let's Encrypt via **win-acme**, com renovação automática; VirtualHost `*:443` no `httpd-ssl.conf`. HTTP redireciona para HTTPS.
- `php.ini`: habilitar `openssl`, `pdo_mysql`, `mbstring`, `fileinfo`, `gd`, `zip`, `curl`; `upload_max_filesize=10M`; OPcache ligado.
- MariaDB: usuário próprio `ministre` com senha forte e acesso só local (**nunca root sem senha**); porta 3306 **fechada** no firewall do Windows. phpMyAdmin bloqueado para acesso externo.
- `.env` de produção: `APP_ENV=production`, `APP_DEBUG=false`, `APP_URL=https://…`, chaves geradas no servidor e **nunca** commitadas.
- Agendador de Tarefas do Windows, a cada 1 minuto: `C:\xampp\php\php.exe C:\ministre\apps\api\artisan schedule:run`. A fila roda dentro do agendador (`queue:work --stop-when-empty`, `withoutOverlapping`).
- Apache e MySQL do XAMPP instalados **como serviços do Windows** para subirem sozinhos após reiniciar.
- Script `scripts/deploy.ps1`: `git pull` → `composer install --no-dev -o` → `php artisan migrate --force` → `config:cache`, `route:cache`, `view:cache` → `storage:link`.

### 9.2 Backups (a lição do sistema perdido)
1. **Código:** tudo no **GitHub** (repositório privado), com push no fim de cada etapa. O servidor só faz `git pull`.
2. **Banco de dados:** `scripts/backup/backup-db.ps1`, agendado **todo dia às 3h**:
   - `mysqldump --single-transaction --routines --triggers ministre` →
   - compacta e **criptografa** com 7-Zip (AES-256, senha lida de um arquivo fora do repositório) →
   - guarda **30 dias** em `C:\ministre-backups\` e **envia uma cópia para fora da VPS**: um **repositório privado separado no GitHub** (`ministre-backups`, só os arquivos `.7z` criptografados) e/ou um bucket ou drive via `rclone`.
   - **Nunca** subir dump sem criptografia: são dados pessoais (LGPD).
3. **Arquivos enviados** (`storage/app/public`): entram no mesmo backup.
4. **Teste de restauração:** `scripts/backup/restore-db.ps1` + um passo a passo no README. Um backup só vale se a restauração tiver sido testada.
5. Registro do resultado de cada backup em `C:\ministre-backups\backup.log`; se falhar, mandar e-mail para o administrador.

### 9.3 App nas lojas
- **EAS Build** gera os binários: `.aab` para a Google Play e `.ipa` para a App Store. Precisa de conta **Apple Developer** (US$ 99 por ano) e **Google Play Console** (US$ 25, pagos uma vez). Para testar antes disso, use o Expo Go ou um *development build*.
- Push no Android exige credenciais do Firebase (FCM) configuradas no EAS; no iOS, a chave APNs (o EAS gera).
- `app.json`/`app.config.ts`: nome "Ministre", `bundleIdentifier`/`package` `br.com.ministre.app` (a confirmar), esquema de deep link `ministre`, ícone e splash no fundo `#0C0C0D` com a marca em branco e laranja.
- Política de privacidade pública numa URL (exigida pelas lojas).

---

## 10. Fora da v1 (não fazer agora, mas não impedir)
- Landing page de venda e contratação, planos e pagamento.
- Outros departamentos (os tipos `reception`, `kids` e `media` já existem no banco).
- Tema claro, versão web, integração com Google Agenda, troca de escala entre membros, chat.

---

## 11. Critérios de pronto da v1
- [ ] Criar conta, criar ministério, convidar membro por link e o membro entrar.
- [ ] Líder cria a escala em 3 passos, indisponível não pode ser escalado, publica e os escalados recebem push.
- [ ] Membro confirma ou recusa pelo Início e pela Escala; o líder vê na hora e consegue lembrar os pendentes.
- [ ] Repertório com cifra ChordPro, transposição e Modo Palco com rolagem automática, funcionando offline.
- [ ] Avisos com push e contador de leitura; lembretes automáticos funcionando.
- [ ] Excluir conta funcionando.
- [ ] Testes da API passando (`php artisan test`); app sem erros de TypeScript (`npx tsc --noEmit`) e lint limpo.
- [ ] API no ar em HTTPS na VPS; backup diário criptografado rodando e **restauração testada**.
- [ ] Builds Android e iOS gerados pelo EAS.
