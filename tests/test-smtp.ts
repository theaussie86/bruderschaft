import { createServer as createHttpServer } from 'node:http'
import { createServer } from 'node:net'
import type { AddressInfo } from 'node:net'

// Minimaler SMTP-Server für die Tests: nimmt jede Mail an und hält sie im
// Speicher. Über HTTP fragen die Tests das Postfach einer Adresse ab, weil sie
// in eigenen Workern laufen.

export type TestMail = { an: Array<string>; roh: string }

export async function starteTestSmtp() {
  const mails: Array<TestMail> = []

  const smtp = createServer((socket) => {
    let puffer = ''
    let imDatenteil = false
    let daten: Array<string> = []
    let an: Array<string> = []
    const antworte = (zeile: string) => socket.write(`${zeile}\r\n`)

    antworte('220 test-smtp')
    socket.on('data', (chunk) => {
      puffer += chunk.toString('utf8')
      let ende: number
      while ((ende = puffer.indexOf('\r\n')) >= 0) {
        const zeile = puffer.slice(0, ende)
        puffer = puffer.slice(ende + 2)
        if (imDatenteil) {
          if (zeile === '.') {
            imDatenteil = false
            mails.push({ an, roh: daten.join('\r\n') })
            daten = []
            an = []
            antworte('250 OK')
          } else {
            daten.push(zeile.startsWith('..') ? zeile.slice(1) : zeile)
          }
          continue
        }
        const befehl = zeile.slice(0, 4).toUpperCase()
        if (befehl === 'EHLO' || befehl === 'HELO') antworte('250 test-smtp')
        else if (befehl === 'RCPT') {
          const adresse = /<([^>]*)>/.exec(zeile)?.[1]
          if (adresse) an.push(adresse.toLowerCase())
          antworte('250 OK')
        } else if (befehl === 'DATA') {
          imDatenteil = true
          antworte('354 weiter')
        } else if (befehl === 'QUIT') {
          antworte('221 tschüss')
          socket.end()
        } else antworte('250 OK')
      }
    })
    socket.on('error', () => socket.destroy())
  })

  const http = createHttpServer((req, res) => {
    const adresse = new URL(req.url ?? '/', 'http://localhost').searchParams
      .get('an')
      ?.toLowerCase()
    const treffer = mails.filter((m) => adresse && m.an.includes(adresse))
    res.setHeader('content-type', 'application/json')
    res.end(JSON.stringify(treffer))
  })

  await Promise.all([
    new Promise<void>((r) => smtp.listen(0, '127.0.0.1', r)),
    new Promise<void>((r) => http.listen(0, '127.0.0.1', r)),
  ])

  return {
    smtpPort: (smtp.address() as AddressInfo).port,
    postfachUrl: `http://127.0.0.1:${(http.address() as AddressInfo).port}`,
    stop() {
      return Promise.all([
        new Promise((r) => smtp.close(r)),
        new Promise((r) => http.close(r)),
      ])
    },
  }
}
