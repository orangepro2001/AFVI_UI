package main

import (
	"context"
	"runtime"

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

	inv *inventory.Lazy
}

// AppInfo describes the running build.
type AppInfo struct {
	Version  string `json:"version"`
	Platform string `json:"platform"`
}

// NewApp creates the bound application object.
func NewApp(version string) *App {
	return &App{version: version, inv: inventory.NewLazy(inventory.Discover)}
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
	svc, err := a.inv.Service()
	if err != nil {
		return nil, err
	}
	return svc.Models()
}

// GetActiveModel returns the model the UI works with.
func (a *App) GetActiveModel() (inventory.ActiveModel, error) {
	svc, err := a.inv.Service()
	if err != nil {
		return inventory.ActiveModel{}, err
	}
	return svc.Active()
}

// SelectModel switches the active model; the name must exist in GetModels.
func (a *App) SelectModel(name string) (inventory.ActiveModel, error) {
	svc, err := a.inv.Service()
	if err != nil {
		return inventory.ActiveModel{}, err
	}
	return svc.Select(name)
}

// GetTeachSpec returns the specification tree and align data of the active model.
func (a *App) GetTeachSpec() (inventory.TeachSpec, error) {
	svc, err := a.inv.Service()
	if err != nil {
		return inventory.TeachSpec{}, err
	}
	return svc.Teach()
}

// GetNodeAnalysis returns the light analysis of a specification tree node.
func (a *App) GetNodeAnalysis(nodeID string) (inventory.NodeAnalysis, error) {
	svc, err := a.inv.Service()
	if err != nil {
		return nil, err
	}
	return svc.Analysis(nodeID)
}
