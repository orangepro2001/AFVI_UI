package inventory

import (
	"encoding/json"
	"errors"
	"fmt"
	"os"
	"path/filepath"
	"reflect"
	"strings"
	"sync"
	"testing"
)

// testdataInventory is the path of the fixture PxInventory directory.
const testdataInventory = "testdata/PxInventory"

// realInventory is where the design/repo snapshot of machine FM1 lives.
var realInventory = filepath.Join("..", "..", "design", "repo", "FM1", "PxInventory")

// openTestdata returns a Service on the fixture inventory.
func openTestdata(t *testing.T) *Service {
	t.Helper()
	s, err := Open(testdataInventory)
	if err != nil {
		t.Fatalf("Open(%q): %v", testdataInventory, err)
	}
	return s
}

// copyTree copies the fixture inventory into a new temp dir and returns its path.
func copyTree(t *testing.T, src string) string {
	t.Helper()
	dst := t.TempDir()
	copyDirTo := func(from, to string) {
		err := filepath.Walk(from, func(path string, info os.FileInfo, err error) error {
			if err != nil {
				return err
			}
			rel, err := filepath.Rel(from, path)
			if err != nil {
				return err
			}
			target := filepath.Join(to, rel)
			if info.IsDir() {
				return os.MkdirAll(target, 0o755)
			}
			data, err := os.ReadFile(path)
			if err != nil {
				return err
			}
			return os.WriteFile(target, data, 0o644)
		})
		if err != nil {
			t.Fatalf("copy %q: %v", from, err)
		}
	}
	copyDirTo(src, filepath.Join(dst, "PxInventory"))
	repo := filepath.Join(filepath.Dir(src), "PxRepository")
	if info, err := os.Stat(repo); err == nil && info.IsDir() {
		copyDirTo(repo, filepath.Join(dst, "PxRepository"))
	}
	return filepath.Join(dst, "PxInventory")
}

// writeFile creates parent directories and writes data to a file.
func writeFile(t *testing.T, path, data string) {
	t.Helper()
	if err := os.MkdirAll(filepath.Dir(path), 0o755); err != nil {
		t.Fatalf("mkdir %q: %v", filepath.Dir(path), err)
	}
	if err := os.WriteFile(path, []byte(data), 0o644); err != nil {
		t.Fatalf("write %q: %v", path, err)
	}
}

// findSpecNode returns a node with the given ID from a tree, or nil.
func findSpecNode(nodes []SpecNode, id string) *SpecNode {
	for i := range nodes {
		if nodes[i].ID == id {
			return &nodes[i]
		}
		if n := findSpecNode(nodes[i].Children, id); n != nil {
			return n
		}
	}
	return nil
}

// findRow returns the row whose ParamKey-derived name equals name, or nil.
func findRow(rows []AnalysisRow, name string) *AnalysisRow {
	for i := range rows {
		if rows[i].Name == name {
			return &rows[i]
		}
	}
	return nil
}

func TestDiscover(t *testing.T) {
	t.Run("EnvVarIsInventory", func(t *testing.T) {
		getenv := func(k string) string {
			if k == "AFVI_INVENTORY" {
				return testdataInventory
			}
			return ""
		}
		dir, err := discover(getenv, nil)
		if err != nil {
			t.Fatalf("discover: %v", err)
		}
		want, _ := filepath.Abs(testdataInventory)
		if dir != want {
			t.Fatalf("got %q want %q", dir, want)
		}
	})

	t.Run("EnvVarIsParent", func(t *testing.T) {
		parent := filepath.Dir(testdataInventory)
		getenv := func(k string) string {
			if k == "AFVI_INVENTORY" {
				return parent
			}
			return ""
		}
		dir, err := discover(getenv, nil)
		if err != nil {
			t.Fatalf("discover: %v", err)
		}
		want, _ := filepath.Abs(testdataInventory)
		if dir != want {
			t.Fatalf("got %q want %q", dir, want)
		}
	})

	t.Run("WalkUp", func(t *testing.T) {
		root := t.TempDir()
		writeFile(t, filepath.Join(root, "PxInventory", "INSPECT_SPEC", ".keep"), "")
		deep := filepath.Join(root, "a", "b", "c")
		if err := os.MkdirAll(deep, 0o755); err != nil {
			t.Fatalf("mkdir: %v", err)
		}
		dir, err := discover(func(string) string { return "" }, []string{deep})
		if err != nil {
			t.Fatalf("discover: %v", err)
		}
		want := filepath.Join(root, "PxInventory")
		if dir != want {
			t.Fatalf("got %q want %q", dir, want)
		}
	})

	t.Run("DesignRepoMachine", func(t *testing.T) {
		root := t.TempDir()
		writeFile(t, filepath.Join(root, "design", "repo", "FM1", "PxInventory", "INSPECT_SPEC", ".keep"), "")
		getenv := func(string) string { return "" }
		dir, err := discover(getenv, []string{root})
		if err != nil {
			t.Fatalf("discover: %v", err)
		}
		want := filepath.Join(root, "design", "repo", "FM1", "PxInventory")
		if dir != want {
			t.Fatalf("got %q want %q", dir, want)
		}
	})

	t.Run("DesignRepoMachineEnv", func(t *testing.T) {
		root := t.TempDir()
		writeFile(t, filepath.Join(root, "design", "repo", "BM", "PxInventory", "INSPECT_SPEC", ".keep"), "")
		getenv := func(k string) string {
			if k == "AFVI_MACHINE" {
				return "BM"
			}
			return ""
		}
		dir, err := discover(getenv, []string{root})
		if err != nil {
			t.Fatalf("discover: %v", err)
		}
		want := filepath.Join(root, "design", "repo", "BM", "PxInventory")
		if dir != want {
			t.Fatalf("got %q want %q", dir, want)
		}
	})

	t.Run("NotFound", func(t *testing.T) {
		root := t.TempDir()
		_, err := discover(func(string) string { return "" }, []string{root})
		if !errors.Is(err, ErrNotFound) {
			t.Fatalf("got %v want ErrNotFound", err)
		}
	})
}

func TestOpen(t *testing.T) {
	parent := filepath.Dir(testdataInventory)
	if _, err := Open(testdataInventory); err != nil {
		t.Fatalf("Open inventory: %v", err)
	}
	if _, err := Open(parent); err != nil {
		t.Fatalf("Open parent: %v", err)
	}
	empty := t.TempDir()
	if _, err := Open(empty); !errors.Is(err, ErrNotFound) {
		t.Fatalf("got %v want ErrNotFound", err)
	}
}

func TestModels(t *testing.T) {
	s := openTestdata(t)
	models, err := s.Models()
	if err != nil {
		t.Fatalf("Models: %v", err)
	}
	var names []string
	for _, m := range models {
		names = append(names, m.Name)
	}
	wantNames := []string{"ALPHA-00", "BETA-01", "gamma-02"}
	if !reflect.DeepEqual(names, wantNames) {
		t.Fatalf("names = %v want %v", names, wantNames)
	}
	for i, m := range models {
		wantIndex := fmt.Sprintf("%02d", i+1)
		if m.Index != wantIndex {
			t.Errorf("%s index = %q want %q", m.Name, m.Index, wantIndex)
		}
		if len(m.Created) != len("2006-01-02 15:04:05") || m.Created[4] != '-' || m.Created[10] != ' ' {
			t.Errorf("%s created = %q not in date format", m.Name, m.Created)
		}
	}
	wantState := map[string]string{"ALPHA-00": "", "BETA-01": "Load", "gamma-02": ""}
	for _, m := range models {
		if m.State != wantState[m.Name] {
			t.Errorf("%s state = %q want %q", m.Name, m.State, wantState[m.Name])
		}
	}
	wantRes := map[string]string{"ALPHA-00": "2.0", "BETA-01": "3.5", "gamma-02": "3.5"}
	for _, m := range models {
		if m.Resolution != wantRes[m.Name] {
			t.Errorf("%s resolution = %q want %q", m.Name, m.Resolution, wantRes[m.Name])
		}
	}
	for _, m := range models {
		if m.Name == "Thumbs.db" {
			t.Fatalf("Thumbs.db treated as model")
		}
	}
}

func TestActiveSelect(t *testing.T) {
	s := openTestdata(t)
	am, err := s.Active()
	if err != nil {
		t.Fatalf("Active: %v", err)
	}
	if am.Name != "BETA-01" {
		t.Fatalf("initial active = %q want BETA-01", am.Name)
	}
	if am.Base != "BETA" {
		t.Fatalf("base = %q want BETA", am.Base)
	}
	if am.Surface != "Top" {
		t.Fatalf("surface = %q want Top", am.Surface)
	}

	am, err = s.Select("ALPHA-00")
	if err != nil {
		t.Fatalf("Select ALPHA-00: %v", err)
	}
	if am.Name != "ALPHA-00" || am.Base != "ALPHA" {
		t.Fatalf("selected = %+v", am)
	}
	got, _ := s.Active()
	if got.Name != "ALPHA-00" {
		t.Fatalf("active after select = %q", got.Name)
	}
	models, err := s.Models()
	if err != nil {
		t.Fatalf("Models: %v", err)
	}
	for _, m := range models {
		want := ""
		if m.Name == "ALPHA-00" {
			want = "Load"
		}
		if m.State != want {
			t.Errorf("%s state = %q want %q", m.Name, m.State, want)
		}
	}

	if _, err := s.Select("nope"); err == nil {
		t.Fatalf("Select(nope) should fail")
	}
	if got, _ := s.Active(); got.Name != "ALPHA-00" {
		t.Fatalf("state changed after failed select: %q", got.Name)
	}
}

func TestSurfaceBottom(t *testing.T) {
	inv := copyTree(t, testdataInventory)
	writeFile(t, filepath.Join(inv, "SystemList.xml"), `<?xml version="1.0" encoding="utf-8"?>
<pixel version="1.0">
  <system ID="AFVI14" Repository="C:\PxRepository">
    <subsystem ID="M1" Surface="1"/>
  </system>
</pixel>
`)
	s, err := Open(inv)
	if err != nil {
		t.Fatalf("Open: %v", err)
	}
	am, err := s.Active()
	if err != nil {
		t.Fatalf("Active: %v", err)
	}
	if am.Surface != "Bottom" {
		t.Fatalf("surface = %q want Bottom", am.Surface)
	}
}

func TestTeach(t *testing.T) {
	s := openTestdata(t)
	if _, err := s.Select("ALPHA-00"); err != nil {
		t.Fatalf("Select: %v", err)
	}
	spec, err := s.Teach()
	if err != nil {
		t.Fatalf("Teach: %v", err)
	}

	t.Run("UnitTopNames", func(t *testing.T) {
		var names []string
		for _, n := range spec.Unit.Tree {
			names = append(names, n.Name)
		}
		want := []string{"Align / ROI", "AU", "OSP", "NonMetal", "ETC"}
		if !reflect.DeepEqual(names, want) {
			t.Fatalf("names = %v want %v", names, want)
		}
	})

	t.Run("ChildIDAndTone", func(t *testing.T) {
		cases := []struct {
			id   string
			tone string
		}{
			{"u-p1", "root"},
			{"u-p2", "gold"},
			{"u-p3", "gold"},
			{"u-p5", "green"},
			{"u-p6", "violet"},
			{"u-p1-c10", "silver"},
			{"u-p2-c22", "gold"},
			{"u-p5-c51", "green"},
			{"u-p6-c93", "violet"},
			{"u-p3-c22", ""},
		}
		for _, c := range cases {
			n := findSpecNode(spec.Unit.Tree, c.id)
			found := n != nil
			if c.tone == "" {
				if !found {
					t.Errorf("node %q not found", c.id)
				}
				continue
			}
			if !found {
				t.Errorf("node %q not found", c.id)
				continue
			}
			if n.Tone != c.tone {
				t.Errorf("%s tone = %q want %q", c.id, n.Tone, c.tone)
			}
		}
	})

	t.Run("AlignNodes", func(t *testing.T) {
		parents := findSpecNode(spec.Unit.Tree, "u-p1")
		if parents == nil {
			t.Fatalf("u-p1 not found")
		}
		if parents.Checked != nil || len(parents.LightChecked) != 0 {
			t.Fatalf("u-p1 should have no checkbox: %+v", parents)
		}
		wants := map[string]string{
			"u-p1-c10": "metal",
			"u-p1-c11": "sr",
			"u-p1-c12": "dmg",
		}
		for id, align := range wants {
			n := findSpecNode(spec.Unit.Tree, id)
			if n == nil {
				t.Fatalf("%s not found", id)
			}
			if n.Align != align {
				t.Errorf("%s align = %q want %q", id, n.Align, align)
			}
			if n.Checked != nil || len(n.LightChecked) != 0 {
				t.Errorf("%s should have no checkbox", id)
			}
		}
	})

	t.Run("CheckboxesDistinct", func(t *testing.T) {
		p2 := findSpecNode(spec.Unit.Tree, "u-p2-c22")
		p3 := findSpecNode(spec.Unit.Tree, "u-p3-c22")
		if p2 == nil || p3 == nil {
			t.Fatalf("missing nodes")
		}
		if p2.Checked == nil || p3.Checked == nil {
			t.Fatalf("missing checkboxes")
		}
		if reflect.DeepEqual(p2.LightChecked, p3.LightChecked) {
			t.Fatalf("u-p2-c22 and u-p3-c22 LightChecked equal: %v", p2.LightChecked)
		}
		if *p2.Checked != p2.LightChecked[1] {
			t.Errorf("u-p2-c22 checked %v != light[1] %v", *p2.Checked, p2.LightChecked[1])
		}
		if *p3.Checked != p3.LightChecked[1] {
			t.Errorf("u-p3-c22 checked %v != light[1] %v", *p3.Checked, p3.LightChecked[1])
		}
		if p2.Checked == p3.Checked {
			t.Fatalf("checked pointers shared")
		}
		old := *p2.Checked
		*p2.Checked = !old
		if *p3.Checked != p3.LightChecked[1] {
			t.Fatalf("mutating u-p2-c22 changed u-p3-c22")
		}
	})

	t.Run("DummyDiffers", func(t *testing.T) {
		u := findSpecNode(spec.Unit.Tree, "u-p2-c22")
		d := findSpecNode(spec.Dummy.Tree, "d-p2-c22")
		if u == nil || d == nil {
			t.Fatalf("missing nodes")
		}
		if reflect.DeepEqual(u.LightChecked, d.LightChecked) {
			t.Fatalf("Unit and Dummy u-p2-c22/d-p2-c22 LightChecked equal")
		}
	})

	t.Run("DummyUnknownID", func(t *testing.T) {
		n := findSpecNode(spec.Dummy.Tree, "d-p5-c99")
		if n == nil {
			t.Fatalf("d-p5-c99 not found")
		}
		if n.Name != "Node 99" {
			t.Fatalf("name = %q want Node 99", n.Name)
		}
	})

	t.Run("AlignLines", func(t *testing.T) {
		wantGlobal := []AlignLine{
			{Light: 1, Channel: "Red"},
			{Light: 2, Channel: "Green"},
			{Light: 3, Channel: "Blue"},
		}
		if !reflect.DeepEqual(spec.Unit.GlobalAlign, wantGlobal) {
			t.Fatalf("global = %v want %v", spec.Unit.GlobalAlign, wantGlobal)
		}
		wantSR := []AlignLine{{Light: 3, Channel: "Gray"}}
		if !reflect.DeepEqual(spec.Unit.SrAlign, wantSR) {
			t.Fatalf("sr = %v want %v", spec.Unit.SrAlign, wantSR)
		}
		if spec.Unit.Overlay != (Overlay{MK: true}) {
			t.Fatalf("overlay = %+v want MK only", spec.Unit.Overlay)
		}
	})

	t.Run("NoSharedArray", func(t *testing.T) {
		if len(spec.Unit.GlobalAlign) == 0 {
			t.Fatalf("empty")
		}
		if &spec.Unit.GlobalAlign[0] == &spec.Dummy.GlobalAlign[0] {
			t.Fatalf("Unit and Dummy share GlobalAlign backing array")
		}
	})
}

func TestTeachBETA(t *testing.T) {
	s := openTestdata(t)
	if _, err := s.Select("BETA-01"); err != nil {
		t.Fatalf("Select: %v", err)
	}
	spec, err := s.Teach()
	if err != nil {
		t.Fatalf("Teach: %v", err)
	}
	wantGlobal := []AlignLine{
		{Light: 1, Channel: "Red"},
		{Light: 2, Channel: "Red"},
		{Light: 3, Channel: "Red"},
	}
	if !reflect.DeepEqual(spec.Unit.GlobalAlign, wantGlobal) {
		t.Fatalf("global = %v want %v", spec.Unit.GlobalAlign, wantGlobal)
	}
	wantSR := []AlignLine{{Light: 1, Channel: "Red"}}
	if !reflect.DeepEqual(spec.Unit.SrAlign, wantSR) {
		t.Fatalf("sr = %v want %v", spec.Unit.SrAlign, wantSR)
	}
	n := findSpecNode(spec.Unit.Tree, "u-p2-c22")
	if n == nil || n.Checked == nil {
		t.Fatalf("u-p2-c22 missing")
	}
	want := []bool{false, true, false}
	if !reflect.DeepEqual(n.LightChecked, want) {
		t.Fatalf("LightChecked = %v want %v", n.LightChecked, want)
	}
}

func TestAnalysis(t *testing.T) {
	s := openTestdata(t)
	if _, err := s.Select("ALPHA-00"); err != nil {
		t.Fatalf("Select: %v", err)
	}
	na, err := s.Analysis("u-p3-c22")
	if err != nil {
		t.Fatalf("Analysis: %v", err)
	}
	for _, key := range []string{"1", "2", "3"} {
		if _, ok := na[key]; !ok {
			t.Fatalf("missing light key %q", key)
		}
	}

	light2 := na["2"]
	t.Run("Upper", func(t *testing.T) {
		var keys []string
		for _, r := range light2.Upper {
			keys = append(keys, r.Name)
		}
		want := []string{"Mask Inspection(Bright)", "Mask Inspection(Dark)", "Adjust Mask"}
		if !reflect.DeepEqual(keys, want) {
			t.Fatalf("upper names = %v want %v", keys, want)
		}
		for i, r := range light2.Upper {
			if r.No != i+1 {
				t.Errorf("row %d no = %d", i, r.No)
			}
		}
		if v := light2.Upper[0].Value; v != true {
			t.Errorf("101 value = %#v want true", v)
		}
		if v := light2.Upper[1].Value; v != false {
			t.Errorf("102 value = %#v want false", v)
		}
		if v := light2.Upper[2].Value; v != "-2.500" {
			t.Errorf("500 value = %#v want -2.500", v)
		}
		wantTone := []string{"green", "green", "plain"}
		for i, r := range light2.Upper {
			if r.Tone != wantTone[i] {
				t.Errorf("%s tone = %q want %q", r.Name, r.Tone, wantTone[i])
			}
		}
	})

	t.Run("Lower", func(t *testing.T) {
		if len(light2.Lower) != 1 {
			t.Fatalf("lower rows = %d want 1", len(light2.Lower))
		}
		r := light2.Lower[0]
		if r.Name != "Adjust Inner Chain(Align)" || r.Value != "-3.000" || r.Tone != "yellow" {
			t.Fatalf("lower row = %+v", r)
		}
	})

	t.Run("Channels", func(t *testing.T) {
		red := light2.Channels["red"]
		green := light2.Channels["green"]
		blue := light2.Channels["blue"]
		if len(red) != 2 || len(green) != 2 || len(blue) != 2 {
			t.Fatalf("channel lengths red=%d green=%d blue=%d", len(red), len(green), len(blue))
		}
		if red[0].Value != "20.000" || red[0].Min != "5.000" || red[0].Name != "Dark Defect(TH)" {
			t.Fatalf("red[0] = %+v", red[0])
		}
		if green[0].Value != "25.500" || green[0].Min != "6.000" {
			t.Fatalf("green[0] = %+v", green[0])
		}
		if blue[0].Value != "0.000" || blue[0].Min != "0.000" {
			t.Fatalf("blue[0] = %+v", blue[0])
		}
		if red[1].Name != "Param 777" || red[1].Tone != "yellow" {
			t.Fatalf("red[1] = %+v", red[1])
		}
	})
}

func TestAnalysisEmpty(t *testing.T) {
	s := openTestdata(t)
	if _, err := s.Select("ALPHA-00"); err != nil {
		t.Fatalf("Select: %v", err)
	}
	for _, id := range []string{"u-p3", "u-p3-c99"} {
		na, err := s.Analysis(id)
		if err != nil {
			t.Fatalf("Analysis(%q): %v", id, err)
		}
		for _, key := range []string{"1", "2", "3"} {
			la := na[key]
			if la.Upper == nil || la.Lower == nil {
				t.Errorf("%s light %s has nil tables", id, key)
			}
			for _, ch := range []string{"red", "green", "blue"} {
				if la.Channels[ch] == nil {
					t.Errorf("%s light %s channel %s nil", id, key, ch)
				}
			}
		}
	}
}

func TestAnalysisIgnoresJunk(t *testing.T) {
	s := openTestdata(t)
	if _, err := s.Select("ALPHA-00"); err != nil {
		t.Fatalf("Select: %v", err)
	}
	na, err := s.Analysis("u-p3-c22")
	if err != nil {
		t.Fatalf("Analysis: %v", err)
	}
	if len(na["1"].Upper) != 0 {
		t.Fatalf("LIGHT0 should be empty, got %d rows", len(na["1"].Upper))
	}
	for _, r := range na["2"].Upper {
		if r.Value == false && r.Name == "Mask Inspection(Bright)" {
			t.Fatalf("data from .bak or copy leaked")
		}
	}
}

func TestAnalysisInvalidID(t *testing.T) {
	s := openTestdata(t)
	for _, id := range []string{"", "x-p3", "u-3", "u-p", "u-p3-c", "u-pX"} {
		if _, err := s.Analysis(id); err == nil {
			t.Errorf("Analysis(%q) should fail", id)
		}
	}
}

func TestNoNullInJSON(t *testing.T) {
	s := openTestdata(t)
	if _, err := s.Select("ALPHA-00"); err != nil {
		t.Fatalf("Select: %v", err)
	}
	models, err := s.Models()
	if err != nil {
		t.Fatalf("Models: %v", err)
	}
	teach, err := s.Teach()
	if err != nil {
		t.Fatalf("Teach: %v", err)
	}
	cases := map[string]any{"models": models, "teach": teach}
	for _, id := range []string{"u-p3-c22", "u-p3", "d-p2-c22"} {
		na, err := s.Analysis(id)
		if err != nil {
			t.Fatalf("Analysis(%q): %v", id, err)
		}
		cases[id] = na
	}
	for name, v := range cases {
		data, err := json.Marshal(v)
		if err != nil {
			t.Fatalf("Marshal %s: %v", name, err)
		}
		if strings.Contains(string(data), "null") {
			t.Errorf("%s JSON contains null: %s", name, data)
		}
	}
}

func TestConcurrent(t *testing.T) {
	s := openTestdata(t)
	var wg sync.WaitGroup
	for i := 0; i < 8; i++ {
		wg.Add(1)
		go func(i int) {
			defer wg.Done()
			name := "ALPHA-00"
			if i%2 == 0 {
				name = "BETA-01"
			}
			if _, err := s.Select(name); err != nil {
				t.Errorf("Select(%q): %v", name, err)
			}
			if _, err := s.Teach(); err != nil {
				t.Errorf("Teach: %v", err)
			}
			if _, err := s.Analysis("u-p2-c22"); err != nil {
				t.Errorf("Analysis: %v", err)
			}
			models, err := s.Models()
			if err != nil || len(models) == 0 {
				t.Errorf("Models: %v %v", models, err)
			}
		}(i)
	}
	wg.Wait()
}

func TestRealInventory(t *testing.T) {
	if _, err := os.Stat(realInventory); err != nil {
		t.Skipf("real inventory not present: %v", err)
	}
	s, err := Open(realInventory)
	if err != nil {
		t.Fatalf("Open: %v", err)
	}
	models, err := s.Models()
	if err != nil {
		t.Fatalf("Models: %v", err)
	}
	var names []string
	res := map[string]string{}
	for _, m := range models {
		names = append(names, m.Name)
		res[m.Name] = m.Resolution
	}
	wantNames := []string{"25FBO015-15-00", "6AN0921I01-00", "6ST2001Q01-00"}
	if !reflect.DeepEqual(names, wantNames) {
		t.Fatalf("names = %v want %v", names, wantNames)
	}
	if res["25FBO015-15-00"] != "2.0" {
		t.Fatalf("25FBO015-15-00 resolution = %q want 2.0", res["25FBO015-15-00"])
	}
	am, err := s.Active()
	if err != nil {
		t.Fatalf("Active: %v", err)
	}
	if am.Name != "6ST2001Q01-00" || am.Base != "6ST2001Q01" || am.Surface != "Top" {
		t.Fatalf("active = %+v", am)
	}
	spec, err := s.Teach()
	if err != nil {
		t.Fatalf("Teach: %v", err)
	}
	var unitNames, dummyNames []string
	for _, n := range spec.Unit.Tree {
		unitNames = append(unitNames, n.Name)
	}
	for _, n := range spec.Dummy.Tree {
		dummyNames = append(dummyNames, n.Name)
	}
	wantUnit := []string{"Align / ROI", "AU", "OSP", "Drill", "NonMetal", "ETC"}
	if !reflect.DeepEqual(unitNames, wantUnit) {
		t.Fatalf("unit names = %v want %v", unitNames, wantUnit)
	}
	wantDummy := []string{"AU", "Drill", "NonMetal", "ETC"}
	if !reflect.DeepEqual(dummyNames, wantDummy) {
		t.Fatalf("dummy names = %v want %v", dummyNames, wantDummy)
	}
	n := findSpecNode(spec.Unit.Tree, "u-p3-c22")
	if n == nil || n.LightChecked == nil || !n.LightChecked[1] {
		t.Fatalf("u-p3-c22 LightChecked[1] should be true: %+v", n)
	}

	na, err := s.Analysis("u-p3-c22")
	if err != nil {
		t.Fatalf("Analysis: %v", err)
	}
	light2 := na["2"]
	wantUpper := []struct {
		name string
		val  any
	}{
		{"Mask Inspection(Bright)", true},
		{"Mask Inspection(Dark)", true},
		{"Chain Align", false},
		{"Chain Inspection", false},
		{"Adjust Mask", "-11.000"},
		{"Adjust Margin Mask", "-1.000"},
		{"Remove SR Edge", "7.000"},
		{"Remove Hole Edge", "0.000"},
	}
	if len(light2.Upper) != len(wantUpper) {
		t.Fatalf("upper rows = %d want %d", len(light2.Upper), len(wantUpper))
	}
	for i, w := range wantUpper {
		r := light2.Upper[i]
		if r.Name != w.name || !reflect.DeepEqual(r.Value, w.val) || r.No != i+1 {
			t.Errorf("upper[%d] = %+v want %+v", i, r, w)
		}
	}
	wantLower := []struct {
		name string
		val  string
	}{
		{"Adjust Inner Chain(Align)", "-1.000"},
		{"Adjust Outer Chain(Align)", "4.000"},
		{"Inner Chain Weight(Align)", "1.700"},
		{"Outer Chain Weight(Align)", "1.000"},
		{"Chain Search Range(Align)", "9.000"},
		{"Chain Step(Align)", "1.000"},
		{"Chain Search TH(Align)", "0.000"},
		{"Adjust Inner Chain(Insp)", "-2.000"},
		{"Adjust Outer Chain(Insp)", "4.000"},
	}
	if len(light2.Lower) != len(wantLower) {
		t.Fatalf("lower rows = %d want %d", len(light2.Lower), len(wantLower))
	}
	for i, w := range wantLower {
		r := light2.Lower[i]
		if r.Name != w.name || r.Value != w.val {
			t.Errorf("lower[%d] = %+v want %+v", i, r, w)
		}
	}
	for _, ch := range []string{"red", "green", "blue"} {
		if len(light2.Channels[ch]) != 22 {
			t.Errorf("channel %s rows = %d want 22", ch, len(light2.Channels[ch]))
		}
	}
	red := light2.Channels["red"]
	if red[0].Name != "Bright Defect(TH)" || red[0].Value != "0.000" || red[0].Min != "0.000" {
		t.Errorf("red[0] = %+v", red[0])
	}
	green := light2.Channels["green"]
	if green[2].Name != "Bright Defect Size(Pixel)" || green[2].Value != "10.000" {
		t.Errorf("green[2] = %+v", green[2])
	}
	if red[21].Name != "Protrusion Defect Size(Pixel)" {
		t.Errorf("red[21] = %+v", red[21])
	}
}
