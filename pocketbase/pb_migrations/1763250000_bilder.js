/// <reference path="../pb_data/types.d.ts" />

// Bilder zu Veranstaltungen (Spec #17). Alle Mitglieder sehen sie und laden
// welche hoch, aber nur zu Veranstaltungen, die begonnen haben und nicht
// abgesagt sind. Löschen darf das Mitglied sein eigenes Bild, ein Admin jedes.
// Ändern darf niemand. Wechselt die Art des Termins weg von Veranstaltung,
// sind die Bilder ausgeblendet, bleiben aber gespeichert.
const ADMIN = '(@request.auth.admin = true || @request.auth.support = true)'
const ANGEMELDET = "@request.auth.collectionName = 'mitglieder'"
const VERANSTALTUNG = "termin.art = 'veranstaltung'"

migrate(
  (app) => {
    const termine = app.findCollectionByNameOrId('termine')
    const mitglieder = app.findCollectionByNameOrId('mitglieder')

    const bilder = new Collection({
      type: 'base',
      name: 'bilder',
      listRule: `${ANGEMELDET} && ${VERANSTALTUNG}`,
      viewRule: `${ANGEMELDET} && ${VERANSTALTUNG}`,
      createRule: [
        ANGEMELDET,
        'mitglied = @request.auth.id',
        VERANSTALTUNG,
        'termin.abgesagt = false',
        'termin.beginn <= @now',
      ].join(' && '),
      updateRule: null,
      deleteRule: `${ANGEMELDET} && ${VERANSTALTUNG} && (mitglied = @request.auth.id || ${ADMIN})`,
    })
    // Ein Termin mit Bildern lässt sich nicht löschen, ebenso ein Mitglied:
    // Gelöscht wird nur, was falsch angelegt wurde.
    bilder.fields.add(
      new RelationField({
        name: 'termin',
        collectionId: termine.id,
        required: true,
        maxSelect: 1,
      }),
    )
    bilder.fields.add(
      new RelationField({
        name: 'mitglied',
        collectionId: mitglieder.id,
        required: true,
        maxSelect: 1,
      }),
    )
    bilder.fields.add(
      new FileField({
        name: 'datei',
        required: true,
        maxSelect: 1,
        maxSize: 10 * 1024 * 1024,
        mimeTypes: ['image/jpeg', 'image/png', 'image/webp'],
        thumbs: ['400x400'],
        protected: true,
      }),
    )
    bilder.fields.add(
      new AutodateField({ name: 'created', onCreate: true, onUpdate: false }),
    )
    bilder.addIndex('idx_bilder_termin', false, 'termin', '')
    app.save(bilder)
  },
  (app) => {
    app.delete(app.findCollectionByNameOrId('bilder'))
  },
)
