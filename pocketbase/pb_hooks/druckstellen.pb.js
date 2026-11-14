/// <reference path="../pb_data/types.d.ts" />

// Erlaubte Motive gibt es nur an Motiv-Druckstellen (Spec #17). An einer
// Text-Druckstelle schreibt das Mitglied eigenen Text, eine Motivliste dort
// wäre irreführend.
onRecordValidate((e) => {
  if (
    e.record.getString('art') === 'text' &&
    e.record.getStringSlice('erlaubte_motive').length > 0
  ) {
    throw new BadRequestError(
      'Eine Text-Druckstelle hat keine erlaubten Motive.',
      {
        erlaubte_motive: new ValidationError(
          'text_ohne_motive',
          'Eine Text-Druckstelle hat keine erlaubten Motive.',
        ),
      },
    )
  }
  e.next()
}, 'druckstellen')
