import React from 'react';
import ReactDOM from 'react-dom/client';
import { marked } from 'marked';
import DOMPurify from 'dompurify';
import {
  Bold,
  Code,
  Heading1,
  Heading2,
  Italic,
  Link,
  List,
  ListOrdered,
  Minus,
  Quote,
  Download,
  Eye,
  EyeOff,
  FileText,
  FolderOpen,
  Github,
  Moon,
  PanelRightClose,
  PanelRightOpen,
  RotateCcw,
  Save,
  Sun,
  Table2,
  Underline,
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

type SelectionRange = {
  start: number;
  end: number;
};

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
  const [currentFilePath, setCurrentFilePath] = React.useState<string | null>(null);
  const [saveStatus, setSaveStatus] = React.useState('Nicht gespeichert');
  const fileInputRef = React.useRef<HTMLInputElement>(null);
  const textareaRef = React.useRef<HTMLTextAreaElement>(null);
  const electronApi = window.mdeApi;
  const isElectron = Boolean(electronApi?.isElectron);

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

  const openFileDialog = async () => {
    if (electronApi) {
      const result = await electronApi.openFile();
      if (!result) {
        return;
      }

      setMarkdown(result.content ?? '');
      setFileName(normalizeMarkdownFileName(result.fileName));
      setCurrentFilePath(result.filePath);
      setSaveStatus('Gespeichert');
      return;
    }

    fileInputRef.current?.click();
  };

  const updateMarkdown = (nextMarkdown: string) => {
    setMarkdown(nextMarkdown);
    setSaveStatus('Ungespeicherte Änderungen');
  };

  const getSelectionRange = (): SelectionRange => {
    const textarea = textareaRef.current;
    return {
      start: textarea?.selectionStart ?? markdown.length,
      end: textarea?.selectionEnd ?? markdown.length,
    };
  };

  const restoreSelection = (range: SelectionRange) => {
    window.requestAnimationFrame(() => {
      textareaRef.current?.focus();
      textareaRef.current?.setSelectionRange(range.start, range.end);
    });
  };

  const insertInline = (prefix: string, suffix: string, placeholder: string) => {
    const { start, end } = getSelectionRange();
    const selectedText = markdown.slice(start, end) || placeholder;
    const nextMarkdown = `${markdown.slice(0, start)}${prefix}${selectedText}${suffix}${markdown.slice(end)}`;
    const nextStart = start + prefix.length;
    const nextEnd = nextStart + selectedText.length;

    updateMarkdown(nextMarkdown);
    restoreSelection({ start: nextStart, end: nextEnd });
  };

  const insertBlock = (block: string, selectionOffset = 0, selectionLength = 0) => {
    const { start, end } = getSelectionRange();
    const needsLeadingBreak = start > 0 && markdown[start - 1] !== '\n';
    const needsTrailingBreak = end < markdown.length && markdown[end] !== '\n';
    const insertion = `${needsLeadingBreak ? '\n\n' : ''}${block}${needsTrailingBreak ? '\n\n' : ''}`;
    const nextMarkdown = `${markdown.slice(0, start)}${insertion}${markdown.slice(end)}`;
    const insertedStart = start + (needsLeadingBreak ? 2 : 0);

    updateMarkdown(nextMarkdown);
    restoreSelection({
      start: insertedStart + selectionOffset,
      end: insertedStart + selectionOffset + selectionLength,
    });
  };

  const transformSelectedLines = (formatter: (line: string, index: number) => string) => {
    const { start, end } = getSelectionRange();
    const lineStart = markdown.lastIndexOf('\n', Math.max(0, start - 1)) + 1;
    const nextBreak = markdown.indexOf('\n', end);
    const lineEnd = nextBreak === -1 ? markdown.length : nextBreak;
    const selectedLines = markdown.slice(lineStart, lineEnd);
    const formatted = selectedLines
      .split('\n')
      .map((line, index) => formatter(line, index))
      .join('\n');

    updateMarkdown(`${markdown.slice(0, lineStart)}${formatted}${markdown.slice(lineEnd)}`);
    restoreSelection({ start: lineStart, end: lineStart + formatted.length });
  };

  const insertLink = () => {
    const { start, end } = getSelectionRange();
    const selectedText = markdown.slice(start, end) || 'Linktext';
    const linkText = `[${selectedText}](https://example.com)`;
    const nextMarkdown = `${markdown.slice(0, start)}${linkText}${markdown.slice(end)}`;
    const urlStart = start + selectedText.length + 3;
    const urlEnd = urlStart + 'https://example.com'.length;

    updateMarkdown(nextMarkdown);
    restoreSelection({ start: urlStart, end: urlEnd });
  };

  const insertCodeBlock = () => {
    const { start, end } = getSelectionRange();
    const selectedText = markdown.slice(start, end) || 'const beispiel = true;';
    insertBlock(`\`\`\`ts\n${selectedText}\n\`\`\``, 6, selectedText.length);
  };

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
    updateMarkdown(text);
    setFileName(normalizeMarkdownFileName(file.name));
    setCurrentFilePath(null);
    event.target.value = '';
  };

  const saveMarkdown = async () => {
    if (electronApi) {
      const result = await electronApi.saveFile({
        filePath: currentFilePath,
        fileName,
        content: markdown,
      });

      if (result) {
        setCurrentFilePath(result.filePath);
        setFileName(normalizeMarkdownFileName(result.fileName));
        setSaveStatus('Gespeichert');
      }

      return;
    }

    const blob = new Blob([markdown], { type: 'text/markdown;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = normalizeMarkdownFileName(fileName);
    document.body.append(anchor);
    anchor.click();
    anchor.remove();
    URL.revokeObjectURL(url);
    setSaveStatus('Heruntergeladen');
  };

  const saveMarkdownAs = async () => {
    if (!electronApi) {
      await saveMarkdown();
      return;
    }

    const result = await electronApi.saveFileAs({
      filePath: currentFilePath,
      fileName,
      content: markdown,
    });

    if (result) {
      setCurrentFilePath(result.filePath);
      setFileName(normalizeMarkdownFileName(result.fileName));
      setSaveStatus('Gespeichert');
    }
  };

  const resetDocument = () => {
    const confirmed = window.confirm('Aktuellen Inhalt durch die Beispielnotiz ersetzen?');
    if (confirmed) {
      updateMarkdown(starterMarkdown);
      setFileName('notizen.md');
      setCurrentFilePath(null);
    }
  };

  React.useEffect(() => {
    if (!electronApi) {
      return undefined;
    }

    return electronApi.onMenuCommand((command) => {
      if (command === 'open') {
        void openFileDialog();
      }

      if (command === 'save') {
        void saveMarkdown();
      }

      if (command === 'saveAs') {
        void saveMarkdownAs();
      }
    });
  }, [electronApi, fileName, markdown, currentFilePath]);

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
          <button type="button" className="icon-button" onClick={openFileDialog} title={isElectron ? 'Markdown-Datei öffnen' : 'Markdown-Datei hochladen'}>
            <FolderOpen aria-hidden="true" size={20} />
            <span>{isElectron ? 'Öffnen' : 'Hochladen'}</span>
          </button>
          <button type="button" className="icon-button" onClick={saveMarkdown} title={isElectron ? 'Markdown-Datei speichern' : 'Markdown-Datei herunterladen'}>
            {isElectron ? <Save aria-hidden="true" size={20} /> : <Download aria-hidden="true" size={20} />}
            <span>{isElectron ? 'Speichern' : 'Herunterladen'}</span>
          </button>
          {isElectron ? (
            <button type="button" className="icon-button" onClick={saveMarkdownAs} title="Markdown-Datei unter neuem Namen speichern">
              <Download aria-hidden="true" size={20} />
              <span>Speichern unter</span>
            </button>
          ) : null}
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
          <a
            className="icon-only"
            href="https://github.com/thomas-lauer/mdE"
            target="_blank"
            rel="noreferrer"
            title="GitHub Projekt öffnen"
            aria-label="GitHub Projekt öffnen"
          >
            <Github aria-hidden="true" size={20} />
          </a>
        </div>
      </header>

      <section className="toolbar" aria-label="Editor-Optionen">
        <div className="status-group">
          <span>{stats.words} Wörter</span>
          <span>{stats.chars} Zeichen</span>
          <span>{stats.lines} Zeilen</span>
          <span>{saveStatus}</span>
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
          <div className="format-toolbar" aria-label="Formatierung">
            <button type="button" className="format-button" onClick={() => insertInline('**', '**', 'fetter Text')} title="Fett">
              <Bold aria-hidden="true" size={18} />
            </button>
            <button type="button" className="format-button" onClick={() => insertInline('*', '*', 'kursiver Text')} title="Kursiv">
              <Italic aria-hidden="true" size={18} />
            </button>
            <button type="button" className="format-button" onClick={() => insertInline('<u>', '</u>', 'unterstrichener Text')} title="Unterstrichen">
              <Underline aria-hidden="true" size={18} />
            </button>
            <button type="button" className="format-button" onClick={insertLink} title="Link">
              <Link aria-hidden="true" size={18} />
            </button>
            <span className="format-divider" aria-hidden="true" />
            <button type="button" className="format-button" onClick={() => transformSelectedLines((line) => `# ${line.replace(/^#{1,6}\s*/, '') || 'Überschrift'}`)} title="Überschrift 1">
              <Heading1 aria-hidden="true" size={18} />
            </button>
            <button type="button" className="format-button" onClick={() => transformSelectedLines((line) => `## ${line.replace(/^#{1,6}\s*/, '') || 'Überschrift'}`)} title="Überschrift 2">
              <Heading2 aria-hidden="true" size={18} />
            </button>
            <button type="button" className="format-button" onClick={() => transformSelectedLines((line) => `- ${line.replace(/^[-*]\s*/, '') || 'Listenpunkt'}`)} title="Aufzählung">
              <List aria-hidden="true" size={18} />
            </button>
            <button type="button" className="format-button" onClick={() => transformSelectedLines((line, index) => `${index + 1}. ${line.replace(/^\d+\.\s*/, '') || 'Listenpunkt'}`)} title="Nummerierte Liste">
              <ListOrdered aria-hidden="true" size={18} />
            </button>
            <button type="button" className="format-button" onClick={() => transformSelectedLines((line) => `> ${line.replace(/^>\s*/, '') || 'Zitat'}`)} title="Zitat">
              <Quote aria-hidden="true" size={18} />
            </button>
            <span className="format-divider" aria-hidden="true" />
            <button type="button" className="format-button" onClick={() => insertInline('`', '`', 'code')} title="Inline-Code">
              <Code aria-hidden="true" size={18} />
            </button>
            <button type="button" className="format-button" onClick={insertCodeBlock} title="Codeblock">
              <Code aria-hidden="true" size={18} />
            </button>
            <button type="button" className="format-button" onClick={() => insertBlock('| Spalte 1 | Spalte 2 |\n| --- | --- |\n| Inhalt | Inhalt |')} title="Tabelle">
              <Table2 aria-hidden="true" size={18} />
            </button>
            <button type="button" className="format-button" onClick={() => insertBlock('---')} title="Trennlinie">
              <Minus aria-hidden="true" size={18} />
            </button>
          </div>
          <textarea
            ref={textareaRef}
            value={markdown}
            onChange={(event) => updateMarkdown(event.target.value)}
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
