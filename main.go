package main

import (
	"embed"
	"fmt"
	"log"

	"github.com/wailsapp/wails/v2"
	"github.com/wailsapp/wails/v2/pkg/options"
	"github.com/wailsapp/wails/v2/pkg/options/assetserver"
	"github.com/wailsapp/wails/v2/pkg/options/windows"
)

// The frontend build (pnpm build in frontend/) is embedded into the executable.
// frontend/dist/.gitkeep keeps the pattern valid before the first build.
//
//go:embed all:frontend/dist
var assets embed.FS

// version is set at link time by scripts/build.sh: -ldflags "-X main.version=<version>".
var version = "dev"

// The design is a 1920x1080 maximised window (docs/UI_WORKFLOW.md); the minimum
// size is where the layout still holds together.
const (
	designWidth  = 1920
	designHeight = 1080
	minWidth     = 1280
	minHeight    = 720
)

func main() {
	app := NewApp(version)

	err := wails.Run(&options.App{
		Title:            fmt.Sprintf("Pixel Inspector ( Version : %s - AFVI )", version),
		Width:            designWidth,
		Height:           designHeight,
		MinWidth:         minWidth,
		MinHeight:        minHeight,
		WindowStartState: options.Maximised,
		// Same as --background in frontend/src/styles/themes/afvi-dark.css, so there is no
		// white flash before the page paints.
		BackgroundColour: &options.RGBA{R: 27, G: 27, B: 29, A: 255},
		AssetServer:      &assetserver.Options{Assets: assets},
		OnStartup:        app.startup,
		Bind:             []any{app},
		Windows: &windows.Options{
			Theme: windows.Dark,
		},
	})
	if err != nil {
		log.Fatal(err)
	}
}
