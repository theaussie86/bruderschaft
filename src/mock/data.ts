// Mock-Daten für den Klick-Dummy. Alles fiktiv: keine echten Namen, keine
// echten Adressen, keine Lieferantenpreise. Begriffe nach GLOSSARY.md.

export const HEUTE = '2026-11-14'

export const asset = (file: string) => `/club-assets/${file}`

// ---------- Typen ----------

export type MemberStatus = 'aktiv' | 'eingeladen' | 'gesperrt'

export interface Member {
  id: string
  name: string
  email: string
  status: MemberStatus
  admin?: boolean
}

export interface Motif {
  id: string
  name: string
  image: string
  /** Bild auf schwarzem Grund (sonst weißer Grund) */
  dark?: boolean
  hidden?: boolean
}

export interface Size {
  id: string
  label: string
  surcharge: number
}

export interface PrintSpot {
  id: string
  name: string
  kind: 'motiv' | 'text'
  required: boolean
  surcharge: number
  motifIds?: Array<string>
  placeholder?: string
}

export interface Article {
  id: string
  name: string
  price: number
  image?: string
  description?: string
  sizes: Array<Size>
  spots: Array<PrintSpot>
  hidden?: boolean
}

export interface PositionPrint {
  spotId: string
  motifId?: string
  text?: string
}

export interface Position {
  id: string
  articleId: string
  sizeId: string
  prints: Array<PositionPrint>
  qty: number
}

export interface Correction {
  amount: number
  reason: string
}

export interface Order {
  id: string
  roundId: string
  memberId: string
  positions: Array<Position>
  note: string
  done: boolean
  waived: boolean
  paid: boolean
  correction?: Correction
  /** Beim Abschließen weggelassen: nicht in der Sammelbestellung. */
  excluded?: boolean
}

export interface Round {
  id: string
  name: string
  orderDate: string
  status: 'offen' | 'abgeschlossen'
  openedOn: string
  closedOn?: string
}

export type TerminKind = 'Stammtisch' | 'Sitzung' | 'Veranstaltung'

export interface GalleryImage {
  id: string
  src: string
  by: string
}

export interface ProtocolFile {
  name: string
  size: string
}

export interface Termin {
  id: string
  kind: TerminKind
  title: string
  /** ISO-Datum mit Uhrzeit, z. B. 2026-11-20T19:30 */
  start: string
  end?: string
  allDay?: boolean
  place: string
  info: string
  cancelled?: boolean
  images?: Array<GalleryImage>
  protocol?: Array<ProtocolFile>
}

export interface Settings {
  paymentHint: string
  homeText: string
  calendarLink: string
}

// ---------- Mitglieder ----------

export const CURRENT_MEMBER_ID = 'kalle'

export const MEMBERS: Array<Member> = [
  { id: 'kalle', name: 'Kalle', email: 'kalle@example.org', status: 'aktiv', admin: true },
  { id: 'bodo', name: 'Bodo', email: 'bodo@example.org', status: 'aktiv' },
  { id: 'hias', name: 'Hias', email: 'hias@example.org', status: 'aktiv' },
  { id: 'wastl', name: 'Wastl', email: 'wastl@example.org', status: 'aktiv', admin: true },
  { id: 'ferdl', name: 'Ferdl', email: 'ferdl@example.org', status: 'aktiv' },
  { id: 'mo', name: 'Mo', email: 'mo@example.org', status: 'aktiv' },
  { id: 'rudi', name: 'Rudi', email: 'rudi@example.org', status: 'gesperrt' },
  { id: 'toni', name: 'Toni', email: 'toni@example.org', status: 'aktiv' },
  { id: 'ole', name: 'Ole', email: 'ole@example.org', status: 'eingeladen' },
  { id: 'jakob', name: 'Jakob', email: 'jakob@example.org', status: 'aktiv' },
  { id: 'lenny', name: 'Lenny', email: 'lenny@example.org', status: 'aktiv' },
  { id: 'gusti', name: 'Gusti', email: 'gusti@example.org', status: 'aktiv' },
]

// ---------- Sortiment ----------

export const MOTIFS: Array<Motif> = [
  { id: 'brotherhood', name: 'Brotherhood', image: asset('motiv-brotherhood.jpg') },
  { id: 'brotherhood-grau', name: 'Brotherhood grau', image: asset('motiv-brotherhood-grau.jpg') },
  { id: 'support', name: 'Support', image: asset('motiv-support.jpg'), dark: true },
  { id: 'arme', name: 'Arme', image: asset('motiv-arme.jpg') },
]

const sizes = (labels: Array<string>, extra: Record<string, number> = {}): Array<Size> =>
  labels.map((label) => ({ id: label.toLowerCase(), label, surcharge: extra[label] ?? 0 }))

const STANDARD_SIZES = sizes(['S', 'M', 'L', 'XL', 'XXL', '3XL'], { XXL: 3, '3XL': 5 })

export const ARTICLES: Array<Article> = [
  {
    id: 'shirt-schwarz',
    name: 'T-Shirt schwarz',
    price: 25,
    image: asset('artikel-shirt.jpg'),
    description: 'Schweres Baumwoll-Shirt, gerader Schnitt.',
    sizes: STANDARD_SIZES,
    spots: [
      { id: 'vorne', name: 'vorne', kind: 'motiv', required: true, surcharge: 0, motifIds: ['brotherhood', 'support', 'arme'] },
      { id: 'hinten', name: 'hinten', kind: 'motiv', required: false, surcharge: 5, motifIds: ['brotherhood', 'brotherhood-grau', 'arme'] },
      { id: 'aermel', name: 'Ärmel links', kind: 'motiv', required: false, surcharge: 3, motifIds: ['support'] },
    ],
  },
  {
    id: 'hoodie-schwarz',
    name: 'Hoodie schwarz',
    price: 49,
    description: 'Kapuzenpullover mit Känguru-Tasche, innen angeraut.',
    sizes: STANDARD_SIZES,
    spots: [
      { id: 'vorne', name: 'vorne', kind: 'motiv', required: true, surcharge: 0, motifIds: ['brotherhood'] },
      { id: 'hinten', name: 'hinten', kind: 'motiv', required: false, surcharge: 6, motifIds: ['brotherhood', 'brotherhood-grau', 'arme', 'support'] },
      { id: 'aermel', name: 'Ärmel links', kind: 'motiv', required: false, surcharge: 3, motifIds: ['support'] },
    ],
  },
  {
    id: 'zip-schwarz',
    name: 'Zip-Hoodie schwarz',
    price: 59,
    description: 'Durchgehender Reißverschluss, Brustdruck klein.',
    sizes: sizes(['S', 'M', 'L', 'XL', 'XXL'], { XXL: 3 }),
    spots: [
      { id: 'brust', name: 'Brust links', kind: 'motiv', required: true, surcharge: 0, motifIds: ['brotherhood-grau', 'support'] },
      { id: 'hinten', name: 'hinten', kind: 'motiv', required: false, surcharge: 6, motifIds: ['brotherhood', 'brotherhood-grau', 'arme'] },
    ],
  },
  {
    id: 'muetze-schwarz',
    name: 'Mütze schwarz',
    price: 19,
    description: 'Strickmütze mit Umschlag.',
    sizes: sizes(['Einheitsgröße']),
    spots: [{ id: 'vorne', name: 'vorne', kind: 'motiv', required: true, surcharge: 0, motifIds: ['support'] }],
  },
  {
    id: 'weste-schwarz',
    name: 'Weste schwarz',
    price: 69,
    description: 'Robuste Weste. Spitzname wird auf die Brust gestickt.',
    sizes: sizes(['M', 'L', 'XL', 'XXL', '3XL'], { XXL: 4, '3XL': 6 }),
    spots: [
      { id: 'hinten', name: 'hinten', kind: 'motiv', required: true, surcharge: 0, motifIds: ['brotherhood', 'arme'] },
      { id: 'name', name: 'Brust rechts (Spitzname)', kind: 'text', required: false, surcharge: 8, placeholder: 'z. B. Kalle' },
    ],
  },
  {
    id: 'muetze-grau',
    name: 'Mütze grau',
    price: 19,
    description: 'Ausgeblendet, nicht mehr lieferbar.',
    sizes: sizes(['Einheitsgröße']),
    spots: [{ id: 'vorne', name: 'vorne', kind: 'motiv', required: true, surcharge: 0, motifIds: ['support'] }],
    hidden: true,
  },
]

// ---------- Bestellrunden und Aufträge ----------

export const ROUNDS: Array<Round> = [
  { id: 'w2627', name: 'Winter 2026/27', orderDate: '2026-11-30', status: 'offen', openedOn: '2026-11-01' },
  { id: 's26', name: 'Sommer 2026', orderDate: '2026-05-15', status: 'abgeschlossen', openedOn: '2026-04-20', closedOn: '2026-05-18' },
  { id: 'w2526', name: 'Winter 2025/26', orderDate: '2025-11-28', status: 'abgeschlossen', openedOn: '2025-11-02', closedOn: '2025-12-01' },
]

let pid = 0
const pos = (articleId: string, sizeId: string, prints: Array<PositionPrint>, qty = 1): Position => ({
  id: `p${++pid}`,
  articleId,
  sizeId,
  prints,
  qty,
})

const order = (roundId: string, memberId: string, o: Partial<Order> = {}): Order => ({
  id: `${roundId}-${memberId}`,
  roundId,
  memberId,
  positions: [],
  note: '',
  done: false,
  waived: false,
  paid: false,
  ...o,
})

export const ORDERS: Array<Order> = [
  // Winter 2026/27, offen: gemischter Stand
  order('w2627', 'kalle', {
    positions: [pos('hoodie-schwarz', 'l', [{ spotId: 'vorne', motifId: 'brotherhood' }, { spotId: 'hinten', motifId: 'arme' }])],
    note: '',
  }),
  order('w2627', 'bodo', {
    positions: [pos('shirt-schwarz', 'xl', [{ spotId: 'vorne', motifId: 'brotherhood' }], 2)],
    done: true,
    paid: true,
  }),
  order('w2627', 'hias', {
    positions: [
      pos('weste-schwarz', 'xxl', [{ spotId: 'hinten', motifId: 'brotherhood' }, { spotId: 'name', text: 'Hias' }]),
      pos('muetze-schwarz', 'einheitsgröße', [{ spotId: 'vorne', motifId: 'support' }]),
    ],
    note: 'Weste bitte eine Nummer weiter, ich trage drunter Leder.',
    done: true,
  }),
  order('w2627', 'wastl', { waived: true }),
  order('w2627', 'ferdl', {
    positions: [pos('zip-schwarz', 'm', [{ spotId: 'brust', motifId: 'support' }])],
  }),
  order('w2627', 'mo'),
  order('w2627', 'rudi', {
    positions: [pos('shirt-schwarz', 'l', [{ spotId: 'vorne', motifId: 'arme' }])],
  }),
  order('w2627', 'toni', {
    positions: [
      pos('muetze-grau', 'einheitsgröße', [{ spotId: 'vorne', motifId: 'support' }]),
      pos('shirt-schwarz', 'm', [{ spotId: 'vorne', motifId: 'support' }, { spotId: 'aermel', motifId: 'support' }]),
    ],
    done: true,
    paid: true,
  }),
  order('w2627', 'ole'),
  order('w2627', 'jakob', {
    positions: [pos('hoodie-schwarz', 'xl', [{ spotId: 'vorne', motifId: 'brotherhood' }])],
    done: true,
  }),
  order('w2627', 'lenny', { waived: true }),
  order('w2627', 'gusti', {
    positions: [pos('shirt-schwarz', '3xl', [{ spotId: 'vorne', motifId: 'brotherhood' }, { spotId: 'hinten', motifId: 'brotherhood-grau' }])],
  }),

  // Sommer 2026, abgeschlossen
  order('s26', 'kalle', {
    positions: [
      pos('shirt-schwarz', 'l', [{ spotId: 'vorne', motifId: 'brotherhood' }, { spotId: 'hinten', motifId: 'arme' }], 2),
      pos('muetze-schwarz', 'einheitsgröße', [{ spotId: 'vorne', motifId: 'support' }]),
    ],
    note: 'Ein Shirt ist für meinen Bruder.',
    done: true,
    paid: true,
  }),
  order('s26', 'bodo', { positions: [pos('shirt-schwarz', 'xl', [{ spotId: 'vorne', motifId: 'support' }])], done: true, paid: true }),
  order('s26', 'hias', { waived: true }),
  order('s26', 'toni', { positions: [pos('zip-schwarz', 'm', [{ spotId: 'brust', motifId: 'brotherhood-grau' }])], done: true, paid: false }),

  // Winter 2025/26, abgeschlossen
  order('w2526', 'kalle', {
    positions: [pos('weste-schwarz', 'l', [{ spotId: 'hinten', motifId: 'brotherhood' }, { spotId: 'name', text: 'Kalle' }])],
    done: true,
    paid: false,
    correction: { amount: -5, reason: 'Stickerei verspätet, Nachlass vom Drucker' },
  }),
  order('w2526', 'bodo', { positions: [pos('hoodie-schwarz', 'xl', [{ spotId: 'vorne', motifId: 'brotherhood' }])], done: true, paid: true }),
]

// ---------- Termine ----------

const img = (id: string, file: string, by = 'bodo'): GalleryImage => ({ id, src: asset(file), by })

export const TERMINE: Array<Termin> = [
  // Kommend
  {
    id: 'stammtisch-2026-11-20',
    kind: 'Stammtisch',
    title: 'Stammtisch',
    start: '2026-11-20T19:30',
    place: 'Gasthof zur Linde, Nebenzimmer',
    info: 'Wie immer am dritten Freitag. Wer die Bestellrunde noch nicht ausgefüllt hat, kann es hier mit Kalle zusammen machen.',
  },
  {
    id: 'ausfahrt-2026-11-28',
    kind: 'Veranstaltung',
    title: 'Glühwein-Ausfahrt',
    start: '2026-11-28T13:00',
    place: 'Treffpunkt Parkplatz am Sportplatz',
    info: 'Kurze Runde über die Dörfer, Glühwein am Lagerfeuer. Wegen Glätte abgesagt.',
    cancelled: true,
  },
  {
    id: 'jhv-2026-12-05',
    kind: 'Sitzung',
    title: 'Jahreshauptversammlung',
    start: '2026-12-05T18:00',
    end: '2026-12-05T21:00',
    place: 'Vereinsheim',
    info: 'Tagesordnung: Bericht des Vorstands, Kasse, Ausfahrten 2027, Verschiedenes. Anträge bitte bis 28.11. an den Vorstand.',
  },
  {
    id: 'stammtisch-2026-12-18',
    kind: 'Stammtisch',
    title: 'Stammtisch',
    start: '2026-12-18T19:30',
    place: 'Gasthof zur Linde, Nebenzimmer',
    info: 'Letzter Stammtisch im Jahr.',
  },
  {
    id: 'weihnachtsfeier-2026-12-19',
    kind: 'Veranstaltung',
    title: 'Weihnachtsfeier',
    start: '2026-12-19T18:00',
    place: 'Vereinsheim',
    info: 'Mit Familien. Jeder bringt einen Salat oder Nachtisch mit, Grill und Getränke stellt der Club.',
  },
  {
    id: 'stammtisch-2027-01-15',
    kind: 'Stammtisch',
    title: 'Stammtisch',
    start: '2027-01-15T19:30',
    place: 'Gasthof zur Linde, Nebenzimmer',
    info: '',
  },
  {
    id: 'saisonstart-2027-04-17',
    kind: 'Veranstaltung',
    title: 'Saisonauftakt',
    start: '2027-04-17',
    allDay: true,
    place: 'Vereinsheim',
    info: 'Erste gemeinsame Ausfahrt des Jahres, danach Weißwurstfrühstück.',
  },

  // Vergangen
  {
    id: 'stammtisch-2026-10-16',
    kind: 'Stammtisch',
    title: 'Stammtisch',
    start: '2026-10-16T19:30',
    place: 'Gasthof zur Linde, Nebenzimmer',
    info: '',
  },
  {
    id: 'rocknacht-2026-10-10',
    kind: 'Veranstaltung',
    title: 'Rocknacht',
    start: '2026-10-10T19:00',
    place: 'Festhalle',
    info: 'Club-Stand mit Pins und Shirts, drei Bands, bis tief in die Nacht.',
    images: [
      img('r1', 'archiv-pin.jpg', 'kalle'),
      img('r2', 'archiv-uebersicht.jpg', 'hias'),
      img('r3', 'archiv-zahnrad.jpg', 'toni'),
      img('r4', 'motiv-brotherhood-strahlen.jpg', 'bodo'),
    ],
  },
  {
    id: 'sitzung-2026-10-08',
    kind: 'Sitzung',
    title: 'Herbstsitzung',
    start: '2026-10-08T19:00',
    place: 'Vereinsheim',
    info: 'Planung Rocknacht und Bestellrunde Winter.',
    protocol: [{ name: 'Protokoll Herbstsitzung 2026.pdf', size: '184 KB' }],
  },
  {
    id: 'sommerfest-2026-07-25',
    kind: 'Veranstaltung',
    title: 'Sommerfest',
    start: '2026-07-25T15:00',
    place: 'Vereinsheim',
    info: 'Enthüllung der neuen Holztafel, Spanferkel, Lagerfeuer.',
    images: [
      img('s1', 'archiv-tafel.jpg', 'wastl'),
      img('s2', 'archiv-zahnrad.jpg', 'kalle'),
      img('s3', 'archiv-uebersicht.jpg', 'ferdl'),
      img('s4', 'archiv-pin.jpg', 'bodo'),
      img('s5', 'motiv-brotherhood.jpg', 'jakob'),
      img('s6', 'motiv-arme.jpg', 'mo'),
    ],
  },
  {
    id: 'ausfahrt-2026-06-06',
    kind: 'Veranstaltung',
    title: 'Pfingstausfahrt',
    start: '2026-06-06T09:00',
    place: 'Treffpunkt Parkplatz am Sportplatz',
    info: 'Zwei Tage über die Pässe.',
    images: [],
  },
  {
    id: 'grillen-2026-05-02',
    kind: 'Veranstaltung',
    title: 'Anfahrgrillen',
    start: '2026-05-02T14:00',
    place: 'Vereinsheim',
    info: 'Wegen Dauerregen abgesagt.',
    cancelled: true,
  },
  {
    id: 'jhv-2025-12-06',
    kind: 'Sitzung',
    title: 'Jahreshauptversammlung',
    start: '2025-12-06T18:00',
    place: 'Vereinsheim',
    info: 'Neuwahl des Vorstands.',
    protocol: [
      { name: 'Protokoll JHV 2025.pdf', size: '312 KB' },
      { name: 'Anlage Kassenbericht.pdf', size: '96 KB' },
      { name: 'Anwesenheitsliste.pdf', size: '58 KB' },
    ],
  },
]

export const SETTINGS: Settings = {
  paymentHint:
    'Bitte überweise die Summe auf das Clubkonto.\nIBAN DE00 1234 5678 9000 0000 00\nVerwendungszweck: dein Name und die Bestellrunde',
  homeText:
    'Seit über 25 Jahren unterwegs. Hier organisieren wir Clubkleidung, Termine und unser Archiv, nur für Mitglieder.',
  calendarLink: 'webcal://club.example.org/kalender/8f3a91c2e7.ics',
}
