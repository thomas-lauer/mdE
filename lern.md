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
- Der erste GitHub-Pages-Lauf war erfolgreich, meldete aber eine Warnung zur bevorstehenden Node-20-Actions-Abkündigung. Der Workflow setzt `FORCE_JAVASCRIPT_ACTIONS_TO_NODE24=true` und nutzt die aktuellen Major-Versionen der GitHub-Actions.
- Markdown kennt keine native Unterstreichung. Die Toolbar nutzt dafür bewusst `<u>...</u>`, das in der bereinigten Vorschau gerendert wird.
- Beim ersten Electron-Packaging-Versuch blockierte Windows/OneDrive das Umbenennen des generierten `release/win-unpacked.tmp`-Ordners mit `EPERM`. Der Release-Ordner wurde bereinigt und der Packaging-Lauf danach erneut ausgeführt.
- Das `EPERM` trat auch ausserhalb von OneDrive auf, solange electron-builder die Electron-Laufzeit selbst entpacken wollte. Die Loesung ist `electronDist: node_modules/electron/dist`, wodurch die bereits lokal installierte Electron-Runtime kopiert wird.
- Fuer den NSIS-Installer trat das gleiche Rename-Problem im lokalen electron-builder-Cache auf. Nach manuellem Umbenennen der vollstaendig entpackten Cache-Ordner `nsis-3.0.4.1-...tmp` und `nsis-resources-3.4.1-...tmp` lief `npm run electron:dist` erfolgreich durch.
- Externe Links in der Electron-App duerfen nicht die lokale Editor-Ansicht ersetzen. Der GitHub-Link wird deshalb ueber `setWindowOpenHandler` abgefangen und mit `shell.openExternal` im Standardbrowser geoeffnet.
- Startargumente fuer die Electron-EXE muessen im Main-Prozess verarbeitet werden, damit der Renderer keinen direkten Dateisystemzugriff bekommt. Die Datei wird ueber IPC an den Renderer uebergeben und bleibt als aktueller Speicherpfad erhalten.

## Entscheidungen

- Vite und React wurden gewählt, weil die UI-Zustände für Editor, Vorschau, Dateiaktionen und Theme damit gut wartbar bleiben.
- Die App ist komplett clientseitig. Es gibt kein Backend und keine serverseitige Speicherung.
- Browserdaten werden nur lokal per `localStorage` gesichert.
