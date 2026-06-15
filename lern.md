# Lernprotokoll

## Probleme und Fehler

- Das Ziel-Repository `thomas-lauer/mdE` existierte zu Beginn noch nicht. Es wird deshalb als neues öffentliches Repository angelegt.
- Der lokale Projektordner war noch kein Git-Repository. Git wird nach der Implementierung initialisiert.
- Die Referenz Polypost ist eine gebaute Vite-App. Die genaue Komponentenstruktur ist dadurch nicht direkt sichtbar; mdE orientiert sich am Bedienkonzept und an der zweigeteilten Arbeitsfläche, bleibt aber eine eigenständige Implementierung.
- Markdown aus Dateien oder Eingaben kann HTML enthalten. Deshalb wird die gerenderte Vorschau vor der Ausgabe mit DOMPurify bereinigt.
- GitHub Pages benötigt bei Vite-Projekten eine passende `base`-Konfiguration. Für dieses Repository ist `/mdE/` gesetzt.
- Der erste Build scheiterte, weil TypeScript mit klassischer `Node`-Modulauflösung die Typen von `@vitejs/plugin-react` nicht korrekt auflösen konnte. Die Konfiguration wurde auf `Bundler` umgestellt.
- `npm audit` meldete für die initiale Vite-Version einen High-Severity-Hinweis über `esbuild`. Vite wurde auf die aktuelle Version 8.0.16 aktualisiert.
- Eine separate TypeScript-Projekt-Referenz für `vite.config.ts` erzeugte Build-Zwischenartefakte und war für diese kleine App unnötig. Der Build nutzt nun `tsc --noEmit` plus `vite build`.
- Der erste GitHub-Pages-Lauf war erfolgreich, meldete aber eine Warnung zur bevorstehenden Node-20-Actions-Abkündigung. Der Workflow setzt nun `FORCE_JAVASCRIPT_ACTIONS_TO_NODE24=true`.

## Entscheidungen

- Vite und React wurden gewählt, weil die UI-Zustände für Editor, Vorschau, Dateiaktionen und Theme damit gut wartbar bleiben.
- Die App ist komplett clientseitig. Es gibt kein Backend und keine serverseitige Speicherung.
- Browserdaten werden nur lokal per `localStorage` gesichert.
