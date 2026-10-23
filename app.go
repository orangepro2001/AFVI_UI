package main

import (
	"context"
	"errors"
	"log"
	"os"
	"runtime"
	"strconv"
	"strings"

	wailsruntime "github.com/wailsapp/wails/v2/pkg/runtime"

	"afvi/ui/internal/appdata"
	"afvi/ui/internal/connector"
	"afvi/ui/internal/inventory"
	"afvi/ui/internal/journal"
)

// App is the object bound to the frontend: its exported methods become
// window.go.main.App.* and the typed wrappers in frontend/wailsjs/go/main/.
//
// Frontend-first: the frontend works against the mock API in frontend/src/api/mock
// until a method exists here (see docs/FRONTEND.md, "API layer"). When a method is
// added or changed, regenerate the bindings with scripts/bindings.sh.
type App struct {
	ctx     context.Context
	version string

	hub *connector.Hub
	// journal is the record of what the user does in this run (internal/journal); nil records nothing.
	journal *journal.Journal
}

// AppInfo describes the running build.
type AppInfo struct {
	Version  string `json:"version"`
	Platform string `json:"platform"`
}

// NewApp creates the bound application object. The host folders come from the connector
// configuration file in the user's config directory; without one the Hub keeps it in memory only.
func NewApp(version string) *App {
	file, err := connector.DefaultFile()
	if err != nil {
		file = ""
	}
	hub := connector.NewHub(connector.NewStore(file))
	if dir, err := appdata.Path("roi"); err == nil {
		hub.SetRoiDir(dir)
	}
	return newAppWith(version, hub)
}

// openJournal starts the journal of this run in the user's data folder. Only the window's startup
// calls it (main.go): neither NewApp, which tests use, nor main itself, which the binding generator
// runs without a window, may write to that folder.
func (a *App) openJournal() {
	dir, err := appdata.Path("journal")
	if err != nil {
		log.Printf("operation journal: %v", err)
		return
	}
	j, err := journal.Open(dir, journal.Info{Version: a.version, Platform: runtime.GOOS + "/" + runtime.GOARCH})
	if err != nil {
		log.Printf("operation journal: %v", err)
		return
	}
	a.journal = j
}

// newAppWith creates an App around hub; tests inject a Hub with an in-memory store.
func newAppWith(version string, hub *connector.Hub) *App {
	return &App{version: version, hub: hub}
}

// startup keeps the Wails context, which the runtime calls (events, dialogs) need.
func (a *App) startup(ctx context.Context) {
	a.ctx = ctx
	a.record("session.start", "host", a.hub.Config().Active)
}

// shutdown ends the session's journal.
func (a *App) shutdown(ctx context.Context) {
	a.record("session.end")
	if err := a.journal.Close(); err != nil {
		log.Printf("operation journal: %v", err)
	}
}

// record writes one operation of Go's own to the journal: kind, then name/value pairs.
func (a *App) record(kind string, pairs ...string) {
	attrs := make(map[string]string, len(pairs)/2)
	for i := 0; i+1 < len(pairs); i += 2 {
		attrs[pairs[i]] = pairs[i+1]
	}
	a.journal.Record(kind, attrs)
}

// RecordOps appends operations the frontend collected (page changes, tools, boxes drawn, ...) to
// the journal of this session. It returns an error only when the journal file cannot be written.
func (a *App) RecordOps(ops []journal.Op) error {
	return a.journal.RecordOps(ops)
}

// GetAppInfo returns the version and platform of this build.
func (a *App) GetAppInfo() AppInfo {
	return AppInfo{Version: a.version, Platform: runtime.GOOS + "/" + runtime.GOARCH}
}

// GetModels lists the models under INSPECT_SPEC.
func (a *App) GetModels() ([]inventory.ModelEntry, error) {
	svc, err := a.hub.Inventory()
	if err != nil {
		return nil, err
	}
	return svc.Models()
}

// GetActiveModel returns the model the UI works with.
func (a *App) GetActiveModel() (inventory.ActiveModel, error) {
	svc, err := a.hub.Inventory()
	if err != nil {
		return inventory.ActiveModel{}, err
	}
	return svc.Active()
}

// SelectModel switches the active model; the name must exist in GetModels.
func (a *App) SelectModel(name string) (inventory.ActiveModel, error) {
	svc, err := a.hub.Inventory()
	if err != nil {
		return inventory.ActiveModel{}, err
	}
	am, err := svc.Select(name)
	if err != nil {
		a.record("model.select.fail", "name", name, "err", err.Error())
		return am, err
	}
	a.record("model.select", "name", am.Name)
	return am, nil
}

// GetTeachSpec returns the specification tree and align data of the active model.
func (a *App) GetTeachSpec() (inventory.TeachSpec, error) {
	svc, err := a.hub.Inventory()
	if err != nil {
		return inventory.TeachSpec{}, err
	}
	return svc.Teach()
}

// GetNodeAnalysis returns the light analysis of a specification tree node.
func (a *App) GetNodeAnalysis(nodeID string) (inventory.NodeAnalysis, error) {
	svc, err := a.hub.Inventory()
	if err != nil {
		return nil, err
	}
	return svc.Analysis(nodeID)
}

// GetAlignView returns the composed Metal / SR picture and the align ROIs of the active model.
func (a *App) GetAlignView() (inventory.AlignView, error) {
	svc, err := a.hub.Inventory()
	if err != nil {
		return inventory.AlignView{}, err
	}
	return svc.AlignView()
}

// SaveAlignRois saves the complete ROI list of the active model in the user's own file (never in
// the machine's data) and returns the list as saved.
func (a *App) SaveAlignRois(rois []inventory.AlignRoi) ([]inventory.AlignRoi, error) {
	svc, err := a.hub.Inventory()
	if err != nil {
		return nil, err
	}
	saved, err := svc.SaveAlignRois(rois)
	if err != nil {
		a.record("roi.save.fail", "model", svc.ActiveName(), "err", err.Error())
		return saved, err
	}
	a.record("roi.save", "model", svc.ActiveName(), "n", strconv.Itoa(len(saved)), "rois", roiList(saved))
	return saved, nil
}

// roiList is the ROIs in one short attribute value: id:x,y,w,h;id:x,y,w,h
func roiList(rois []inventory.AlignRoi) string {
	parts := make([]string, len(rois))
	for i, r := range rois {
		parts[i] = r.ID + ":" + strconv.Itoa(r.X) + "," + strconv.Itoa(r.Y) + "," + strconv.Itoa(r.W) + "," + strconv.Itoa(r.H)
	}
	return strings.Join(parts, ";")
}

// ResetAlignRois drops the user's ROIs of the active model and returns the machine's own.
func (a *App) ResetAlignRois() ([]inventory.AlignRoi, error) {
	svc, err := a.hub.Inventory()
	if err != nil {
		return nil, err
	}
	machine, err := svc.ResetAlignRois()
	if err != nil {
		a.record("roi.reset.fail", "model", svc.ActiveName(), "err", err.Error())
		return machine, err
	}
	a.record("roi.reset", "model", svc.ActiveName(), "n", strconv.Itoa(len(machine)))
	return machine, nil
}

// GetMedianView returns the Median picture of the active model for a light (1 is Light-1): the
// preview the viewer shows and the size of the TIFF it stands for.
func (a *App) GetMedianView(light int) (inventory.MedianView, error) {
	svc, err := a.hub.Inventory()
	if err != nil {
		return inventory.MedianView{}, err
	}
	return svc.MedianView(light)
}

// MeasureGv measures the gray values (mean, standard deviation, range) of a box of the Median
// picture of the active model for a light; the box is in pixels of the TIFF.
func (a *App) MeasureGv(light int, box inventory.GvBox) (inventory.GvStats, error) {
	svc, err := a.hub.Inventory()
	if err != nil {
		return inventory.GvStats{}, err
	}
	return svc.MeasureGv(light, box)
}

// GetConnector returns the three hosts, their folders and the active host.
func (a *App) GetConnector() connector.Config {
	return a.hub.Config()
}

// CheckMachinePath checks that path directly contains PxInventory and PxRepository.
func (a *App) CheckMachinePath(path string) connector.PathCheck {
	return connector.Check(path)
}

// SaveConnector saves the folders and the active host after checking them.
func (a *App) SaveConnector(in connector.SaveInput) (connector.Config, error) {
	cfg, err := a.hub.Save(in)
	if err != nil {
		a.record("connector.save.fail", "active", in.Active, "err", err.Error())
		return cfg, err
	}
	var hosts []string
	for _, m := range cfg.Machines {
		if m.Path != "" {
			hosts = append(hosts, m.ID)
		}
	}
	a.record("connector.save", "active", cfg.Active, "hosts", strings.Join(hosts, ","))
	return cfg, nil
}

// PickFolder opens the folder dialog; it returns "" when the user cancels.
func (a *App) PickFolder(startDir string) (string, error) {
	if a.ctx == nil {
		return "", errors.New("no window")
	}
	opts := wailsruntime.OpenDialogOptions{
		Title: "Select the folder that contains PxInventory and PxRepository",
	}
	if info, err := os.Stat(startDir); err == nil && info.IsDir() {
		opts.DefaultDirectory = startDir
	}
	return wailsruntime.OpenDirectoryDialog(a.ctx, opts)
}
