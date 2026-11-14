/// <reference path="../pb_data/types.d.ts" />

// Kalender-Abo (Spec #17): ein gemeinsamer geheimer Token in `einstellungen`.
// Mitglieder lesen ihn, um den Abo-Link zu kopieren. Ändern kann ihn niemand
// über die Collection, nur die Hook-Route "erneuern" (kalender.pb.js), damit
// immer ein zufälliger Token entsteht.
const TOKEN_GESPERRT = '@request.body.kalender_token:isset = false'

migrate(
  (app) => {
    const einstellungen = app.findCollectionByNameOrId('einstellungen')
    einstellungen.fields.add(
      new TextField({ name: 'kalender_token', max: 100 }),
    )
    einstellungen.updateRule = `${einstellungen.updateRule} && ${TOKEN_GESPERRT}`
    app.save(einstellungen)

    for (const record of app.findAllRecords('einstellungen')) {
      record.set('kalender_token', $security.randomString(40))
      app.save(record)
    }
  },
  (app) => {
    const einstellungen = app.findCollectionByNameOrId('einstellungen')
    einstellungen.updateRule = einstellungen.updateRule.replace(
      ` && ${TOKEN_GESPERRT}`,
      '',
    )
    einstellungen.fields.removeByName('kalender_token')
    app.save(einstellungen)
  },
)
