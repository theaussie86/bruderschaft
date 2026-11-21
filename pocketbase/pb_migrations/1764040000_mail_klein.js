/// <reference path="../pb_data/types.d.ts" />

// Bestehende Mails einmalig klein schreiben, passend zum Hook in
// mitglieder.pb.js. Ab jetzt landet keine Großschreibung mehr in der Datenbank.
migrate((app) => {
  for (const m of app.findAllRecords('mitglieder')) {
    const klein = m.email().trim().toLowerCase()
    if (m.email() === klein) continue
    m.setEmail(klein)
    app.saveNoValidate(m)
  }
})
