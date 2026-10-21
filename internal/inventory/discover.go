package inventory

import (
	"errors"
	"os"
	"path/filepath"
)

// ErrNotFound is returned when no PxInventory directory can be found or opened.
var ErrNotFound = errors.New("inventory: PxInventory not found")

// resolveInventory accepts a PxInventory directory or its parent and returns the PxInventory
// directory if it contains INSPECT_SPEC.
func resolveInventory(path string) (string, bool) {
	abs, err := filepath.Abs(path)
	if err != nil {
		return "", false
	}
	if isDir(filepath.Join(abs, "INSPECT_SPEC")) {
		return abs, true
	}
	nested := filepath.Join(abs, "PxInventory")
	if isDir(filepath.Join(nested, "INSPECT_SPEC")) {
		return nested, true
	}
	return "", false
}

// isDir reports whether path exists and is a directory.
func isDir(path string) bool {
	info, err := os.Stat(path)
	return err == nil && info.IsDir()
}
