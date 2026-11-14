import { createFileRoute } from '@tanstack/react-router'

import { kalenderAboAbrufen } from '@/lib/kalender-abo'
import { POCKETBASE_URL } from '@/lib/pocketbase'

// Kalender-Abo (Spec #17): Kalender-Apps holen hier ohne Anmeldung den
// iCal-Feed, der Token im Pfad entscheidet.
export const Route = createFileRoute('/kalender-abo/$datei')({
  server: {
    handlers: {
      GET: ({ params }) => kalenderAboAbrufen(params.datei, POCKETBASE_URL),
    },
  },
})
