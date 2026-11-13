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

**Drucker**:
Der regionale Textildruck-Betrieb, der die Sammelbestellung bedruckt und liefert.
_Avoid_: Hersteller, Lieferant
