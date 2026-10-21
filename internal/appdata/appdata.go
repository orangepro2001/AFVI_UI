// Package appdata is the one folder where AFVI UI keeps everything it saves for the user: the
// Connector configuration and the WebView2 browser data. It is os.UserConfigDir()/AFVI-UI, which on
// Windows is %AppData%\AFVI-UI, a folder Explorer hides together with AppData.
//
// The folder is the same for every build and version. WebView2 would otherwise keep its data in a
// folder named after the executable (%AppData%\AFVI-UI-<version>-windows-amd64.exe), so each
// nightly would leave a new folder of about 70 MB behind and start with an empty UI state.
//
// Development and tests never use this folder: they use the fixtures under internal/inventory/testdata
// and design/repo, and the git-ignored .dev/ folder (scripts/devapi.go).
package appdata

import (
	"os"
	"path/filepath"
)

// Name is the folder name inside the user's configuration directory.
const Name = "AFVI-UI"

// Dir is os.UserConfigDir()/AFVI-UI. It is not created here.
func Dir() (string, error) {
	dir, err := os.UserConfigDir()
	if err != nil {
		return "", err
	}
	return filepath.Join(dir, Name), nil
}

// Path is Dir joined with the given elements, e.g. Path("connector.json") or Path("webview2").
func Path(elem ...string) (string, error) {
	dir, err := Dir()
	if err != nil {
		return "", err
	}
	return filepath.Join(append([]string{dir}, elem...)...), nil
}
