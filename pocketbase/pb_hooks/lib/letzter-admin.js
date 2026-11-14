// Wer als Admin zählt, wenn es darum geht, dass immer einer bleibt.
function zaehltAlsAdmin(mitglied) {
  return (
    mitglied.getBool('admin') &&
    mitglied.verified() &&
    !mitglied.getBool('gesperrt') &&
    !mitglied.getBool('ehemalig') &&
    !mitglied.getBool('support')
  )
}

// Gibt es außer diesem Mitglied keinen Admin mehr?
function letzterAdmin(app, id) {
  const andere = app.findRecordsByFilter(
    'mitglieder',
    'admin = true && verified = true && gesperrt = false && ehemalig = false && support = false && id != {:id}',
    '',
    1,
    0,
    { id },
  )
  return andere.length === 0
}

module.exports = { zaehltAlsAdmin, letzterAdmin }
