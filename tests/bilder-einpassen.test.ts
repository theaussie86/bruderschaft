import { deflateSync } from 'node:zlib'
import { describe, expect, test } from 'vitest'

import { pocketbaseUrl, superuser } from './helpers'

// Ein einfarbiges PNG in der gewünschten Größe, ohne Bildbibliothek.
function png(breite: number, hoehe: number) {
  const crcTabelle = Array.from({ length: 256 }, (_, n) => {
    let c = n
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1
    return c >>> 0
  })
  const crc = (b: Buffer) => {
    let c = 0xffffffff
    for (const x of b) c = crcTabelle[(c ^ x) & 0xff] ^ (c >>> 8)
    return (c ^ 0xffffffff) >>> 0
  }
  const block = (typ: string, daten: Buffer) => {
    const laenge = Buffer.alloc(4)
    laenge.writeUInt32BE(daten.length)
    const inhalt = Buffer.concat([Buffer.from(typ), daten])
    const pruef = Buffer.alloc(4)
    pruef.writeUInt32BE(crc(inhalt))
    return Buffer.concat([laenge, inhalt, pruef])
  }
  const kopf = Buffer.alloc(13)
  kopf.writeUInt32BE(breite, 0)
  kopf.writeUInt32BE(hoehe, 4)
  kopf[8] = 8 // Bittiefe
  kopf[9] = 2 // RGB
  const zeile = Buffer.concat([Buffer.from([0]), Buffer.alloc(breite * 3, 200)])
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    block('IHDR', kopf),
    block('IDAT', deflateSync(Buffer.concat(Array(hoehe).fill(zeile)))),
    block('IEND', Buffer.alloc(0)),
  ])
}

function pngGroesse(b: Buffer) {
  return { breite: b.readUInt32BE(16), hoehe: b.readUInt32BE(20) }
}

// Motive und Artikelbilder sind oft Querformat. Das kleine Vorschaubild, das
// App und Verwaltung zeigen, muss das ganze Bild enthalten, nicht einen
// quadratischen Ausschnitt.
describe('Bilder: Vorschaubild ohne Beschnitt', () => {
  test.each([
    ['motive', { name: 'Querformat' }],
    ['artikel', { name: 'Querformat', preis: 1000 }],
  ] as const)(
    '%s: 200x200f behält das Seitenverhältnis',
    async (collection, felder) => {
      const pb = await superuser()
      const form = new FormData()
      for (const [k, v] of Object.entries(felder)) form.append(k, String(v))
      form.append(
        'bild',
        new File([png(300, 150)], 'quer.png', { type: 'image/png' }),
      )
      const r = await pb.collection(collection).create(form)
      const token = await pb.files.getToken()

      const res = await fetch(
        `${pocketbaseUrl}/api/files/${r.collectionId}/${r.id}/${r.bild}?thumb=200x200f&token=${token}`,
      )
      expect(res.status).toBe(200)
      expect(pngGroesse(Buffer.from(await res.arrayBuffer()))).toEqual({
        breite: 200,
        hoehe: 100,
      })
    },
  )
})
