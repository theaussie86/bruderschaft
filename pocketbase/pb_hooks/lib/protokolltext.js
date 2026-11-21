// Regeln zum Protokolltext (Tiptap/ProseMirror-JSON, Spec #62). Dieselben
// Regeln wie protokollTextLeer in src/lib/protokoll.ts und dokumenteGleich in
// src/lib/protokoll-entwurf.ts, die JS-Laufzeit der Hooks kann sie nicht
// importieren.

// roh ist der Feldinhalt, wie ihn record.getString liefert. Ein leeres
// JSON-Feld liest sich als "null".
function lesen(roh) {
  if (!roh) return null
  try {
    return JSON.parse(roh)
  } catch (_) {
    return null
  }
}

function knotenLeer(knoten) {
  if (!knoten || typeof knoten !== 'object') return true
  if (typeof knoten.text === 'string' && knoten.text.trim() !== '') return false
  return (knoten.content || []).every(knotenLeer)
}

// Ein Protokolltext ohne sichtbaren Text gilt als kein Text.
function leer(roh) {
  return knotenLeer(lesen(roh))
}

// Erlaubt ist kein Text oder ein Dokument. Eine Zeichenkette würde der Editor
// als HTML lesen, deshalb nie.
function gueltig(roh) {
  const wert = lesen(roh)
  if (wert === null) return true
  return typeof wert === 'object' && !Array.isArray(wert) && wert.type === 'doc'
}

function geordnet(wert) {
  return JSON.stringify(wert === undefined ? null : wert, (_k, v) => {
    if (!v || typeof v !== 'object' || Array.isArray(v)) return v
    const sortiert = {}
    for (const k of Object.keys(v).sort()) sortiert[k] = v[k]
    return sortiert
  })
}

// Zwei Stände sind gleich, wenn sie dasselbe Dokument beschreiben. Die
// Reihenfolge der Schlüssel zählt nicht, zwei leere Stände sind gleich.
function gleich(rohA, rohB) {
  if (leer(rohA) && leer(rohB)) return true
  return geordnet(lesen(rohA)) === geordnet(lesen(rohB))
}

// Ob der Datensatz einen neuen oder geänderten Protokolltext mitbringt.
function geaendert(record) {
  const alt = record.isNew() ? '' : record.original().getString('protokolltext')
  return !gleich(record.getString('protokolltext'), alt)
}

// Hält fest, wann der Text zuletzt geändert wurde und ob es sichtbaren Text
// gibt. Beides bestimmt nur PocketBase, Mitgeschicktes wird überschrieben.
function festhalten(record) {
  const text = record.getString('protokolltext')
  record.set(
    'protokoll_gespeichert',
    geaendert(record)
      ? new DateTime()
      : record.isNew()
        ? ''
        : record.original().get('protokoll_gespeichert'),
  )
  record.set('hat_protokolltext', !leer(text))
}

module.exports = { leer, gueltig, geaendert, festhalten }
