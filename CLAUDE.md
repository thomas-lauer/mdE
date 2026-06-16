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
- Symbolleiste für schnelle Standardformatierungen
- Upload vorhandener Markdown-Dateien
- Download des aktuellen Dokuments
- Export der gerenderten Vorschau als HTML, PDF und DOCX
- Editierbarer Dateiname
- Helles und dunkles Design
- Lokale Zwischenspeicherung im Browser

## Architektur

- Framework: Vite mit React und TypeScript
- Markdown: `marked` mit GFM-Unterstuetzung
- Sicherheit: HTML-Sanitizing durch `dompurify`
- Export: HTML als Standalone-Datei, PDF mit `jspdf`, DOCX mit `docx`
- Icons: `lucide-react`
- Desktop: Electron mit isoliertem Preload-Skript und IPC fuer Dateioperationen
- Deployment: GitHub Actions mit `actions/deploy-pages`
- Hosting: GitHub Pages unter `/mdE/`

## Datenschutz

Die App verarbeitet Dateien ausschließlich im Browser. Upload bedeutet in diesem Kontext nur das lokale Einlesen einer Datei in die Web-App. Export bedeutet das lokale Erzeugen einer Datei aus der gerenderten, bereinigten Vorschau. Es werden keine Inhalte an einen Server gesendet.

In der Electron-Variante laufen Dateioperationen ueber den Main-Prozess. Der Renderer erhaelt nur die eng begrenzte Preload-API `mdeApi` fuer `openFile`, `saveFile`, `saveFileAs`, Startdateien und Menue-Kommandos. Die Exportfunktionen bleiben Renderer-seitig und werden nur per Menue-Kommandos ausgeloest. `nodeIntegration` bleibt deaktiviert und `contextIsolation` bleibt aktiviert.

Beim Start kann der EXE eine `.md`- oder `.markdown`-Datei als Argument uebergeben werden. Der Main-Prozess liest diese Datei ein, uebergibt Inhalt und Pfad an den Renderer und nutzt denselben Pfad spaeter fuer `Speichern`.

Die App-Version wird als numerische Hauptversion gefuehrt. Version 2 ist der Startpunkt fuer diese Versionierung. Bei normalen Pushes auf `main` erhoeht `.github/workflows/version.yml` die Hauptversion automatisch um `+1`; Commits mit `[skip version]` sind ausgenommen.

## Design

Die Oberfläche ist arbeitsorientiert, dicht und ruhig. Die wichtigsten Aktionen liegen in der Kopfzeile: Datei hochladen, speichern oder herunterladen, Export, Beispiel zurücksetzen, Theme wechseln und GitHub öffnen. Direkt über der Schreibfläche liegt eine Symbolleiste für häufige Markdown-Formatierungen. Der Editor und die Vorschau sind als gleichwertige Arbeitsbereiche ausgelegt. Auf kleinen Bildschirmen stapeln sich die Bereiche.

## Erweiterungsideen

- Drag-and-drop Upload
- Such- und Ersetzen-Funktion
- Synchronisierte Scrollposition zwischen Editor und Vorschau
