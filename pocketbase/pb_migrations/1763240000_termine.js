/// <reference path="../pb_data/types.d.ts" />

// Termine im Kalender (Spec #17): Stammtisch oder Veranstaltung, Beginn mit
// Uhrzeit oder ganztägig, optionales Ende. Alle Mitglieder lesen, nur Admins
// (und das Support-Konto) legen an, ändern, sagen ab und löschen. Protokolle
// und Bilder kommen mit eigenen Tickets.
const ADMIN = '(@request.auth.admin = true || @request.auth.support = true)'
const ANGEMELDET = "@request.auth.collectionName = 'mitglieder'"

migrate(
  (app) => {
    const termine = new Collection({
      type: 'base',
      name: 'termine',
      listRule: ANGEMELDET,
      viewRule: ANGEMELDET,
      createRule: `${ANGEMELDET} && ${ADMIN}`,
      updateRule: `${ANGEMELDET} && ${ADMIN}`,
      deleteRule: `${ANGEMELDET} && ${ADMIN}`,
    })
    termine.fields.add(
      new TextField({ name: 'titel', required: true, max: 200 }),
    )
    termine.fields.add(
      new SelectField({
        name: 'art',
        required: true,
        maxSelect: 1,
        values: ['stammtisch', 'veranstaltung'],
      }),
    )
    termine.fields.add(new DateField({ name: 'beginn', required: true }))
    termine.fields.add(new DateField({ name: 'ende' }))
    termine.fields.add(new BoolField({ name: 'ganztaegig' }))
    termine.fields.add(new TextField({ name: 'ort', max: 200 }))
    termine.fields.add(new TextField({ name: 'infotext', max: 5000 }))
    termine.fields.add(new BoolField({ name: 'abgesagt' }))
    termine.fields.add(
      new AutodateField({ name: 'created', onCreate: true, onUpdate: false }),
    )
    termine.addIndex('idx_termine_beginn', false, 'beginn', '')
    app.save(termine)
  },
  (app) => {
    app.delete(app.findCollectionByNameOrId('termine'))
  },
)
