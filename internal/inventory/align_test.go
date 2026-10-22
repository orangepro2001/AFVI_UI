package inventory

import (
	"bytes"
	"errors"
	"image"
	"image/color"
	"os"
	"path/filepath"
	"strings"
	"testing"

	"golang.org/x/image/tiff"
)

const alignSpecXML = `<?xml version="1.0" encoding="UTF-8"?>
<pixel Version="1.0">
	<AlignPoint>
		<Cell ID="0" AlignPoint="1">
			<Param ID="0" Left="1" Top="1" Right="50" Bottom="50" Type="0"/>
		</Cell>
		<Unit ID="0" AlignPoint="4">
			<Param ID="0" Left="100" Top="200" Right="300" Bottom="400" Type="3"/>
			<Param ID="4" Left="10" Top="20" Right="110" Bottom="80" Type="0"/>
			<Param ID="5" Left="400" Top="300" Right="400" Bottom="350" Type="0"/>
			<Param ID="6" Left="500" Top="600" Right="700" Bottom="640" Type="0"/>
		</Unit>
	</AlignPoint>
</pixel>`

// writeTiff writes a w x h gray TIFF in which the pixels left of lit are 255.
func writeTiff(t *testing.T, path string, w, h, lit int) {
	t.Helper()
	img := image.NewGray(image.Rect(0, 0, w, h))
	for y := 0; y < h; y++ {
		for x := 0; x < lit; x++ {
			img.SetGray(x, y, color.Gray{Y: 255})
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

// alignFixture builds PxInventory (model M1-00 with an AlignSpec.xml) and, when layers is true,
// PxRepository/m1/deeper/{Metal,SR}.tif. It returns the service and the user folder.
func alignFixture(t *testing.T, layers bool) (*Service, string, string) {
	t.Helper()
	base := t.TempDir()
	inv := filepath.Join(base, "PxInventory")
	writeFile(t, filepath.Join(inv, "INSPECT_SPEC", "M1-00", "TOP", "AlignSpec.xml"), alignSpecXML)
	repo := filepath.Join(base, "PxRepository")
	if err := os.MkdirAll(repo, 0o755); err != nil {
		t.Fatal(err)
	}
	if layers {
		writeTiff(t, filepath.Join(repo, "m1", "deeper", "Metal.tif"), 80, 40, 40)
		writeTiff(t, filepath.Join(repo, "m1", "deeper", "SR.tif"), 80, 40, 80)
	}
	svc, err := Open(inv)
	if err != nil {
		t.Fatal(err)
	}
	user := filepath.Join(base, "user")
	if err := svc.SetUserDir(user); err != nil {
		t.Fatal(err)
	}
	return svc, inv, user
}

func TestAlignViewMachineRois(t *testing.T) {
	svc, _, _ := alignFixture(t, true)
	view, err := svc.AlignView()
	if err != nil {
		t.Fatal(err)
	}
	// Only Type 0 of the Unit, and the empty one (Left == Right) is dropped.
	want := []AlignRoi{{ID: "P4", X: 10, Y: 20, W: 100, H: 60}, {ID: "P6", X: 500, Y: 600, W: 200, H: 40}}
	if len(view.Rois) != len(want) || view.Rois[0] != want[0] || view.Rois[1] != want[1] {
		t.Fatalf("rois = %+v, want %+v", view.Rois, want)
	}
	if view.Edited {
		t.Error("Edited without a user file")
	}
}

func TestAlignPictureFoundRecursively(t *testing.T) {
	svc, _, _ := alignFixture(t, true)
	view, err := svc.AlignView()
	if err != nil {
		t.Fatal(err)
	}
	if view.State != StateOK {
		t.Fatalf("state = %q (%s)", view.State, view.Note)
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
}

func TestComposeColors(t *testing.T) {
	metal := &grayLayer{pix: []uint8{255, 0, 0, 0}, stride: 4, w: 4, h: 1}
	sr := &grayLayer{pix: []uint8{255, 255, 0, 0}, stride: 4, w: 4, h: 1}
	img := composeLayers(metal, sr, 4*previewFactor, previewFactor)
	if img.Bounds().Dx() != 4 {
		t.Fatalf("width = %d", img.Bounds().Dx())
	}
	if got := img.RGBAAt(0, 0); got != metalColor {
		t.Errorf("metal over resist = %v", got)
	}
	if got := img.RGBAAt(1, 0); got != resistColor {
		t.Errorf("resist = %v", got)
	}
	if got := img.RGBAAt(3, 0); got != (color.RGBA{A: 255}) {
		t.Errorf("empty = %v", got)
	}
}

func TestAlignPictureMissing(t *testing.T) {
	svc, _, _ := alignFixture(t, false)
	view, err := svc.AlignView()
	if err != nil {
		t.Fatal(err)
	}
	if view.State != StateMissing {
		t.Errorf("state = %q", view.State)
	}
	if view.Size != (PictureSize{Width: defaultImageWidth, Height: defaultImageHeight}) {
		t.Errorf("size = %+v", view.Size)
	}
	if view.Image.URL == "" || len(view.Rois) != 2 {
		t.Errorf("an empty picture and the machine ROIs must still show: %+v", view.Rois)
	}
}

func TestAlignPictureUnreadable(t *testing.T) {
	svc, inv, _ := alignFixture(t, false)
	writeFile(t, filepath.Join(filepath.Dir(inv), "PxRepository", "M1", "Metal.tif"), "not a tiff")
	view, err := svc.AlignView()
	if err != nil {
		t.Fatal(err)
	}
	if view.State != StateUnreadable || view.Note == "" {
		t.Errorf("state = %q note = %q", view.State, view.Note)
	}
}

func TestSaveAlignRoisLeavesMachineFilesAlone(t *testing.T) {
	svc, inv, user := alignFixture(t, true)
	spec := filepath.Join(inv, "INSPECT_SPEC", "M1-00", "TOP", "AlignSpec.xml")
	before, _ := os.ReadFile(spec)

	saved, err := svc.SaveAlignRois([]AlignRoi{
		{ID: "P4", X: 11, Y: 21, W: 100, H: 60},
		{ID: "R1", X: -5, Y: 10, W: 30, H: 100}, // sticks out of the 80 x 40 picture
	})
	if err != nil {
		t.Fatal(err)
	}
	if saved[1] != (AlignRoi{ID: "R1", X: 0, Y: 10, W: 25, H: 30}) {
		t.Errorf("clamped = %+v", saved[1])
	}
	after, _ := os.ReadFile(spec)
	if !bytes.Equal(before, after) {
		t.Fatal("AlignSpec.xml was changed")
	}
	files, _ := filepath.Glob(filepath.Join(user, "*.json"))
	if len(files) != 1 {
		t.Fatalf("user files = %v", files)
	}

	view, _ := svc.AlignView()
	if !view.Edited || len(view.Rois) != 2 || view.Rois[0].X != 11 {
		t.Errorf("view after save = %+v", view)
	}

	rois, err := svc.ResetAlignRois()
	if err != nil || len(rois) != 2 || rois[0].X != 10 {
		t.Errorf("reset = %+v, %v", rois, err)
	}
	if view, _ = svc.AlignView(); view.Edited {
		t.Error("still Edited after reset")
	}
}

func TestSaveAlignRoisRejects(t *testing.T) {
	svc, _, _ := alignFixture(t, true)
	for name, rois := range map[string][]AlignRoi{
		"empty id":  {{ID: " ", X: 0, Y: 0, W: 20, H: 20}},
		"repeated":  {{ID: "A", X: 0, Y: 0, W: 20, H: 20}, {ID: "A", X: 30, Y: 0, W: 20, H: 20}},
		"too small": {{ID: "A", X: 0, Y: 0, W: 3, H: 20}},
		"outside":   {{ID: "A", X: 200, Y: 0, W: 20, H: 20}},
	} {
		if _, err := svc.SaveAlignRois(rois); err == nil {
			t.Errorf("%s: no error", name)
		}
	}
	if saved, err := svc.SaveAlignRois(nil); err != nil || len(saved) != 0 {
		t.Errorf("an empty list is a valid list: %v %v", saved, err)
	}
}

func TestSaveAlignRoisNeedsUserDir(t *testing.T) {
	svc, _, _ := alignFixture(t, true)
	if err := svc.SetUserDir(""); err != nil {
		t.Fatal(err)
	}
	if _, err := svc.SaveAlignRois(nil); !errors.Is(err, ErrNoUserDir) {
		t.Errorf("err = %v", err)
	}
}

func TestUserDirNeverInsideMachineData(t *testing.T) {
	svc, inv, _ := alignFixture(t, true)
	for _, dir := range []string{inv, filepath.Join(inv, "sub"), filepath.Join(filepath.Dir(inv), "PxRepository", "m1")} {
		if err := svc.SetUserDir(dir); err == nil {
			t.Errorf("%s accepted", dir)
		}
	}
}
