/// <reference path="../pb_data/types.d.ts" />

// Der freie Zahlungshinweis in den Einstellungen wird zur Bankverbindung.
// Betrag, Frist und Verwendungszweck setzt die App selbst zusammen (siehe
// src/lib/zahlungshinweis.ts). Der bisherige Text bleibt erhalten.
migrate(
  (app) => {
    const einstellungen = app.findCollectionByNameOrId('einstellungen')
    einstellungen.fields.getByName('zahlungshinweis').name = 'bankverbindung'
    app.save(einstellungen)
  },
  (app) => {
    const einstellungen = app.findCollectionByNameOrId('einstellungen')
    einstellungen.fields.getByName('bankverbindung').name = 'zahlungshinweis'
    app.save(einstellungen)
  },
)
