/// <reference path="../pb_data/types.d.ts" />

// Ein gesetzter Geburtstag bleibt gesetzt (Spec #17): Die App erzwingt ihn
// beim ersten Login, über die API leeren kann ihn niemand. Die DSGVO-Löschung
// leert ihn mit app.save und läuft nicht durch diesen Request-Hook.
// Geburtstage in der Zukunft sind Tippfehler und werden abgelehnt.
onRecordUpdateRequest((e) => {
  const neu = e.record.getDateTime('geburtstag')
  const alt = e.record.original().getDateTime('geburtstag')

  if (neu.isZero() && !alt.isZero()) {
    throw new BadRequestError('Der Geburtstag lässt sich nicht leeren.', {
      geburtstag: new ValidationError(
        'geburtstag_pflicht',
        'Der Geburtstag lässt sich nicht leeren.',
      ),
    })
  }
  if (!neu.isZero() && neu.after(new DateTime())) {
    throw new BadRequestError('Der Geburtstag liegt in der Zukunft.', {
      geburtstag: new ValidationError(
        'geburtstag_zukunft',
        'Der Geburtstag liegt in der Zukunft.',
      ),
    })
  }
  e.next()
}, 'mitglieder')
