import type { AuftragStatus } from '@/lib/auftrag'

// Übersicht der Runde für Admins (Spec #17): wer hat nichts eingetragen, wer
// ist in Arbeit, fertig oder hat verzichtet, und wer hat bezahlt.

export type Stand = 'leer' | 'in_arbeit' | 'fertig' | 'verzicht'

export const STAND_TEXT: Record<Stand, string> = {
  leer: 'nichts eingetragen',
  in_arbeit: 'in Arbeit',
  fertig: 'fertig',
  verzicht: 'Verzicht',
}

type UebersichtMitglied = {
  id: string
  name: string
  gesperrt: boolean
  support: boolean
}

type UebersichtAuftrag = {
  id: string
  mitglied: string
  status: AuftragStatus
  anmerkung: string
  bezahlt: boolean
}

// Ein angelegter Auftrag ohne Positionen und Anmerkung ist so gut wie nichts
// eingetragen, z. B. wenn das Mitglied seine einzige Position wieder löscht.
export function auftragsStand(
  auftrag: Pick<UebersichtAuftrag, 'status' | 'anmerkung'> | null,
  anzahlPositionen: number,
): Stand {
  if (!auftrag) return 'leer'
  if (auftrag.status === 'fertig' || auftrag.status === 'verzicht')
    return auftrag.status
  return anzahlPositionen > 0 || auftrag.anmerkung.trim() ? 'in_arbeit' : 'leer'
}

// Alle nicht gesperrten Mitglieder, dazu gesperrte mit Auftrag (ausgetreten),
// nie das Support-Konto. Sortiert nach Name.
export function uebersichtZeilen<
  TMitglied extends UebersichtMitglied,
  TAuftrag extends UebersichtAuftrag,
>(
  mitglieder: Array<TMitglied>,
  auftraege: Array<TAuftrag>,
  positionenProAuftrag: Record<string, number>,
) {
  return mitglieder
    .filter((m) => !m.support)
    .map((m) => ({
      mitglied: m,
      auftrag: auftraege.find((a) => a.mitglied === m.id) ?? null,
    }))
    .filter(({ mitglied, auftrag }) => !mitglied.gesperrt || auftrag)
    .sort((x, y) => x.mitglied.name.localeCompare(y.mitglied.name, 'de'))
    .map(({ mitglied, auftrag }) => ({
      mitglied,
      auftrag,
      stand: auftragsStand(
        auftrag,
        auftrag ? (positionenProAuftrag[auftrag.id] ?? 0) : 0,
      ),
      bezahlt: auftrag?.bezahlt ?? false,
      ausgetreten: mitglied.gesperrt,
      anmerkung: !!auftrag?.anmerkung.trim(),
    }))
}
