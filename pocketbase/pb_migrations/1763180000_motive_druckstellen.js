/// <reference path="../pb_data/types.d.ts" />

// Sortiment: gemeinsame Motivliste und Druckstellen pro Artikel (Spec #17).
// Rechte wie bei Artikeln und Größen: alle Mitglieder lesen, auch
// Ausgeblendetes, nur Admins (inkl. Support-Konto) schreiben. Aufpreise in
// Cent als ganze Zahl.
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
    const motive = new Collection({ type: 'base', name: 'motive', ...RECHTE })
    motive.fields.add(new TextField({ name: 'name', required: true, max: 100 }))
    motive.fields.add(
      new FileField({
        name: 'bild',
        maxSelect: 1,
        maxSize: 10 * 1024 * 1024,
        mimeTypes: ['image/jpeg', 'image/png', 'image/webp'],
        thumbs: ['200x200', '800x0'],
        protected: true,
      }),
    )
    motive.fields.add(new NumberField({ name: 'sortierung', onlyInt: true }))
    motive.fields.add(new BoolField({ name: 'ausgeblendet' }))
    app.save(motive)

    const artikel = app.findCollectionByNameOrId('artikel')
    const druckstellen = new Collection({
      type: 'base',
      name: 'druckstellen',
      ...RECHTE,
    })
    // Wie Größen gehören Druckstellen fest zu ihrem Artikel und gehen mit,
    // wenn ein nie bestellter Artikel gelöscht wird.
    druckstellen.fields.add(
      new RelationField({
        name: 'artikel',
        collectionId: artikel.id,
        required: true,
        maxSelect: 1,
        cascadeDelete: true,
      }),
    )
    druckstellen.fields.add(
      new TextField({ name: 'name', required: true, max: 50 }),
    )
    druckstellen.fields.add(
      new SelectField({
        name: 'art',
        required: true,
        maxSelect: 1,
        values: ['motiv', 'text'],
      }),
    )
    druckstellen.fields.add(new BoolField({ name: 'pflicht' }))
    druckstellen.fields.add(
      new NumberField({ name: 'aufpreis', min: 0, onlyInt: true }),
    )
    druckstellen.fields.add(
      new RelationField({
        name: 'erlaubte_motive',
        collectionId: motive.id,
        maxSelect: 999,
        cascadeDelete: false,
      }),
    )
    druckstellen.fields.add(
      new NumberField({ name: 'sortierung', onlyInt: true }),
    )
    druckstellen.fields.add(new BoolField({ name: 'ausgeblendet' }))
    druckstellen.addIndex('idx_druckstellen_artikel', false, 'artikel', '')
    app.save(druckstellen)
  },
  (app) => {
    app.delete(app.findCollectionByNameOrId('druckstellen'))
    app.delete(app.findCollectionByNameOrId('motive'))
  },
)
