import type PocketBase from 'pocketbase'

// Der eine Datensatz der öffentlichen Startseite (Spec #17).
export type Startseite = { id: string; text: string }

export async function ladeStartseite(
  pb: PocketBase,
): Promise<Startseite | null> {
  const liste = await pb.collection('startseite').getList<Startseite>(1, 1)
  return liste.items.at(0) ?? null
}
