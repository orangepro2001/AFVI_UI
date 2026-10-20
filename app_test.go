package main

import (
	"runtime"
	"testing"
)

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
