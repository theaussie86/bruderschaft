import { createFileRoute, redirect, useRouter } from '@tanstack/react-router'

import { GeburtstagFormular } from '@/components/GeburtstagFormular'
import { PublicPage } from '@/components/PublicPage'

// Pflichtschritt beim ersten Login: Ohne Geburtstag führt die App hierher,
// bevor das Mitglied sie nutzen kann. Das Support-Konto ist kein Mitglied und
// braucht keinen.
export const Route = createFileRoute('/geburtstag')({
  beforeLoad: ({ context }) => {
    if (!context.mitglied) throw redirect({ to: '/login' })
    if (context.mitglied.geburtstag || context.mitglied.support)
      throw redirect({ to: '/bestellen' })
    return { mitglied: context.mitglied }
  },
  component: Geburtstag,
})

function Geburtstag() {
  const { mitglied } = Route.useRouteContext()
  const router = useRouter()

  return (
    <PublicPage title="Willkommen">
      <p className="text-ash mb-6">
        Hallo {mitglied.name}, bevor es losgeht: Wann hast du Geburtstag? Er
        steht dann im Kalender, mit dem Alter, das du wirst.
      </p>
      <GeburtstagFormular
        mitgliedId={mitglied.id}
        wert=""
        knopf="Weiter"
        hinweis="Mit Jahr. Du kannst ihn später im Profil ändern."
        onGespeichert={async () => {
          await router.invalidate()
          await router.navigate({ to: '/bestellen' })
        }}
      />
    </PublicPage>
  )
}
