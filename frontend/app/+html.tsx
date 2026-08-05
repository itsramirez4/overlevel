import { ScrollViewStyleReset } from 'expo-router/html';
import { type PropsWithChildren } from 'react';

/**
 * `viewport-fit=cover` is what lets the browser expose the
 * `env(safe-area-inset-*)` values that `useSafeAreaInsets()` reads on web —
 * without it, mobile browsers report zero inset even on phones with a
 * bottom gesture bar, and fixed-height UI (like the tab bar) gets clipped.
 */
export default function Root({ children }: PropsWithChildren) {
  return (
    <html lang="es">
      <head>
        <meta charSet="utf-8" />
        <meta httpEquiv="X-UA-Compatible" content="IE=edge" />
        <meta
          name="viewport"
          content="width=device-width, initial-scale=1, shrink-to-fit=no, viewport-fit=cover"
        />
        <ScrollViewStyleReset />
      </head>
      <body>{children}</body>
    </html>
  );
}
