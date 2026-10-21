package connector

import (
	"os"
	"path/filepath"
	"strings"
	"testing"
)

func TestStoreLoadMissing(t *testing.T) {
	s := NewStore(filepath.Join(t.TempDir(), "sub", "connector.json"))
	d, err := s.Load()
	if err != nil {
		t.Fatalf("Load: %v", err)
	}
	if d.Version != 1 || d.Active != "" || d.Paths == nil || len(d.Paths) != 0 {
		t.Fatalf("data = %+v want empty", d)
	}
}

func TestStoreRoundTrip(t *testing.T) {
	file := filepath.Join(t.TempDir(), "a", "b", "connector.json")
	s := NewStore(file)
	in := Data{Version: 1, Active: "FM1", Paths: map[string]string{"FM1": "/data/fm1"}}
	if err := s.Save(in); err != nil {
		t.Fatalf("Save: %v", err)
	}
	if _, err := os.Stat(file); err != nil {
		t.Fatalf("file not created: %v", err)
	}
	got, err := NewStore(file).Load()
	if err != nil {
		t.Fatalf("Load: %v", err)
	}
	if got.Active != "FM1" || got.Paths["FM1"] != "/data/fm1" {
		t.Fatalf("data = %+v", got)
	}
}

func TestStoreBadJSON(t *testing.T) {
	file := filepath.Join(t.TempDir(), "connector.json")
	writeFile(t, file, "{not json")
	s := NewStore(file)
	d, err := s.Load()
	if err != nil {
		t.Fatalf("Load: %v", err)
	}
	if d.Active != "" || len(d.Paths) != 0 {
		t.Fatalf("data = %+v want empty", d)
	}
	if err := s.Save(Data{Version: 1, Active: "BM", Paths: map[string]string{"BM": "/bm"}}); err != nil {
		t.Fatalf("Save: %v", err)
	}
	got, err := s.Load()
	if err != nil {
		t.Fatalf("Load: %v", err)
	}
	if got.Active != "BM" || got.Paths["BM"] != "/bm" {
		t.Fatalf("data = %+v", got)
	}
}

func TestStoreUnknownActive(t *testing.T) {
	file := filepath.Join(t.TempDir(), "connector.json")
	writeFile(t, file, `{"version":1,"active":"XYZ","paths":{"FM1":"/x"}}`)
	d, err := NewStore(file).Load()
	if err != nil {
		t.Fatalf("Load: %v", err)
	}
	if d.Active != "" {
		t.Fatalf("Active = %q want empty", d.Active)
	}
	if d.Paths["FM1"] != "/x" {
		t.Fatalf("Paths = %+v", d.Paths)
	}
}

func TestStoreMemory(t *testing.T) {
	s := NewStore("")
	if err := s.Save(Data{Version: 1, Active: "FM2", Paths: map[string]string{"FM2": "/m2"}}); err != nil {
		t.Fatalf("Save: %v", err)
	}
	d, err := s.Load()
	if err != nil {
		t.Fatalf("Load: %v", err)
	}
	if d.Active != "FM2" || d.Paths["FM2"] != "/m2" {
		t.Fatalf("data = %+v", d)
	}
}

func TestStoreSaveCopiesPaths(t *testing.T) {
	s := NewStore("")
	paths := map[string]string{"FM1": "/one"}
	if err := s.Save(Data{Version: 1, Active: "FM1", Paths: paths}); err != nil {
		t.Fatalf("Save: %v", err)
	}
	paths["FM1"] = "/changed"
	paths["FM2"] = "/new"
	d, err := s.Load()
	if err != nil {
		t.Fatalf("Load: %v", err)
	}
	if d.Paths["FM1"] != "/one" || len(d.Paths) != 1 {
		t.Fatalf("Paths = %+v want copy", d.Paths)
	}
}

func TestDefaultFile(t *testing.T) {
	file, err := DefaultFile()
	if err != nil {
		t.Fatalf("DefaultFile: %v", err)
	}
	if !strings.HasSuffix(filepath.ToSlash(file), "AFVI-UI/connector.json") {
		t.Fatalf("file = %q", file)
	}
}
