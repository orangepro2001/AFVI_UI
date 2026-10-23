package inventory

import (
	"bytes"
	"image"
	"image/color"
	"math"
	"os"
	"path/filepath"
	"strings"
	"testing"
	"time"

	"golang.org/x/image/tiff"
)

// writeGrayTiff writes a w x h gray TIFF whose pixel (x, y) is value(x, y).
func writeGrayTiff(t *testing.T, path string, w, h int, value func(x, y int) uint8) {
	t.Helper()
	img := image.NewGray(image.Rect(0, 0, w, h))
	for y := 0; y < h; y++ {
		for x := 0; x < w; x++ {
			img.SetGray(x, y, color.Gray{Y: value(x, y)})
		}
	}
	var buf bytes.Buffer
	if err := tiff.Encode(&buf, img, nil); err != nil {
		t.Fatal(err)
	}
	if err := os.MkdirAll(filepath.Dir(path), 0o755); err != nil {
		t.Fatal(err)
	}
	if err := os.WriteFile(path, buf.Bytes(), 0o644); err != nil {
		t.Fatal(err)
	}
}

// halves is an 80 x 40 picture: 10 on the left half, 200 on the right half.
func halves(x, _ int) uint8 {
	if x < 40 {
		return 10
	}
	return 200
}

// medianFixture builds model M1-00 with the Median pictures of Light-1 and Light-2 in
// PxRepository/m1/2.0/Line/Top/Layer/MEDIAN. It returns the service and that folder.
func medianFixture(t *testing.T) (*Service, string) {
	t.Helper()
	svc, inv, _ := alignFixture(t, false)
	dir := filepath.Join(filepath.Dir(inv), "PxRepository", "m1", "2.0", "Line", "Top", "Layer", "MEDIAN")
	writeGrayTiff(t, filepath.Join(dir, "Median_0_1_0.tif"), 80, 40, halves)
	writeGrayTiff(t, filepath.Join(dir, "Median_0_1_1.tif"), 80, 40, func(int, int) uint8 { return 77 })
	return svc, dir
}

func near(a, b float64) bool { return math.Abs(a-b) < 1e-9 }

func TestMedianViewPerLight(t *testing.T) {
	svc, _ := medianFixture(t)
	view, err := svc.MedianView(1)
	if err != nil {
		t.Fatal(err)
	}
	if view.State != StateOK || view.Light != 1 || view.File != "Median_0_1_0.tif" {
		t.Fatalf("view = %+v", view)
	}
	if view.Size != (PictureSize{Width: 80, Height: 40}) {
		t.Errorf("size = %+v", view.Size)
	}
	if view.Image.Width != displayWidth || view.Image.Height != displayHeight(80, 40) {
		t.Errorf("image = %d x %d", view.Image.Width, view.Image.Height)
	}
	if !strings.HasPrefix(view.Image.URL, "data:image/png;base64,") {
		t.Errorf("url = %.40s", view.Image.URL)
	}
	if len(view.Lights) != 2 || view.Lights[0] != 1 || view.Lights[1] != 2 {
		t.Errorf("lights = %v", view.Lights)
	}

	second, err := svc.MedianView(2)
	if err != nil || second.File != "Median_0_1_1.tif" || second.Image.URL == view.Image.URL {
		t.Errorf("Light-2 = %+v, %v", second, err)
	}
}

func TestMedianViewMissingAndUnreadable(t *testing.T) {
	svc, dir := medianFixture(t)

	view, err := svc.MedianView(3)
	if err != nil || view.State != StateMissing || view.Note == "" || view.Image.URL != "" {
		t.Errorf("Light-3 = %+v, %v", view, err)
	}
	if len(view.Lights) != 2 {
		t.Errorf("lights = %v", view.Lights)
	}
	if _, err := svc.MedianView(0); err == nil {
		t.Error("Light-0 accepted")
	}

	writeFile(t, filepath.Join(dir, "Median_0_1_2.tif"), "not a tiff")
	// The lookup of Light-3 was remembered as "none": the new file shows after a reload.
	svc.ReloadPictures()
	view, err = svc.MedianView(3)
	if err != nil || view.State != StateUnreadable || view.Note == "" {
		t.Errorf("garbage = %+v, %v", view, err)
	}
	if _, err := svc.MeasureGv(3, GvBox{W: 5, H: 5}); err == nil {
		t.Error("measuring an unreadable picture succeeded")
	}
}

func TestMedianViewWithoutRepository(t *testing.T) {
	svc, _, _ := alignFixture(t, false)
	view, err := svc.MedianView(1)
	if err != nil || view.State != StateMissing || len(view.Lights) != 0 {
		t.Errorf("view = %+v, %v", view, err)
	}
}

func TestMeasureGvStatistics(t *testing.T) {
	svc, _ := medianFixture(t)

	whole, err := svc.MeasureGv(1, GvBox{X: 0, Y: 0, W: 80, H: 40})
	if err != nil {
		t.Fatal(err)
	}
	want := GvStats{Box: GvRect{W: 80, H: 40}, Pixels: 3200, Mean: 105, Std: 95, Min: 10, Max: 200}
	if whole != want {
		t.Errorf("whole = %+v, want %+v", whole, want)
	}

	left, _ := svc.MeasureGv(1, GvBox{X: 5, Y: 2, W: 20, H: 10})
	if left.Mean != 10 || left.Std != 0 || left.Pixels != 200 || left.Box != (GvRect{X: 5, Y: 2, W: 20, H: 10}) {
		t.Errorf("left = %+v", left)
	}

	// A box across the edge: 5 columns of 10 and 15 of 200.
	across, _ := svc.MeasureGv(1, GvBox{X: 35, Y: 0, W: 20, H: 4})
	if !near(across.Mean, (5*10+15*200)/20.0) || across.Min != 10 || across.Max != 200 {
		t.Errorf("across = %+v", across)
	}
	if !near(across.Std, math.Sqrt((5*math.Pow(10-152.5, 2)+15*math.Pow(200-152.5, 2))/20)) {
		t.Errorf("std = %v", across.Std)
	}
}

func TestMeasureGvRoundsOutwardsAndClamps(t *testing.T) {
	svc, _ := medianFixture(t)
	cases := map[string]struct {
		box  GvBox
		want GvRect
	}{
		"fraction":      {GvBox{X: 10.4, Y: 5.5, W: 3.2, H: 1.1}, GvRect{X: 10, Y: 5, W: 4, H: 2}},
		"left of image": {GvBox{X: -30, Y: -10, W: 50, H: 20}, GvRect{X: 0, Y: 0, W: 20, H: 10}},
		"past the edge": {GvBox{X: 70, Y: 30, W: 100, H: 100}, GvRect{X: 70, Y: 30, W: 10, H: 10}},
		"empty":         {GvBox{X: 12, Y: 7}, GvRect{X: 12, Y: 7, W: 1, H: 1}},
		"far outside":   {GvBox{X: 500, Y: 500, W: 10, H: 10}, GvRect{X: 79, Y: 39, W: 1, H: 1}},
		"huge":          {GvBox{X: -1e300, Y: -1e300, W: 2e300, H: 2e300}, GvRect{W: 80, H: 40}},
	}
	for name, c := range cases {
		got, err := svc.MeasureGv(1, c.box)
		if err != nil {
			t.Errorf("%s: %v", name, err)
			continue
		}
		if got.Box != c.want || got.Pixels != c.want.W*c.want.H {
			t.Errorf("%s: box = %+v (%d px), want %+v", name, got.Box, got.Pixels, c.want)
		}
	}
}

func TestMeasureGvSaturation(t *testing.T) {
	g := &grayLayer{pix: []uint8{0, 0, 255, 128, 255, 255}, stride: 3, w: 3, h: 2}
	stats, err := measureGray(g, GvBox{W: 3, H: 2})
	if err != nil {
		t.Fatal(err)
	}
	if stats.SaturatedLow != 2 || stats.SaturatedHigh != 3 || stats.Min != 0 || stats.Max != 255 {
		t.Errorf("stats = %+v", stats)
	}
	if _, err := measureGray(nil, GvBox{}); err == nil {
		t.Error("an empty picture was measured")
	}
}

func TestMeasureGvFlatPictureHasNoSpread(t *testing.T) {
	g := &grayLayer{pix: bytes.Repeat([]byte{255}, 4000*4000), stride: 4000, w: 4000, h: 4000}
	stats, err := measureGray(g, GvBox{W: 4000, H: 4000})
	if err != nil {
		t.Fatal(err)
	}
	if stats.Mean != 255 || stats.Std > 1e-3 {
		t.Errorf("mean = %v std = %v", stats.Mean, stats.Std)
	}
}

func TestMedianFileChoice(t *testing.T) {
	base := t.TempDir()
	repo := filepath.Join(base, "m1")
	touch := func(rel string) {
		writeFile(t, filepath.Join(repo, filepath.FromSlash(rel)), "x")
	}
	touch("2.0/Line/Bottom/Layer/MEDIAN/Median_0_1_0.tif")
	touch("2.0/Line/Top/Layer/MEDIAN/Median_2_0_0.tif")
	touch("2.0/Line/Top/Layer/MEDIAN/Median_1_9_0.tif")
	touch("2.0/Line/Top/Layer/MEDIAN/Median_1_2_0.tif")
	touch("2.0/Line/Top/Layer/MEDIAN/median_0_0_2.TIFF")
	touch("2.0/Line/Top/Layer/MEDIAN/Thumbs.db")
	touch("2.0/Line/Top/Layer/MEDIAN/Median_x_1_1.tif")

	top := findMedianFiles([]string{repo}, "Top")
	if len(top) != 2 {
		t.Fatalf("top = %+v", top)
	}
	if got := filepath.Base(top[0].path); got != "Median_1_2_0.tif" {
		t.Errorf("Light-1 = %s: the lowest a_b of the surface's folder wins", got)
	}
	if got := filepath.Base(top[2].path); got != "median_0_0_2.TIFF" {
		t.Errorf("Light-3 = %s", got)
	}
	if got := sortedLights(top); len(got) != 2 || got[0] != 1 || got[1] != 3 {
		t.Errorf("lights = %v", got)
	}

	bottom := findMedianFiles([]string{repo}, "bottom")
	if len(bottom) != 1 || !strings.Contains(bottom[0].path, "Bottom") {
		t.Errorf("bottom = %+v", bottom)
	}
	if got := findMedianFiles([]string{filepath.Join(base, "nothing")}, "Top"); len(got) != 0 {
		t.Errorf("nothing = %+v", got)
	}
}

func TestMedianPictureIsReadOnceAndServedFromMemory(t *testing.T) {
	svc, dir := medianFixture(t)
	path := filepath.Join(dir, "Median_0_1_0.tif")

	first, err := svc.medianPicture(path)
	if err != nil {
		t.Fatal(err)
	}
	again, _ := svc.medianPicture(path)
	if again != first {
		t.Error("the same picture was decoded twice")
	}

	// A new file under the same name (and a later date) is not looked at: the share is not asked.
	writeGrayTiff(t, path, 80, 40, func(int, int) uint8 { return 99 })
	later := time.Now().Add(time.Hour)
	if err := os.Chtimes(path, later, later); err != nil {
		t.Fatal(err)
	}
	if stats, _ := svc.MeasureGv(1, GvBox{W: 80, H: 40}); stats.Mean != 105 {
		t.Errorf("mean = %v: the picture was read again", stats.Mean)
	}

	// Until the pictures are explicitly reloaded.
	svc.ReloadPictures()
	if stats, _ := svc.MeasureGv(1, GvBox{W: 80, H: 40}); stats.Mean != 99 {
		t.Errorf("mean = %v after ReloadPictures", stats.Mean)
	}
}

func TestMedianNeedsNoDiskOnceLoaded(t *testing.T) {
	svc, dir := medianFixture(t)
	view, err := svc.MedianView(1)
	if err != nil || view.State != StateOK {
		t.Fatalf("view = %+v, %v", view, err)
	}
	before, _ := svc.MeasureGv(1, GvBox{X: 5, Y: 5, W: 30, H: 20})

	// The whole repository and the inventory go away: a warm session does not notice, which is
	// what keeps a drag from asking the network share dozens of times a second.
	base := filepath.Dir(svc.root)
	if err := os.RemoveAll(filepath.Join(base, "PxRepository")); err != nil {
		t.Fatal(err)
	}
	if err := os.RemoveAll(svc.root); err != nil {
		t.Fatal(err)
	}
	if _, err := os.Stat(dir); err == nil {
		t.Fatal("the repository is still there")
	}
	for i := 0; i < 50; i++ {
		got, err := svc.MeasureGv(1, GvBox{X: 5, Y: 5, W: 30, H: 20})
		if err != nil || got != before {
			t.Fatalf("measure %d = %+v, %v", i, got, err)
		}
	}
	again, err := svc.MedianView(1)
	if err != nil || again.Image.URL != view.Image.URL || again.State != StateOK {
		t.Errorf("view after the disk went = %+v, %v", again, err)
	}
	// A light that was never loaded needs the file: it is gone now.
	if other, _ := svc.MedianView(2); other.State != StateUnreadable {
		t.Errorf("Light-2 = %+v", other)
	}
}

func TestMedianLookupIsRememberedPerModel(t *testing.T) {
	svc, dir := medianFixture(t)
	if view, _ := svc.MedianView(3); view.State != StateMissing {
		t.Fatalf("Light-3 = %+v", view)
	}
	// A picture that shows up later is not noticed (no new look at the share) ...
	writeGrayTiff(t, filepath.Join(dir, "Median_0_1_2.tif"), 80, 40, halves)
	if view, _ := svc.MedianView(3); view.State != StateMissing {
		t.Errorf("Light-3 = %+v: the folder was walked again", view)
	}
	// ... until the pictures are reloaded.
	svc.ReloadPictures()
	if view, _ := svc.MedianView(3); view.State != StateOK {
		t.Errorf("Light-3 after ReloadPictures = %+v", view)
	}
}

func TestMedianCacheIsBoundedByMemory(t *testing.T) {
	svc, dir := medianFixture(t)
	old := maxMedianBytes
	maxMedianBytes = 3 * 64
	defer func() { maxMedianBytes = old }()

	for i := 0; i < 6; i++ {
		path := filepath.Join(dir, "extra", strings.Repeat("a", i+1)+".tif")
		writeGrayTiff(t, path, 8, 8, halves)
		if _, err := svc.medianPicture(path); err != nil {
			t.Fatal(err)
		}
	}
	if n := len(svc.medianCache); n != 3 {
		t.Errorf("cache holds %d pictures of 64 bytes within 192, want 3", n)
	}

	// The picture just asked for stays even when it alone is over the budget.
	maxMedianBytes = 10
	last := filepath.Join(dir, "extra", "big.tif")
	writeGrayTiff(t, last, 8, 8, halves)
	if _, err := svc.medianPicture(last); err != nil {
		t.Fatal(err)
	}
	if n := len(svc.medianCache); n != 1 || svc.medianCache[0].path != last {
		t.Errorf("cache = %d pictures", n)
	}
}

func TestReadGrayDecodesFromMemory(t *testing.T) {
	// readGray decodes from memory: the same pixels as decoding straight from the file.
	svc, dir := medianFixture(t)
	g, err := readGray(filepath.Join(dir, "Median_0_1_0.tif"))
	if err != nil {
		t.Fatal(err)
	}
	if g.w != 80 || g.h != 40 || g.pix[0] != 10 || g.pix[79] != 200 {
		t.Errorf("layer = %dx%d, first %d last %d", g.w, g.h, g.pix[0], g.pix[79])
	}
	_ = svc
}

func TestMedianNeverWritesTheRepository(t *testing.T) {
	svc, dir := medianFixture(t)
	snapshot := func() map[string]int64 {
		out := map[string]int64{}
		_ = filepath.WalkDir(filepath.Dir(dir), func(path string, d os.DirEntry, err error) error {
			if err == nil && !d.IsDir() {
				info, _ := d.Info()
				out[path] = info.ModTime().UnixNano() + info.Size()
			}
			return nil
		})
		return out
	}
	before := snapshot()
	_, _ = svc.MedianView(1)
	_, _ = svc.MeasureGv(1, GvBox{W: 10, H: 10})
	after := snapshot()
	if len(before) != len(after) {
		t.Fatalf("files before %d, after %d", len(before), len(after))
	}
	for path, v := range before {
		if after[path] != v {
			t.Errorf("%s changed", path)
		}
	}
}

// The reference machine's Median picture: the numbers were measured independently (Pillow).
func TestRealMedianPicture(t *testing.T) {
	if _, err := os.Stat(realInventory); err != nil {
		t.Skipf("real inventory not present: %v", err)
	}
	svc, err := Open(realInventory)
	if err != nil {
		t.Fatal(err)
	}
	if _, err := svc.Select("25FBO015-15-00"); err != nil {
		t.Fatal(err)
	}
	view, err := svc.MedianView(1)
	if err != nil {
		t.Fatal(err)
	}
	if view.State != StateOK || view.Size != (PictureSize{Width: 5860, Height: 4020}) || len(view.Lights) != 3 {
		t.Fatalf("view = %+v", view)
	}
	if view.File != "Median_0_1_0.tif" || view.Image.Height != 536 {
		t.Errorf("file = %s, height = %d", view.File, view.Image.Height)
	}
	whole, err := svc.MeasureGv(1, GvBox{W: 5860, H: 4020})
	if err != nil {
		t.Fatal(err)
	}
	if math.Abs(whole.Mean-31.03) > 0.01 || math.Abs(whole.Std-20.39) > 0.01 || whole.Min != 12 || whole.Max != 168 {
		t.Errorf("Light-1 = %+v", whole)
	}
	second, _ := svc.MeasureGv(2, GvBox{W: 5860, H: 4020})
	if math.Abs(second.Mean-18.1) > 0.01 || second.Min != 9 || second.Max != 29 {
		t.Errorf("Light-2 = %+v", second)
	}
}

func writeEmptyDir(path string) error { return os.MkdirAll(path, 0o755) }

func removeFile(path string) error { return os.Remove(path) }
