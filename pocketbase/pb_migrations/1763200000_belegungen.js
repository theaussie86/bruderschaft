/// <reference path="../pb_data/types.d.ts" />

// Belegung der Druckstellen einer Position (Spec #17): pro Druckstelle ein
// Motiv oder ein Text. Rechte wie bei Positionen: jedes Mitglied nur für den
// eigenen Auftrag, Admins für alle, nur solange die Runde offen ist und der
// Auftrag nicht abgeschickt.
const ADMIN = '(@request.auth.admin = true || @request.auth.support = true)'
const ANGEMELDET = "@request.auth.collectionName = 'mitglieder'"

const BELEGUNG_SCHREIBEN = [
  ANGEMELDET,
  "position.auftrag.runde.status = 'offen'",
  "position.auftrag.status != 'verzicht'",
  `(${ADMIN} || (position.auftrag.mitglied = @request.auth.id && position.auftrag.status = 'in_arbeit'))`,
].join(' && ')

const BELEGUNG_LESEN = `${ANGEMELDET} && (position.auftrag.mitglied = @request.auth.id || ${ADMIN})`

migrate(
  (app) => {
    const positionen = app.findCollectionByNameOrId('positionen')
    const druckstellen = app.findCollectionByNameOrId('druckstellen')
    const motive = app.findCollectionByNameOrId('motive')

    const belegungen = new Collection({
      type: 'base',
      name: 'belegungen',
      listRule: BELEGUNG_LESEN,
      viewRule: BELEGUNG_LESEN,
      createRule: BELEGUNG_SCHREIBEN,
      updateRule: [
        BELEGUNG_SCHREIBEN,
        '@request.body.position:isset = false',
        '@request.body.druckstelle:isset = false',
      ].join(' && '),
      deleteRule: BELEGUNG_SCHREIBEN,
    })
    // Belegungen gehen mit ihrer Position. Druckstelle und Motiv verweisen
    // ohne cascadeDelete: Was einmal bestellt wurde, lässt sich nicht mehr
    // löschen.
    belegungen.fields.add(
      new RelationField({
        name: 'position',
        collectionId: positionen.id,
        required: true,
        maxSelect: 1,
        cascadeDelete: true,
      }),
    )
    belegungen.fields.add(
      new RelationField({
        name: 'druckstelle',
        collectionId: druckstellen.id,
        required: true,
        maxSelect: 1,
        cascadeDelete: false,
      }),
    )
    belegungen.fields.add(
      new RelationField({
        name: 'motiv',
        collectionId: motive.id,
        maxSelect: 1,
        cascadeDelete: false,
      }),
    )
    belegungen.fields.add(new TextField({ name: 'text', max: 50 }))
    belegungen.addIndex(
      'idx_belegungen_position_druckstelle',
      true,
      'position, druckstelle',
      '',
    )
    app.save(belegungen)

    // Mit Belegungen hängt eine Position an ihrem Artikel. Wer einen anderen
    // Artikel will, legt eine neue Position an.
    positionen.updateRule = `${positionen.updateRule} && @request.body.artikel:isset = false`
    app.save(positionen)
  },
  (app) => {
    const positionen = app.findCollectionByNameOrId('positionen')
    positionen.updateRule = positionen.updateRule.replace(
      ' && @request.body.artikel:isset = false',
      '',
    )
    app.save(positionen)
    app.delete(app.findCollectionByNameOrId('belegungen'))
  },
)
