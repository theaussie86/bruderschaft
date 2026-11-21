// Ein Protokolltext (Tiptap/ProseMirror-JSON) ohne sichtbaren Text gilt als
// kein Text. Dieselbe Regel wie protokollTextLeer in src/lib/protokoll.ts, die
// JS-Laufzeit der Hooks kann sie nicht importieren.
function knotenLeer(knoten) {
  if (!knoten || typeof knoten !== 'object') return true
  if (typeof knoten.text === 'string' && knoten.text.trim() !== '') return false
  return (knoten.content || []).every(knotenLeer)
}

// roh ist der Feldinhalt, wie ihn record.getString liefert. Ein leeres
// JSON-Feld liest sich als "null".
function leer(roh) {
  if (!roh || roh === 'null') return true
  try {
    return knotenLeer(JSON.parse(roh))
  } catch (_) {
    return true
  }
}

module.exports = { leer }
