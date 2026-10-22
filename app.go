package main

import (
	"context"
	"errors"
	"os"
	"runtime"

	wailsruntime "github.com/wailsapp/wails/v2/pkg/runtime"

	"afvi/ui/internal/appdata"
	"afvi/ui/internal/connector"
	"afvi/ui/internal/inventory"
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

// newAppWith creates an App around hub; tests inject a Hub with an in-memory store.
func newAppWith(version string, hub *connector.Hub) *App {
	return &App{version: version, hub: hub}
}

// startup keeps the Wails context, which the runtime calls (events, dialogs) need.
func (a *App) startup(ctx context.Context) {
	a.ctx = ctx
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
	return svc.Select(name)
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
	return svc.SaveAlignRois(rois)
}

// ResetAlignRois drops the user's ROIs of the active model and returns the machine's own.
func (a *App) ResetAlignRois() ([]inventory.AlignRoi, error) {
	svc, err := a.hub.Inventory()
	if err != nil {
		return nil, err
	}
	return svc.ResetAlignRois()
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
	return a.hub.Save(in)
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
