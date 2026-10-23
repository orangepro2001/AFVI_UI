package inventory

import (
	"errors"
	"fmt"
	"image"
	"io/fs"
	"math"
	"os"
	"path/filepath"
	"regexp"
	"sort"
	"strconv"
	"strings"
)

// maxMedianCache is how many decoded Median pictures stay in memory (one per light; 24 MB each).
const maxMedianCache = 3

// medianFileName matches Median_<a>_<b>_<c>.tif; c is the light index (0 is Light-1).
var medianFileName = regexp.MustCompile(`(?i)^median_(\d+)_(\d+)_(\d+)\.tiff?$`)

// MedianView is the picture the viewer shows for one light (MedianView in api/types.ts). Image
// and Size are empty unless State is "ok".
type MedianView struct {
	// Light is the light that was asked for (1 is Light-1).
	Light int `json:"light"`
	// Image is the preview and the size it is shown at.
	Image AlignImage `json:"image"`
	// Size is the size of the TIFF; the XY of the read-out bar and the GV boxes are pixels of it.
	Size PictureSize `json:"size"`
	// State is "ok", "missing" (no Median picture for this light) or "unreadable".
	State string `json:"state"`
	// Note says why the picture could not be read.
	Note string `json:"note,omitempty"`
	// File is the base name of the TIFF that was read.
	File string `json:"file,omitempty"`
	// Lights are the lights the model has a Median picture for, ascending.
	Lights []int `json:"lights"`
}

// GvBox is the rectangle a GV measurement is taken in: pixels of the TIFF, fractions allowed.
type GvBox struct {
	X float64 `json:"x"`
	Y float64 `json:"y"`
	W float64 `json:"w"`
	H float64 `json:"h"`
}

// GvRect is a GvBox as it was measured: whole pixels, inside the picture.
type GvRect struct {
	X int `json:"x"`
	Y int `json:"y"`
	W int `json:"w"`
	H int `json:"h"`
}

// GvStats is the gray-value statistics of one box (GvStats in api/types.ts).
type GvStats struct {
	// Box is the area that was measured: the asked box rounded outwards and clamped to the picture.
	Box    GvRect  `json:"box"`
	Pixels int     `json:"pixels"`
	Mean   float64 `json:"mean"`
	// Std is the standard deviation over the pixels of the box (population, not sample).
	Std           float64 `json:"std"`
	Min           int     `json:"min"`
	Max           int     `json:"max"`
	SaturatedHigh int     `json:"saturatedHigh"`
	SaturatedLow  int     `json:"saturatedLow"`
}

// medianEntry is a decoded Median picture and the preview that was made of it.
type medianEntry struct {
	path string
	mod  int64
	gray *grayLayer
	url  string
}

// medianFile is one Median_<a>_<b>_<c>.tif.
type medianFile struct {
	path    string
	a, b, c int
}

// findMedianFiles returns the Median pictures below dirs, by light index. They sit in a folder
// called MEDIAN (.../Line/Top/Layer/MEDIAN); when several such folders exist the one under the
// model's own surface ("Top"), then the shallowest, then the first by name wins. Of the files of
// one light the lowest <a>_<b> is taken.
func findMedianFiles(dirs []string, surface string) map[int]medianFile {
	type folder struct {
		path  string
		depth int
		match bool
		files []medianFile
	}
	var folders []*folder
	for _, dir := range dirs {
		_ = filepath.WalkDir(dir, func(path string, d fs.DirEntry, err error) error {
			if err != nil || !d.IsDir() {
				return nil
			}
			rel, relErr := filepath.Rel(dir, path)
			if relErr != nil {
				return nil
			}
			depth := 0
			if rel != "." {
				depth = strings.Count(rel, string(filepath.Separator)) + 1
			}
			if depth > maxRepoDepth {
				return filepath.SkipDir
			}
			if !strings.EqualFold(d.Name(), "MEDIAN") {
				return nil
			}
			f := &folder{path: path, depth: depth}
			for _, part := range strings.Split(rel, string(filepath.Separator)) {
				if surface != "" && strings.EqualFold(part, surface) {
					f.match = true
				}
			}
			entries, _ := os.ReadDir(path)
			for _, e := range entries {
				m := medianFileName.FindStringSubmatch(e.Name())
				if e.IsDir() || m == nil {
					continue
				}
				a, _ := strconv.Atoi(m[1])
				b, _ := strconv.Atoi(m[2])
				c, _ := strconv.Atoi(m[3])
				f.files = append(f.files, medianFile{path: filepath.Join(path, e.Name()), a: a, b: b, c: c})
			}
			if len(f.files) > 0 {
				folders = append(folders, f)
			}
			return filepath.SkipDir
		})
	}
	if len(folders) == 0 {
		return map[int]medianFile{}
	}
	sort.SliceStable(folders, func(i, j int) bool {
		x, y := folders[i], folders[j]
		if x.match != y.match {
			return x.match
		}
		if x.depth != y.depth {
			return x.depth < y.depth
		}
		return x.path < y.path
	})
	out := map[int]medianFile{}
	for _, f := range folders[0].files {
		old, ok := out[f.c]
		if !ok || f.a < old.a || (f.a == old.a && f.b < old.b) {
			out[f.c] = f
		}
	}
	return out
}

// sortedLights lists the lights (1-based) of files.
func sortedLights(files map[int]medianFile) []int {
	lights := make([]int, 0, len(files))
	for c := range files {
		lights = append(lights, c+1)
	}
	sort.Ints(lights)
	return lights
}

// previewGray shrinks g by previewFactor, each preview pixel being the mean of the pixels it covers.
func previewGray(g *grayLayer) *image.Gray {
	outW := (g.w + previewFactor - 1) / previewFactor
	outH := (g.h + previewFactor - 1) / previewFactor
	out := image.NewGray(image.Rect(0, 0, outW, outH))
	for y := 0; y < outH; y++ {
		row := out.Pix[y*out.Stride : y*out.Stride+outW]
		for x := range row {
			row[x] = uint8(g.coverage(x, y, outW, outH))
		}
	}
	return out
}

// medianPicture decodes the Median TIFF at path (or takes it from the cache) and makes its preview.
func (s *Service) medianPicture(path string) (*medianEntry, error) {
	s.medianMu.Lock()
	defer s.medianMu.Unlock()

	mod := modTime(path)
	for i, e := range s.medianCache {
		if e.path == path && e.mod == mod {
			// Most recently used last.
			s.medianCache = append(append(s.medianCache[:i:i], s.medianCache[i+1:]...), e)
			return e, nil
		}
	}

	gray, err := readGray(path)
	if err != nil {
		return nil, err
	}
	url, err := pngDataURL(previewGray(gray))
	if err != nil {
		return nil, err
	}
	entry := &medianEntry{path: path, mod: mod, gray: gray, url: url}

	kept := s.medianCache[:0:0]
	for _, e := range s.medianCache {
		if e.path != path {
			kept = append(kept, e)
		}
	}
	kept = append(kept, entry)
	if len(kept) > maxMedianCache {
		kept = kept[len(kept)-maxMedianCache:]
	}
	s.medianCache = kept
	return entry, nil
}

// medianFileOf finds the Median TIFF of the active model for light (1-based).
func (s *Service) medianFileOf(light int) (medianFile, []int, bool, error) {
	am, err := s.Active()
	if err != nil {
		return medianFile{}, nil, false, err
	}
	files := findMedianFiles(s.modelRepoDirs(am.Name), am.Surface)
	file, ok := files[light-1]
	return file, sortedLights(files), ok, nil
}

// MedianView returns the Median picture of the active model for light (1 is Light-1): a preview
// of the TIFF in the repository, which is only ever read.
func (s *Service) MedianView(light int) (MedianView, error) {
	if light < 1 {
		return MedianView{}, fmt.Errorf("inventory: light %d does not exist", light)
	}
	file, lights, ok, err := s.medianFileOf(light)
	if err != nil {
		return MedianView{}, err
	}
	view := MedianView{Light: light, Lights: lights}
	if !ok {
		view.State = StateMissing
		view.Note = fmt.Sprintf("no Median picture of Light-%d", light)
		return view, nil
	}
	view.File = filepath.Base(file.path)
	entry, err := s.medianPicture(file.path)
	if err != nil {
		view.State = StateUnreadable
		view.Note = fmt.Sprintf("%s: %v", view.File, err)
		return view, nil
	}
	view.State = StateOK
	view.Size = PictureSize{Width: entry.gray.w, Height: entry.gray.h}
	view.Image = AlignImage{URL: entry.url, Width: displayWidth, Height: displayHeight(entry.gray.w, entry.gray.h)}
	return view, nil
}

// MeasureGv measures the gray values of box in the Median picture of the active model for light.
// The box is in pixels of the TIFF (the Size of MedianView); a box outside the picture is clamped,
// an empty one measures the single pixel at its corner.
func (s *Service) MeasureGv(light int, box GvBox) (GvStats, error) {
	if light < 1 {
		return GvStats{}, fmt.Errorf("inventory: light %d does not exist", light)
	}
	file, _, ok, err := s.medianFileOf(light)
	if err != nil {
		return GvStats{}, err
	}
	if !ok {
		return GvStats{}, fmt.Errorf("inventory: no Median picture of Light-%d", light)
	}
	entry, err := s.medianPicture(file.path)
	if err != nil {
		return GvStats{}, err
	}
	return measureGray(entry.gray, box)
}

// clampSpan rounds [pos, pos+size) outwards to whole pixels inside [0, limit) and keeps at least
// one pixel, the way AFVI_TEACH's MeasureGv does.
func clampSpan(pos, size float64, limit int) (from, to int) {
	if math.IsNaN(pos) || math.IsNaN(size) {
		return 0, 1
	}
	bound := float64(limit)
	start := math.Floor(math.Min(math.Max(pos, 0), bound-1))
	end := math.Ceil(math.Min(math.Max(pos+size, start+1), bound))
	return int(start), int(end)
}

// measureGray is the gray-value statistics of box in g (AFVI_TEACH's core.MeasureGv).
func measureGray(g *grayLayer, box GvBox) (GvStats, error) {
	if g == nil || g.w <= 0 || g.h <= 0 {
		return GvStats{}, errors.New("inventory: the picture is empty")
	}
	x0, x1 := clampSpan(box.X, box.W, g.w)
	y0, y1 := clampSpan(box.Y, box.H, g.h)
	var sum, sumSq int64
	lo, hi := 255, 0
	var satHigh, satLow int
	for y := y0; y < y1; y++ {
		for _, v := range g.pix[y*g.stride+x0 : y*g.stride+x1] {
			sum += int64(v)
			sumSq += int64(v) * int64(v)
			n := int(v)
			if n < lo {
				lo = n
			}
			if n > hi {
				hi = n
			}
			if v == 255 {
				satHigh++
			}
			if v == 0 {
				satLow++
			}
		}
	}
	w, h := x1-x0, y1-y0
	pixels := w * h
	mean := float64(sum) / float64(pixels)
	variance := float64(sumSq)/float64(pixels) - mean*mean
	if variance < 0 {
		variance = 0
	}
	return GvStats{
		Box:           GvRect{X: x0, Y: y0, W: w, H: h},
		Pixels:        pixels,
		Mean:          mean,
		Std:           math.Sqrt(variance),
		Min:           lo,
		Max:           hi,
		SaturatedHigh: satHigh,
		SaturatedLow:  satLow,
	}, nil
}
