package connector

import (
	"os"
	"path/filepath"
	"strings"
)

// Check checks one folder: it must be an absolute path to a directory that directly contains the
// directories PxInventory and PxRepository.
func Check(path string) PathCheck {
	path = strings.TrimSpace(path)
	if path == "" {
		return PathCheck{Message: "path is empty"}
	}
	if !filepath.IsAbs(path) {
		return PathCheck{Message: "path must be absolute"}
	}
	info, err := os.Stat(path)
	if err != nil {
		return PathCheck{Message: "folder not found"}
	}
	if !info.IsDir() {
		return PathCheck{Message: "not a folder"}
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

// isDir reports whether path exists and is a directory.
func isDir(path string) bool {
	info, err := os.Stat(path)
	return err == nil && info.IsDir()
}
