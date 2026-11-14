# Bruderschaft

Mitglieder-App eines Clubs mit rund 20 festen Mitgliedern. Kern ist die gemeinsame Bestellung von Clubkleidung, damit sie nicht mehr über verstreute Excel-Listen läuft.

## Personen

**Mitglied**:
Eine Person, die zum Club gehört und einen Zugang hat. Wird vom Admin angelegt, registriert sich nie selbst.
_Avoid_: User, Member, Kunde

**Geburtstag**:
Das Geburtsdatum eines Mitglieds, mit Jahr. Jedes Mitglied gibt ihn beim ersten Login an und ändert ihn selbst im Profil; ein Admin kann ihn korrigieren. Er steht jedes Jahr mit dem Alter, das das Mitglied wird, im Kalender und im Kalender-Abo, solange das Mitglied nicht ausgetreten ist, und ist kein Termin. Ein Geburtstag am 29. Februar steht in Nicht-Schaltjahren am 28. Februar.
_Avoid_: Geburtstagstermin

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
_Avoid_: Verwalter, Superuser, Schriftführer (für das Recht)

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
Die Auswahl eines Mitglieds in einer Bestellrunde. Jedes Mitglied hat pro Bestellrunde höchstens einen Auftrag. Solange die Runde offen ist, darf ein Admin jeden Auftrag ändern oder für ein Mitglied anlegen. Solange die Bestellrunde offen ist, folgt die Summe den aktuellen Preisen; beim Abschließen werden die Preise in der Runde festgehalten.
_Avoid_: Warenkorb, Bestellung, Order

**Abgeschickter Auftrag**:
Ein Auftrag, den das Mitglied mit "bin fertig" markiert hat. Er lässt sich wieder öffnen, solange die Bestellrunde offen ist.
_Avoid_: bestätigte Bestellung, fertiger Warenkorb

**Verzicht**:
Die Angabe eines Mitglieds, in einer Bestellrunde nichts zu bestellen. Unterscheidet "will nichts" von "hat noch nichts eingetragen".
_Avoid_: Absage, leerer Auftrag

**Anmerkung**:
Ein freier Text, den ein Mitglied seinem Auftrag mitgibt, für alles, was die Auswahl nicht abdeckt. Der Admin sieht ihn in der Übersicht, der Drucker in der Sammelbestellung.
_Avoid_: Kommentar, Notiz

**Korrektur**:
Ein Betrag mit Begründung, den ein Admin auf einen Auftrag aufschlägt oder abzieht, z. B. Rabatt oder Porto. Er ändert die Summe, nicht die Preise.
_Avoid_: Rabatt (als Oberbegriff), Gutschrift

**Bezahlt**:
Vom Admin manuell gesetzter Vermerk, dass die Summe eines abgeschickten Auftrags auf dem Clubkonto eingegangen ist.
_Avoid_: beglichen, Zahlung

**Sammelbestellung**:
Die zusammengeführten Aufträge einer abgeschlossenen Bestellrunde, als Dokument für den Drucker: Summen pro Artikel, Größe und Belegung der Druckstellen, die Zahl der Drucke pro Motiv, die Textdrucke und eine Liste pro Mitglied mit Anmerkung. Preise und Zahlungsstand stehen nicht darin. Enthält die abgeschickten Aufträge; ob noch nicht abgeschickte mit hineinkommen, entscheidet der Admin beim Abschließen. Nur Admins rufen sie ab und geben sie selbst an den Drucker weiter.
_Avoid_: Gesamtbestellung, Export

**Textdruck**:
Eine belegte Text-Druckstelle mit dem Text, den ein Mitglied eingetragen hat, z. B. ein Spitzname. Textdrucke lassen sich nicht aufsummieren und stehen in der Sammelbestellung einzeln.
_Avoid_: Namensdruck, Beschriftung

**Position**:
Eine Zeile in einem Auftrag: ein Artikel in einer Größe, mit einem Motiv oder Text pro belegter Druckstelle, und eine Anzahl.
_Avoid_: Artikel (für die Zeile), Item

## Sortiment

**Artikel**:
Ein bestellbares Kleidungsstück mit Preis, optionalem Bild und optionaler Beschreibung, z. B. Hoodie oder Mütze. Jede Farbe ist ein eigener Artikel. Der Preis gilt inklusive Aufdruck, solange kein Aufpreis festgelegt ist. Jeder eingeblendete Artikel steht in jeder Bestellrunde zur Wahl.
_Avoid_: Produkt, Klamotte, Variante (für Farben)

**Artikelnummer**:
Die Nummer, unter der der Drucker einen Artikel in seinem Katalog führt. Optional. Sehen nur Admins und der Drucker in der Sammelbestellung, nicht die Mitglieder beim Bestellen.
_Avoid_: SKU, Bestellnummer

**Größe**:
Eine wählbare Größe eines Artikels, optional mit Aufpreis. Jeder Artikel hat seine eigene Größenliste.
_Avoid_: Variante

**Druckstelle**:
Eine Stelle an einem bestimmten Artikel, die bedruckt werden kann, z. B. vorne oder hinten. Der Admin legt sie pro Artikel an. Eine Druckstelle bietet entweder eine Auswahl an Motiven oder ein Textfeld, in das das Mitglied einen eigenen Text schreibt, z. B. seinen Spitznamen. An einer Pflicht-Druckstelle muss etwas gewählt oder geschrieben werden, eine optionale darf leer bleiben. Ein Aufpreis wird fällig, sobald sie belegt ist.
_Avoid_: Position (für die Stelle), Platzierung

**Motiv**:
Ein Aufdruck mit Namen und Bild, z. B. "Hahna Allgäu" oder "Brotherhood". Motive bilden eine gemeinsame Liste für alle Artikel.
_Avoid_: Aufdruck-Variante, Logo, Design

**Aufpreis**:
Ein Betrag, der zum Artikelpreis hinzukommt, wenn eine bestimmte Größe gewählt oder eine bestimmte Druckstelle belegt wird. Standard ist kein Aufpreis.
_Avoid_: Zuschlag, Extra

**Ausgeblendet**:
Ein Artikel, eine Größe, Druckstelle oder ein Motiv, das niemand mehr neu wählen kann. In bestehenden Aufträgen bleibt es stehen und ist als nicht mehr verfügbar markiert. Löschen geht nur, solange es nie bestellt wurde.
_Avoid_: gelöscht, deaktiviert, archiviert

## Club-Leben

**Termin**:
Ein Eintrag im Kalender des Clubs mit Titel, Beginn, optionalem Ende, Ort und Infotext. Stammtisch und Veranstaltung sind Arten von Termin. Nur Admins legen Termine an; jeder Termin steht für sich, es gibt keine Serien.
_Avoid_: Event, Eintrag, Serie

**Abgesagter Termin**:
Ein Termin, der nicht stattfindet, aber sichtbar bleibt, damit die Absage auch im Kalender-Abo ankommt. Gelöscht werden nur falsch angelegte Termine.
_Avoid_: gelöschter Termin, ausgefallener Termin

**Veranstaltung**:
Ein Termin, der nach seinem Datum ins Archiv eingeht. Mitglieder können Bilder dazu hochladen.
_Avoid_: Event, Party

**Archiv**:
Die vergangenen, nicht abgesagten Veranstaltungen des Clubs mit ihren Bildern, auch solche ohne Bilder, und die vergangenen Stammtische mit Protokoll. Stammtische ohne Protokoll und abgesagte Termine gehören nicht dazu.
_Avoid_: Galerie, Veranstaltungsgalerie, Chronik

**Stammtisch**:
Das regelmäßige Treffen des Clubs. An einem Stammtisch kann ein Protokoll hängen.
_Avoid_: Sitzung, Meeting, Versammlung

**Protokoll**:
Die Niederschrift eines Stammtischs, von einem Admin hochgeladen, für alle Mitglieder lesbar. Ein Stammtisch hat höchstens ein Protokoll, das aus mehreren Dateien bestehen kann.
_Avoid_: Notiz, Mitschrift

**Kalender-Abo**:
Der gemeinsame geheime Link, über den Mitglieder alle Termine in ihren eigenen Kalender holen. Ein Admin kann ihn erneuern, dann gilt der alte nicht mehr.
_Avoid_: Export, Feed

**Drucker**:
Der regionale Textildruck-Betrieb, der die Sammelbestellung bedruckt und liefert.
_Avoid_: Hersteller, Lieferant
