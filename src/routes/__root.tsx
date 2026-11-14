import { HeadContent, Outlet, Scripts, createRootRoute } from '@tanstack/react-router'

import appCss from '../styles.css?url'
import { ladeSitzung } from '@/lib/sitzung.functions'

export const Route = createRootRoute({
  // authRefresh bei jedem Laden: verlängert die Sitzung und liefert das
  // angemeldete Mitglied für alle Routen darunter.
  beforeLoad: async () => ({ mitglied: await ladeSitzung() }),
  head: () => ({
    meta: [
      { charSet: 'utf-8' },
      { name: 'viewport', content: 'width=device-width, initial-scale=1, viewport-fit=cover' },
      { name: 'robots', content: 'noindex, nofollow' },
      { name: 'theme-color', content: '#0d0c0b' },
      { name: 'mobile-web-app-capable', content: 'yes' },
      { name: 'apple-mobile-web-app-capable', content: 'yes' },
      { name: 'apple-mobile-web-app-title', content: 'Club-App' },
      { name: 'apple-mobile-web-app-status-bar-style', content: 'black-translucent' },
      { title: 'Club-App' },
    ],
    // Logo-Dateien kommen wie alle Club-Bilder aus club-assets, nicht aus public
    links: [
      { rel: 'stylesheet', href: appCss },
      { rel: 'icon', href: '/club-assets/brand/favicon.ico', sizes: '32x32' },
      { rel: 'icon', href: '/club-assets/brand/logo-icon.svg', type: 'image/svg+xml' },
      { rel: 'apple-touch-icon', href: '/club-assets/brand/apple-touch-icon.png' },
      { rel: 'manifest', href: '/manifest.json' },
    ],
  }),
  shellComponent: RootDocument,
  component: Outlet,
})

function RootDocument({ children }: { children: React.ReactNode }) {
  return (
    <html lang="de">
      <head>
        <HeadContent />
      </head>
      <body>
        {children}
        <Scripts />
      </body>
    </html>
  )
}
