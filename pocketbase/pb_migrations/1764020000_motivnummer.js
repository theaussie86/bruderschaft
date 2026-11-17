/// <reference path="../pb_data/types.d.ts" />

// Motive bekommen eine optionale Nummer. In der Sammelbestellung für den
// Drucker steht dann die kurze Nummer statt des langen Namens.
migrate(
  (app) => {
    const motive = app.findCollectionByNameOrId('motive')
    motive.fields.add(new TextField({ name: 'nummer', max: 20 }))
    app.save(motive)
  },
  (app) => {
    const motive = app.findCollectionByNameOrId('motive')
    motive.fields.removeByName('nummer')
    app.save(motive)
  },
)
