package main

import (
	"context"
	"errors"
	"os"
	"path/filepath"
	"runtime"
	"strings"
	"testing"

	"afvi/ui/internal/connector"
	"afvi/ui/internal/inventory"
	"afvi/ui/internal/journal"
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
	if _, err := app.GetMedianView(1); !errors.Is(err, connector.ErrNotConfigured) {
		t.Errorf("GetMedianView() error = %v, want ErrNotConfigured", err)
	}
	if _, err := app.MeasureGv(1, inventory.GvBox{W: 1, H: 1}); !errors.Is(err, connector.ErrNotConfigured) {
		t.Errorf("MeasureGv() error = %v, want ErrNotConfigured", err)
	}
}

func TestMedianWithoutPictures(t *testing.T) {
	app := newTestApp(t)

	// The fixture has no Median pictures: the view says so, and measuring is an error.
	view, err := app.GetMedianView(1)
	if err != nil {
		t.Fatalf("GetMedianView() error: %v", err)
	}
	if view.State != inventory.StateMissing || view.Note == "" || view.Image.URL != "" {
		t.Errorf("GetMedianView() = %+v, want a missing picture", view)
	}
	if _, err := app.MeasureGv(1, inventory.GvBox{W: 10, H: 10}); err == nil {
		t.Error("MeasureGv() without a picture returned no error")
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

// journaled gives app a journal in a temp folder and returns a function that reads it.
func journaled(t *testing.T, app *App) func() string {
	t.Helper()
	j, err := journal.Open(t.TempDir(), journal.Info{Version: "test"})
	if err != nil {
		t.Fatalf("journal.Open: %v", err)
	}
	app.journal = j
	t.Cleanup(func() { j.Close() })
	return func() string {
		data, err := os.ReadFile(j.Path())
		if err != nil {
			t.Fatalf("read journal: %v", err)
		}
		return string(data)
	}
}

func TestJournalRecordsWhatGoDoes(t *testing.T) {
	app := newTestApp(t)
	read := journaled(t, app)

	if _, err := app.SelectModel("ALPHA-00"); err != nil {
		t.Fatalf("SelectModel: %v", err)
	}
	if _, err := app.SelectModel("nope"); err == nil {
		t.Fatal("SelectModel(nope) returned no error")
	}
	if _, err := app.SaveConnector(connector.SaveInput{Machines: []connector.MachinePath{{ID: "FM2", Path: "/does/not/exist"}}, Active: "FM2"}); err == nil {
		t.Fatal("SaveConnector accepted a missing folder")
	}
	if _, err := app.SaveAlignRois(nil); err == nil {
		t.Fatal("SaveAlignRois without a user folder returned no error")
	}

	got := read()
	for _, want := range []string{
		`k="model.select" name="ALPHA-00"/>`,
		`k="model.select.fail" err="`,
		`k="connector.save.fail" active="FM2" err="`,
		`k="roi.save.fail" err="`,
	} {
		if !strings.Contains(got, want) {
			t.Errorf("journal lacks %s:\n%s", want, got)
		}
	}
}

func TestJournalRecordsTheSavedConnectorAndRois(t *testing.T) {
	hub := connector.NewHub(connector.NewStore(""))
	hub.SetRoiDir(t.TempDir())
	app := newAppWith("test", hub)
	read := journaled(t, app)

	abs, _ := filepath.Abs("internal/inventory/testdata")
	if _, err := app.SaveConnector(connector.SaveInput{Machines: []connector.MachinePath{{ID: "FM1", Path: abs}}, Active: "FM1"}); err != nil {
		t.Fatalf("SaveConnector: %v", err)
	}
	if _, err := app.SelectModel("ALPHA-00"); err != nil {
		t.Fatalf("SelectModel: %v", err)
	}
	if _, err := app.SaveAlignRois([]inventory.AlignRoi{{ID: "R1", X: 1, Y: 2, W: 30, H: 40}}); err != nil {
		t.Fatalf("SaveAlignRois: %v", err)
	}
	if _, err := app.ResetAlignRois(); err != nil {
		t.Fatalf("ResetAlignRois: %v", err)
	}

	got := read()
	for _, want := range []string{
		`k="connector.save" active="FM1" hosts="FM1"/>`,
		`k="roi.save" model="ALPHA-00" n="1" rois="R1:1,2,30,40"/>`,
		`k="roi.reset" model="ALPHA-00" n="`,
	} {
		if !strings.Contains(got, want) {
			t.Errorf("journal lacks %s:\n%s", want, got)
		}
	}
	// No folder path of the user's machines goes into the journal.
	if strings.Contains(got, abs) {
		t.Error("a folder path was written to the journal")
	}
}

func TestRecordOpsRelaysTheFrontend(t *testing.T) {
	app := newTestApp(t)
	read := journaled(t, app)

	err := app.RecordOps([]journal.Op{
		{Kind: "nav", Attrs: map[string]string{"page": "teach"}},
		{Kind: "gv", Attrs: map[string]string{"mean": "31.03"}},
	})
	if err != nil {
		t.Fatalf("RecordOps: %v", err)
	}
	got := read()
	if !strings.Contains(got, `k="nav" page="teach"/>`) || !strings.Contains(got, `k="gv" mean="31.03"/>`) {
		t.Errorf("journal:\n%s", got)
	}
}

func TestNewAppLeavesTheUsersFolderAlone(t *testing.T) {
	// Tests build Apps through NewApp: it must not open the journal, which lives in the user's folder.
	if app := NewApp("test"); app.journal != nil {
		t.Error("NewApp opened a journal; only main may (openJournal)")
	}
}

func TestWithoutAJournalNothingIsRecorded(t *testing.T) {
	app := newTestApp(t)
	if err := app.RecordOps([]journal.Op{{Kind: "nav"}}); err != nil {
		t.Errorf("RecordOps without a journal: %v", err)
	}
	app.startup(context.Background())
	app.shutdown(context.Background())
}
