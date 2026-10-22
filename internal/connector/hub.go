package connector

import (
	"errors"
	"fmt"
	"path/filepath"
	"strings"
	"sync"

	"afvi/ui/internal/inventory"
)

// ErrNotConfigured is returned by Inventory when no host has a folder yet.
var ErrNotConfigured = errors.New("connector: no host is configured")

// Hub ties the Store, the folder checks and the inventory.Service of the active host together.
// All methods are safe for concurrent use.
type Hub struct {
	mu     sync.Mutex
	store  *Store
	data   Data
	loaded bool
	svc    *inventory.Service
	svcKey string
	// roiDir is where the user's own ROI files go, one folder per host ("" = saving is refused).
	roiDir string
}

// NewHub returns a Hub that reads and writes store.
func NewHub(store *Store) *Hub {
	return &Hub{store: store}
}

// SetRoiDir sets the folder for the user's own ROI files; each host gets a folder inside it. The
// folder must not be inside a host's data: those are read only.
func (h *Hub) SetRoiDir(dir string) {
	h.mu.Lock()
	defer h.mu.Unlock()
	h.roiDir = dir
	h.svc = nil
	h.svcKey = ""
}

// loadLocked reads the configuration from the Store on first use.
func (h *Hub) loadLocked() error {
	if h.loaded {
		return nil
	}
	data, err := h.store.Load()
	if err != nil {
		return err
	}
	h.data = data
	h.loaded = true
	return nil
}

// Config returns the three hosts and the active one; every host's path is checked afresh.
func (h *Hub) Config() Config {
	h.mu.Lock()
	defer h.mu.Unlock()
	if err := h.loadLocked(); err != nil {
		// A read error leaves an empty configuration; Save reports the error again.
		h.data = emptyData()
		h.loaded = true
	}
	return h.configLocked()
}

// configLocked builds the Config from h.data, checking every path.
func (h *Hub) configLocked() Config {
	cfg := Config{Machines: make([]Machine, 0, len(Machines)), Active: h.data.Active}
	for _, id := range Machines {
		path := h.data.Paths[id]
		m := Machine{ID: id, Path: path}
		if strings.TrimSpace(path) == "" {
			m.Status = StatusUnset
		} else {
			check := Check(path)
			if check.OK {
				m.Status = StatusOK
			} else {
				m.Status = StatusInvalid
				m.Message = check.Message
			}
		}
		cfg.Machines = append(cfg.Machines, m)
	}
	return cfg
}

// Save checks and saves the folders and the active host; nothing changes when a rule fails.
func (h *Hub) Save(in SaveInput) (Config, error) {
	h.mu.Lock()
	defer h.mu.Unlock()
	if err := h.loadLocked(); err != nil {
		return h.configLocked(), err
	}

	paths := map[string]string{}
	for k, v := range h.data.Paths {
		paths[k] = v
	}

	for _, mp := range in.Machines {
		if !isMachine(mp.ID) {
			return h.configLocked(), fmt.Errorf("unknown machine %q", mp.ID)
		}
		trimmed := strings.TrimSpace(mp.Path)
		if trimmed == "" {
			delete(paths, mp.ID)
			continue
		}
		if check := Check(trimmed); !check.OK {
			return h.configLocked(), fmt.Errorf("%s: %s", mp.ID, check.Message)
		}
		paths[mp.ID] = Normalize(trimmed)
	}

	anyPath := false
	for _, id := range Machines {
		if paths[id] != "" {
			anyPath = true
			break
		}
	}

	active := in.Active
	if active != "" {
		if !isMachine(active) {
			return h.configLocked(), fmt.Errorf("unknown machine %q", active)
		}
		if paths[active] == "" {
			return h.configLocked(), fmt.Errorf("%s has no folder", active)
		}
	} else if anyPath {
		return h.configLocked(), fmt.Errorf("choose the host to read")
	}

	next := Data{Version: 1, Active: active, Paths: paths}
	if err := h.store.Save(next); err != nil {
		return h.configLocked(), err
	}

	if next.Active != h.data.Active || !samePaths(next.Paths, h.data.Paths) {
		h.svc = nil
		h.svcKey = ""
	}
	h.data = next
	return h.configLocked(), nil
}

// samePaths reports whether a and b hold the same folders.
func samePaths(a, b map[string]string) bool {
	if len(a) != len(b) {
		return false
	}
	for k, v := range a {
		if b[k] != v {
			return false
		}
	}
	return true
}

// Inventory returns the inventory.Service of the active host, opening it on first use.
func (h *Hub) Inventory() (*inventory.Service, error) {
	h.mu.Lock()
	defer h.mu.Unlock()
	if err := h.loadLocked(); err != nil {
		return nil, err
	}

	active := h.data.Active
	if active == "" {
		return nil, ErrNotConfigured
	}
	path := h.data.Paths[active]
	if check := Check(path); !check.OK {
		return nil, fmt.Errorf("%s: %s", active, check.Message)
	}

	key := active + "\x00" + path
	if h.svc != nil && h.svcKey == key {
		return h.svc, nil
	}
	svc, err := inventory.Open(filepath.Join(path, "PxInventory"))
	if err != nil {
		return nil, fmt.Errorf("%s: %w", active, err)
	}
	if h.roiDir != "" {
		if err := svc.SetUserDir(filepath.Join(h.roiDir, active)); err != nil {
			return nil, fmt.Errorf("%s: %w", active, err)
		}
	}
	h.svc = svc
	h.svcKey = key
	return svc, nil
}
