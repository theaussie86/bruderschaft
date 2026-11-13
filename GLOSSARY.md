# Bruderschaft

Mitglieder-App eines Clubs mit rund 20 festen Mitgliedern. Kern ist die gemeinsame Bestellung von Clubkleidung, damit sie nicht mehr über verstreute Excel-Listen läuft.

## Personen

**Mitglied**:
Eine Person, die zum Club gehört und einen Zugang hat. Wird vom Admin angelegt, registriert sich nie selbst.
_Avoid_: User, Member, Kunde

**Eingeladenes Mitglied**:
Ein Mitglied, das der Admin angelegt hat und das sein Passwort über den Einladungslink noch nicht gesetzt hat. Der Admin kann die Einladung erneut senden, dann gilt nur noch der neue Link.
_Avoid_: inaktiv, unbestätigt

**Ausgetretenes Mitglied**:
Ein Mitglied, das der Admin gesperrt hat. Es kann sich nicht mehr anmelden und taucht in neuen Bestellrunden nicht auf; seine Aufträge und Bilder bleiben mit Namen erhalten. Die Sperre lässt sich aufheben.
_Avoid_: gelöschtes Mitglied, deaktiviert

**Ehemaliges Mitglied**:
Die Bezeichnung, unter der Aufträge und Bilder eines ausgetretenen Mitglieds weiterlaufen, nachdem seine Daten auf Wunsch gelöscht wurden. Gelöscht wird ein Mitglied sonst nur, wenn es falsch angelegt wurde und weder Aufträge noch Bilder hat.
_Avoid_: anonym, Gast

**Admin**:
Ein Recht, das einzelne Mitglieder zusätzlich haben. Ein Admin ist immer auch Mitglied und bestellt selbst. Jeder Admin kann das Recht vergeben und entziehen; es bleibt immer mindestens ein Admin.
_Avoid_: Verwalter, Superuser

**Support-Konto**:
Der Zugang des Entwicklers, mit denselben Rechten wie ein Admin. Er ist kein Mitglied, bestellt nicht und taucht in keiner Übersicht oder Liste auf.
_Avoid_: Admin (für den Entwickler), Testkonto

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
Ein Eintrag im Kalender des Clubs mit Titel, Beginn, optionalem Ende, Ort und Infotext. Stammtisch, Sitzung und Veranstaltung sind Arten von Termin. Nur Admins legen Termine an; jeder Termin steht für sich, es gibt keine Serien.
_Avoid_: Event, Eintrag, Serie

**Abgesagter Termin**:
Ein Termin, der nicht stattfindet, aber sichtbar bleibt, damit die Absage auch im Kalender-Abo ankommt. Gelöscht werden nur falsch angelegte Termine.
_Avoid_: gelöschter Termin, ausgefallener Termin

**Veranstaltung**:
Ein Termin, der nach seinem Datum ins Archiv eingeht. Mitglieder können Bilder dazu hochladen.
_Avoid_: Event, Party

**Archiv**:
Die vergangenen Veranstaltungen des Clubs mit ihren Bildern, auch solche ohne Bilder. Stammtische und Sitzungen gehören nicht dazu.
_Avoid_: Galerie, Chronik

**Sitzung**:
Ein Termin, an dem ein Protokoll hängt.
_Avoid_: Meeting, Versammlung

**Protokoll**:
Die Niederschrift einer Sitzung, von einem Admin hochgeladen, für alle Mitglieder lesbar. Eine Sitzung hat höchstens ein Protokoll, das aus mehreren Dateien bestehen kann.
_Avoid_: Notiz, Mitschrift

**Kalender-Abo**:
Der gemeinsame geheime Link, über den Mitglieder alle Termine in ihren eigenen Kalender holen. Ein Admin kann ihn erneuern, dann gilt der alte nicht mehr.
_Avoid_: Export, Feed

**Drucker**:
Der regionale Textildruck-Betrieb, der die Sammelbestellung bedruckt und liefert.
_Avoid_: Hersteller, Lieferant
