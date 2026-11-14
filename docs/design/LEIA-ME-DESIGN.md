# Referências de design do Ministre

Estes arquivos são o design aprovado. O código do app antigo foi perdido; só o design sobrou.

| Arquivo | O que é | Como usar |
|---|---|---|
| `telas-direcoes.html` | **Fonte principal do visual.** Mostra as telas Início, Escala e Agenda no "modelo tradicional": fundo escuro, laranja nos botões, fonte Figtree. | Abra no navegador. Copie as medidas, cores, raios e espaçamentos do CSS. |
| `apresentacao/*.html` | Slides da proposta "Ministre — Novo Design". Cada slide tem um `<x-embed>` com uma tela animada (HTML/CSS) mais o texto explicando a regra. | Use como fonte para **fluxos e comportamentos**: botão +, Nova escala em 3 passos, aba Repertório, Modo Palco, animações e onde fica cada função. |
| `apresentacao/ordem-dos-slides.json` | Ordem dos slides. | Leia nesta ordem: cover → hoje → conceito → visual → navegacao → inicio → escala → criar → palco → movimento → mapa → proximos. |

## Quando as duas fontes divergirem

`telas-direcoes.html` é a versão mais recente e manda no **visual**: tokens, fonte, barra de abas com rótulos Início · Agenda · (+) · Músicas · Perfil e cartões arredondados.

A apresentação manda nos **fluxos**: painel do +, assistente de nova escala, Modo Palco e tabela de animações.

Nos slides aparecem Sora/DM Sans e laranja `#F97316`. **Ignore isso e use Figtree e `#F7731C`**, que vêm de `telas-direcoes.html`.

Nomes, músicas e letras nas telas são fictícios. Use-os só como dados de exemplo (seed).
