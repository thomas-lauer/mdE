import React from 'react';
import ReactDOM from 'react-dom/client';
import { marked } from 'marked';
import DOMPurify from 'dompurify';
import {
  Download,
  Eye,
  EyeOff,
  FileText,
  FolderOpen,
  Moon,
  PanelRightClose,
  PanelRightOpen,
  RotateCcw,
  Sun,
} from 'lucide-react';
import './styles.css';

const starterMarkdown = `# Willkommen in mdE

Schreibe links Markdown und sieh rechts sofort die Vorschau.

## Funktionen

- GitHub-Flavored Markdown
- Tabellen, Task-Listen und Codeblöcke
- Upload vorhandener .md Dateien
- Download deiner aktuellen Datei
- Vorschau ein- und ausblenden

| Element | Status |
| --- | --- |
| Editor | bereit |
| Vorschau | live |

\`\`\`ts
const message = 'Markdown macht Arbeit angenehm.';
console.log(message);
\`\`\`
`;

const storageKey = 'mde-editor-content';
const filenameKey = 'mde-filename';
const themeKey = 'mde-theme';

marked.use({
  gfm: true,
  breaks: false,
});

function App() {
  const [markdown, setMarkdown] = React.useState(() => {
    return localStorage.getItem(storageKey) ?? starterMarkdown;
  });
  const [fileName, setFileName] = React.useState(() => {
    return localStorage.getItem(filenameKey) ?? 'notizen.md';
  });
  const [previewVisible, setPreviewVisible] = React.useState(true);
  const [theme, setTheme] = React.useState<'light' | 'dark'>(() => {
    return (localStorage.getItem(themeKey) as 'light' | 'dark' | null) ?? 'light';
  });
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  React.useEffect(() => {
    localStorage.setItem(storageKey, markdown);
  }, [markdown]);

  React.useEffect(() => {
    localStorage.setItem(filenameKey, fileName);
  }, [fileName]);

  React.useEffect(() => {
    localStorage.setItem(themeKey, theme);
    document.documentElement.dataset.theme = theme;
  }, [theme]);

  const renderedHtml = React.useMemo(() => {
    return DOMPurify.sanitize(marked.parse(markdown, { async: false }) as string);
  }, [markdown]);

  const stats = React.useMemo(() => {
    const words = markdown.trim() ? markdown.trim().split(/\s+/).length : 0;
    const chars = markdown.length;
    const lines = markdown.length ? markdown.split('\n').length : 0;
    return { words, chars, lines };
  }, [markdown]);

  const openFileDialog = () => fileInputRef.current?.click();

  const handleUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) {
      return;
    }

    const isMarkdown = file.name.toLowerCase().endsWith('.md') || file.name.toLowerCase().endsWith('.markdown');

    if (!isMarkdown) {
      alert('Bitte lade eine Markdown-Datei hoch.');
      event.target.value = '';
      return;
    }

    const text = await file.text();
    setMarkdown(text);
    setFileName(normalizeMarkdownFileName(file.name));
    event.target.value = '';
  };

  const downloadMarkdown = () => {
    const blob = new Blob([markdown], { type: 'text/markdown;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = normalizeMarkdownFileName(fileName);
    document.body.append(anchor);
    anchor.click();
    anchor.remove();
    URL.revokeObjectURL(url);
  };

  const resetDocument = () => {
    const confirmed = window.confirm('Aktuellen Inhalt durch die Beispielnotiz ersetzen?');
    if (confirmed) {
      setMarkdown(starterMarkdown);
      setFileName('notizen.md');
    }
  };

  return (
    <main className="app-shell">
      <header className="app-header">
        <div className="brand">
          <div className="brand-mark">
            <FileText aria-hidden="true" size={24} />
          </div>
          <div>
            <p className="eyebrow">Markdown Editor</p>
            <h1>mdE</h1>
          </div>
        </div>

        <div className="header-actions">
          <label className="file-name">
            <span>Datei</span>
            <input
              value={fileName}
              onChange={(event) => setFileName(event.target.value)}
              onBlur={(event) => setFileName(normalizeMarkdownFileName(event.target.value))}
              aria-label="Dateiname"
            />
          </label>
          <button type="button" className="icon-button" onClick={openFileDialog} title="Markdown-Datei hochladen">
            <FolderOpen aria-hidden="true" size={20} />
            <span>Hochladen</span>
          </button>
          <button type="button" className="icon-button" onClick={downloadMarkdown} title="Markdown-Datei herunterladen">
            <Download aria-hidden="true" size={20} />
            <span>Herunterladen</span>
          </button>
          <button type="button" className="icon-only" onClick={resetDocument} title="Beispiel wiederherstellen">
            <RotateCcw aria-hidden="true" size={20} />
          </button>
          <button
            type="button"
            className="icon-only"
            onClick={() => setTheme(theme === 'light' ? 'dark' : 'light')}
            title={theme === 'light' ? 'Dunkles Design' : 'Helles Design'}
          >
            {theme === 'light' ? <Moon aria-hidden="true" size={20} /> : <Sun aria-hidden="true" size={20} />}
          </button>
        </div>
      </header>

      <section className="toolbar" aria-label="Editor-Optionen">
        <div className="status-group">
          <span>{stats.words} Wörter</span>
          <span>{stats.chars} Zeichen</span>
          <span>{stats.lines} Zeilen</span>
        </div>
        <button
          type="button"
          className="toggle-preview"
          onClick={() => setPreviewVisible((visible) => !visible)}
          aria-pressed={!previewVisible}
        >
          {previewVisible ? <PanelRightClose aria-hidden="true" size={18} /> : <PanelRightOpen aria-hidden="true" size={18} />}
          {previewVisible ? 'Vorschau ausblenden' : 'Vorschau anzeigen'}
        </button>
      </section>

      <section className={previewVisible ? 'workspace split' : 'workspace editor-only'}>
        <article className="pane editor-pane">
          <div className="pane-title">
            <span>Editor</span>
            <EyeOff aria-hidden="true" size={16} />
          </div>
          <textarea
            value={markdown}
            onChange={(event) => setMarkdown(event.target.value)}
            spellCheck="false"
            aria-label="Markdown Editor"
          />
        </article>

        {previewVisible ? (
          <article className="pane preview-pane">
            <div className="pane-title">
              <span>Vorschau</span>
              <Eye aria-hidden="true" size={16} />
            </div>
            <div className="preview" dangerouslySetInnerHTML={{ __html: renderedHtml }} />
          </article>
        ) : null}
      </section>

      <input
        ref={fileInputRef}
        className="visually-hidden"
        type="file"
        accept=".md,.markdown,text/markdown"
        onChange={handleUpload}
        aria-hidden="true"
        tabIndex={-1}
      />
    </main>
  );
}

function normalizeMarkdownFileName(value: string) {
  const trimmed = value.trim() || 'notizen.md';
  return /\.(md|markdown)$/i.test(trimmed) ? trimmed : `${trimmed}.md`;
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
