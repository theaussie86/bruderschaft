/// <reference path="../pb_data/types.d.ts" />

// Bestellrunde, Auftrag und Position (Spec #17). Belegungen der Druckstellen,
// Festpreise, Korrektur, bezahlt und `mitbestellt` kommen mit eigenen Tickets.
//
// Rechte: Alle Mitglieder lesen Bestellrunden, nur Admins eröffnen sie. Den
// Status wechselt niemand direkt, das übernehmen später die Hook-Routen
// Abschließen und Wieder öffnen. Aufträge und Positionen liest und schreibt
// jedes Mitglied nur für sich, Admins für alle, und nur solange die Runde
// offen ist.
const ADMIN = '(@request.auth.admin = true || @request.auth.support = true)'
const ANGEMELDET = "@request.auth.collectionName = 'mitglieder'"

// Ein abgeschickter Auftrag ist für das Mitglied gesperrt, bis es ihn wieder
// öffnet; ein Admin darf ihn weiter ändern. An einem Verzicht hängen nie
// Positionen.
const POSITION_SCHREIBEN = [
  ANGEMELDET,
  "auftrag.runde.status = 'offen'",
  "auftrag.status != 'verzicht'",
  `(${ADMIN} || (auftrag.mitglied = @request.auth.id && auftrag.status = 'in_arbeit'))`,
].join(' && ')

const EIGENER_AUFTRAG = `(mitglied = @request.auth.id || ${ADMIN})`

migrate(
  (app) => {
    const mitglieder = app.findCollectionByNameOrId('mitglieder')
    const artikel = app.findCollectionByNameOrId('artikel')
    const groessen = app.findCollectionByNameOrId('groessen')

    const runden = new Collection({
      type: 'base',
      name: 'bestellrunden',
      listRule: ANGEMELDET,
      viewRule: ANGEMELDET,
      createRule: [
        ANGEMELDET,
        ADMIN,
        "(@request.body.status:isset = false || @request.body.status = 'offen')",
        '@request.body.abgeschlossen_am:isset = false',
      ].join(' && '),
      updateRule: [
        ANGEMELDET,
        ADMIN,
        '@request.body.status:isset = false',
        '@request.body.abgeschlossen_am:isset = false',
      ].join(' && '),
      // Nur falsch angelegte Runden ohne Aufträge, die Relation verhindert
      // alles andere.
      deleteRule: `${ANGEMELDET} && ${ADMIN}`,
    })
    runden.fields.add(new TextField({ name: 'name', required: true, max: 100 }))
    runden.fields.add(new DateField({ name: 'bestelldatum', required: true }))
    runden.fields.add(
      new SelectField({
        name: 'status',
        required: true,
        maxSelect: 1,
        values: ['offen', 'abgeschlossen'],
      }),
    )
    runden.fields.add(new DateField({ name: 'abgeschlossen_am' }))
    runden.fields.add(
      new AutodateField({ name: 'created', onCreate: true, onUpdate: false }),
    )
    runden.addIndex('idx_bestellrunden_status', false, 'status', '')
    app.save(runden)

    const auftraege = new Collection({
      type: 'base',
      name: 'auftraege',
      listRule: `${ANGEMELDET} && ${EIGENER_AUFTRAG}`,
      viewRule: `${ANGEMELDET} && ${EIGENER_AUFTRAG}`,
      createRule: [ANGEMELDET, EIGENER_AUFTRAG, "runde.status = 'offen'"].join(
        ' && ',
      ),
      updateRule: [
        ANGEMELDET,
        EIGENER_AUFTRAG,
        "runde.status = 'offen'",
        '@request.body.runde:isset = false',
        '@request.body.mitglied:isset = false',
      ].join(' && '),
      deleteRule: `${ANGEMELDET} && ${ADMIN} && runde.status = 'offen'`,
    })
    auftraege.fields.add(
      new RelationField({
        name: 'runde',
        collectionId: runden.id,
        required: true,
        maxSelect: 1,
        cascadeDelete: false,
      }),
    )
    auftraege.fields.add(
      new RelationField({
        name: 'mitglied',
        collectionId: mitglieder.id,
        required: true,
        maxSelect: 1,
        cascadeDelete: false,
      }),
    )
    auftraege.fields.add(
      new SelectField({
        name: 'status',
        required: true,
        maxSelect: 1,
        values: ['in_arbeit', 'fertig', 'verzicht'],
      }),
    )
    auftraege.fields.add(new TextField({ name: 'anmerkung', max: 2000 }))
    auftraege.addIndex(
      'idx_auftraege_runde_mitglied',
      true,
      'runde, mitglied',
      '',
    )
    app.save(auftraege)

    const positionen = new Collection({
      type: 'base',
      name: 'positionen',
      listRule: `${ANGEMELDET} && (auftrag.mitglied = @request.auth.id || ${ADMIN})`,
      viewRule: `${ANGEMELDET} && (auftrag.mitglied = @request.auth.id || ${ADMIN})`,
      createRule: POSITION_SCHREIBEN,
      updateRule: `${POSITION_SCHREIBEN} && @request.body.auftrag:isset = false`,
      deleteRule: POSITION_SCHREIBEN,
    })
    // Positionen gehören fest zu ihrem Auftrag. Artikel und Größe verweisen
    // ohne cascadeDelete: Was einmal bestellt wurde, lässt sich nicht mehr
    // löschen.
    positionen.fields.add(
      new RelationField({
        name: 'auftrag',
        collectionId: auftraege.id,
        required: true,
        maxSelect: 1,
        cascadeDelete: true,
      }),
    )
    positionen.fields.add(
      new RelationField({
        name: 'artikel',
        collectionId: artikel.id,
        required: true,
        maxSelect: 1,
        cascadeDelete: false,
      }),
    )
    positionen.fields.add(
      new RelationField({
        name: 'groesse',
        collectionId: groessen.id,
        required: true,
        maxSelect: 1,
        cascadeDelete: false,
      }),
    )
    positionen.fields.add(
      new NumberField({
        name: 'anzahl',
        required: true,
        min: 1,
        onlyInt: true,
      }),
    )
    positionen.fields.add(
      new AutodateField({ name: 'created', onCreate: true, onUpdate: false }),
    )
    positionen.addIndex('idx_positionen_auftrag', false, 'auftrag', '')
    app.save(positionen)
  },
  (app) => {
    app.delete(app.findCollectionByNameOrId('positionen'))
    app.delete(app.findCollectionByNameOrId('auftraege'))
    app.delete(app.findCollectionByNameOrId('bestellrunden'))
  },
)
