/// <reference path="../pb_data/types.d.ts" />

// Die Startseite gehört jetzt der Rocknacht Ottobeuren, der Text aus den
// Einstellungen ist dort der Absatz über die Hahna Brothers. Ersetzt wird nur
// der alte Vorgabetext - was ein Admin selbst geschrieben hat, bleibt stehen.
const ALT =
  'Die Mitglieder-App der Bruderschaft. Zugänge vergibt die Bruderschaft.'
const NEU =
  'Seit 1999 eine Bruderschaft aus der Region. Bei der Rocknacht in Ottobeuren sind wir mit dabei.'

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
