package connector

import (
	"os"
	"path/filepath"
	"runtime"
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

func TestUncServer(t *testing.T) {
	cases := []struct {
		path string
		want string
		ok   bool
	}{
		{`\\192.168.1.63`, `\\192.168.1.63`, true},
		{`\\192.168.1.63\`, `\\192.168.1.63`, true},
		{`//host/`, `\\host`, true},
		{`//host`, `\\host`, true},
		{`\\host\\`, `\\host`, true},
		{`\\host\share`, "", false},
		{`\\host\share\dir`, "", false},
		{`\\`, "", false},
		{`\\\host`, "", false},
		{`\\.\C:`, "", false},
		{`\\?\C:\x`, "", false},
		{`C:\x`, "", false},
		{`/abs/path`, "", false},
		{"", "", false},
	}
	for _, c := range cases {
		got, ok := uncServer(c.path)
		if ok != c.ok || got != c.want {
			t.Errorf("uncServer(%q) = %q, %v want %q, %v", c.path, got, ok, c.want, c.ok)
		}
	}
}

func TestCheckUNCServerRoot(t *testing.T) {
	old := onWindows
	t.Cleanup(func() { onWindows = old })

	// On Windows the server root is not stat-ed (it is no directory there); only its shares
	// PxInventory and PxRepository are looked at. No such server here, so it cannot be reached.
	onWindows = true
	got := Check(`\\no-such-server-xyz`)
	if got.OK || got.Message != "network path not found" {
		t.Fatalf("Check = %+v", got)
	}

	if runtime.GOOS == "linux" {
		onWindows = false
		got = Check(`\\no-such-server-xyz`)
		if got.Message != "path must be absolute" {
			t.Fatalf("not on Windows: Check = %+v", got)
		}
	}
}

func TestNormalize(t *testing.T) {
	old := onWindows
	t.Cleanup(func() { onWindows = old })

	dir := t.TempDir()
	if got := Normalize("  " + filepath.Join(dir, "a", "..") + string(filepath.Separator) + " "); got != dir {
		t.Errorf("Normalize(dir/a/../) = %q want %q", got, dir)
	}

	onWindows = true
	for _, in := range []string{`\\host`, `\\host\`, `//host/`, "  //host  "} {
		if got := Normalize(in); got != `\\host` {
			t.Errorf("Normalize(%q) = %q want %q", in, got, `\\host`)
		}
	}
	onWindows = false
	if runtime.GOOS == "linux" {
		if got := Normalize(`//host/`); got != "/host" {
			t.Errorf("Normalize(//host/) off Windows = %q want /host", got)
		}
	}
}

func TestCheckStatErrors(t *testing.T) {
	if runtime.GOOS != "linux" {
		t.Skip("uses POSIX error codes")
	}

	// A path below a regular file: neither "not found" nor a permission problem, so the message
	// carries the system's text.
	file := filepath.Join(t.TempDir(), "plain.txt")
	writeFile(t, file, "x")
	got := Check(filepath.Join(file, "sub"))
	if got.OK || got.Message != "cannot open folder: not a directory" {
		t.Errorf("below a file: Check = %+v", got)
	}

	if os.Geteuid() == 0 {
		t.Skip("root ignores directory permissions")
	}
	parent := t.TempDir()
	child := filepath.Join(parent, "child")
	mkdir(t, child)
	if err := os.Chmod(parent, 0o000); err != nil {
		t.Fatalf("chmod: %v", err)
	}
	t.Cleanup(func() { _ = os.Chmod(parent, 0o755) })
	got = Check(child)
	if got.OK || got.Message != "access denied" {
		t.Errorf("unreadable parent: Check = %+v", got)
	}
}
