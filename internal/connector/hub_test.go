package connector

import (
	"bytes"
	"errors"
	"image"
	"os"
	"path/filepath"
	"reflect"
	"sync"
	"testing"
	"time"

	"golang.org/x/image/tiff"

	"afvi/ui/internal/inventory"
)

// fm1Folder returns the absolute path of the inventory testdata folder as a host folder.
func fm1Folder(t *testing.T) string {
	t.Helper()
	dir, err := filepath.Abs(filepath.Join("..", "inventory", "testdata"))
	if err != nil {
		t.Fatalf("Abs: %v", err)
	}
	return dir
}

// fm2Folder makes a host folder holding only the model OTHER-00.
func fm2Folder(t *testing.T) string {
	t.Helper()
	dir := t.TempDir()
	mkdir(t, filepath.Join(dir, "PxInventory", "INSPECT_SPEC", "OTHER-00"))
	mkdir(t, filepath.Join(dir, "PxRepository"))
	return dir
}

// modelNames returns the model names of a Service.
func modelNames(t *testing.T, hub *Hub) []string {
	t.Helper()
	svc, err := hub.Inventory()
	if err != nil {
		t.Fatalf("Inventory: %v", err)
	}
	models, err := svc.Models()
	if err != nil {
		t.Fatalf("Models: %v", err)
	}
	names := make([]string, 0, len(models))
	for _, m := range models {
		names = append(names, m.Name)
	}
	return names
}

// statuses returns the status of each machine by id.
func statuses(cfg Config) map[string]string {
	out := map[string]string{}
	for _, m := range cfg.Machines {
		out[m.ID] = m.Status
	}
	return out
}

func TestHubNew(t *testing.T) {
	hub := NewHub(NewStore(filepath.Join(t.TempDir(), "connector.json")))
	cfg := hub.Config()
	if len(cfg.Machines) != 3 {
		t.Fatalf("machines = %d", len(cfg.Machines))
	}
	for i, id := range Machines {
		if cfg.Machines[i].ID != id {
			t.Fatalf("machine %d = %q want %q", i, cfg.Machines[i].ID, id)
		}
		if cfg.Machines[i].Status != StatusUnset {
			t.Fatalf("%s status = %q want unset", id, cfg.Machines[i].Status)
		}
	}
	if cfg.Active != "" {
		t.Fatalf("active = %q want empty", cfg.Active)
	}
	if _, err := hub.Inventory(); !errors.Is(err, ErrNotConfigured) {
		t.Fatalf("Inventory err = %v want ErrNotConfigured", err)
	}
}

func TestHubSaveAndSwitch(t *testing.T) {
	file := filepath.Join(t.TempDir(), "connector.json")
	hub := NewHub(NewStore(file))
	fm1 := fm1Folder(t)
	fm2 := fm2Folder(t)

	cfg, err := hub.Save(SaveInput{
		Machines: []MachinePath{{ID: "FM1", Path: fm1}},
		Active:   "FM1",
	})
	if err != nil {
		t.Fatalf("Save FM1: %v", err)
	}
	if statuses(cfg)["FM1"] != StatusOK || cfg.Active != "FM1" {
		t.Fatalf("config = %+v", cfg)
	}
	want := []string{"ALPHA-00", "BETA-01", "gamma-02"}
	if got := modelNames(t, hub); !reflect.DeepEqual(got, want) {
		t.Fatalf("FM1 models = %v want %v", got, want)
	}

	cfg, err = hub.Save(SaveInput{
		Machines: []MachinePath{{ID: "FM2", Path: fm2}},
		Active:   "FM2",
	})
	if err != nil {
		t.Fatalf("Save FM2: %v", err)
	}
	if cfg.Active != "FM2" || statuses(cfg)["FM1"] != StatusOK {
		t.Fatalf("config = %+v", cfg)
	}
	if got := modelNames(t, hub); !reflect.DeepEqual(got, []string{"OTHER-00"}) {
		t.Fatalf("FM2 models = %v", got)
	}

	reloaded := NewHub(NewStore(file))
	if got := modelNames(t, reloaded); !reflect.DeepEqual(got, []string{"OTHER-00"}) {
		t.Fatalf("reloaded models = %v", got)
	}
	if reloaded.Config().Active != "FM2" {
		t.Fatalf("reloaded active = %q", reloaded.Config().Active)
	}
}

func TestHubActiveWithoutFolder(t *testing.T) {
	hub := NewHub(NewStore(filepath.Join(t.TempDir(), "connector.json")))
	fm1 := fm1Folder(t)
	if _, err := hub.Save(SaveInput{Machines: []MachinePath{{ID: "FM1", Path: fm1}}, Active: "FM1"}); err != nil {
		t.Fatalf("Save: %v", err)
	}
	_, err := hub.Save(SaveInput{Machines: []MachinePath{{ID: "FM1", Path: fm1}}, Active: "FM2"})
	if err == nil {
		t.Fatalf("Save with folderless active should fail")
	}
	if got := hub.Config().Active; got != "FM1" {
		t.Fatalf("active after failed save = %q want FM1", got)
	}
}

func TestHubInvalidPath(t *testing.T) {
	dir := t.TempDir()
	mkdir(t, filepath.Join(dir, "PxInventory"))
	hub := NewHub(NewStore(filepath.Join(t.TempDir(), "connector.json")))
	if _, err := hub.Save(SaveInput{Machines: []MachinePath{{ID: "FM1", Path: fm1Folder(t)}}, Active: "FM1"}); err != nil {
		t.Fatalf("Save FM1: %v", err)
	}
	_, err := hub.Save(SaveInput{Machines: []MachinePath{{ID: "FM2", Path: dir}}, Active: "FM2"})
	if err == nil {
		t.Fatalf("Save invalid path should fail")
	}
	if got := err.Error(); got != "FM2: PxRepository is missing" {
		t.Fatalf("err = %q", got)
	}
	if cfg := hub.Config(); cfg.Active != "FM1" || statuses(cfg)["FM2"] != StatusUnset {
		t.Fatalf("config changed: %+v", cfg)
	}
}

func TestHubUnknownMachine(t *testing.T) {
	hub := NewHub(NewStore(filepath.Join(t.TempDir(), "connector.json")))
	_, err := hub.Save(SaveInput{Machines: []MachinePath{{ID: "XX", Path: "/x"}}, Active: "XX"})
	if err == nil || err.Error() != `unknown machine "XX"` {
		t.Fatalf("err = %v", err)
	}
	_, err = hub.Save(SaveInput{Machines: []MachinePath{{ID: "FM1", Path: fm1Folder(t)}}, Active: "XX"})
	if err == nil || err.Error() != `unknown machine "XX"` {
		t.Fatalf("err = %v", err)
	}
}

func TestHubEmptyActive(t *testing.T) {
	hub := NewHub(NewStore(filepath.Join(t.TempDir(), "connector.json")))
	if _, err := hub.Save(SaveInput{Machines: []MachinePath{{ID: "FM1", Path: fm1Folder(t)}}, Active: "FM1"}); err != nil {
		t.Fatalf("Save FM1: %v", err)
	}
	_, err := hub.Save(SaveInput{Active: ""})
	if err == nil || err.Error() != "choose the host to read" {
		t.Fatalf("err = %v", err)
	}
	cfg, err := hub.Save(SaveInput{Machines: []MachinePath{{ID: "FM1", Path: ""}}, Active: ""})
	if err != nil {
		t.Fatalf("Save clearing all: %v", err)
	}
	if cfg.Active != "" || statuses(cfg)["FM1"] != StatusUnset {
		t.Fatalf("config = %+v", cfg)
	}
}

func TestHubFolderDeleted(t *testing.T) {
	file := filepath.Join(t.TempDir(), "connector.json")
	hub := NewHub(NewStore(file))
	// A throw-away folder: the test removes a directory, which must never touch the shared testdata.
	fm1 := fm2Folder(t)
	if _, err := hub.Save(SaveInput{Machines: []MachinePath{{ID: "FM1", Path: fm1}}, Active: "FM1"}); err != nil {
		t.Fatalf("Save: %v", err)
	}
	if err := os.RemoveAll(filepath.Join(fm1, "PxRepository")); err != nil {
		t.Fatalf("RemoveAll: %v", err)
	}
	cfg := hub.Config()
	if statuses(cfg)["FM1"] != StatusInvalid {
		t.Fatalf("status = %q", statuses(cfg)["FM1"])
	}
	if _, err := hub.Inventory(); err == nil {
		t.Fatalf("Inventory should fail")
	}
}

func TestHubKeepService(t *testing.T) {
	hub := NewHub(NewStore(filepath.Join(t.TempDir(), "connector.json")))
	fm1 := fm1Folder(t)
	if _, err := hub.Save(SaveInput{Machines: []MachinePath{{ID: "FM1", Path: fm1}}, Active: "FM1"}); err != nil {
		t.Fatalf("Save: %v", err)
	}
	first, err := hub.Inventory()
	if err != nil {
		t.Fatalf("Inventory: %v", err)
	}
	if _, err := first.Select("ALPHA-00"); err != nil {
		t.Fatalf("Select: %v", err)
	}
	if _, err := hub.Save(SaveInput{Machines: []MachinePath{{ID: "FM1", Path: fm1}}, Active: "FM1"}); err != nil {
		t.Fatalf("Save again: %v", err)
	}
	second, err := hub.Inventory()
	if err != nil {
		t.Fatalf("Inventory: %v", err)
	}
	if first != second {
		t.Fatalf("service replaced by an unchanged Save")
	}
	am, err := second.Active()
	if err != nil {
		t.Fatalf("Active: %v", err)
	}
	if am.Name != "ALPHA-00" {
		t.Fatalf("active model = %q want ALPHA-00", am.Name)
	}
}

func TestHubApplyingTheSameFoldersReloadsThePictures(t *testing.T) {
	dir := t.TempDir()
	mkdir(t, filepath.Join(dir, "PxInventory", "INSPECT_SPEC", "M1-00"))
	medianDir := filepath.Join(dir, "PxRepository", "m1", "Layer", "MEDIAN")
	writeTiff := func(value uint8) {
		img := image.NewGray(image.Rect(0, 0, 16, 16))
		for i := range img.Pix {
			img.Pix[i] = value
		}
		var buf bytes.Buffer
		if err := tiff.Encode(&buf, img, nil); err != nil {
			t.Fatal(err)
		}
		mkdir(t, medianDir)
		if err := os.WriteFile(filepath.Join(medianDir, "Median_0_1_0.tif"), buf.Bytes(), 0o644); err != nil {
			t.Fatal(err)
		}
	}
	writeTiff(40)

	hub := NewHub(NewStore(filepath.Join(t.TempDir(), "connector.json")))
	input := SaveInput{Machines: []MachinePath{{ID: "FM1", Path: dir}}, Active: "FM1"}
	if _, err := hub.Save(input); err != nil {
		t.Fatalf("Save: %v", err)
	}
	svc, err := hub.Inventory()
	if err != nil {
		t.Fatalf("Inventory: %v", err)
	}
	mean := func() float64 {
		stats, err := svc.MeasureGv(1, inventory.GvBox{W: 16, H: 16})
		if err != nil {
			t.Fatalf("MeasureGv: %v", err)
		}
		return stats.Mean
	}
	if mean() != 40 {
		t.Fatal("first read")
	}

	// The picture is replaced on the share: a session that has it in memory does not see that ...
	writeTiff(90)
	if mean() != 40 {
		t.Fatal("the picture was read again without being asked to")
	}
	// ... until the folders are applied again, which keeps the service and its active model.
	if _, err := hub.Save(input); err != nil {
		t.Fatalf("Save again: %v", err)
	}
	if again, _ := hub.Inventory(); again != svc {
		t.Fatal("service replaced by an unchanged Save")
	}
	if mean() != 90 {
		t.Fatal("the picture was not read again after Apply")
	}
}

func TestHubHandsTheRepositoryFolderOfTheHostToTheService(t *testing.T) {
	// Whatever the form of the host's path, its PxRepository is the folder of that name inside it;
	// on Windows a bare \\host root has no folder next to PxInventory to guess it from.
	hub := NewHub(NewStore(filepath.Join(t.TempDir(), "connector.json")))
	fm1 := fm1Folder(t)
	if _, err := hub.Save(SaveInput{Machines: []MachinePath{{ID: "FM1", Path: fm1}}, Active: "FM1"}); err != nil {
		t.Fatalf("Save: %v", err)
	}
	svc, err := hub.Inventory()
	if err != nil {
		t.Fatalf("Inventory: %v", err)
	}
	if got, want := svc.RepoDir(), filepath.Join(fm1, "PxRepository"); got != want {
		t.Errorf("RepoDir = %q, want %q", got, want)
	}
}

func TestHubDoesNotAskTheShareOnEveryCall(t *testing.T) {
	hub := NewHub(NewStore(filepath.Join(t.TempDir(), "connector.json")))
	host := fm2Folder(t)
	if _, err := hub.Save(SaveInput{Machines: []MachinePath{{ID: "FM1", Path: host}}, Active: "FM1"}); err != nil {
		t.Fatalf("Save: %v", err)
	}
	svc, err := hub.Inventory()
	if err != nil {
		t.Fatalf("Inventory: %v", err)
	}

	// The folder goes away: calls inside the trust window do not look, and get the open service.
	if err := os.RemoveAll(filepath.Join(host, "PxRepository")); err != nil {
		t.Fatalf("RemoveAll: %v", err)
	}
	for i := 0; i < 20; i++ {
		got, err := hub.Inventory()
		if err != nil || got != svc {
			t.Fatalf("call %d inside the window: %v", i, err)
		}
	}

	// Once the window is over the folder is checked again, and the loss is reported.
	hub.checkedAt = time.Now().Add(-2 * recheckEvery)
	if _, err := hub.Inventory(); err == nil {
		t.Fatal("a folder that went away was not noticed after the window")
	}
}

func TestHubConcurrent(t *testing.T) {
	hub := NewHub(NewStore(filepath.Join(t.TempDir(), "connector.json")))
	fm1 := fm1Folder(t)
	fm2 := fm2Folder(t)
	if _, err := hub.Save(SaveInput{Machines: []MachinePath{{ID: "FM1", Path: fm1}}, Active: "FM1"}); err != nil {
		t.Fatalf("Save: %v", err)
	}
	var wg sync.WaitGroup
	for i := 0; i < 16; i++ {
		wg.Add(1)
		go func(i int) {
			defer wg.Done()
			if _, err := hub.Inventory(); err != nil {
				t.Errorf("Inventory: %v", err)
			}
			hub.Config()
			if i%4 == 0 {
				if _, err := hub.Save(SaveInput{Machines: []MachinePath{{ID: "FM2", Path: fm2}}, Active: "FM2"}); err != nil {
					t.Errorf("Save FM2: %v", err)
				}
				if _, err := hub.Save(SaveInput{Machines: []MachinePath{{ID: "FM1", Path: fm1}}, Active: "FM1"}); err != nil {
					t.Errorf("Save FM1: %v", err)
				}
			}
		}(i)
	}
	wg.Wait()
}
