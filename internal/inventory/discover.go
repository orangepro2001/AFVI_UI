package inventory

import (
	"errors"
	"os"
	"path/filepath"
	"strings"
)

// ErrNotFound is returned when no PxInventory directory can be found or opened.
var ErrNotFound = errors.New("inventory: PxInventory not found")

// maxParents is the maximum number of parent directories walked up from a base directory.
const maxParents = 6

// Discover locates the PxInventory directory: first the AFVI_INVENTORY environment variable,
// then the current directory and the executable directory with up to six parents each.
func Discover() (string, error) {
	bases := []string{}
	if wd, err := os.Getwd(); err == nil {
		bases = append(bases, wd)
	}
	if exe, err := os.Executable(); err == nil {
		bases = append(bases, filepath.Dir(exe))
	}
	return discover(os.Getenv, bases)
}

// discover is the testable core of Discover: getenv reads environment variables and bases are the
// starting directories. It returns the normalized PxInventory directory.
func discover(getenv func(string) string, bases []string) (string, error) {
	if env := strings.TrimSpace(getenv("AFVI_INVENTORY")); env != "" {
		if dir, ok := resolveInventory(env); ok {
			return dir, nil
		}
	}

	machine := strings.TrimSpace(getenv("AFVI_MACHINE"))
	if machine == "" {
		machine = "FM1"
	}

	for _, base := range bases {
		if base == "" {
			continue
		}
		dir, err := filepath.Abs(base)
		if err != nil {
			continue
		}
		for i := 0; i <= maxParents; i++ {
			candidates := []string{
				filepath.Join(dir, "PxInventory"),
				filepath.Join(dir, "design", "repo", machine, "PxInventory"),
			}
			for _, c := range candidates {
				if inv, ok := resolveInventory(c); ok {
					return inv, nil
				}
			}
			parent := filepath.Dir(dir)
			if parent == dir {
				break
			}
			dir = parent
		}
	}
	return "", ErrNotFound
}

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
