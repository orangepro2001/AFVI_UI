package main

import (
	"context"
	"runtime"
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
}

// AppInfo describes the running build.
type AppInfo struct {
	Version  string `json:"version"`
	Platform string `json:"platform"`
}

// NewApp creates the bound application object.
func NewApp(version string) *App {
	return &App{version: version}
}

// startup keeps the Wails context, which the runtime calls (events, dialogs) need.
func (a *App) startup(ctx context.Context) {
	a.ctx = ctx
}

// GetAppInfo returns the version and platform of this build.
func (a *App) GetAppInfo() AppInfo {
	return AppInfo{Version: a.version, Platform: runtime.GOOS + "/" + runtime.GOARCH}
}
