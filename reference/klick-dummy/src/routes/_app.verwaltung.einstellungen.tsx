import { createFileRoute } from '@tanstack/react-router'
import { RefreshCw } from 'lucide-react'
import { AdminPage } from '../components/admin'
import { Button, SectionTitle, notInDummy } from '../components/ui'
import { actions, useApp } from '../mock/store'

export const Route = createFileRoute('/_app/verwaltung/einstellungen')({ component: Einstellungen })

function Einstellungen() {
  const { settings } = useApp()
  return (
    <AdminPage title="Einstellungen">
      <SectionTitle>Zahlungshinweis</SectionTitle>
      <textarea
        className="field min-h-32 leading-relaxed"
        value={settings.paymentHint}
        onChange={(e) => actions.setPaymentHint(e.target.value)}
      />
      <p className="mt-1.5 text-[13px] text-ash">Sehen Mitglieder unter ihrem Auftrag, sobald die Runde abgeschlossen ist. Änderung wirkt sofort.</p>

      <SectionTitle>Text der öffentlichen Startseite</SectionTitle>
      <div className="card p-4 text-[15px] text-ash">{settings.homeText}</div>

      <SectionTitle>Kalender-Abo</SectionTitle>
      <div className="card p-4">
        <div className="mb-3 font-mono text-[13px] break-all text-bone/80">{settings.calendarLink}</div>
        <Button variant="danger" size="sm" onClick={() => notInDummy('Link erneuern')}>
          <RefreshCw className="size-4" /> Neuen Link erzeugen
        </Button>
        <p className="mt-2 text-[13px] text-ash">Der alte Link gilt dann nicht mehr, alle müssen neu abonnieren.</p>
      </div>
    </AdminPage>
  )
}
