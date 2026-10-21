package connector

import (
	"os"
	"path/filepath"
	"testing"
)

// mkdir creates path (and parents).
func mkdir(t *testing.T, path string) {
	t.Helper()
	if err := os.MkdirAll(path, 0o755); err != nil {
		t.Fatalf("mkdir %q: %v", path, err)
	}
}

// writeFile creates parent directories and writes data to a file.
func writeFile(t *testing.T, path, data string) {
	t.Helper()
	mkdir(t, filepath.Dir(path))
	if err := os.WriteFile(path, []byte(data), 0o644); err != nil {
		t.Fatalf("write %q: %v", path, err)
	}
}

// validMachine makes a folder that directly contains PxInventory and PxRepository and returns it.
func validMachine(t *testing.T) string {
	t.Helper()
	dir := t.TempDir()
	mkdir(t, filepath.Join(dir, "PxInventory"))
	mkdir(t, filepath.Join(dir, "PxRepository"))
	return dir
}

func TestCheck(t *testing.T) {
	missing := t.TempDir()
	onlyInv := t.TempDir()
	mkdir(t, filepath.Join(onlyInv, "PxInventory"))
	onlyRepo := t.TempDir()
	mkdir(t, filepath.Join(onlyRepo, "PxRepository"))
	neither := t.TempDir()
	fileAsInventory := t.TempDir()
	writeFile(t, filepath.Join(fileAsInventory, "PxInventory"), "x")
	mkdir(t, filepath.Join(fileAsInventory, "PxRepository"))
	regularFile := filepath.Join(t.TempDir(), "plain.txt")
	writeFile(t, regularFile, "x")
	valid := validMachine(t)

	cases := []struct {
		name string
		path string
		ok   bool
		msg  string
	}{
		{"empty", "", false, "path is empty"},
		{"spaces", "   ", false, "path is empty"},
		{"relative", filepath.Join("some", "relative"), false, "path must be absolute"},
		{"not exist", filepath.Join(missing, "nope"), false, "folder not found"},
		{"file", regularFile, false, "not a folder"},
		{"only inventory", onlyInv, false, "PxRepository is missing"},
		{"only repository", onlyRepo, false, "PxInventory is missing"},
		{"neither", neither, false, "PxInventory and PxRepository are missing"},
		{"inventory is file", fileAsInventory, false, "PxInventory is missing"},
		{"valid", valid, true, ""},
		{"valid with spaces", "  " + valid + "  ", true, ""},
	}

	for _, c := range cases {
		t.Run(c.name, func(t *testing.T) {
			got := Check(c.path)
			if got.OK != c.ok {
				t.Fatalf("OK = %v want %v (message %q)", got.OK, c.ok, got.Message)
			}
			if got.Message != c.msg {
				t.Fatalf("Message = %q want %q", got.Message, c.msg)
			}
		})
	}
}
