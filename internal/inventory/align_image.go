package inventory

import (
	"bytes"
	"encoding/base64"
	"errors"
	"fmt"
	"image"
	"image/color"
	"image/png"
	"io/fs"
	"os"
	"path/filepath"
	"sort"
	"strings"

	"golang.org/x/image/tiff"
)

const (
	// defaultImageWidth and defaultImageHeight are the strip picture of the machines (pixels); the
	// empty default picture and its ROI coordinates use this size when no real picture is found.
	defaultImageWidth  = 5860
	defaultImageHeight = 4020

	// previewFactor is how much smaller the picture sent to the viewer is than the TIFF.
	previewFactor = 4
	// displayWidth is the width of the picture in the viewer (design pixels); the height follows
	// the picture's ratio.
	displayWidth = 781

	// maxRepoDepth bounds the search below PxRepository/<model>.
	maxRepoDepth = 8
)

// The layer colors of the composed picture: solder resist green and copper gold, the same
// colors the specification tree uses for SR and Metal.
var (
	resistColor = color.RGBA{R: 0, G: 160, B: 0, A: 255}
	metalColor  = color.RGBA{R: 255, G: 201, B: 14, A: 255}
)

// Picture states of AlignView.State.
const (
	// StateOK: Metal.tif and SR.tif were found and read.
	StateOK = "ok"
	// StatePartial: only one of the two layers could be used.
	StatePartial = "partial"
	// StateMissing: no Metal.tif / SR.tif anywhere below the model's PxRepository folder.
	StateMissing = "missing"
	// StateUnreadable: the files exist but none could be decoded.
	StateUnreadable = "unreadable"
)

// layerFiles are the Metal.tif and SR.tif found for a model ("" when absent).
type layerFiles struct {
	metal, sr string
}

// maxAlignPictures is how many models' composed Align pictures stay in memory.
const maxAlignPictures = 4

// composed is the picture sent to the viewer.
type composed struct {
	url        string
	srcW, srcH int
	state      string
	// note says why a layer could not be read; empty when everything was.
	note string
}

// repoDir is the PxRepository folder.
func (s *Service) repoDir() string {
	s.mu.Lock()
	defer s.mu.Unlock()
	return s.repo
}

// RepoDir is the PxRepository folder the pictures are read from.
func (s *Service) RepoDir() string { return s.repoDir() }

// SetRepoDir tells the Service where PxRepository is. The Connector knows: it is the folder of the
// host (or, for a bare \\host root, the share \\host\PxRepository), which is not always the
// folder next to PxInventory that Open guesses.
func (s *Service) SetRepoDir(dir string) {
	s.mu.Lock()
	s.repo = dir
	s.mu.Unlock()
}

// siblingDir is the folder called name next to the folder dir. On Windows a UNC share is a volume
// and filepath.Dir of \\host\PxInventory is that volume itself, so the sibling share
// \\host\PxRepository has to be built from the volume name.
func siblingDir(dir, name string) string {
	if sibling, ok := uncShareSibling(dir, filepath.VolumeName(dir), name); ok {
		return sibling
	}
	return filepath.Join(filepath.Dir(dir), name)
}

// uncShareSibling is the share called name on the host of dir when dir is exactly a UNC share
// (\\host\share, vol being its volume name); otherwise ok is false.
func uncShareSibling(dir, vol, name string) (string, bool) {
	if len(vol) <= 2 || strings.TrimRight(dir, `\/`) != vol {
		return "", false
	}
	i := strings.LastIndexAny(vol, `\/`)
	if i < 2 {
		return "", false
	}
	return vol[:i+1] + name, true
}

// modelRepoDirs returns the folders of PxRepository that belong to model: the folder named like
// the model, or like the model without its revision ("25FBO015-15-00" is "25fbo015-15"), in any
// letter case.
func (s *Service) modelRepoDirs(model string) []string {
	entries, err := os.ReadDir(s.repoDir())
	if err != nil {
		return nil
	}
	base := modelBaseName(model)
	var out []string
	for _, e := range entries {
		if !e.IsDir() {
			continue
		}
		if strings.EqualFold(e.Name(), model) || strings.EqualFold(e.Name(), base) {
			out = append(out, filepath.Join(s.repoDir(), e.Name()))
		}
	}
	sort.Strings(out)
	return out
}

// findLayers walks dirs down to maxRepoDepth and returns the shallowest Metal and SR TIFF.
func findLayers(dirs []string) layerFiles {
	var found layerFiles
	depth := map[string]int{}
	for _, dir := range dirs {
		_ = filepath.WalkDir(dir, func(path string, d fs.DirEntry, err error) error {
			if err != nil {
				return nil
			}
			rel, relErr := filepath.Rel(dir, path)
			if relErr != nil {
				return nil
			}
			level := 0
			if rel != "." {
				level = strings.Count(rel, string(filepath.Separator)) + 1
			}
			if d.IsDir() {
				if level >= maxRepoDepth {
					return filepath.SkipDir
				}
				return nil
			}
			var layer string
			switch strings.ToLower(d.Name()) {
			case "metal.tif", "metal.tiff":
				layer = "metal"
			case "sr.tif", "sr.tiff":
				layer = "sr"
			default:
				return nil
			}
			if old, ok := depth[layer]; ok && old <= level {
				return nil
			}
			depth[layer] = level
			if layer == "metal" {
				found.metal = path
			} else {
				found.sr = path
			}
			return nil
		})
	}
	return found
}

// grayLayer is a decoded 8-bit layer.
type grayLayer struct {
	pix    []uint8
	stride int
	w, h   int
}

// readGray decodes a TIFF into an 8-bit gray layer. The file is read in one go and decoded from
// memory: a network share answers one long sequential read far better than the many small reads
// of a decoder that seeks through the file.
func readGray(path string) (*grayLayer, error) {
	data, err := os.ReadFile(path)
	if err != nil {
		return nil, err
	}
	img, err := tiff.Decode(bytes.NewReader(data))
	if err != nil {
		return nil, err
	}
	if g, ok := img.(*image.Gray); ok && g.Rect.Min == (image.Point{}) {
		return &grayLayer{pix: g.Pix, stride: g.Stride, w: g.Rect.Dx(), h: g.Rect.Dy()}, nil
	}
	b := img.Bounds()
	g := image.NewGray(image.Rect(0, 0, b.Dx(), b.Dy()))
	for y := 0; y < b.Dy(); y++ {
		for x := 0; x < b.Dx(); x++ {
			g.SetGray(x, y, color.GrayModel.Convert(img.At(b.Min.X+x, b.Min.Y+y)).(color.Gray))
		}
	}
	return &grayLayer{pix: g.Pix, stride: g.Stride, w: b.Dx(), h: b.Dy()}, nil
}

// coverage returns, for the preview pixel (px, py), how much of the layer is lit (0..255): the
// mean of the TIFF pixels the preview pixel stands for.
func (g *grayLayer) coverage(px, py, outW, outH int) uint32 {
	x0, x1 := px*g.w/outW, (px+1)*g.w/outW
	y0, y1 := py*g.h/outH, (py+1)*g.h/outH
	if x1 <= x0 {
		x1 = x0 + 1
	}
	if y1 <= y0 {
		y1 = y0 + 1
	}
	var sum uint32
	for y := y0; y < y1; y++ {
		row := g.pix[y*g.stride+x0 : y*g.stride+x1]
		for _, v := range row {
			sum += uint32(v)
		}
	}
	return sum / uint32((x1-x0)*(y1-y0))
}

// mix returns a over b by t/255 for one channel.
func mix(a, b uint8, t uint32) uint8 {
	return uint8((uint32(a)*t + uint32(b)*(255-t)) / 255)
}

// composeLayers paints the resist in green and the metal in gold over black, at 1/previewFactor of
// the TIFF size. A missing layer (nil) paints nothing.
func composeLayers(metal, sr *grayLayer, srcW, srcH int) *image.RGBA {
	outW := (srcW + previewFactor - 1) / previewFactor
	outH := (srcH + previewFactor - 1) / previewFactor
	out := image.NewRGBA(image.Rect(0, 0, outW, outH))
	for y := 0; y < outH; y++ {
		for x := 0; x < outW; x++ {
			c := color.RGBA{A: 255}
			if sr != nil {
				t := sr.coverage(x, y, outW, outH)
				c = color.RGBA{R: mix(resistColor.R, c.R, t), G: mix(resistColor.G, c.G, t), B: mix(resistColor.B, c.B, t), A: 255}
			}
			if metal != nil {
				t := metal.coverage(x, y, outW, outH)
				c = color.RGBA{R: mix(metalColor.R, c.R, t), G: mix(metalColor.G, c.G, t), B: mix(metalColor.B, c.B, t), A: 255}
			}
			out.SetRGBA(x, y, c)
		}
	}
	return out
}

// pngDataURL encodes img as a data URL.
func pngDataURL(img image.Image) (string, error) {
	var buf bytes.Buffer
	enc := png.Encoder{CompressionLevel: png.BestSpeed}
	if err := enc.Encode(&buf, img); err != nil {
		return "", err
	}
	return "data:image/png;base64," + base64.StdEncoding.EncodeToString(buf.Bytes()), nil
}

// alignPicture composes the picture of model once per session (ReloadPictures forgets it). Nothing
// under PxRepository is ever written.
func (s *Service) alignPicture(model string) (composed, error) {
	s.mu.Lock()
	cached := s.pictures[model]
	s.mu.Unlock()
	if cached != nil {
		return *cached, nil
	}

	dirs := s.modelRepoDirs(model)
	files := findLayers(dirs)
	pic := composed{}
	var metal, sr *grayLayer
	var errs []error
	for _, layer := range []struct {
		path string
		dst  **grayLayer
	}{{files.metal, &metal}, {files.sr, &sr}} {
		if layer.path == "" {
			continue
		}
		g, err := readGray(layer.path)
		if err != nil {
			errs = append(errs, fmt.Errorf("%s: %w", filepath.Base(layer.path), err))
			continue
		}
		*layer.dst = g
	}

	switch {
	case files.metal == "" && files.sr == "":
		pic.state = StateMissing
	case metal == nil && sr == nil:
		pic.state = StateUnreadable
	case metal == nil || sr == nil:
		pic.state = StatePartial
	default:
		pic.state = StateOK
	}

	if pic.state == StateMissing || pic.state == StateUnreadable {
		pic.srcW, pic.srcH = defaultImageWidth, defaultImageHeight
	} else {
		first := metal
		if first == nil {
			first = sr
		}
		pic.srcW, pic.srcH = first.w, first.h
		// A layer of another size is left out rather than stretched over the first one.
		if metal != nil && sr != nil && (metal.w != sr.w || metal.h != sr.h) {
			sr = nil
			pic.state = StatePartial
		}
	}

	img := composeLayers(metal, sr, pic.srcW, pic.srcH)
	url, err := pngDataURL(img)
	if err != nil {
		return composed{}, err
	}
	pic.url = url

	if err := errors.Join(errs...); err != nil {
		pic.note = err.Error()
	} else if pic.state == StateMissing {
		pic.note = "no Metal.tif or SR.tif: " + s.searchedNote(model, dirs)
	}
	s.mu.Lock()
	if s.pictures == nil {
		s.pictures = map[string]*composed{}
	}
	if _, seen := s.pictures[model]; !seen {
		s.pictureList = append(s.pictureList, model)
		for len(s.pictureList) > maxAlignPictures {
			delete(s.pictures, s.pictureList[0])
			s.pictureList = s.pictureList[1:]
		}
	}
	s.pictures[model] = &pic
	s.mu.Unlock()
	return pic, nil
}

// displayHeight is the viewer height of a picture srcW x srcH shown displayWidth wide.
func displayHeight(srcW, srcH int) int {
	return (displayWidth*srcH + srcW/2) / srcW
}
