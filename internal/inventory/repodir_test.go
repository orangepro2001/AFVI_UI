package inventory

import (
	"path/filepath"
	"strings"
	"testing"
)

// A UNC share is a volume: filepath.Dir(\\host\PxInventory) is \\host\PxInventory itself, so the
// repository next to it has to be built from the volume name. This is the case of a host that the
// Connector holds as a bare \\host root, where every picture used to be looked for in
// \\host\PxInventory\PxRepository, a folder that does not exist.
func TestUNCShareSibling(t *testing.T) {
	cases := []struct {
		name, dir, vol, want string
		ok                   bool
	}{
		{"a share of a bare host root", `\\192.168.1.61\PxInventory`, `\\192.168.1.61\PxInventory`, `\\192.168.1.61\PxRepository`, true},
		{"with a trailing separator", `\\192.168.1.61\PxInventory\`, `\\192.168.1.61\PxInventory`, `\\192.168.1.61\PxRepository`, true},
		{"slashes", `//srv/Inv`, `//srv/Inv`, `//srv/PxRepository`, true},
		{"a folder below a share", `\\host\share\PxInventory`, `\\host\share`, "", false},
		{"a drive letter", `D:\PxInventory`, `D:`, "", false},
		{"no volume", `/data/PxInventory`, "", "", false},
	}
	for _, c := range cases {
		got, ok := uncShareSibling(c.dir, c.vol, "PxRepository")
		if got != c.want || ok != c.ok {
			t.Errorf("%s: uncShareSibling(%q, %q) = %q, %v; want %q, %v", c.name, c.dir, c.vol, got, ok, c.want, c.ok)
		}
	}
}

func TestSiblingDirOfAnOrdinaryFolder(t *testing.T) {
	dir := filepath.Join("data", "host", "PxInventory")
	if got, want := siblingDir(dir, "PxRepository"), filepath.Join("data", "host", "PxRepository"); got != want {
		t.Errorf("siblingDir = %q, want %q", got, want)
	}
}

func TestSetRepoDirWinsOverTheGuess(t *testing.T) {
	// The repository is not next to PxInventory: only an explicit folder finds the pictures.
	svc, inv, _ := alignFixture(t, false)
	elsewhere := filepath.Join(t.TempDir(), "PxRepository")
	writeTiff(t, filepath.Join(elsewhere, "m1", "Metal.tif"), 80, 40, 40)
	writeTiff(t, filepath.Join(elsewhere, "m1", "SR.tif"), 80, 40, 80)
	if view, _ := svc.AlignView(); view.State != StateMissing {
		t.Fatalf("before SetRepoDir the guess finds %q", view.State)
	}
	_ = inv

	svc.ReloadPictures()
	svc.SetRepoDir(elsewhere)
	view, err := svc.AlignView()
	if err != nil || view.State != StateOK {
		t.Fatalf("after SetRepoDir: %q (%s), %v", view.State, view.Note, err)
	}
}

func TestAMissingPictureSaysWhereItWasLookedFor(t *testing.T) {
	svc, inv, _ := alignFixture(t, false)
	repo := filepath.Join(filepath.Dir(inv), "PxRepository")

	// No folder for the model at all.
	view, _ := svc.AlignView()
	if view.State != StateMissing || !strings.Contains(view.Note, "there is no folder for model M1-00 in "+repo) {
		t.Errorf("align note = %q", view.Note)
	}
	median, _ := svc.MedianView(2)
	if median.State != StateMissing || !strings.Contains(median.Note, "Light-2") || !strings.Contains(median.Note, "no folder for model M1-00") {
		t.Errorf("median note = %q", median.Note)
	}

	// The folder is there but holds no pictures.
	svc.ReloadPictures()
	if err := writeEmptyDir(filepath.Join(repo, "m1")); err != nil {
		t.Fatal(err)
	}
	view, _ = svc.AlignView()
	if !strings.Contains(view.Note, "looked below "+filepath.Join(repo, "m1")) {
		t.Errorf("align note = %q", view.Note)
	}
	median, _ = svc.MedianView(2)
	if !strings.Contains(median.Note, "looked below "+filepath.Join(repo, "m1")) {
		t.Errorf("median note = %q", median.Note)
	}
}

func TestTheMachinesResolutionDecidesWhichMedianFolderIsUsed(t *testing.T) {
	svc, inv, _ := alignFixture(t, false)
	repo := filepath.Join(filepath.Dir(inv), "PxRepository", "m1")
	// A model taught at 2.0 and at 3.5 has a MEDIAN folder under each, with different pictures.
	writeGrayTiff(t, filepath.Join(repo, "2.0", "Line", "Top", "Layer", "MEDIAN", "Median_0_1_0.tif"), 8, 8, func(int, int) uint8 { return 20 })
	writeGrayTiff(t, filepath.Join(repo, "3.5", "Line", "Top", "Layer", "MEDIAN", "Median_0_1_0.tif"), 8, 8, func(int, int) uint8 { return 35 })

	mean := func() float64 {
		stats, err := svc.MeasureGv(1, GvBox{W: 8, H: 8})
		if err != nil {
			t.Fatal(err)
		}
		return stats.Mean
	}

	// Application.xml names the machine's resolution: 3.5.
	writeFile(t, filepath.Join(inv, "Application.xml"), `<?xml version="1.0"?><pixel><system Model="M1" Resolution="3.5"/></pixel>`)
	if got := mean(); got != 35 {
		t.Errorf("with a 3.5 machine the mean is %v, want 35", got)
	}

	// Without it the model's own (first) resolution folder is used.
	if err := removeFile(filepath.Join(inv, "Application.xml")); err != nil {
		t.Fatal(err)
	}
	svc.ReloadPictures()
	if got := mean(); got != 20 {
		t.Errorf("without Application.xml the mean is %v, want 20", got)
	}
}
