import { createFileRoute } from '@tanstack/react-router'

import { pbProxy } from '@/lib/pb-proxy'
import { POCKETBASE_URL } from '@/lib/pocketbase'

// Der Browser spricht PocketBase nur hierüber an (ADR 0003).
export const Route = createFileRoute('/pb/$')({
  server: {
    handlers: {
      ANY: ({ request }) => pbProxy(request, POCKETBASE_URL),
    },
  },
})
