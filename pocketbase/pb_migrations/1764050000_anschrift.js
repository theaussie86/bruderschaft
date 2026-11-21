/// <reference path="../pb_data/types.d.ts" />

// Anschrift am Mitglied: voller Name, Straße, PLZ, Ort (siehe GLOSSARY.md),
// damit der Schriftführer keine eigene Liste mehr pflegt. Alle Felder sind
// freiwillig. Jedes Mitglied ändert seine eigenen, Admins alle: Die
// updateRule lässt Felder außerhalb der Admin-Liste ohnehin für das Mitglied
// selbst zu (ADR 0002).
const FELDER = [
  { name: 'voller_name', max: 150 },
  { name: 'strasse', max: 150 },
  { name: 'plz', max: 10 },
  { name: 'ort', max: 100 },
]

migrate(
  (app) => {
    const mitglieder = app.findCollectionByNameOrId('mitglieder')
    for (const f of FELDER) mitglieder.fields.add(new TextField(f))
    app.save(mitglieder)
  },
  (app) => {
    const mitglieder = app.findCollectionByNameOrId('mitglieder')
    for (const f of FELDER) mitglieder.fields.removeByName(f.name)
    app.save(mitglieder)
  },
)
