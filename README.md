# mdE - Markdown Editor

mdE ist ein deutschsprachiger, rein clientseitiger Markdown Editor als Web Application. Die App ist für GitHub Pages vorbereitet und bietet einen Editor-Bereich, eine Live-Vorschau und einfache Dateiaktionen für Markdown-Dateien.

## Funktionen

- Live-Vorschau für GitHub-Flavored Markdown
- Vorschau kann ein- und ausgeblendet werden
- Symbolleiste für schnelle Markdown-Formatierungen
- Upload von `.md` und `.markdown` Dateien
- Download des aktuellen Inhalts als Markdown-Datei
- Electron-Variante für Windows mit direktem Datei-Öffnen und Speichern
- Dateiname direkt in der Kopfzeile editierbar
- Helles und dunkles Design
- Automatische lokale Zwischenspeicherung im Browser

## Symbolleiste

Die Editor-Symbolleiste fügt Standardformatierungen direkt an der Cursorposition ein oder wendet sie auf markierten Text an. Unterstützt werden Fett, Kursiv, Unterstrichen, Link, Überschriften, Aufzählungen, nummerierte Listen, Zitate, Inline-Code, Codeblöcke, Tabellen und Trennlinien.

## Entwicklung

```bash
npm install
npm run dev
```

## Build

```bash
npm run build
```

## Electron für Windows

Die Electron-Variante greift direkt auf lokale Dateien zu. Im Desktop-Modus werden die Schaltflächen zu `Öffnen`, `Speichern` und `Speichern unter`; zusätzlich gibt es ein natives Datei-Menü mit `Strg+O`, `Strg+S` und `Strg+Umschalt+S`.

```bash
npm run electron:dev
```

Eine entpackte Windows-App wird mit folgendem Befehl erstellt:

```bash
npm run electron:pack
```

Danach liegt die startbare App unter `release/win-unpacked/mdE.exe`. Installer und portable EXE werden mit folgendem Befehl erzeugt:

```bash
npm run electron:dist
```

## Deployment

Das Projekt enthält einen GitHub-Actions-Workflow unter `.github/workflows/pages.yml`. Bei jedem Push auf `main` wird die App gebaut und per GitHub Pages veröffentlicht.

Die Vite-Konfiguration nutzt `base: '/mdE/'`, damit die App korrekt unter `https://thomas-lauer.github.io/mdE/` läuft.
