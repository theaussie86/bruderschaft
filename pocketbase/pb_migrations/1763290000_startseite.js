/// <reference path="../pb_data/types.d.ts" />

// Öffentliche Startseite (Spec #17): genau ein Datensatz mit dem Text, den der
// Admin pflegt. Jeder liest ihn, auch ohne Anmeldung; ändern nur Admins.
// Anlegen und Löschen kann niemand, es bleibt bei dem einen Datensatz.
const ADMIN = '(@request.auth.admin = true || @request.auth.support = true)'
const ANGEMELDET = "@request.auth.collectionName = 'mitglieder'"

migrate(
  (app) => {
    const startseite = new Collection({
      type: 'base',
      name: 'startseite',
      listRule: '',
      viewRule: '',
      createRule: null,
      updateRule: `${ANGEMELDET} && ${ADMIN}`,
      deleteRule: null,
    })
    startseite.fields.add(new TextField({ name: 'text', max: 2000 }))
    app.save(startseite)

    const record = new Record(startseite)
    record.set(
      'text',
      'Die Mitglieder-App des Clubs. Zugänge vergibt der Club.',
    )
    app.save(record)
  },
  (app) => {
    app.delete(app.findCollectionByNameOrId('startseite'))
  },
)
