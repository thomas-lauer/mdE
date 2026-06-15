# mdE Konzept

## Ziel

mdE ist ein schlanker Markdown Editor, der direkt über GitHub Pages läuft. Nutzer können Markdown schreiben, hochladen, ansehen und herunterladen, ohne ein Konto oder Backend zu benötigen.

## Produktidee

Die App übernimmt das fokussierte Editor-Prinzip von Polypost: eine klare Kopfzeile, ein Arbeitsbereich mit Schreibfläche und Vorschau sowie eine schnell erreichbare Option, den rechten Bereich auszublenden. Für mdE steht nicht Multi-Platform-Posting im Mittelpunkt, sondern das schnelle Bearbeiten von Markdown-Dokumenten.

## Zielgruppe

- Personen, die schnell Markdown-Dateien schreiben oder pruefen wollen
- Nutzer, die eine einfache GitHub-Pages-App ohne Backend bevorzugen
- Autoren technischer Notizen, README-Dateien und kleiner Dokumentationen

## Kernfunktionen

- Markdown-Editor mit grosser Schreibflaeche
- Live-Vorschau mit GitHub-Flavored Markdown
- Ausblendbare Vorschau für konzentriertes Schreiben
- Upload vorhandener Markdown-Dateien
- Download des aktuellen Dokuments
- Editierbarer Dateiname
- Helles und dunkles Design
- Lokale Zwischenspeicherung im Browser

## Architektur

- Framework: Vite mit React und TypeScript
- Markdown: `marked` mit GFM-Unterstuetzung
- Sicherheit: HTML-Sanitizing durch `dompurify`
- Icons: `lucide-react`
- Deployment: GitHub Actions mit `actions/deploy-pages`
- Hosting: GitHub Pages unter `/mdE/`

## Datenschutz

Die App verarbeitet Dateien ausschließlich im Browser. Upload bedeutet in diesem Kontext nur das lokale Einlesen einer Datei in die Web-App. Es werden keine Inhalte an einen Server gesendet.

## Design

Die Oberfläche ist arbeitsorientiert, dicht und ruhig. Die wichtigsten Aktionen liegen in der Kopfzeile: Datei hochladen, herunterladen, Beispiel zurücksetzen, Theme wechseln. Der Editor und die Vorschau sind als gleichwertige Arbeitsbereiche ausgelegt. Auf kleinen Bildschirmen stapeln sich die Bereiche.

## Erweiterungsideen

- Markdown-Toolbar fuer haeufige Formatierungen
- Export als HTML oder PDF
- Drag-and-drop Upload
- Such- und Ersetzen-Funktion
- Synchronisierte Scrollposition zwischen Editor und Vorschau
