/// <reference path="../pb_data/types.d.ts" />

// Ein Termin endet nicht vor seinem Beginn (Spec #17), ein Urlaub hat ein Ende.
onRecordValidate((e) => {
  const abgelehnt = require(`${__hooks}/lib/abgelehnt.js`)
  const beginn = e.record.getDateTime('beginn')
  const ende = e.record.getDateTime('ende')
  if (!ende.isZero() && !beginn.isZero() && ende.before(beginn)) {
    throw abgelehnt('ende', 'ende_vor_beginn', 'Das Ende liegt vor dem Beginn.')
  }
  // Ein Urlaub ist mehrtägig und hat deshalb immer ein Ende.
  if (e.record.get('art') === 'urlaub' && ende.isZero()) {
    throw abgelehnt('ende', 'urlaub_ohne_ende', 'Ein Urlaub braucht ein Ende.')
  }
  e.next()
}, 'termine')

// Ändert sich der Protokolltext, hält PocketBase selbst fest, wann. So kann
// niemand einen falschen Zeitpunkt mitschicken. Ob es sichtbaren Text gibt,
// hält hat_protokolltext für den Archiv-Filter fest; auch das bestimmt nur
// PocketBase.
onRecordCreate((e) => {
  // Ein leeres JSON-Feld liest sich als "null".
  const text = e.record.getString('protokolltext')
  e.record.set(
    'protokoll_gespeichert',
    text && text !== 'null' ? new DateTime() : '',
  )
  e.record.set(
    'hat_protokolltext',
    !require(`${__hooks}/lib/protokolltext.js`).leer(text),
  )
  e.next()
}, 'termine')

onRecordUpdate((e) => {
  const alt = e.record.original()
  const text = e.record.getString('protokolltext')
  e.record.set(
    'protokoll_gespeichert',
    text !== alt.getString('protokolltext')
      ? new DateTime()
      : alt.get('protokoll_gespeichert'),
  )
  e.record.set(
    'hat_protokolltext',
    !require(`${__hooks}/lib/protokolltext.js`).leer(text),
  )
  e.next()
}, 'termine')

// Ein Protokoll (Dateien und Text) gehört nur zum Stammtisch. Wechselt die
// Art, bleibt es gespeichert, ist aber weder im Datensatz noch als Datei zu
// sehen, bis die Art zurückgeändert wird.
onRecordEnrich((e) => {
  if (e.record.get('art') !== 'stammtisch') {
    e.record.hide(
      'protokoll',
      'protokolltext',
      'protokoll_gespeichert',
      'hat_protokolltext',
    )
  }
  e.next()
}, 'termine')

onFileDownloadRequest((e) => {
  if (
    e.fileField.name === 'protokoll' &&
    e.record.get('art') !== 'stammtisch'
  ) {
    throw new NotFoundError()
  }
  e.next()
}, 'termine')
