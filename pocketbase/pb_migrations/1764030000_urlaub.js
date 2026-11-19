/// <reference path="../pb_data/types.d.ts" />

// Urlaub als dritte Art von Termin (siehe GLOSSARY.md): gemeinsame mehrtägige
// Fahrten der Bruderschaft. Bilder gibt es dazu wie bei einer Veranstaltung.
// Dass ein Urlaub ein Ende hat, prüft pb_hooks/termine.pb.js.
const NUR_VERANSTALTUNG = "termin.art = 'veranstaltung'"
const MIT_URLAUB = "(termin.art = 'veranstaltung' || termin.art = 'urlaub')"
const REGELN = ['listRule', 'viewRule', 'createRule', 'deleteRule']

function bilderRegeln(app, von, nach) {
  const bilder = app.findCollectionByNameOrId('bilder')
  for (const regel of REGELN) bilder[regel] = bilder[regel].replace(von, nach)
  app.save(bilder)
}

migrate(
  (app) => {
    const termine = app.findCollectionByNameOrId('termine')
    termine.fields.getByName('art').values = [
      'stammtisch',
      'veranstaltung',
      'urlaub',
    ]
    app.save(termine)
    bilderRegeln(app, NUR_VERANSTALTUNG, MIT_URLAUB)
  },
  (app) => {
    bilderRegeln(app, MIT_URLAUB, NUR_VERANSTALTUNG)
    const termine = app.findCollectionByNameOrId('termine')
    termine.fields.getByName('art').values = ['stammtisch', 'veranstaltung']
    app.save(termine)
  },
)
