import { createFileRoute } from '@tanstack/react-router'
import path from 'node:path'

// Echte Club-Bilder (Logo, Motive, Artikel) liegen nicht im öffentlichen Repo,
// sondern in einem Ordner, der im Deployment als Volume hängt. Lokal ist das
// ./club-assets (gitignored). Fehlt eine Datei, antwortet die Route mit 404 und
// die UI zeigt ihren Platzhalter.
const ASSETS_DIR = path.resolve(process.env.CLUB_ASSETS_DIR ?? './club-assets')

export const Route = createFileRoute('/club-assets/$')({
  server: {
    handlers: {
      GET: async ({ params }) => {
        const file = path.resolve(ASSETS_DIR, params._splat ?? '')
        if (!file.startsWith(ASSETS_DIR + path.sep)) {
          return new Response('Not found', { status: 404 })
        }
        const blob = Bun.file(file)
        if (!(await blob.exists())) {
          return new Response('Not found', { status: 404 })
        }
        return new Response(blob, {
          headers: { 'Cache-Control': 'public, max-age=3600' },
        })
      },
    },
  },
})
