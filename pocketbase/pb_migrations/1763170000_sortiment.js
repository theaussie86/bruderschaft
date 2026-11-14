/// <reference path="../pb_data/types.d.ts" />

// Sortiment: Artikel und ihre Größen (Spec #17). Alle Mitglieder lesen, auch
// Ausgeblendetes, nur Admins (inkl. Support-Konto) schreiben. Preise und
// Aufpreise stehen in Cent als ganze Zahl, damit Summen ohne Rundungsfehler
// aufgehen. Die Reihenfolge des Admins steht in `sortierung` (aufsteigend).
const ADMIN = '(@request.auth.admin = true || @request.auth.support = true)'
const ANGEMELDET = "@request.auth.collectionName = 'mitglieder'"

const RECHTE = {
  listRule: ANGEMELDET,
  viewRule: ANGEMELDET,
  createRule: `${ANGEMELDET} && ${ADMIN}`,
  updateRule: `${ANGEMELDET} && ${ADMIN}`,
  deleteRule: `${ANGEMELDET} && ${ADMIN}`,
}

migrate(
  (app) => {
    const artikel = new Collection({ type: 'base', name: 'artikel', ...RECHTE })
    artikel.fields.add(
      new TextField({ name: 'name', required: true, max: 100 }),
    )
    artikel.fields.add(
      new NumberField({ name: 'preis', min: 0, onlyInt: true }),
    )
    artikel.fields.add(
      new FileField({
        name: 'bild',
        maxSelect: 1,
        maxSize: 10 * 1024 * 1024,
        mimeTypes: ['image/jpeg', 'image/png', 'image/webp'],
        thumbs: ['200x200', '800x0'],
        protected: true,
      }),
    )
    artikel.fields.add(new TextField({ name: 'beschreibung', max: 2000 }))
    artikel.fields.add(new TextField({ name: 'artikelnummer', max: 100 }))
    artikel.fields.add(new NumberField({ name: 'sortierung', onlyInt: true }))
    artikel.fields.add(new BoolField({ name: 'ausgeblendet' }))
    app.save(artikel)

    const groessen = new Collection({
      type: 'base',
      name: 'groessen',
      ...RECHTE,
    })
    // Größen gehören fest zu ihrem Artikel. Wird ein nie bestellter Artikel
    // gelöscht, gehen seine Größen mit.
    groessen.fields.add(
      new RelationField({
        name: 'artikel',
        collectionId: artikel.id,
        required: true,
        maxSelect: 1,
        cascadeDelete: true,
      }),
    )
    groessen.fields.add(
      new TextField({ name: 'name', required: true, max: 50 }),
    )
    groessen.fields.add(
      new NumberField({ name: 'aufpreis', min: 0, onlyInt: true }),
    )
    groessen.fields.add(new NumberField({ name: 'sortierung', onlyInt: true }))
    groessen.fields.add(new BoolField({ name: 'ausgeblendet' }))
    groessen.addIndex('idx_groessen_artikel', false, 'artikel', '')
    app.save(groessen)
  },
  (app) => {
    app.delete(app.findCollectionByNameOrId('groessen'))
    app.delete(app.findCollectionByNameOrId('artikel'))
  },
)
