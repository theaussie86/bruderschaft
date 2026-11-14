/// <reference path="../pb_data/types.d.ts" />

// Das Sortiment sortiert nach `sortierung,created` (Admin-Reihenfolge, bei
// Gleichstand nach Anlage). Artikel, Größen, Druckstellen und Motive hatten
// kein Feld `created`, PocketBase lehnte die Sortierung ab. Bestehende
// Einträge bekommen den Zeitpunkt der Migration.
const COLLECTIONS = ['artikel', 'groessen', 'druckstellen', 'motive']

migrate(
  (app) => {
    for (const name of COLLECTIONS) {
      const collection = app.findCollectionByNameOrId(name)
      collection.fields.add(
        new AutodateField({ name: 'created', onCreate: true, onUpdate: false }),
      )
      app.save(collection)
      app
        .db()
        .newQuery(`UPDATE ${name} SET created = {:jetzt} WHERE created = ''`)
        .bind({ jetzt: new DateTime().string() })
        .execute()
    }
  },
  (app) => {
    for (const name of COLLECTIONS) {
      const collection = app.findCollectionByNameOrId(name)
      collection.fields.removeByName('created')
      app.save(collection)
    }
  },
)
