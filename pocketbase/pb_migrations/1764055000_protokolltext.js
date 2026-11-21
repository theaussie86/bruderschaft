/// <reference path="../pb_data/types.d.ts" />

// Geschriebenes Protokoll eines Stammtischs (Spec #62): der Text als
// Tiptap/ProseMirror-JSON, nicht als HTML, und der Zeitpunkt der letzten
// Speicherung, den termine.pb.js setzt. Schreiben dürfen wie bei allen
// Termin-Feldern nur Admins. Ist der Termin kein Stammtisch, blendet
// termine.pb.js beides aus.
migrate(
  (app) => {
    const termine = app.findCollectionByNameOrId('termine')
    termine.fields.add(
      new JSONField({ name: 'protokolltext', maxSize: 1024 * 1024 }),
    )
    termine.fields.add(new DateField({ name: 'protokoll_gespeichert' }))
    app.save(termine)
  },
  (app) => {
    const termine = app.findCollectionByNameOrId('termine')
    termine.fields.removeByName('protokolltext')
    termine.fields.removeByName('protokoll_gespeichert')
    app.save(termine)
  },
)
