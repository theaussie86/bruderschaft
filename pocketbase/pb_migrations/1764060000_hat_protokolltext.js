/// <reference path="../pb_data/types.d.ts" />

// Ob ein Stammtisch geschriebenen Protokolltext hat (Spec #62, #66). Den Wert
// setzt termine.pb.js bei jeder Speicherung, damit der Archiv-Filter nicht das
// ganze Dokument durchsuchen muss. Ein leeres Dokument zählt nicht. Ein
// Nachtragen alter Datensätze braucht es nicht, der Protokolltext kommt im
// selben Release.
migrate(
  (app) => {
    const termine = app.findCollectionByNameOrId('termine')
    termine.fields.add(new BoolField({ name: 'hat_protokolltext' }))
    app.save(termine)
  },
  (app) => {
    const termine = app.findCollectionByNameOrId('termine')
    termine.fields.removeByName('hat_protokolltext')
    app.save(termine)
  },
)
