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
  FileCode,
  FileDown,
  FileText,
  FileType,
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

  const applyOpenedFile = React.useCallback((result: NonNullable<ElectronFileResult>) => {
    setMarkdown(result.content ?? '');
    setFileName(normalizeMarkdownFileName(result.fileName));
    setCurrentFilePath(result.filePath);
    setSaveStatus('Gespeichert');
  }, []);

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

      applyOpenedFile(result);
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

  const exportHtml = () => {
    const exportName = `${getExportBaseName(fileName)}.html`;
    const htmlDocument = buildStandaloneHtml(fileName, renderedHtml);

    downloadBlob(new Blob([htmlDocument], { type: 'text/html;charset=utf-8' }), exportName);
    setSaveStatus('HTML exportiert');
  };

  const exportPdf = async () => {
    const exportName = `${getExportBaseName(fileName)}.pdf`;
    const pdfModule = await import('jspdf');

    buildPdfFromHtml(pdfModule, renderedHtml, fileName).save(exportName);
    setSaveStatus('PDF exportiert');
  };

  const exportDocx = async () => {
    const exportName = `${getExportBaseName(fileName)}.docx`;
    const docx = await import('docx');
    const doc = new docx.Document({
      title: fileName,
      creator: 'mdE',
      sections: [
        {
          properties: {},
          children: buildDocxChildren(docx, renderedHtml),
        },
      ],
    });
    const blob = await docx.Packer.toBlob(doc);

    downloadBlob(blob, exportName);
    setSaveStatus('DOCX exportiert');
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

      if (command === 'exportHtml') {
        exportHtml();
      }

      if (command === 'exportPdf') {
        void exportPdf();
      }

      if (command === 'exportDocx') {
        void exportDocx();
      }
    });
  }, [electronApi, fileName, markdown, currentFilePath, renderedHtml]);

  React.useEffect(() => {
    if (!electronApi) {
      return undefined;
    }

    let disposed = false;

    electronApi.getPendingOpenedFile().then((result) => {
      if (!disposed && result) {
        applyOpenedFile(result);
      }
    });

    const unsubscribe = electronApi.onOpenedFromArgument((result) => {
      applyOpenedFile(result);
    });

    return () => {
      disposed = true;
      unsubscribe();
    };
  }, [electronApi, applyOpenedFile]);

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
          <div className="export-group" aria-label="Export">
            <button type="button" className="icon-button export-button" onClick={exportHtml} title="Als HTML-Datei exportieren">
              <FileCode aria-hidden="true" size={20} />
              <span>HTML</span>
            </button>
            <button type="button" className="icon-button export-button" onClick={() => void exportPdf()} title="Als PDF-Datei exportieren">
              <FileDown aria-hidden="true" size={20} />
              <span>PDF</span>
            </button>
            <button type="button" className="icon-button export-button" onClick={() => void exportDocx()} title="Als DOCX-Datei exportieren">
              <FileType aria-hidden="true" size={20} />
              <span>DOCX</span>
            </button>
          </div>
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

function getExportBaseName(fileName: string) {
  return fileName
    .replace(/\.(md|markdown)$/i, '')
    .replace(/[<>:"/\\|?*\u0000-\u001f]/g, '-')
    .trim() || 'notizen';
}

function downloadBlob(blob: Blob, fileName: string) {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = fileName;
  document.body.append(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
}

function buildStandaloneHtml(title: string, content: string) {
  return `<!doctype html>
<html lang="de">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>${escapeHtml(title)}</title>
  <style>
    :root {
      color: #17212f;
      font-family: Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
      background: #f7f8fa;
    }
    body {
      margin: 0;
      padding: 48px 24px;
      background: #f7f8fa;
    }
    main {
      width: min(860px, 100%);
      margin: 0 auto;
      padding: 44px;
      background: #ffffff;
      border: 1px solid #d9dee6;
      border-radius: 8px;
    }
    h1, h2, h3 { line-height: 1.2; }
    h1 { padding-bottom: 12px; border-bottom: 1px solid #d9dee6; }
    p, li { line-height: 1.68; }
    a { color: #115e59; }
    blockquote {
      margin-left: 0;
      padding: 12px 16px;
      border-left: 4px solid #0f766e;
      background: #f7f8fa;
      color: #687386;
    }
    code {
      padding: 2px 6px;
      border-radius: 5px;
      background: #eef1f4;
      font-family: "Cascadia Code", Consolas, monospace;
      font-size: 0.9em;
    }
    pre {
      overflow: auto;
      padding: 16px;
      border-radius: 8px;
      background: #101827;
      color: #e8edf5;
    }
    pre code {
      padding: 0;
      color: inherit;
      background: transparent;
    }
    table {
      width: 100%;
      border-collapse: collapse;
      margin: 18px 0;
    }
    th, td {
      padding: 10px 12px;
      border: 1px solid #d9dee6;
      text-align: left;
    }
    th { background: #f7f8fa; }
    img { max-width: 100%; }
  </style>
</head>
<body>
  <main>
${content}
  </main>
</body>
</html>`;
}

type PdfModule = typeof import('jspdf');
type DocxModule = typeof import('docx');
type DocxParagraph = InstanceType<DocxModule['Paragraph']>;
type DocxTable = InstanceType<DocxModule['Table']>;
type DocxTextRun = InstanceType<DocxModule['TextRun']>;

function buildPdfFromHtml(pdfModule: PdfModule, html: string, title: string) {
  const pdf = new pdfModule.jsPDF({ unit: 'pt', format: 'a4' });
  const pageWidth = pdf.internal.pageSize.getWidth();
  const pageHeight = pdf.internal.pageSize.getHeight();
  const margin = 48;
  const maxWidth = pageWidth - margin * 2;
  let cursorY = margin;

  const ensureSpace = (height: number) => {
    if (cursorY + height > pageHeight - margin) {
      pdf.addPage();
      cursorY = margin;
    }
  };

  const addText = (text: string, size = 11, style: 'normal' | 'bold' | 'italic' = 'normal', font = 'helvetica') => {
    const normalized = normalizeInlineText(text);
    if (!normalized) {
      return;
    }

    pdf.setFont(font, style);
    pdf.setFontSize(size);
    const lineHeight = size * 1.45;
    const lines = pdf.splitTextToSize(normalized, maxWidth) as string[];
    ensureSpace(lines.length * lineHeight + 8);
    pdf.text(lines, margin, cursorY);
    cursorY += lines.length * lineHeight + 8;
  };

  const parsed = parseHtmlFragment(html);
  addText(title.replace(/\.(md|markdown)$/i, ''), 20, 'bold');

  Array.from(parsed.children).forEach((element) => {
    addElementToPdf(element, addText);
  });

  return pdf;
}

function addElementToPdf(
  element: Element,
  addText: (text: string, size?: number, style?: 'normal' | 'bold' | 'italic', font?: string) => void,
) {
  const tagName = element.tagName.toLowerCase();

  if (tagName === 'h1') {
    addText(element.textContent ?? '', 18, 'bold');
    return;
  }

  if (tagName === 'h2') {
    addText(element.textContent ?? '', 15, 'bold');
    return;
  }

  if (tagName === 'h3') {
    addText(element.textContent ?? '', 13, 'bold');
    return;
  }

  if (tagName === 'p') {
    addText(element.textContent ?? '');
    return;
  }

  if (tagName === 'blockquote') {
    addText(element.textContent ?? '', 11, 'italic');
    return;
  }

  if (tagName === 'pre') {
    addText(element.textContent ?? '', 9, 'normal', 'courier');
    return;
  }

  if (tagName === 'ul' || tagName === 'ol') {
    Array.from(element.children).forEach((child, index) => {
      const prefix = tagName === 'ol' ? `${index + 1}. ` : '- ';
      addText(`${prefix}${child.textContent ?? ''}`);
    });
    return;
  }

  if (tagName === 'table') {
    Array.from(element.querySelectorAll('tr')).forEach((row) => {
      const cells = Array.from(row.children).map((cell) => normalizeInlineText(cell.textContent ?? ''));
      addText(cells.join(' | '), 9, row.querySelector('th') ? 'bold' : 'normal', 'courier');
    });
    return;
  }

  if (tagName === 'hr') {
    addText('________________________________________', 9);
    return;
  }

  Array.from(element.children).forEach((child) => addElementToPdf(child, addText));
}

function buildDocxChildren(docx: DocxModule, html: string): Array<DocxParagraph | DocxTable> {
  const parsed = parseHtmlFragment(html);
  const children = Array.from(parsed.children).flatMap((element) => convertElementToDocx(docx, element));

  return children.length > 0 ? children : [new docx.Paragraph('')];
}

function convertElementToDocx(docx: DocxModule, element: Element): Array<DocxParagraph | DocxTable> {
  const tagName = element.tagName.toLowerCase();

  if (tagName === 'h1' || tagName === 'h2' || tagName === 'h3') {
    const heading =
      tagName === 'h1' ? docx.HeadingLevel.HEADING_1 : tagName === 'h2' ? docx.HeadingLevel.HEADING_2 : docx.HeadingLevel.HEADING_3;

    return [
      new docx.Paragraph({
        heading,
        children: inlineRunsFromNode(docx, element),
        spacing: { after: 180 },
      }),
    ];
  }

  if (tagName === 'p') {
    return [paragraphFromElement(docx, element)];
  }

  if (tagName === 'blockquote') {
    return [
      new docx.Paragraph({
        children: inlineRunsFromNode(docx, element, { italics: true, color: '687386' }),
        indent: { left: 360 },
        border: {
          left: {
            color: '0F766E',
            space: 8,
            style: 'single',
            size: 12,
          },
        },
        spacing: { after: 160 },
      }),
    ];
  }

  if (tagName === 'pre') {
    return (element.textContent ?? '')
      .split('\n')
      .map((line) => new docx.Paragraph({ children: [new docx.TextRun({ text: line || ' ', font: 'Cascadia Code', size: 18 })] }));
  }

  if (tagName === 'ul') {
    return Array.from(element.children).map(
      (child) =>
        new docx.Paragraph({
          bullet: { level: 0 },
          children: inlineRunsFromNode(docx, child),
          spacing: { after: 80 },
        }),
    );
  }

  if (tagName === 'ol') {
    return Array.from(element.children).map(
      (child, index) =>
        new docx.Paragraph({
          children: [new docx.TextRun({ text: `${index + 1}. `, bold: true }), ...inlineRunsFromNode(docx, child)],
          spacing: { after: 80 },
        }),
    );
  }

  if (tagName === 'table') {
    const rows = Array.from(element.querySelectorAll('tr')).map(
      (row) =>
        new docx.TableRow({
          children: Array.from(row.children).map(
            (cell) =>
              new docx.TableCell({
                width: { size: 100 / Math.max(row.children.length, 1), type: docx.WidthType.PERCENTAGE },
                children: [
                  new docx.Paragraph({
                    children: inlineRunsFromNode(docx, cell, cell.tagName.toLowerCase() === 'th' ? { bold: true } : {}),
                  }),
                ],
              }),
          ),
        }),
    );

    return [
      new docx.Table({
        rows,
        width: { size: 100, type: docx.WidthType.PERCENTAGE },
      }),
      new docx.Paragraph(''),
    ];
  }

  if (tagName === 'hr') {
    return [
      new docx.Paragraph({
        alignment: docx.AlignmentType.CENTER,
        children: [new docx.TextRun('____________________________')],
        spacing: { after: 160 },
      }),
    ];
  }

  return Array.from(element.children).flatMap((child) => convertElementToDocx(docx, child));
}

function paragraphFromElement(docx: DocxModule, element: Element): DocxParagraph {
  return new docx.Paragraph({
    children: inlineRunsFromNode(docx, element),
    spacing: { after: 160 },
  });
}

type InlineTextStyle = Record<string, any>;

function inlineRunsFromNode(docx: DocxModule, node: Node, inheritedStyle: InlineTextStyle = {}): DocxTextRun[] {
  if (node.nodeType === Node.TEXT_NODE) {
    const text = normalizeInlineText(node.textContent ?? '');
    return text ? [new docx.TextRun({ text, ...inheritedStyle })] : [];
  }

  if (node.nodeType !== Node.ELEMENT_NODE) {
    return [];
  }

  const element = node as Element;
  const tagName = element.tagName.toLowerCase();
  const nextStyle: InlineTextStyle = { ...inheritedStyle };

  if (tagName === 'strong' || tagName === 'b') {
    nextStyle.bold = true;
  }

  if (tagName === 'em' || tagName === 'i') {
    nextStyle.italics = true;
  }

  if (tagName === 'u') {
    nextStyle.underline = { type: docx.UnderlineType.SINGLE };
  }

  if (tagName === 'code') {
    nextStyle.font = 'Cascadia Code';
    nextStyle.color = '17212F';
  }

  if (tagName === 'a') {
    nextStyle.color = '115E59';
    nextStyle.underline = { type: docx.UnderlineType.SINGLE };
  }

  if (tagName === 'br') {
    return [new docx.TextRun({ break: 1 })];
  }

  const runs: DocxTextRun[] = Array.from(element.childNodes).flatMap((child) => inlineRunsFromNode(docx, child, nextStyle));
  return runs.length > 0 ? runs : [new docx.TextRun({ text: normalizeInlineText(element.textContent ?? ''), ...nextStyle })];
}

function parseHtmlFragment(html: string) {
  const documentFragment = new DOMParser().parseFromString(`<main>${html}</main>`, 'text/html');
  return documentFragment.querySelector('main')!;
}

function normalizeInlineText(value: string) {
  return value.replace(/\s+/g, ' ').trim();
}

function escapeHtml(value: string) {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
