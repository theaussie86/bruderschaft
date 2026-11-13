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
Ein Sammelzeitraum mit festem Bestelldatum, den ein Admin eröffnet. Es gibt höchstens eine offene Bestellrunde, geschlossene bleiben als Archiv lesbar.
_Avoid_: Sammelbestellung (für den Zeitraum), Bestellung, Termin

**Bestelldatum**:
Der Stichtag einer Bestellrunde, bis zu dem Mitglieder ihren Auftrag ändern können.
_Avoid_: Deadline, Termin

**Auftrag**:
Die Auswahl eines Mitglieds in einer Bestellrunde. Jedes Mitglied hat pro Bestellrunde höchstens einen Auftrag.
_Avoid_: Warenkorb, Bestellung, Order

**Abgeschickter Auftrag**:
Ein Auftrag, den das Mitglied mit "bin fertig" abgeschlossen hat. Er trägt eine Auftragsnummer und eine Summe und lässt sich bis zum Bestelldatum wieder öffnen.
_Avoid_: bestätigte Bestellung, fertiger Warenkorb

**Bezahlt**:
Vom Admin manuell gesetzter Vermerk, dass die Summe eines abgeschickten Auftrags auf dem Clubkonto eingegangen ist.
_Avoid_: beglichen, Zahlung

**Sammelbestellung**:
Die zusammengeführten Aufträge einer geschlossenen Bestellrunde, als Liste für den Drucker.
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
