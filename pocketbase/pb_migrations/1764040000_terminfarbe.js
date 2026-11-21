/// <reference path="../pb_data/types.d.ts" />

// Farbe eines Termins (siehe GLOSSARY.md): optional, aus einer festen
// Auswahl, damit der Jahreskalender auf Papier lesbar bleibt. Ohne Farbe
// gilt die der Art. Rot bleibt den Geburtstagen vorbehalten.
migrate(
  (app) => {
    const termine = app.findCollectionByNameOrId('termine')
    termine.fields.add(
      new SelectField({
        name: 'farbe',
        maxSelect: 1,
        values: ['grau', 'gelb', 'blau', 'gruen', 'lila'],
      }),
    )
    app.save(termine)
  },
  (app) => {
    const termine = app.findCollectionByNameOrId('termine')
    termine.fields.removeByName('farbe')
    app.save(termine)
  },
)
