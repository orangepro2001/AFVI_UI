package inventory

import (
	"encoding/json"
	"errors"
	"fmt"
	"os"
	"path/filepath"
	"regexp"
	"strings"
)

const (
	// minRoiSize is the smallest ROI the user may keep (picture pixels).
	minRoiSize = 8
	// maxRois bounds the list a model may carry.
	maxRois = 200
	// roiFileVersion is the version field of the user's ROI file.
	roiFileVersion = 1
)

// ErrNoUserDir is returned by the ROI writes when no folder for the user's own data was given.
var ErrNoUserDir = errors.New("inventory: no folder for the user's ROI files")

// AlignRoi is one rectangle of the align picture, in pixels of the full-size TIFF (AlignRoi in
// api/types.ts). The coordinates are the XML's Left/Top and Right-Left/Bottom-Top.
type AlignRoi struct {
	ID string `json:"id"`
	X  int    `json:"x"`
	Y  int    `json:"y"`
	W  int    `json:"w"`
	H  int    `json:"h"`
}

// PictureSize is a size in pixels.
type PictureSize struct {
	Width  int `json:"width"`
	Height int `json:"height"`
}

// AlignImage is the picture of the viewer (ImageRef in api/types.ts); Width and Height are the
// size it is shown at.
type AlignImage struct {
	URL    string `json:"url"`
	Width  int    `json:"width"`
	Height int    `json:"height"`
}

// AlignView is what the Metal node of the Align / ROI tree shows (AlignView in api/types.ts).
type AlignView struct {
	Image AlignImage `json:"image"`
	// Size is the size of the TIFF the ROI coordinates refer to.
	Size PictureSize `json:"size"`
	// State is "ok", "partial", "missing" or "unreadable"; the last two show the empty default picture.
	State string `json:"state"`
	// Note says why a picture file could not be read.
	Note string     `json:"note,omitempty"`
	Rois []AlignRoi `json:"rois"`
	// Edited is true when Rois come from the user's own file and not from AlignSpec.xml.
	Edited bool `json:"edited"`
}

// roiFile is the user's ROI file. It holds the complete list the user wants for one model and side;
// the AlignSpec.xml of the machine is only read, never written.
type roiFile struct {
	Version int         `json:"version"`
	Model   string      `json:"model"`
	Side    string      `json:"side"`
	Size    PictureSize `json:"size"`
	Rois    []AlignRoi  `json:"rois"`
}

// SetUserDir sets the folder the user's own ROI files go to. It must not lie inside the
// inventory or the repository: those are read only.
func (s *Service) SetUserDir(dir string) error {
	if dir == "" {
		s.mu.Lock()
		s.userDir = ""
		s.mu.Unlock()
		return nil
	}
	abs, err := filepath.Abs(dir)
	if err != nil {
		return err
	}
	for _, protected := range []string{s.root, s.repoDir()} {
		if within(protected, abs) {
			return fmt.Errorf("inventory: %s is inside %s, which is never written", abs, protected)
		}
	}
	s.mu.Lock()
	s.userDir = abs
	s.mu.Unlock()
	return nil
}

// within reports whether path is dir or lies below it.
func within(dir, path string) bool {
	rel, err := filepath.Rel(dir, path)
	if err != nil {
		return false
	}
	return rel == "." || (rel != ".." && !strings.HasPrefix(rel, ".."+string(filepath.Separator)))
}

var unsafeName = regexp.MustCompile(`[^A-Za-z0-9._-]`)

// roiPath is the user's file of model and side; "" without a user folder.
func (s *Service) roiPath(model, side string) string {
	s.mu.Lock()
	dir := s.userDir
	s.mu.Unlock()
	if dir == "" {
		return ""
	}
	return filepath.Join(dir, unsafeName.ReplaceAllString(model+"-"+side, "_")+".json")
}

// machineRois reads the align ROIs of the strip's unit from AlignSpec.xml: the Params of Unit
// with Type 0 (the other types are the cell and the SR points, which the viewer does not draw).
func (s *Service) machineRois(model, side string) []AlignRoi {
	rois := []AlignRoi{}
	root, ok := s.cache.loadOptional(filepath.Join(s.root, "INSPECT_SPEC", model, side, "AlignSpec.xml"))
	if !ok {
		return rois
	}
	points, ok := root.child("AlignPoint")
	if !ok {
		return rois
	}
	unit, ok := points.child("Unit")
	if !ok {
		return rois
	}
	for _, p := range unit.children("Param") {
		if strings.TrimSpace(p.attr("Type")) != "0" {
			continue
		}
		x, y := p.attrInt("Left"), p.attrInt("Top")
		w, h := p.attrInt("Right")-x, p.attrInt("Bottom")-y
		if w <= 0 || h <= 0 {
			continue
		}
		rois = append(rois, AlignRoi{ID: "P" + strings.TrimSpace(p.attr("ID")), X: x, Y: y, W: w, H: h})
	}
	return rois
}

// userRois reads the user's file; ok is false when there is none or it cannot be used.
func (s *Service) userRois(model, side string) ([]AlignRoi, bool) {
	path := s.roiPath(model, side)
	if path == "" {
		return nil, false
	}
	data, err := os.ReadFile(path)
	if err != nil {
		return nil, false
	}
	var f roiFile
	if err := json.Unmarshal(data, &f); err != nil || f.Version != roiFileVersion {
		return nil, false
	}
	if f.Rois == nil {
		f.Rois = []AlignRoi{}
	}
	return f.Rois, true
}

// AlignView returns the composed Metal / SR picture and the ROIs of the active model.
func (s *Service) AlignView() (AlignView, error) {
	am, err := s.Active()
	if err != nil {
		return AlignView{}, err
	}
	side := s.sideFor(am.Name, am.Surface)
	pic, err := s.alignPicture(am.Name)
	if err != nil {
		return AlignView{}, err
	}
	rois, edited := s.userRois(am.Name, side)
	if !edited {
		rois = s.machineRois(am.Name, side)
	}
	return AlignView{
		Image:  AlignImage{URL: pic.url, Width: displayWidth, Height: displayHeight(pic.srcW, pic.srcH)},
		Size:   PictureSize{Width: pic.srcW, Height: pic.srcH},
		State:  pic.state,
		Note:   pic.note,
		Rois:   rois,
		Edited: edited,
	}, nil
}

// checkRois validates a list the user sends and returns it with every rectangle kept inside the picture.
func checkRois(rois []AlignRoi, size PictureSize) ([]AlignRoi, error) {
	if len(rois) > maxRois {
		return nil, fmt.Errorf("inventory: at most %d ROIs", maxRois)
	}
	out := make([]AlignRoi, 0, len(rois))
	seen := map[string]bool{}
	for _, r := range rois {
		id := strings.TrimSpace(r.ID)
		if id == "" || seen[id] {
			return nil, fmt.Errorf("inventory: ROI id %q is empty or repeated", r.ID)
		}
		seen[id] = true
		if r.X < 0 {
			r.W += r.X
			r.X = 0
		}
		if r.Y < 0 {
			r.H += r.Y
			r.Y = 0
		}
		if r.X+r.W > size.Width {
			r.W = size.Width - r.X
		}
		if r.Y+r.H > size.Height {
			r.H = size.Height - r.Y
		}
		if r.W < minRoiSize || r.H < minRoiSize {
			return nil, fmt.Errorf("inventory: ROI %s is smaller than %d px or outside the picture", id, minRoiSize)
		}
		r.ID = id
		out = append(out, r)
	}
	return out, nil
}

// SaveAlignRois writes the complete ROI list of the active model to the user's own file and
// returns the list as saved. AlignSpec.xml and everything else of the machine stay untouched.
func (s *Service) SaveAlignRois(rois []AlignRoi) ([]AlignRoi, error) {
	am, err := s.Active()
	if err != nil {
		return nil, err
	}
	side := s.sideFor(am.Name, am.Surface)
	path := s.roiPath(am.Name, side)
	if path == "" {
		return nil, ErrNoUserDir
	}
	pic, err := s.alignPicture(am.Name)
	if err != nil {
		return nil, err
	}
	size := PictureSize{Width: pic.srcW, Height: pic.srcH}
	clean, err := checkRois(rois, size)
	if err != nil {
		return nil, err
	}
	data, err := json.MarshalIndent(roiFile{Version: roiFileVersion, Model: am.Name, Side: side, Size: size, Rois: clean}, "", "  ")
	if err != nil {
		return nil, err
	}
	if err := writeAtomic(path, append(data, '\n')); err != nil {
		return nil, err
	}
	return clean, nil
}

// ResetAlignRois deletes the user's file of the active model, so the machine's own ROIs show
// again, and returns them.
func (s *Service) ResetAlignRois() ([]AlignRoi, error) {
	am, err := s.Active()
	if err != nil {
		return nil, err
	}
	side := s.sideFor(am.Name, am.Surface)
	path := s.roiPath(am.Name, side)
	if path == "" {
		return nil, ErrNoUserDir
	}
	if err := os.Remove(path); err != nil && !errors.Is(err, os.ErrNotExist) {
		return nil, err
	}
	return s.machineRois(am.Name, side), nil
}

// writeAtomic writes data to path through a temporary file, so a crash never leaves half a file.
func writeAtomic(path string, data []byte) error {
	if err := os.MkdirAll(filepath.Dir(path), 0o755); err != nil {
		return err
	}
	tmp, err := os.CreateTemp(filepath.Dir(path), ".roi-*.tmp")
	if err != nil {
		return err
	}
	name := tmp.Name()
	if _, err := tmp.Write(data); err != nil {
		tmp.Close()
		os.Remove(name)
		return err
	}
	if err := tmp.Close(); err != nil {
		os.Remove(name)
		return err
	}
	if err := os.Rename(name, path); err != nil {
		os.Remove(name)
		return err
	}
	return nil
}
