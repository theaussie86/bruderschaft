/// <reference path="../pb_data/types.d.ts" />

// Die Bruderschaft ist kein Club (siehe GLOSSARY.md). Der Starttext wird nur
// ersetzt, solange er noch der ursprüngliche Vorgabetext ist - was ein Admin
// selbst geschrieben hat, bleibt stehen.
const ALT = 'Die Mitglieder-App des Clubs. Zugänge vergibt der Club.'
const NEU =
  'Die Mitglieder-App der Bruderschaft. Zugänge vergibt die Bruderschaft.'

function ersetze(app, von, nach) {
  const records = app.findAllRecords('startseite')
  for (const record of records) {
    if (record.getString('text') !== von) continue
    record.set('text', nach)
    app.save(record)
  }
}

migrate(
  (app) => ersetze(app, ALT, NEU),
  (app) => ersetze(app, NEU, ALT),
)
