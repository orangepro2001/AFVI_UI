//go:build windows

package inventory

import (
	"path/filepath"
	"testing"
)

// The reason for uncShareSibling, on the real filepath of Windows (the CI's Windows runner): Dir of
// a UNC share is the share itself.
func TestWindowsDirOfAUNCShareIsTheShare(t *testing.T) {
	const share = `\\192.168.1.61\PxInventory`
	if got := filepath.Dir(share); got != share {
		t.Fatalf("filepath.Dir(%s) = %s; the assumption behind siblingDir has changed", share, got)
	}
	if got := filepath.Join(filepath.Dir(share), "PxRepository"); got == `\\192.168.1.61\PxRepository` {
		t.Fatalf("the naive guess is right now: %s", got)
	}
	if got, want := siblingDir(share, "PxRepository"), `\\192.168.1.61\PxRepository`; got != want {
		t.Errorf("siblingDir(%s) = %s, want %s", share, got, want)
	}
	// What the Connector stores for \\192.168.1.61 and what Hub hands to SetRepoDir.
	if got, want := filepath.Join(`\\192.168.1.61`, "PxRepository"), `\\192.168.1.61\PxRepository`; got != want {
		t.Errorf("Join(host, PxRepository) = %s, want %s", got, want)
	}
}
