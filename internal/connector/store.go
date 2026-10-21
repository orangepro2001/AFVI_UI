package connector

import (
	"encoding/json"
	"errors"
	"os"
	"path/filepath"
	"sync"
)

// Data is the content of the configuration file.
type Data struct {
	Version int               `json:"version"`
	Active  string            `json:"active"`
	Paths   map[string]string `json:"paths"`
}

// Store reads and writes the connector configuration JSON file (the local "database"). A Store
// with an empty file name keeps the data in memory only.
type Store struct {
	mu   sync.Mutex
	file string
	// mem is what a memory-only Store stored last.
	mem Data
}

// NewStore returns a Store for the JSON file; file == "" keeps the data in memory only.
func NewStore(file string) *Store {
	return &Store{file: file}
}

// DefaultFile is os.UserConfigDir()/AFVI-UI/connector.json.
func DefaultFile() (string, error) {
	dir, err := os.UserConfigDir()
	if err != nil {
		return "", err
	}
	return filepath.Join(dir, "AFVI-UI", "connector.json"), nil
}

// emptyData returns the "nothing configured" Data: Version 1 and a non-nil Paths.
func emptyData() Data {
	return Data{Version: 1, Paths: map[string]string{}}
}

// normalize returns d with Version 1, a non-nil copy of Paths and an Active that is a known host.
func normalize(d Data) Data {
	out := Data{Version: 1, Active: d.Active, Paths: map[string]string{}}
	for k, v := range d.Paths {
		out.Paths[k] = v
	}
	if !isMachine(out.Active) {
		out.Active = ""
	}
	return out
}

// isMachine reports whether id is one of Machines.
func isMachine(id string) bool {
	for _, m := range Machines {
		if m == id {
			return true
		}
	}
	return false
}

// Load reads the file. A missing or empty file, or one that is not valid JSON, is "nothing
// configured": it returns an empty Data (Version 1, Paths non-nil) and a nil error. An unknown
// Active is cleared. A memory-only Store returns what Save stored last.
func (s *Store) Load() (Data, error) {
	s.mu.Lock()
	defer s.mu.Unlock()

	if s.file == "" {
		return normalize(s.mem), nil
	}

	data, err := os.ReadFile(s.file)
	if err != nil {
		if errors.Is(err, os.ErrNotExist) {
			return emptyData(), nil
		}
		return emptyData(), err
	}
	if len(data) == 0 {
		return emptyData(), nil
	}

	var d Data
	if err := json.Unmarshal(data, &d); err != nil {
		return emptyData(), nil
	}
	return normalize(d), nil
}

// Save writes the file atomically (temp file in the same directory, then rename; MkdirAll the
// directory with 0o755, file 0o644); Version is forced to 1. A memory-only Store keeps a copy.
func (s *Store) Save(d Data) error {
	s.mu.Lock()
	defer s.mu.Unlock()

	out := normalize(d)

	if s.file == "" {
		s.mem = out
		return nil
	}

	data, err := json.MarshalIndent(out, "", "  ")
	if err != nil {
		return err
	}
	data = append(data, '\n')

	dir := filepath.Dir(s.file)
	if err := os.MkdirAll(dir, 0o755); err != nil {
		return err
	}

	tmp, err := os.CreateTemp(dir, ".connector-*.json")
	if err != nil {
		return err
	}
	tmpName := tmp.Name()
	cleanup := func() {
		tmp.Close()
		os.Remove(tmpName)
	}
	if _, err := tmp.Write(data); err != nil {
		cleanup()
		return err
	}
	if err := tmp.Close(); err != nil {
		os.Remove(tmpName)
		return err
	}
	if err := os.Chmod(tmpName, 0o644); err != nil {
		os.Remove(tmpName)
		return err
	}
	if err := os.Rename(tmpName, s.file); err != nil {
		os.Remove(tmpName)
		return err
	}
	return nil
}
