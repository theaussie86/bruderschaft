/// <reference path="../pb_data/types.d.ts" />

// Ein Termin endet nicht vor seinem Beginn (Spec #17).
onRecordValidate((e) => {
  const abgelehnt = require(`${__hooks}/lib/abgelehnt.js`)
  const beginn = e.record.getDateTime('beginn')
  const ende = e.record.getDateTime('ende')
  if (!ende.isZero() && !beginn.isZero() && ende.before(beginn)) {
    throw abgelehnt('ende', 'ende_vor_beginn', 'Das Ende liegt vor dem Beginn.')
  }
  e.next()
}, 'termine')
