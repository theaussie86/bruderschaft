// @vitest-environment jsdom
import { getSchema } from '@tiptap/core'
import { DOMParser, Node } from '@tiptap/pm/model'
import { describe, expect, test } from 'vitest'

import type { ProtokollKnoten } from '@/lib/protokoll'
import {
  PROTOKOLL_SCHEMA,
  neuerPunkt,
} from '@/components/termin/protokoll-schema'

// Editor und Lese-Ansicht teilen ein Schema (Spec #62, #64). Geprüft wird,
// was daraus entsteht: welche Dokumente gültig sind und was beim Einfügen aus
// der Zwischenablage übrig bleibt.
const schema = getSchema(PROTOKOLL_SCHEMA)

function lesen(json: ProtokollKnoten) {
  const doc = Node.fromJSON(schema, json)
  doc.check()
  return doc
}

// Einfügen aus der Zwischenablage parst HTML über dieselben Regeln.
function einfuegen(html: string) {
  const el = document.createElement('div')
  el.innerHTML = html
  return DOMParser.fromSchema(schema).parse(el).toJSON() as ProtokollKnoten
}

function typen(knoten: ProtokollKnoten): Array<string> {
  return [
    knoten.type,
    ...(knoten.marks ?? []).map((m) => `mark:${m.type}`),
    ...(knoten.content ?? []).flatMap(typen),
  ]
}

describe('Protokolltext: Schema', () => {
  test('ein schon gespeichertes Protokoll aus Absätzen bleibt lesbar', () => {
    const alt: ProtokollKnoten = {
      type: 'doc',
      content: [
        { type: 'paragraph', content: [{ type: 'text', text: '14 da.' }] },
        { type: 'paragraph' },
        {
          type: 'paragraph',
          content: [{ type: 'text', text: 'Kasse stimmt.' }],
        },
      ],
    }
    expect(lesen(alt).textContent).toBe('14 da.Kasse stimmt.')
  })

  test('Überschrift, Fett und verschachtelte Listen sind erlaubt', () => {
    const doc = lesen({
      type: 'doc',
      content: [
        neuerPunkt('20:05'),
        {
          type: 'bulletList',
          content: [
            {
              type: 'listItem',
              content: [
                {
                  type: 'paragraph',
                  content: [
                    { type: 'text', text: 'Termin fix: ' },
                    {
                      type: 'text',
                      text: '17. Juli',
                      marks: [{ type: 'bold' }],
                    },
                  ],
                },
                {
                  type: 'orderedList',
                  content: [
                    {
                      type: 'listItem',
                      content: [
                        {
                          type: 'paragraph',
                          content: [{ type: 'text', text: 'Bands anfragen' }],
                        },
                      ],
                    },
                  ],
                },
              ],
            },
          ],
        },
      ],
    })
    expect(doc.textContent).toContain('17. Juli')
  })

  test('ein neuer Punkt ist eine Überschrift, die mit der fetten Uhrzeit beginnt', () => {
    const punkt = neuerPunkt('19:42')
    expect(punkt.type).toBe('heading')
    expect(punkt.content?.[0]).toEqual({
      type: 'text',
      text: '19:42',
      marks: [{ type: 'bold' }],
    })
  })

  test('es gibt nur eine Überschrift-Ebene', () => {
    const doc = einfuegen('<h1>Eins</h1><h2>Zwei</h2><h3>Drei</h3>')
    const ebenen = (doc.content ?? [])
      .filter((k) => k.type === 'heading')
      .map((k) => k.attrs?.level)
    expect(new Set(ebenen)).toEqual(new Set([3]))
  })

  test('Links, Tabellen und andere Formate fallen beim Einfügen weg, der Text bleibt', () => {
    const doc = einfuegen(
      '<p><a href="https://example.com">Link</a> <em>kursiv</em> <u>unter</u> <s>weg</s> <code>x</code></p>' +
        '<table><tr><td>Zelle</td></tr></table>' +
        '<blockquote><p>Zitat</p></blockquote><hr><pre>Code</pre>' +
        '<img src="x.png"><ul><li><p><strong>fett</strong></p></li></ul>',
    )
    const erlaubt = new Set([
      'doc',
      'paragraph',
      'text',
      'heading',
      'bulletList',
      'orderedList',
      'listItem',
      'mark:bold',
    ])
    expect(typen(doc).filter((t) => !erlaubt.has(t))).toEqual([])
    const text = JSON.stringify(doc)
    for (const wort of ['Link', 'kursiv', 'Zelle', 'Zitat', 'fett'])
      expect(text).toContain(wort)
  })
})
