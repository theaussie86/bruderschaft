// Ausblenden, Löschen und Kopieren im Sortiment (Spec #17). Liegt hier, weil
// Handler in pb_hooks keine Funktionen der eigenen Datei sehen.

// Ist der Datensatz neu oder hat sich das Feld geändert? Nur dann zählt, ob
// das Gewählte noch eingeblendet ist; Bestehendes bleibt gültig.
function neuGewaehlt(record, feld) {
  return (
    !!record.getString(feld) &&
    (record.isNew() ||
      record.original().getString(feld) !== record.getString(feld))
  )
}

// Wirft, wenn der gewählte Datensatz ausgeblendet ist. Unbekannte IDs meldet
// die Relationsprüfung von PocketBase.
function eingeblendetPruefen(app, record, feld, collection, text) {
  const abgelehnt = require(`${__hooks}/lib/abgelehnt.js`)
  if (!neuGewaehlt(record, feld)) return
  let gewaehlt = null
  try {
    gewaehlt = app.findRecordById(collection, record.getString(feld))
  } catch {
    return
  }
  if (gewaehlt.getBool('ausgeblendet'))
    throw abgelehnt(feld, 'nicht_verfuegbar', text)
}

// Wo ein Sortiments-Datensatz in Aufträgen steckt, aus allen Runden.
const VERWENDUNG = {
  artikel: ['positionen', 'artikel'],
  groessen: ['positionen', 'groesse'],
  druckstellen: ['belegungen', 'druckstelle'],
  motive: ['belegungen', 'motiv'],
}

function bestellt(app, record) {
  const [collection, feld] = VERWENDUNG[record.collection().name]
  return (
    app.findRecordsByFilter(collection, `${feld} = {:id}`, '', 1, 0, {
      id: record.id,
    }).length > 0
  )
}

// Ein Datensatz mit denselben Feldern wie das Original, ohne ID und Dateien.
function kopie(app, original, felder) {
  const neu = new Record(original.collection())
  for (const feld of original.collection().fields) {
    const name = feld.getName()
    if (name === 'id' || feld.type() === 'file' || feld.type() === 'autodate')
      continue
    neu.set(name, original.get(name))
  }
  for (const name of Object.keys(felder)) neu.set(name, felder[name])
  return neu
}

// Die Datei eines Datensatzes als neue Datei, damit die Kopie ihre eigene hat
// und das Löschen des Originals sie nicht mitnimmt.
function dateiKopie(app, record, feld) {
  const name = record.getString(feld)
  if (!name) return null
  const fsys = app.newFilesystem()
  try {
    const reader = fsys.getReader(`${record.baseFilesPath()}/${name}`)
    try {
      return $filesystem.fileFromBytes(toBytes(reader), name)
    } finally {
      reader.close()
    }
  } finally {
    fsys.close()
  }
}

module.exports = { eingeblendetPruefen, bestellt, kopie, dateiKopie }
