/// <reference path="../pb_data/types.d.ts" />

// Protokolle an Stammtischen (Spec #17): eine oder mehrere Dateien (PDF oder
// Foto) am Termin, ohne Aufbereitung. Schreiben dürfen wie bei allen
// Termin-Feldern nur Admins, lesen alle Mitglieder über den Proxy. Ist der
// Termin kein Stammtisch, blendet termine.pb.js das Protokoll aus.
migrate(
  (app) => {
    const termine = app.findCollectionByNameOrId('termine')
    termine.fields.add(
      new FileField({
        name: 'protokoll',
        maxSelect: 20,
        maxSize: 20 * 1024 * 1024,
        mimeTypes: [
          'application/pdf',
          'image/jpeg',
          'image/png',
          'image/webp',
          'image/heic',
          'image/heif',
        ],
        protected: true,
      }),
    )
    app.save(termine)
  },
  (app) => {
    const termine = app.findCollectionByNameOrId('termine')
    termine.fields.removeByName('protokoll')
    app.save(termine)
  },
)
