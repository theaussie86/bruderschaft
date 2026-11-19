// Fakten zur Rocknacht Ottobeuren für die öffentliche Startseite. Quellen:
// Ottobeuren Life 07/2026 (Marktgemeinde), Kurier-Verlag 23.08.2026,
// rock-heavensgate.de. Steht der Termin 2027 fest, hier eintragen.

export const ROCKNACHT = {
  name: 'Rocknacht Ottobeuren',
  veranstalter: 'Rocknacht - Ottobeuren GbR',
  naechste: {
    jahr: 2027,
    // null, solange kein Termin bekannt ist
    datum: null as string | null,
  },
  letzte: {
    jahr: 2026,
    auflage: 'Zweite Auflage',
    datum: 'Samstag, 18. Juli 2026',
    einlass: '19:00',
    beginn: '20:00',
    bands: ['Flipside', 'Heavens Gate', 'Obacht'],
  },
  ort: {
    name: "Bull's Shuttle",
    strasse: 'Stephansrieder Straße 6',
    plz_ort: '87724 Ottobeuren',
    karte:
      'https://www.openstreetmap.org/search?query=Stephansrieder%20Stra%C3%9Fe%206%2C%2087724%20Ottobeuren',
  },
  ab: 18,
  vorverkauf: [
    'Touristikamt Ottobeuren',
    'Tankstelle Maier',
    'Vaddis',
    'Bolz Elektrotechnik',
  ],
  touristikamt: {
    telefon: '08332 9219-50',
    telefonHref: 'tel:+498332921950',
    mail: 'touristikamt@ottobeuren.de',
  },
  premiere: {
    jahr: 2025,
    datum: 'Samstag, 19. Juli 2025',
    bands: ['Flipside', 'HEAReos', 'Crasher'],
    preise: { vorverkauf: 15, abendkasse: 19 },
  },
  zitat: {
    text: 'Die zweite Rocknacht in Ottobeuren verband Generationen und Nationen.',
    quelle: 'Kurier Verlag, August 2026',
  },
  rueckblick:
    'Mehrere Generationen vor einer Bühne, Gäste aus den USA, Spanien, Italien und England, dazu Bands aus der Region. Das Wetter hat gewechselt, die Stimmung nicht.',
  ehrenamt:
    'Getragen von Ehrenamtlichen aus Ottobeuren und der Region, von Firmen, Vereinen und Leuten, die einfach mit anpacken.',
} as const

export const HAHNA_BROTHERS = {
  gegruendet: 1999,
  satz: 'Seit 1999 eine Bruderschaft aus der Region. Bei der Rocknacht in Ottobeuren sind wir mit dabei.',
}
