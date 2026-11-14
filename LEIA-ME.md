# Kit de reconstrução do Ministre: como usar

Este kit tem tudo o que o Claude do VS Code precisa para recriar o Ministre:

```
ministre-kit/
├─ LEIA-ME.md               ← este arquivo (para você)
├─ PROMPT_INICIAL.md        ← o texto que você cola no Claude do VS Code
├─ CLAUDE.md                ← regras do projeto (o Claude lê sozinho)
└─ docs/
   ├─ ESPECIFICACAO.md      ← o app inteiro descrito: telas, banco, API, servidor e backup
   └─ design/               ← o design que sobrou (telas e apresentação)
```

## Passo a passo

1. **Instale no seu computador** (se ainda não tiver):
   - VS Code com a extensão **Claude Code** e login na sua conta Claude;
   - **Git** (git-scm.com) e **Node.js LTS** (nodejs.org);
   - **XAMPP** (o mesmo da VPS) e **Composer** (getcomposer.org), apontando para `C:\xampp\php\php.exe` na instalação;
   - no celular, o app **Expo Go** (App Store ou Google Play).
2. **Clone o seu repositório do GitHub** numa pasta, por exemplo `C:\projetos\ministre`.
3. **Copie o conteúdo deste kit** (não a pasta `ministre-kit` em si, e sim o que está dentro dela) para a raiz dessa pasta. O `CLAUDE.md` precisa ficar na raiz.
4. Abra a pasta no **VS Code**, abra o painel do Claude, copie o texto de `PROMPT_INICIAL.md` (entre as linhas `=====`) e cole.
5. O Claude vai ler tudo, conferir as ferramentas, mostrar o plano e **esperar a sua aprovação**. Depois ele trabalha **uma etapa por vez** e para no fim de cada uma para você testar no celular.
6. Para avançar, responda **"pode seguir"**. Se algo não ficou como no design, descreva o problema ou mande um print.

## Dicas
- Deixe o **XAMPP (Apache e MySQL) ligado** enquanto desenvolve.
- O celular e o computador precisam estar **na mesma rede Wi-Fi** para o Expo Go funcionar.
- Se a conversa com o Claude ficar muito longa entre etapas, abra uma conversa nova e diga: *"Leia CLAUDE.md e docs/ESPECIFICACAO.md, veja o git log e continue da Etapa N."*
- O Claude nunca deve subir senhas ou o arquivo `.env` para o GitHub. Se ele sugerir isso, recuse.

## Decisões que ainda são suas
- O **domínio** da API (ex.: `api.ministre.com.br`). É necessário para o HTTPS, que o iPhone exige.
- O **identificador do app** nas lojas (sugestão: `br.com.ministre.app`).
- As contas de **Apple Developer** (US$ 99 por ano) e **Google Play** (US$ 25, pagos uma vez). Só são necessárias na Etapa 7; até lá o teste é pelo Expo Go.
