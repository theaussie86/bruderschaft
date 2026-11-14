// Fehler mit Feldmeldung, wie ihn die App als Formularfehler anzeigt. Liegt
// hier, weil Handler in pb_hooks keine Funktionen der eigenen Datei sehen.
module.exports = function abgelehnt(feld, code, text) {
  return new BadRequestError(text, { [feld]: new ValidationError(code, text) })
}
