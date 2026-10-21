package connector

import (
	"errors"
	"io/fs"
	"os"
	"path/filepath"
	"runtime"
	"strings"
)

// onWindows decides whether a bare UNC server root is accepted (see uncServer); a variable so that
// tests can flip it.
var onWindows = runtime.GOOS == "windows"

// Check checks one folder: it must be an absolute path to a directory that directly contains the
// directories PxInventory and PxRepository. On Windows a bare UNC server root such as
// \\192.168.1.63 is accepted too: it is the list of the server's shares, not a directory (Windows
// cannot stat it), and PxInventory and PxRepository are shares of that server.
func Check(path string) PathCheck {
	path = strings.TrimSpace(path)
	if path == "" {
		return PathCheck{Message: "path is empty"}
	}
	if server, ok := uncServer(path); ok && onWindows {
		path = server
		// A server that cannot be reached is not "PxInventory is missing": say what is wrong.
		if _, err := os.Stat(filepath.Join(path, "PxInventory")); errors.Is(err, fs.ErrNotExist) {
			return PathCheck{Message: "network path not found"}
		}
	} else {
		if !filepath.IsAbs(path) {
			return PathCheck{Message: "path must be absolute"}
		}
		info, err := os.Stat(path)
		if err != nil {
			return PathCheck{Message: statMessage(err)}
		}
		if !info.IsDir() {
			return PathCheck{Message: "not a folder"}
		}
	}
	inv := isDir(filepath.Join(path, "PxInventory"))
	repo := isDir(filepath.Join(path, "PxRepository"))
	switch {
	case !inv && !repo:
		return PathCheck{Message: "PxInventory and PxRepository are missing"}
	case !inv:
		return PathCheck{Message: "PxInventory is missing"}
	case !repo:
		return PathCheck{Message: "PxRepository is missing"}
	}
	return PathCheck{OK: true}
}

// statMessage turns the error of stat-ing the folder into the message of a PathCheck.
func statMessage(err error) string {
	switch {
	case errors.Is(err, fs.ErrNotExist):
		return "folder not found"
	case errors.Is(err, fs.ErrPermission):
		return "access denied"
	}
	var pathErr *fs.PathError
	if errors.As(err, &pathErr) {
		return "cannot open folder: " + pathErr.Err.Error()
	}
	return "cannot open folder: " + err.Error()
}

// Normalize returns the form of a folder that is stored: trimmed and cleaned, and a bare UNC
// server root (\\host, \\host\, //host/) as \\host.
func Normalize(path string) string {
	path = strings.TrimSpace(path)
	if server, ok := uncServer(path); ok && onWindows {
		return server
	}
	return filepath.Clean(path)
}

// uncServer reports whether path is a bare UNC server root (\\host, \\host\, //host/) and returns
// it as \\host. A path with a share (\\host\share) or a device prefix (\\.\, \\?\) is not one.
func uncServer(path string) (string, bool) {
	isSlash := func(c byte) bool { return c == '\\' || c == '/' }
	if len(path) < 3 || !isSlash(path[0]) || !isSlash(path[1]) || isSlash(path[2]) {
		return "", false
	}
	host := strings.TrimRight(path[2:], `\/`)
	if host == "" || host == "." || host == "?" || strings.ContainsAny(host, `\/`) {
		return "", false
	}
	return `\\` + host, true
}

// isDir reports whether path exists and is a directory.
func isDir(path string) bool {
	info, err := os.Stat(path)
	return err == nil && info.IsDir()
}
