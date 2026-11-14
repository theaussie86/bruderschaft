import { createFileRoute } from '@tanstack/react-router'

// Für den start-first-Rollout in Dokploy: antwortet, sobald der Server läuft.
export const Route = createFileRoute('/api/health')({
  server: {
    handlers: {
      GET: () => Response.json({ ok: true }),
    },
  },
})
