import { createFileRoute } from '@tanstack/react-router'

import { PageHeader } from '@/components/PageHeader'

export const Route = createFileRoute('/_app/kalender')({ component: Kalender })

function Kalender() {
  return <PageHeader title="Kalender" />
}
