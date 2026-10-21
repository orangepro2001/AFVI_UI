package main

import (
	"errors"
	"os"
	"path/filepath"
	"runtime"
	"testing"

	"afvi/ui/internal/connector"
)

// newTestApp returns an App whose Hub reads the inventory test data from FM1.
func newTestApp(t *testing.T) *App {
	t.Helper()
	abs, err := filepath.Abs("internal/inventory/testdata")
	if err != nil {
		t.Fatalf("filepath.Abs: %v", err)
	}
	hub := connector.NewHub(connector.NewStore(""))
	if _, err := hub.Save(connector.SaveInput{
		Machines: []connector.MachinePath{{ID: "FM1", Path: abs}},
		Active:   "FM1",
	}); err != nil {
		t.Fatalf("Hub.Save: %v", err)
	}
	return newAppWith("test", hub)
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
	app := newTestApp(t)

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
	app := newTestApp(t)

	am, err := app.GetActiveModel()
	if err != nil {
		t.Fatalf("GetActiveModel() error: %v", err)
	}
	if am.Name != "BETA-01" {
		t.Errorf("GetActiveModel().Name = %q, want %q", am.Name, "BETA-01")
	}
}

func TestSelectModelAndGetTeachSpec(t *testing.T) {
	app := newTestApp(t)

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
	app := newTestApp(t)

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
	app := newTestApp(t)

	if _, err := app.SelectModel("nope"); err == nil {
		t.Error("SelectModel(nope) returned no error")
	}
}

func TestMissingInventory(t *testing.T) {
	app := newAppWith("test", connector.NewHub(connector.NewStore("")))

	if _, err := app.GetModels(); !errors.Is(err, connector.ErrNotConfigured) {
		t.Errorf("GetModels() error = %v, want ErrNotConfigured", err)
	}
	if _, err := app.GetActiveModel(); !errors.Is(err, connector.ErrNotConfigured) {
		t.Errorf("GetActiveModel() error = %v, want ErrNotConfigured", err)
	}
	if _, err := app.SelectModel("ALPHA-00"); !errors.Is(err, connector.ErrNotConfigured) {
		t.Errorf("SelectModel() error = %v, want ErrNotConfigured", err)
	}
	if _, err := app.GetTeachSpec(); !errors.Is(err, connector.ErrNotConfigured) {
		t.Errorf("GetTeachSpec() error = %v, want ErrNotConfigured", err)
	}
	if _, err := app.GetNodeAnalysis("u-p3-c22"); !errors.Is(err, connector.ErrNotConfigured) {
		t.Errorf("GetNodeAnalysis() error = %v, want ErrNotConfigured", err)
	}
}

func TestGetConnector(t *testing.T) {
	app := newTestApp(t)

	cfg := app.GetConnector()
	if len(cfg.Machines) != 3 {
		t.Fatalf("GetConnector() has %d machines, want 3", len(cfg.Machines))
	}
	if cfg.Machines[0].ID != "FM1" || cfg.Machines[0].Status != connector.StatusOK {
		t.Errorf("GetConnector().Machines[0] = %+v, want FM1 ok", cfg.Machines[0])
	}
	if cfg.Active != "FM1" {
		t.Errorf("GetConnector().Active = %q, want %q", cfg.Active, "FM1")
	}
}

func TestCheckMachinePath(t *testing.T) {
	app := newTestApp(t)

	abs, err := filepath.Abs("internal/inventory/testdata")
	if err != nil {
		t.Fatalf("Abs: %v", err)
	}
	check := app.CheckMachinePath(abs)
	if !check.OK {
		t.Errorf("CheckMachinePath(testdata).OK = false, message %q", check.Message)
	}

	check = app.CheckMachinePath(t.TempDir())
	if check.OK {
		t.Error("CheckMachinePath(empty dir).OK = true, want false")
	}
	if check.Message != "PxInventory and PxRepository are missing" {
		t.Errorf("CheckMachinePath(empty dir).Message = %q, want %q", check.Message, "PxInventory and PxRepository are missing")
	}
}

func TestSaveConnectorSwitchesHost(t *testing.T) {
	app := newTestApp(t)

	dir := t.TempDir()
	for _, sub := range []string{filepath.Join("PxInventory", "INSPECT_SPEC", "OTHER-00"), "PxRepository"} {
		if err := os.MkdirAll(filepath.Join(dir, sub), 0o755); err != nil {
			t.Fatalf("MkdirAll: %v", err)
		}
	}

	if _, err := app.SaveConnector(connector.SaveInput{
		Machines: []connector.MachinePath{{ID: "FM2", Path: dir}},
		Active:   "FM2",
	}); err != nil {
		t.Fatalf("SaveConnector() error: %v", err)
	}
	models, err := app.GetModels()
	if err != nil {
		t.Fatalf("GetModels() error: %v", err)
	}
	if len(models) != 1 || models[0].Name != "OTHER-00" {
		t.Fatalf("GetModels() on FM2 = %+v, want [OTHER-00]", models)
	}

	if _, err := app.SaveConnector(connector.SaveInput{Active: "FM1"}); err != nil {
		t.Fatalf("SaveConnector() back to FM1 error: %v", err)
	}
	models, err = app.GetModels()
	if err != nil {
		t.Fatalf("GetModels() error: %v", err)
	}
	want := []string{"ALPHA-00", "BETA-01", "gamma-02"}
	if len(models) != len(want) {
		t.Fatalf("GetModels() on FM1 returned %d models, want %d", len(models), len(want))
	}
	for i, name := range want {
		if models[i].Name != name {
			t.Errorf("GetModels()[%d].Name = %q, want %q", i, models[i].Name, name)
		}
	}
}

func TestSaveConnectorInvalidPath(t *testing.T) {
	app := newTestApp(t)

	dir := t.TempDir()
	if _, err := app.SaveConnector(connector.SaveInput{
		Machines: []connector.MachinePath{{ID: "FM2", Path: dir}},
		Active:   "FM1",
	}); err == nil {
		t.Fatal("SaveConnector() with an empty folder returned no error")
	}

	cfg := app.GetConnector()
	if cfg.Machines[1].ID != "FM2" || cfg.Machines[1].Status != connector.StatusUnset {
		t.Errorf("GetConnector().Machines[1] = %+v, want FM2 unset", cfg.Machines[1])
	}
	if cfg.Active != "FM1" {
		t.Errorf("GetConnector().Active = %q, want %q", cfg.Active, "FM1")
	}
}

func TestPickFolderWithoutWindow(t *testing.T) {
	app := NewApp("test")

	if _, err := app.PickFolder(""); err == nil {
		t.Error("PickFolder() without a window returned no error")
	}
}
