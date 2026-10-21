package appdata

import (
	"os"
	"path/filepath"
	"testing"
)

func TestDirIsInsideTheUserConfigDir(t *testing.T) {
	cfg, err := os.UserConfigDir()
	if err != nil {
		t.Skipf("no user config dir here: %v", err)
	}
	dir, err := Dir()
	if err != nil {
		t.Fatalf("Dir: %v", err)
	}
	if want := filepath.Join(cfg, "AFVI-UI"); dir != want {
		t.Fatalf("Dir = %q want %q", dir, want)
	}
}

func TestPathJoinsUnderDir(t *testing.T) {
	dir, err := Dir()
	if err != nil {
		t.Skipf("no user config dir here: %v", err)
	}
	got, err := Path("webview2")
	if err != nil {
		t.Fatalf("Path: %v", err)
	}
	if want := filepath.Join(dir, "webview2"); got != want {
		t.Fatalf("Path = %q want %q", got, want)
	}
	got, err = Path("a", "b.json")
	if err != nil {
		t.Fatalf("Path: %v", err)
	}
	if want := filepath.Join(dir, "a", "b.json"); got != want {
		t.Fatalf("Path = %q want %q", got, want)
	}
}

// The tests of this module must never write into the real folder: Dir does not create it.
func TestDirDoesNotCreateTheFolder(t *testing.T) {
	cfg := t.TempDir()
	t.Setenv("XDG_CONFIG_HOME", cfg)
	t.Setenv("AppData", cfg)
	t.Setenv("HOME", cfg)
	dir, err := Dir()
	if err != nil {
		t.Skipf("no user config dir here: %v", err)
	}
	if _, err := os.Stat(dir); !os.IsNotExist(err) {
		t.Fatalf("Dir must not create %q (stat error: %v)", dir, err)
	}
}
