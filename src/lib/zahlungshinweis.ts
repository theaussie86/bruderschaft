import type { AuftragStatus } from '@/lib/auftrag'
import { tagAnzeigen, tagAus } from '@/lib/bestellung'
import { euro } from '@/lib/geld'

// Der Zahlungshinweis für das Mitglied (siehe GLOSSARY.md): Betrag, Frist,
// Verwendungszweck und die Bankverbindung aus den Einstellungen.
export type Zahlungshinweis = {
  betrag: string
  frist: string // "10.12.2026" oder "zeitnah", wenn das Bestelldatum vorbei ist
  verwendungszweck: string
  bankverbindung: string
}

export function zahlungshinweis(eingabe: {
  auftrag: { status: AuftragStatus; mitbestellt: boolean; bezahlt: boolean }
  rundeOffen: boolean
  rundenname: string
  bestelldatum: string
  summe: number
  mitglied: string
  bankverbindung: string
  heute: string
}): Zahlungshinweis | null {
  const { auftrag } = eingabe
  // Bezahlt wird, was abgeschickt ist, nach dem Abschluss was mitbestellt ist.
  const zahlt = eingabe.rundeOffen
    ? auftrag.status === 'fertig'
    : auftrag.mitbestellt
  const bankverbindung = eingabe.bankverbindung.trim()
  if (!zahlt || auftrag.bezahlt || !bankverbindung || eingabe.summe <= 0)
    return null

  const vorbei = tagAus(eingabe.bestelldatum) < eingabe.heute
  return {
    betrag: euro(eingabe.summe),
    frist: vorbei ? 'zeitnah' : tagAnzeigen(eingabe.bestelldatum),
    verwendungszweck: `${eingabe.mitglied}, ${eingabe.rundenname}`,
    bankverbindung,
  }
}
