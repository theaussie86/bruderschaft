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

// Ein Protokoll gehört nur zum Stammtisch. Wechselt die Art, bleibt es
// gespeichert, ist aber weder im Datensatz noch als Datei zu sehen, bis die
// Art zurückgeändert wird.
onRecordEnrich((e) => {
  if (e.record.get('art') !== 'stammtisch') e.record.hide('protokoll')
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
