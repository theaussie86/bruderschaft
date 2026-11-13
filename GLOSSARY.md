# Bruderschaft

Mitglieder-App eines Clubs mit rund 20 festen Mitgliedern. Kern ist die gemeinsame Bestellung von Clubkleidung, damit sie nicht mehr über verstreute Excel-Listen läuft.

## Personen

**Mitglied**:
Eine Person, die zum Club gehört und einen Zugang hat. Wird vom Admin angelegt, registriert sich nie selbst.
_Avoid_: User, Member, Kunde

**Admin**:
Ein Recht, das einzelne Mitglieder zusätzlich haben. Ein Admin ist immer auch Mitglied und bestellt selbst.
_Avoid_: Verwalter, Superuser

## Bestellung

**Bestellrunde**:
Ein Sammelzeitraum, den ein Admin eröffnet und von Hand abschließt. Sie ist entweder offen oder abgeschlossen. Es gibt höchstens eine offene Bestellrunde; eine abgeschlossene kann ein Admin wieder öffnen, solange keine andere offen ist. Abgeschlossene bleiben als Archiv lesbar.
_Avoid_: Sammelbestellung (für den Zeitraum), Bestellung, Termin

**Bestelldatum**:
Das angekündigte Datum, bis zu dem Mitglieder ihren Auftrag eintragen sollen. Nur eine Ansage: Die Bestellrunde schließt erst, wenn ein Admin sie abschließt.
_Avoid_: Deadline, Stichtag, Termin

**Auftrag**:
Die Auswahl eines Mitglieds in einer Bestellrunde. Jedes Mitglied hat pro Bestellrunde höchstens einen Auftrag. Solange die Runde offen ist, darf ein Admin jeden Auftrag ändern oder für ein Mitglied anlegen. Die Summe folgt immer den aktuellen Artikelpreisen.
_Avoid_: Warenkorb, Bestellung, Order

**Abgeschickter Auftrag**:
Ein Auftrag, den das Mitglied mit "bin fertig" markiert hat. Er lässt sich wieder öffnen, solange die Bestellrunde offen ist.
_Avoid_: bestätigte Bestellung, fertiger Warenkorb

**Verzicht**:
Die Angabe eines Mitglieds, in einer Bestellrunde nichts zu bestellen. Unterscheidet "will nichts" von "hat noch nichts eingetragen".
_Avoid_: Absage, leerer Auftrag

**Bezahlt**:
Vom Admin manuell gesetzter Vermerk, dass die Summe eines abgeschickten Auftrags auf dem Clubkonto eingegangen ist.
_Avoid_: beglichen, Zahlung

**Sammelbestellung**:
Die zusammengeführten Aufträge einer abgeschlossenen Bestellrunde, als Liste für den Drucker. Enthält die abgeschickten Aufträge; ob noch nicht abgeschickte mit hineinkommen, entscheidet der Admin beim Abschließen.
_Avoid_: Gesamtbestellung, Export

**Position**:
Eine Zeile in einem Auftrag: ein Artikel in einer Größe, mit je einem Motiv pro Druckstelle, und eine Anzahl.
_Avoid_: Artikel (für die Zeile), Item

## Sortiment

**Artikel**:
Ein bestellbares Kleidungsstück mit Preis, z. B. Hoodie oder Mütze. Der Preis gilt inklusive Aufdruck, solange nichts anderes festgelegt ist.
_Avoid_: Produkt, Klamotte

**Größe**:
Eine wählbare Größe eines Artikels. Jeder Artikel hat seine eigene Größenliste.
_Avoid_: Variante

**Druckstelle**:
Eine Stelle am Artikel, die bedruckt werden kann, z. B. vorne oder hinten. Kann Pflicht oder optional sein.
_Avoid_: Position (für die Stelle), Platzierung

**Motiv**:
Ein Aufdruck, der an einer Druckstelle gewählt werden kann, z. B. "Hahna Allgäu" oder "Brotherhood".
_Avoid_: Aufdruck-Variante, Logo, Design

## Club-Leben

**Termin**:
Ein Eintrag im Kalender des Clubs mit Datum, Ort und Infotext. Stammtisch, Sitzung und Veranstaltung sind Arten von Termin.
_Avoid_: Event, Eintrag

**Veranstaltung**:
Ein Termin, der nach seinem Datum mit Bildern ins Archiv eingeht.
_Avoid_: Event, Party

**Sitzung**:
Ein Termin, an dem ein Protokoll hängt.
_Avoid_: Meeting, Versammlung

**Protokoll**:
Die Niederschrift einer Sitzung, als Dokument hochgeladen und nur für Mitglieder sichtbar.
_Avoid_: Notiz, Mitschrift

**Drucker**:
Der regionale Textildruck-Betrieb, der die Sammelbestellung bedruckt und liefert.
_Avoid_: Hersteller, Lieferant
