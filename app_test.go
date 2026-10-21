package main

import (
	"errors"
	"runtime"
	"testing"

	"afvi/ui/internal/inventory"
)

// newTestApp returns an App whose Lazy reads the inventory test data.
func newTestApp() *App {
	app := NewApp("test")
	app.inv = inventory.NewLazy(func() (string, error) {
		return "internal/inventory/testdata/PxInventory", nil
	})
	return app
}

func TestGetAppInfo(t *testing.T) {
	app := NewApp("v1.2.3")

	info := app.GetAppInfo()

	if info.Version != "v1.2.3" {
		t.Errorf("Version = %q, want %q", info.Version, "v1.2.3")
	}
	if want := runtime.GOOS + "/" + runtime.GOARCH; info.Platform != want {
		t.Errorf("Platform = %q, want %q", info.Platform, want)
	}
}

func TestGetModels(t *testing.T) {
	app := newTestApp()

	models, err := app.GetModels()
	if err != nil {
		t.Fatalf("GetModels() error: %v", err)
	}
	want := []string{"ALPHA-00", "BETA-01", "gamma-02"}
	if len(models) != len(want) {
		t.Fatalf("GetModels() returned %d models, want %d", len(models), len(want))
	}
	for i, name := range want {
		if models[i].Name != name {
			t.Errorf("GetModels()[%d].Name = %q, want %q", i, models[i].Name, name)
		}
	}
}

func TestGetActiveModel(t *testing.T) {
	app := newTestApp()

	am, err := app.GetActiveModel()
	if err != nil {
		t.Fatalf("GetActiveModel() error: %v", err)
	}
	if am.Name != "BETA-01" {
		t.Errorf("GetActiveModel().Name = %q, want %q", am.Name, "BETA-01")
	}
}

func TestSelectModelAndGetTeachSpec(t *testing.T) {
	app := newTestApp()

	if _, err := app.SelectModel("ALPHA-00"); err != nil {
		t.Fatalf("SelectModel() error: %v", err)
	}

	spec, err := app.GetTeachSpec()
	if err != nil {
		t.Fatalf("GetTeachSpec() error: %v", err)
	}
	if len(spec.Unit.Tree) == 0 {
		t.Fatal("GetTeachSpec().Unit.Tree is empty")
	}
	if name := spec.Unit.Tree[0].Name; name != "Align / ROI" {
		t.Errorf("Unit.Tree[0].Name = %q, want %q", name, "Align / ROI")
	}
}

func TestGetNodeAnalysis(t *testing.T) {
	app := newTestApp()

	// Only ALPHA-00 has the node u-p3-c22; BETA-01 (the initial model) has just a stub.
	if _, err := app.SelectModel("ALPHA-00"); err != nil {
		t.Fatalf("SelectModel() error: %v", err)
	}
	analysis, err := app.GetNodeAnalysis("u-p3-c22")
	if err != nil {
		t.Fatalf("GetNodeAnalysis() error: %v", err)
	}
	light, ok := analysis["2"]
	if !ok {
		t.Fatal(`GetNodeAnalysis() has no key "2"`)
	}
	if len(light.Upper) == 0 {
		t.Error("GetNodeAnalysis()[\"2\"].Upper is empty")
	}
}

func TestSelectModelUnknown(t *testing.T) {
	app := newTestApp()

	if _, err := app.SelectModel("nope"); err == nil {
		t.Error("SelectModel(nope) returned no error")
	}
}

func TestMissingInventory(t *testing.T) {
	app := NewApp("test")
	app.inv = inventory.NewLazy(func() (string, error) {
		return "", inventory.ErrNotFound
	})

	if _, err := app.GetModels(); !errors.Is(err, inventory.ErrNotFound) {
		t.Errorf("GetModels() error = %v, want ErrNotFound", err)
	}
	if _, err := app.GetActiveModel(); !errors.Is(err, inventory.ErrNotFound) {
		t.Errorf("GetActiveModel() error = %v, want ErrNotFound", err)
	}
	if _, err := app.SelectModel("ALPHA-00"); !errors.Is(err, inventory.ErrNotFound) {
		t.Errorf("SelectModel() error = %v, want ErrNotFound", err)
	}
	if _, err := app.GetTeachSpec(); !errors.Is(err, inventory.ErrNotFound) {
		t.Errorf("GetTeachSpec() error = %v, want ErrNotFound", err)
	}
	if _, err := app.GetNodeAnalysis("u-p3-c22"); !errors.Is(err, inventory.ErrNotFound) {
		t.Errorf("GetNodeAnalysis() error = %v, want ErrNotFound", err)
	}
}
