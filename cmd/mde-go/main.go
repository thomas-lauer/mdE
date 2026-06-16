package main

import (
	"fmt"
	"os"
	"path/filepath"
	"regexp"
	"strings"
	"syscall"
	"unsafe"

	"golang.org/x/sys/windows"
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

const (
	appName = "mdE Go Win32"

	idOpen   = 1001
	idSave   = 1002
	idSaveAs = 1003
	idExit   = 1004

	idEditor  = 2001
	idPreview = 2002
	idStatus  = 2003

	enChange = 0x0300

	cwUseDefault = ^uintptr(0)

	wsOverlapped       = 0x00000000
	wsCaption          = 0x00C00000
	wsSysMenu          = 0x00080000
	wsThickFrame       = 0x00040000
	wsMinimizeBox      = 0x00020000
	wsMaximizeBox      = 0x00010000
	wsChild            = 0x40000000
	wsVisible          = 0x10000000
	wsVScroll          = 0x00200000
	wsHScroll          = 0x00100000
	wsTabStop          = 0x00010000
	wsBorder           = 0x00800000
	wsOverlappedWindow = wsOverlapped | wsCaption | wsSysMenu | wsThickFrame | wsMinimizeBox | wsMaximizeBox

	esLeft        = 0x0000
	esMultiline   = 0x0004
	esAutoVScroll = 0x0040
	esAutoHScroll = 0x0080
	esWantReturn  = 0x1000
	esReadOnly    = 0x0800

	cwRedraw        = 0x0001
	cwHRedraw       = 0x0002
	colorWindow     = 5
	iconApplication = 32512
	cursorArrow     = 32512

	wmCreate        = 0x0001
	wmSize          = 0x0005
	wmCommand       = 0x0111
	wmDestroy       = 0x0002
	wmSetText       = 0x000C
	wmGetText       = 0x000D
	wmGetTextLength = 0x000E
	wmSetFont       = 0x0030

	ofnPathMustExist   = 0x00000800
	ofnFileMustExist   = 0x00001000
	ofnOverwritePrompt = 0x00000002

	mfString    = 0x00000000
	mfSeparator = 0x00000800
	mfPopup     = 0x00000010
)

var (
	appVersion = "dev"

	user32   = windows.NewLazySystemDLL("user32.dll")
	kernel32 = windows.NewLazySystemDLL("kernel32.dll")
	gdi32    = windows.NewLazySystemDLL("gdi32.dll")
	comdlg32 = windows.NewLazySystemDLL("comdlg32.dll")

	procRegisterClassExW     = user32.NewProc("RegisterClassExW")
	procCreateWindowExW      = user32.NewProc("CreateWindowExW")
	procDefWindowProcW       = user32.NewProc("DefWindowProcW")
	procDestroyWindow        = user32.NewProc("DestroyWindow")
	procShowWindow           = user32.NewProc("ShowWindow")
	procUpdateWindow         = user32.NewProc("UpdateWindow")
	procGetMessageW          = user32.NewProc("GetMessageW")
	procTranslateMessage     = user32.NewProc("TranslateMessage")
	procDispatchMessageW     = user32.NewProc("DispatchMessageW")
	procPostQuitMessage      = user32.NewProc("PostQuitMessage")
	procMoveWindow           = user32.NewProc("MoveWindow")
	procSendMessageW         = user32.NewProc("SendMessageW")
	procGetWindowTextLengthW = user32.NewProc("GetWindowTextLengthW")
	procGetWindowTextW       = user32.NewProc("GetWindowTextW")
	procMessageBoxW          = user32.NewProc("MessageBoxW")
	procLoadIconW            = user32.NewProc("LoadIconW")
	procLoadCursorW          = user32.NewProc("LoadCursorW")
	procCreateMenu           = user32.NewProc("CreateMenu")
	procCreatePopupMenu      = user32.NewProc("CreatePopupMenu")
	procAppendMenuW          = user32.NewProc("AppendMenuW")
	procSetMenu              = user32.NewProc("SetMenu")
	procSetFocus             = user32.NewProc("SetFocus")
	procGetStockObject       = gdi32.NewProc("GetStockObject")
	procGetOpenFileNameW     = comdlg32.NewProc("GetOpenFileNameW")
	procGetSaveFileNameW     = comdlg32.NewProc("GetSaveFileNameW")
	procGetModuleHandleW     = kernel32.NewProc("GetModuleHandleW")

	mainWindow uintptr
	editor     uintptr
	preview    uintptr
	status     uintptr
	openBtn    uintptr
	saveBtn    uintptr
	saveAsBtn  uintptr

	currentPath string
	dirty       bool
	updating    bool
)

func appTitle() string {
	return fmt.Sprintf("%s - Version %s", appName, appVersion)
}

type wndClassEx struct {
	cbSize        uint32
	style         uint32
	lpfnWndProc   uintptr
	cbClsExtra    int32
	cbWndExtra    int32
	hInstance     uintptr
	hIcon         uintptr
	hCursor       uintptr
	hbrBackground uintptr
	lpszMenuName  *uint16
	lpszClassName *uint16
	hIconSm       uintptr
}

type point struct {
	x int32
	y int32
}

type msg struct {
	hwnd    uintptr
	message uint32
	wParam  uintptr
	lParam  uintptr
	time    uint32
	pt      point
}

type openFileName struct {
	lStructSize       uint32
	hwndOwner         uintptr
	hInstance         uintptr
	lpstrFilter       *uint16
	lpstrCustomFilter *uint16
	nMaxCustFilter    uint32
	nFilterIndex      uint32
	lpstrFile         *uint16
	nMaxFile          uint32
	lpstrFileTitle    *uint16
	nMaxFileTitle     uint32
	lpstrInitialDir   *uint16
	lpstrTitle        *uint16
	flags             uint32
	nFileOffset       uint16
	nFileExtension    uint16
	lpstrDefExt       *uint16
	lCustData         uintptr
	lpfnHook          uintptr
	lpTemplateName    *uint16
	pvReserved        uintptr
	dwReserved        uint32
	flagsEx           uint32
}

func main() {
	if err := run(); err != nil {
		messageBox(0, "mdE Go", err.Error())
		os.Exit(1)
	}
}

func run() error {
	instance, _, _ := procGetModuleHandleW.Call(0)

	className := windows.StringToUTF16Ptr("MDE_GO_WINDOW")
	wc := wndClassEx{
		cbSize:        uint32(unsafe.Sizeof(wndClassEx{})),
		style:         cwHRedraw | cwRedraw,
		lpfnWndProc:   syscall.NewCallback(windowProc),
		hInstance:     uintptr(instance),
		hbrBackground: colorWindow + 1,
		lpszClassName: className,
	}
	wc.hIcon, _, _ = procLoadIconW.Call(0, iconApplication)
	wc.hIconSm = wc.hIcon
	wc.hCursor, _, _ = procLoadCursorW.Call(0, cursorArrow)

	if atom, _, callErr := procRegisterClassExW.Call(uintptr(unsafe.Pointer(&wc))); atom == 0 {
		return fmt.Errorf("Fensterklasse konnte nicht registriert werden: %v", callErr)
	}

	var createErr error
	mainWindow, _, createErr = procCreateWindowExW.Call(
		0,
		uintptr(unsafe.Pointer(className)),
		uintptr(unsafe.Pointer(windows.StringToUTF16Ptr(appTitle()))),
		wsOverlappedWindow|wsVisible,
		cwUseDefault,
		cwUseDefault,
		1240,
		760,
		0,
		0,
		uintptr(instance),
		0,
	)
	if mainWindow == 0 {
		return fmt.Errorf("Hauptfenster konnte nicht erstellt werden: %v", createErr)
	}

	createMenu(mainWindow)
	setText(editor, defaultDocument)
	updatePreview()
	updateStatus()

	if startupPath := findStartupMarkdown(os.Args[1:]); startupPath != "" {
		if err := openPath(startupPath); err != nil {
			messageBox(mainWindow, "Datei konnte nicht geoeffnet werden", err.Error())
		}
	}

	procShowWindow.Call(mainWindow, 1)
	procUpdateWindow.Call(mainWindow)
	procSetFocus.Call(editor)

	var message msg
	for {
		ret, _, _ := procGetMessageW.Call(uintptr(unsafe.Pointer(&message)), 0, 0, 0)
		if int32(ret) <= 0 {
			break
		}
		procTranslateMessage.Call(uintptr(unsafe.Pointer(&message)))
		procDispatchMessageW.Call(uintptr(unsafe.Pointer(&message)))
	}

	return nil
}

func windowProc(hwnd uintptr, message uint32, wParam, lParam uintptr) uintptr {
	switch message {
	case wmCreate:
		createControls(hwnd)
		return 0
	case wmSize:
		width := int32(lParam & 0xffff)
		height := int32((lParam >> 16) & 0xffff)
		layoutControls(width, height)
		return 0
	case wmCommand:
		commandID := int32(wParam & 0xffff)
		notification := int32((wParam >> 16) & 0xffff)
		switch commandID {
		case idOpen:
			openFile()
		case idSave:
			saveFile()
		case idSaveAs:
			saveFileAs()
		case idExit:
			procDestroyWindow.Call(hwnd)
		case idEditor:
			if notification == enChange && !updating {
				dirty = true
				updatePreview()
				updateStatus()
			}
		}
		return 0
	case wmDestroy:
		procPostQuitMessage.Call(0)
		return 0
	}

	ret, _, _ := procDefWindowProcW.Call(hwnd, uintptr(message), wParam, lParam)
	return ret
}

func createControls(parent uintptr) {
	font, _, _ := procGetStockObject.Call(17)
	openBtn = createChild("BUTTON", "Oeffnen", wsTabStop, parent, idOpen)
	saveBtn = createChild("BUTTON", "Speichern", wsTabStop, parent, idSave)
	saveAsBtn = createChild("BUTTON", "Speichern unter", wsTabStop, parent, idSaveAs)
	status = createChild("STATIC", "Nicht gespeichert", 0, parent, idStatus)
	editor = createChild("EDIT", "", wsBorder|wsVScroll|wsHScroll|esLeft|esMultiline|esAutoVScroll|esAutoHScroll|esWantReturn, parent, idEditor)
	preview = createChild("EDIT", "", wsBorder|wsVScroll|wsHScroll|esLeft|esMultiline|esAutoVScroll|esAutoHScroll|esReadOnly, parent, idPreview)

	for _, hwnd := range []uintptr{openBtn, saveBtn, saveAsBtn, status, editor, preview} {
		procSendMessageW.Call(hwnd, wmSetFont, font, 1)
	}
}

func createChild(className, title string, style uintptr, parent uintptr, id int) uintptr {
	hwnd, _, _ := procCreateWindowExW.Call(
		0,
		uintptr(unsafe.Pointer(windows.StringToUTF16Ptr(className))),
		uintptr(unsafe.Pointer(windows.StringToUTF16Ptr(title))),
		wsChild|wsVisible|style,
		0,
		0,
		100,
		30,
		parent,
		uintptr(id),
		0,
		0,
	)
	return hwnd
}

func layoutControls(width, height int32) {
	if width <= 0 || height <= 0 {
		return
	}

	margin := int32(10)
	toolbarHeight := int32(42)
	gap := int32(8)
	buttonHeight := int32(28)

	move(openBtn, margin, margin, 88, buttonHeight)
	move(saveBtn, margin+96, margin, 96, buttonHeight)
	move(saveAsBtn, margin+200, margin, 130, buttonHeight)
	move(status, margin+342, margin+4, width-margin*2-342, buttonHeight)

	contentTop := toolbarHeight + margin
	contentHeight := height - contentTop - margin
	leftWidth := (width - margin*2 - gap) / 2
	rightX := margin + leftWidth + gap
	rightWidth := width - rightX - margin

	move(editor, margin, contentTop, leftWidth, contentHeight)
	move(preview, rightX, contentTop, rightWidth, contentHeight)
}

func move(hwnd uintptr, x, y, width, height int32) {
	if hwnd == 0 {
		return
	}
	procMoveWindow.Call(hwnd, uintptr(x), uintptr(y), uintptr(width), uintptr(height), 1)
}

func createMenu(hwnd uintptr) {
	menu, _, _ := procCreateMenu.Call()
	fileMenu, _, _ := procCreatePopupMenu.Call()

	appendMenu(fileMenu, mfString, idOpen, "Oeffnen...")
	appendMenu(fileMenu, mfString, idSave, "Speichern")
	appendMenu(fileMenu, mfString, idSaveAs, "Speichern unter...")
	appendMenu(fileMenu, mfSeparator, 0, "")
	appendMenu(fileMenu, mfString, idExit, "Beenden")
	appendMenu(menu, mfPopup, int(fileMenu), "Datei")

	procSetMenu.Call(hwnd, menu)
}

func appendMenu(menu uintptr, flags uintptr, id int, text string) {
	var textPtr uintptr
	if text != "" {
		textPtr = uintptr(unsafe.Pointer(windows.StringToUTF16Ptr(text)))
	}
	procAppendMenuW.Call(menu, flags, uintptr(id), textPtr)
}

func openFile() {
	filePath, ok := showFileDialog(false, "")
	if !ok {
		return
	}
	if err := openPath(filePath); err != nil {
		messageBox(mainWindow, "Datei konnte nicht geoeffnet werden", err.Error())
	}
}

func openPath(filePath string) error {
	content, err := os.ReadFile(filePath)
	if err != nil {
		return err
	}

	currentPath = filePath
	dirty = false
	updating = true
	setText(editor, string(content))
	updating = false
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
		messageBox(mainWindow, "Datei konnte nicht gespeichert werden", err.Error())
	}
}

func saveFileAs() {
	filePath, ok := showFileDialog(true, normalizeMarkdownPath(currentPath))
	if !ok {
		return
	}
	if err := writeCurrentDocument(normalizeMarkdownPath(filePath)); err != nil {
		messageBox(mainWindow, "Datei konnte nicht gespeichert werden", err.Error())
	}
}

func writeCurrentDocument(filePath string) error {
	if err := os.WriteFile(filePath, []byte(getText(editor)), 0o644); err != nil {
		return err
	}
	currentPath = filePath
	dirty = false
	updateStatus()
	return nil
}

func showFileDialog(save bool, initialPath string) (string, bool) {
	buffer := make([]uint16, 4096)
	if initialPath != "" {
		copy(buffer, windows.StringToUTF16(initialPath))
	}
	filter := windows.StringToUTF16("Markdown (*.md;*.markdown)\x00*.md;*.markdown\x00Alle Dateien (*.*)\x00*.*\x00")
	title := "Markdown-Datei oeffnen"
	flags := uint32(ofnPathMustExist | ofnFileMustExist)
	proc := procGetOpenFileNameW

	if save {
		title = "Markdown-Datei speichern"
		flags = ofnPathMustExist | ofnOverwritePrompt
		proc = procGetSaveFileNameW
	}

	ofn := openFileName{
		lStructSize: uint32(unsafe.Sizeof(openFileName{})),
		hwndOwner:   mainWindow,
		lpstrFilter: &filter[0],
		lpstrFile:   &buffer[0],
		nMaxFile:    uint32(len(buffer)),
		lpstrTitle:  windows.StringToUTF16Ptr(title),
		flags:       flags,
		lpstrDefExt: windows.StringToUTF16Ptr("md"),
	}

	ret, _, _ := proc.Call(uintptr(unsafe.Pointer(&ofn)))
	if ret == 0 {
		return "", false
	}

	return windows.UTF16ToString(buffer), true
}

func updatePreview() {
	if preview == 0 || editor == 0 {
		return
	}
	setText(preview, renderMarkdownText(getText(editor)))
}

func updateStatus() {
	if status == 0 {
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
	setText(status, fmt.Sprintf("%s - %s", name, state))
}

func getText(hwnd uintptr) string {
	length, _, _ := procGetWindowTextLengthW.Call(hwnd)
	buffer := make([]uint16, length+1)
	procGetWindowTextW.Call(hwnd, uintptr(unsafe.Pointer(&buffer[0])), length+1)
	return windows.UTF16ToString(buffer)
}

func setText(hwnd uintptr, text string) {
	procSendMessageW.Call(hwnd, wmSetText, 0, uintptr(unsafe.Pointer(windows.StringToUTF16Ptr(text))))
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
			out = append(out, "- "+cleanInline(trimmed[2:]))
		case strings.HasPrefix(trimmed, "* "):
			out = append(out, "- "+cleanInline(trimmed[2:]))
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
	return linkPattern.ReplaceAllString(result, "$1 ($2)")
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

func messageBox(hwnd uintptr, title, text string) {
	procMessageBoxW.Call(
		hwnd,
		uintptr(unsafe.Pointer(windows.StringToUTF16Ptr(text))),
		uintptr(unsafe.Pointer(windows.StringToUTF16Ptr(title))),
		0x10,
	)
}
