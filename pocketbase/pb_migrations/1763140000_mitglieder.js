/// <reference path="../pb_data/types.d.ts" />

// Mitglieder sind die einzige Auth-Collection der App (GLOSSARY: Mitglied).
// Rechte laut Spec #17: Mitglieder lesen nur sich selbst, Admins alle. "Admin"
// schließt das Support-Konto ein. Schreiben dürfen vorerst nur Admins; die
// Ausnahmen für Passwort und Geburtstag kommen mit den Tickets dazu.
const ADMIN = '(@request.auth.admin = true || @request.auth.support = true)'
const ANGEMELDET = "@request.auth.collectionName = 'mitglieder'"

migrate(
  (app) => {
    const mitglieder = new Collection({
      type: 'auth',
      name: 'mitglieder',
      listRule: `${ANGEMELDET} && (id = @request.auth.id || ${ADMIN})`,
      viewRule: `${ANGEMELDET} && (id = @request.auth.id || ${ADMIN})`,
      createRule: `${ANGEMELDET} && ${ADMIN}`,
      updateRule: `${ANGEMELDET} && ${ADMIN}`,
      deleteRule: `${ANGEMELDET} && ${ADMIN}`,
      // Gesperrte (ausgetretene) Mitglieder kommen nicht mehr hinein, weder
      // beim Login noch beim Verlängern der Sitzung.
      authRule: 'gesperrt = false',
      manageRule: null,
      // 90 Tage angemeldet bleiben, jede Nutzung verlängert (authRefresh).
      authToken: { duration: 90 * 24 * 60 * 60 },
      passwordAuth: { enabled: true, identityFields: ['email'] },
      oauth2: { enabled: false },
      otp: { enabled: false },
      mfa: { enabled: false },
    })

    mitglieder.fields.add(new TextField({ name: 'name', required: true, max: 100 }))
    mitglieder.fields.add(new BoolField({ name: 'admin' }))
    mitglieder.fields.add(new BoolField({ name: 'gesperrt' }))
    mitglieder.fields.add(new BoolField({ name: 'support' }))
    mitglieder.fields.add(new BoolField({ name: 'ehemalig' }))

    app.save(mitglieder)
  },
  (app) => {
    app.delete(app.findCollectionByNameOrId('mitglieder'))
  },
)
