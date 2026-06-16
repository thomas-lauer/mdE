package main

import (
	"fmt"
	"os"
	"path/filepath"
	"regexp"
	"strings"

	"github.com/lxn/walk"
	. "github.com/lxn/walk/declarative"
)

const defaultDocument = `# Willkommen in mdE Go

Diese Variante ist eine eigenstaendige Windows-App in Go.

## Funktionen

- Markdown schreiben
- Vorschau als Go-gerenderter Text
- Dateien oeffnen
- Dateien speichern
- Start mit Dateiargument
`

var (
	mainWindow *walk.MainWindow
	editor     *walk.TextEdit
	preview    *walk.TextEdit
	status     *walk.Label

	currentPath string
	dirty       bool
)

func main() {
	if err := run(); err != nil {
		walk.MsgBox(nil, "mdE Go", err.Error(), walk.MsgBoxIconError)
		os.Exit(1)
	}
}

func run() error {
	err := MainWindow{
		AssignTo: &mainWindow,
		Title:    "mdE Go - Markdown Editor",
		MinSize:  Size{Width: 940, Height: 620},
		Size:     Size{Width: 1240, Height: 760},
		Layout:   VBox{MarginsZero: true, SpacingZero: true},
		MenuItems: []MenuItem{
			Menu{
				Text: "Datei",
				Items: []MenuItem{
					Action{Text: "Oeffnen...\tCtrl+O", OnTriggered: openFile},
					Action{Text: "Speichern\tCtrl+S", OnTriggered: saveFile},
					Action{Text: "Speichern unter...\tCtrl+Shift+S", OnTriggered: saveFileAs},
					Separator{},
					Action{Text: "Beenden", OnTriggered: func() { mainWindow.Close() }},
				},
			},
		},
		Children: []Widget{
			Composite{
				Layout: HBox{Margins: Margins{Left: 10, Top: 10, Right: 10, Bottom: 10}},
				Children: []Widget{
					PushButton{Text: "Oeffnen", OnClicked: openFile},
					PushButton{Text: "Speichern", OnClicked: saveFile},
					PushButton{Text: "Speichern unter", OnClicked: saveFileAs},
					Label{AssignTo: &status, Text: "Nicht gespeichert"},
				},
			},
			HSplitter{
				Children: []Widget{
					TextEdit{
						AssignTo:      &editor,
						Text:          defaultDocument,
						HScroll:       true,
						VScroll:       true,
						OnTextChanged: onEditorChanged,
					},
					TextEdit{
						AssignTo: &preview,
						ReadOnly: true,
						HScroll:  true,
						VScroll:  true,
					},
				},
			},
		},
	}.Create()
	if err != nil {
		return err
	}

	updatePreview()

	if startupPath := findStartupMarkdown(os.Args[1:]); startupPath != "" {
		if err := openPath(startupPath); err != nil {
			showError("Datei konnte nicht geoeffnet werden", err)
		}
	}

	mainWindow.Run()
	return nil
}

func onEditorChanged() {
	dirty = true
	updatePreview()
	updateStatus()
}

func openFile() {
	dlg := new(walk.FileDialog)
	dlg.Title = "Markdown-Datei oeffnen"
	dlg.Filter = "Markdown (*.md;*.markdown)|*.md;*.markdown|Alle Dateien (*.*)|*.*"

	ok, err := dlg.ShowOpen(mainWindow)
	if err != nil {
		showError("Dateidialog konnte nicht geoeffnet werden", err)
		return
	}
	if !ok {
		return
	}

	if err := openPath(dlg.FilePath); err != nil {
		showError("Datei konnte nicht geoeffnet werden", err)
	}
}

func openPath(filePath string) error {
	content, err := os.ReadFile(filePath)
	if err != nil {
		return err
	}

	currentPath = filePath
	dirty = false
	if err := editor.SetText(string(content)); err != nil {
		return err
	}
	updatePreview()
	updateStatus()
	return nil
}

func saveFile() {
	if currentPath == "" {
		saveFileAs()
		return
	}

	if err := writeCurrentDocument(currentPath); err != nil {
		showError("Datei konnte nicht gespeichert werden", err)
	}
}

func saveFileAs() {
	dlg := new(walk.FileDialog)
	dlg.Title = "Markdown-Datei speichern"
	dlg.Filter = "Markdown (*.md;*.markdown)|*.md;*.markdown|Alle Dateien (*.*)|*.*"
	dlg.FilePath = normalizeMarkdownPath(currentPath)

	ok, err := dlg.ShowSave(mainWindow)
	if err != nil {
		showError("Dateidialog konnte nicht geoeffnet werden", err)
		return
	}
	if !ok {
		return
	}

	filePath := normalizeMarkdownPath(dlg.FilePath)
	if err := writeCurrentDocument(filePath); err != nil {
		showError("Datei konnte nicht gespeichert werden", err)
	}
}

func writeCurrentDocument(filePath string) error {
	if err := os.WriteFile(filePath, []byte(editor.Text()), 0o644); err != nil {
		return err
	}

	currentPath = filePath
	dirty = false
	updateStatus()
	return nil
}

func updatePreview() {
	if preview == nil || editor == nil {
		return
	}

	_ = preview.SetText(renderMarkdownText(editor.Text()))
}

func updateStatus() {
	if status == nil {
		return
	}

	name := "Neue Datei"
	if currentPath != "" {
		name = filepath.Base(currentPath)
	}

	state := "Gespeichert"
	if dirty {
		state = "Ungespeicherte Aenderungen"
	}

	status.SetText(fmt.Sprintf("%s - %s", name, state))
}

func renderMarkdownText(markdown string) string {
	lines := strings.Split(markdown, "\n")
	out := make([]string, 0, len(lines))

	for _, line := range lines {
		trimmed := strings.TrimSpace(line)

		switch {
		case strings.HasPrefix(trimmed, "###### "):
			out = append(out, strings.TrimSpace(trimmed[7:]))
		case strings.HasPrefix(trimmed, "##### "):
			out = append(out, strings.TrimSpace(trimmed[6:]))
		case strings.HasPrefix(trimmed, "#### "):
			out = append(out, strings.TrimSpace(trimmed[5:]))
		case strings.HasPrefix(trimmed, "### "):
			out = append(out, strings.ToUpper(strings.TrimSpace(trimmed[4:])))
		case strings.HasPrefix(trimmed, "## "):
			out = append(out, strings.ToUpper(strings.TrimSpace(trimmed[3:])))
		case strings.HasPrefix(trimmed, "# "):
			out = append(out, strings.ToUpper(strings.TrimSpace(trimmed[2:])))
		case strings.HasPrefix(trimmed, "- [x] "):
			out = append(out, "[x] "+cleanInline(trimmed[6:]))
		case strings.HasPrefix(trimmed, "- [ ] "):
			out = append(out, "[ ] "+cleanInline(trimmed[6:]))
		case strings.HasPrefix(trimmed, "- "):
			out = append(out, "• "+cleanInline(trimmed[2:]))
		case strings.HasPrefix(trimmed, "* "):
			out = append(out, "• "+cleanInline(trimmed[2:]))
		case strings.HasPrefix(trimmed, "> "):
			out = append(out, "  "+cleanInline(trimmed[2:]))
		default:
			out = append(out, cleanInline(line))
		}
	}

	return strings.Join(out, "\r\n")
}

func cleanInline(value string) string {
	replacements := []struct {
		old string
		new string
	}{
		{"**", ""},
		{"__", ""},
		{"*", ""},
		{"_", ""},
		{"`", ""},
		{"<u>", ""},
		{"</u>", ""},
	}

	result := value
	for _, replacement := range replacements {
		result = strings.ReplaceAll(result, replacement.old, replacement.new)
	}

	linkPattern := regexp.MustCompile(`\[([^\]]+)\]\(([^)]+)\)`)
	result = linkPattern.ReplaceAllString(result, "$1 ($2)")
	return result
}

func findStartupMarkdown(args []string) string {
	for _, arg := range args {
		cleaned := strings.Trim(arg, "\"")
		if isMarkdownPath(cleaned) {
			if absolute, err := filepath.Abs(cleaned); err == nil {
				return absolute
			}
			return cleaned
		}
	}

	return ""
}

func isMarkdownPath(filePath string) bool {
	extension := strings.ToLower(filepath.Ext(filePath))
	return extension == ".md" || extension == ".markdown"
}

func normalizeMarkdownPath(filePath string) string {
	if filePath == "" {
		return "notizen.md"
	}
	if isMarkdownPath(filePath) {
		return filePath
	}
	return filePath + ".md"
}

func showError(title string, err error) {
	walk.MsgBox(mainWindow, title, err.Error(), walk.MsgBoxIconError)
}
