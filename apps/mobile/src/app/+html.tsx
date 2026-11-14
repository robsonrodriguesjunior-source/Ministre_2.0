import { ScrollViewStyleReset } from 'expo-router/html';
import type { PropsWithChildren } from 'react';

import { colors } from '@/theme/tokens';

// HTML da versão web. É ele que deixa o Ministre "instalável" pelo navegador:
// no iPhone, Compartilhar › Adicionar à Tela de Início; no Android, o próprio navegador oferece instalar.
export default function Root({ children }: PropsWithChildren) {
  return (
    <html lang="pt-BR">
      <head>
        <meta charSet="utf-8" />
        <meta httpEquiv="X-UA-Compatible" content="IE=edge" />
        <meta
          name="viewport"
          content="width=device-width, initial-scale=1, viewport-fit=cover, shrink-to-fit=no"
        />
        <title>Ministre</title>
        <meta name="description" content="As escalas do seu ministério, em ordem." />
        <meta name="theme-color" content={colors.bg} />
        <link rel="manifest" href="/manifest.json" />
        <link rel="icon" type="image/png" href="/app-icons/icon-192.png" />

        {/* iPhone e iPad: abre em tela cheia, como app */}
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-title" content="Ministre" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        <link rel="apple-touch-icon" href="/app-icons/apple-touch-icon.png" />

        <ScrollViewStyleReset />
        <style dangerouslySetInnerHTML={{ __html: `html,body{background-color:${colors.bg};}` }} />
      </head>
      <body>{children}</body>
    </html>
  );
}
