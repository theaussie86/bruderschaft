# Fachregeln in PocketBase, nicht in TanStack Start

Alle Fachregeln liegen in PocketBase. Die API-Rules legen fest, wer was lesen und schreiben darf. Validierungs-Hooks prüfen die Auswahl im Auftrag, und eigene `pb_hooks`-Routen führen die mehrschrittigen Abläufe in einer Transaktion aus: Bestellrunde abschließen (Preise festhalten), wieder öffnen, Artikel kopieren, DSGVO-Löschung und das Kalender-Abo. Mitglieder schreiben ihren Auftrag direkt über das SDK mit ihrem eigenen Token. TanStack Start ist nur UI, Proxy für Dateien und iCal sowie Erzeuger der Sammelbestellung. Den Superuser-Token kennt die App nicht.

## Considered Options

- **TanStack-Server-Functions schreiben mit dem Superuser-Token, PocketBase ist nur Speicher**: Verworfen. Die Regeln wären dann zwischen App-Code und Collection-Rules verteilt, und ein Fehler in einer Server Function hätte vollen Datenzugriff.

## Consequences

- Die Sammelbestellung (PDF und Excel) ist die einzige Fachlogik in TanStack Start, weil die JS-Laufzeit von `pb_hooks` keine npm-Pakete laden kann. Sie liest die Daten mit dem Token des Admins.
- PocketBase kennt keine Rechte pro Feld. Felder, die nur Admins setzen dürfen, schützen Rules mit `@request.body.<feld>:isset = false`. Mitglieder können andere Mitglieder nicht lesen, sonst sähen sie deren Mail-Adressen.
