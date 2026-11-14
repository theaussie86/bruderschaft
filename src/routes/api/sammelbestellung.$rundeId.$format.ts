import { createFileRoute } from '@tanstack/react-router'

import { POCKETBASE_URL } from '@/lib/pocketbase'
import { sammelbestellungAbrufen } from '@/lib/sammelbestellung-abruf'

// Download der Sammelbestellung als PDF oder Excel, nur für Admins und das
// Support-Konto (Spec #17).
export const Route = createFileRoute('/api/sammelbestellung/$rundeId/$format')({
  server: {
    handlers: {
      GET: ({ request, params }) =>
        sammelbestellungAbrufen(
          request,
          POCKETBASE_URL,
          params.rundeId,
          params.format,
        ),
    },
  },
})
