import { createFileRoute } from '@tanstack/react-router'

import { PageHeader } from '@/components/PageHeader'

export const Route = createFileRoute('/_app/bestellen')({
  component: Bestellen,
})

function Bestellen() {
  return <PageHeader title="Bestellen" />
}
