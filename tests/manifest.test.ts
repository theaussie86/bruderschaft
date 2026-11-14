import { readFileSync } from 'node:fs'
import { describe, expect, test } from 'vitest'

// PWA-Grundlage (Spec #17): Manifest und Icons, kein Offline-Modus.
const manifest = JSON.parse(
  readFileSync(new URL('../public/manifest.json', import.meta.url), 'utf8'),
) as {
  start_url: string
  display: string
  icons: Array<{ src: string; sizes: string; type: string; purpose?: string }>
}

describe('Web-App-Manifest', () => {
  test('lässt sich als eigenständige App zum Homebildschirm hinzufügen', () => {
    expect(manifest.display).toBe('standalone')
    expect(manifest.start_url).toMatch(/^\//)
  })

  test('hat PNG-Icons in 192 und 512 Pixeln und ein maskierbares', () => {
    const png = manifest.icons.filter((i) => i.type === 'image/png')
    expect(png.map((i) => i.sizes)).toEqual(
      expect.arrayContaining(['192x192', '512x512']),
    )
    expect(manifest.icons.some((i) => i.purpose === 'maskable')).toBe(true)
  })

  test('kein Service Worker, also kein Offline-Modus', () => {
    expect(() =>
      readFileSync(new URL('../public/sw.js', import.meta.url)),
    ).toThrow()
  })
})
