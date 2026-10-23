package journal

import (
	"encoding/xml"
	"fmt"
	"os"
	"path/filepath"
	"strings"
	"sync"
	"testing"
	"time"
)

type doc struct {
	XMLName xml.Name   `xml:"journal"`
	Attrs   []xml.Attr `xml:",any,attr"`
	Ops     []struct {
		Attrs []xml.Attr `xml:",any,attr"`
	} `xml:"o"`
}

func (d doc) attr(name string) string {
	for _, a := range d.Attrs {
		if a.Name.Local == name {
			return a.Value
		}
	}
	return ""
}

// op returns the attributes of operation i by name.
func (d doc) op(i int) map[string]string {
	out := map[string]string{}
	for _, a := range d.Ops[i].Attrs {
		out[a.Name.Local] = a.Value
	}
	return out
}

func parse(t *testing.T, path string) doc {
	t.Helper()
	data, err := os.ReadFile(path)
	if err != nil {
		t.Fatal(err)
	}
	var d doc
	if err := xml.Unmarshal(data, &d); err != nil {
		t.Fatalf("%s is not well-formed: %v\n%s", filepath.Base(path), err, data)
	}
	return d
}

var t0 = time.Date(2026, 10, 23, 18, 44, 12, 381_000_000, time.FixedZone("KST", 9*3600))

func TestSessionFileIsWellFormedAndDense(t *testing.T) {
	dir := t.TempDir()
	j, err := open(dir, Info{Version: "v1", Platform: "windows/amd64"}, t0)
	if err != nil {
		t.Fatal(err)
	}
	if filepath.Base(j.Path()) != "20261023-184412.xml" {
		t.Errorf("file = %s", filepath.Base(j.Path()))
	}
	err = j.RecordOps([]Op{
		{At: t0.Add(1520 * time.Millisecond).UnixMilli(), Kind: "nav", Attrs: map[string]string{"page": "teach"}},
		{At: t0.Add(9034 * time.Millisecond).UnixMilli(), Kind: "gv", Attrs: map[string]string{"x": "10", "mean": "31.03", "light": "2"}},
		{At: t0.Add(-time.Hour).UnixMilli(), Kind: "early"},
	})
	if err != nil {
		t.Fatal(err)
	}
	if err := j.Close(); err != nil {
		t.Fatal(err)
	}

	d := parse(t, j.Path())
	if d.attr("v") != "1" || d.attr("app") != "AFVI-UI" || d.attr("ver") != "v1" || d.attr("os") != "windows/amd64" {
		t.Errorf("header = %+v", d.Attrs)
	}
	if got := d.attr("start"); got != "2026-10-23T18:44:12.381+09:00" {
		t.Errorf("start = %s", got)
	}
	if len(d.Ops) != 3 {
		t.Fatalf("ops = %d", len(d.Ops))
	}
	if op := d.op(0); op["t"] != "1520" || op["k"] != "nav" || op["page"] != "teach" {
		t.Errorf("op 0 = %v", op)
	}
	if op := d.op(2); op["t"] != "0" || op["k"] != "early" {
		t.Errorf("an operation before the start is at 0: %v", op)
	}

	// One element per line, attributes in name order: easy to grep and to diff.
	data, _ := os.ReadFile(j.Path())
	lines := strings.Split(strings.TrimRight(string(data), "\n"), "\n")
	if lines[3] != `<o t="9034" k="gv" light="2" mean="31.03" x="10"/>` {
		t.Errorf("line = %s", lines[3])
	}
	if lines[len(lines)-1] != "</journal>" {
		t.Errorf("last line = %s", lines[len(lines)-1])
	}
}

func TestValuesAndNamesCannotBreakTheXML(t *testing.T) {
	dir := t.TempDir()
	j, err := open(dir, Info{Version: `v"<1>`}, t0)
	if err != nil {
		t.Fatal(err)
	}
	long := strings.Repeat("ä", maxValue+50)
	j.RecordOps([]Op{
		{Kind: "text", Attrs: map[string]string{"v": "a<b>&\"c'\n\tend\x00", "long": long}},
		{Kind: "bad kind <x>", Attrs: map[string]string{"a": "1"}},
		{Kind: "reserved", Attrs: map[string]string{"t": "9", "k": "z", "bad name": "1", "1x": "2", "ok": "3"}},
	})
	j.Close()

	d := parse(t, j.Path())
	if got := d.op(0)["v"]; !strings.HasPrefix(got, "a<b>&\"c'") {
		t.Errorf("value = %q", got)
	}
	if got := []rune(d.op(0)["long"]); len(got) != maxValue+1 || got[maxValue] != '…' {
		t.Errorf("a long value is cut to %d runes and marked, got %d", maxValue, len(got))
	}
	if op := d.op(1); op["k"] != "invalid" || op["name"] != "bad kind <x>" {
		t.Errorf("bad kind = %v", op)
	}
	op := d.op(2)
	if op["ok"] != "3" || op["x.t"] != "9" || op["x.k"] != "z" || op["x.bad_name"] != "1" {
		t.Errorf("reserved names = %v", op)
	}
	if op["k"] != "reserved" || op["t"] == "9" {
		t.Errorf("the line's own t and k were overwritten: %v", op)
	}
	if _, ok := op["x.1x"]; !ok {
		t.Errorf("1x is not an attribute name; kept as x.1x: %v", op)
	}
}

func TestACrashedSessionIsClosedAtTheNextStart(t *testing.T) {
	dir := t.TempDir()
	crashed := filepath.Join(dir, "20261022-101010.xml")
	whole := "<?xml version=\"1.0\" encoding=\"UTF-8\"?>\n<journal v=\"1\">\n<o t=\"1\" k=\"nav\" page=\"home\"/>\n"
	if err := os.WriteFile(crashed, []byte(whole+`<o t="2" k="gv" x="1`), 0o644); err != nil {
		t.Fatal(err)
	}
	finished := filepath.Join(dir, "20261022-111111.xml")
	complete := whole + "</journal>\n"
	if err := os.WriteFile(finished, []byte(complete), 0o644); err != nil {
		t.Fatal(err)
	}
	other := filepath.Join(dir, "notes.xml")
	os.WriteFile(other, []byte("not a session"), 0o644)

	j, err := open(dir, Info{}, t0)
	if err != nil {
		t.Fatal(err)
	}
	defer j.Close()

	d := parse(t, crashed)
	if len(d.Ops) != 2 || d.op(1)["k"] != "session.unclosed" {
		t.Errorf("repaired = %d ops, last %v", len(d.Ops), d.op(len(d.Ops)-1))
	}
	if data, _ := os.ReadFile(finished); string(data) != complete {
		t.Error("a finished file was touched")
	}
	if data, _ := os.ReadFile(other); string(data) != "not a session" {
		t.Error("a file that is not a session was touched")
	}
}

func TestTheArchiveIsPrunedToKeep(t *testing.T) {
	dir := t.TempDir()
	for i := 0; i < Keep+5; i++ {
		name := fmt.Sprintf("2026%04d-000000.xml", i+1)
		os.WriteFile(filepath.Join(dir, name), []byte("<journal></journal>\n"), 0o644)
	}
	j, err := open(dir, Info{}, t0)
	if err != nil {
		t.Fatal(err)
	}
	j.Close()
	names := sessionFiles(dir)
	if len(names) != Keep {
		t.Fatalf("files = %d, want %d", len(names), Keep)
	}
	if names[0] != "20260007-000000.xml" || names[len(names)-1] != filepath.Base(j.Path()) {
		t.Errorf("kept %s … %s: the oldest should go and the new session stay", names[0], names[len(names)-1])
	}
}

func TestTwoSessionsInOneSecondGetTwoFiles(t *testing.T) {
	dir := t.TempDir()
	a, err := open(dir, Info{}, t0)
	if err != nil {
		t.Fatal(err)
	}
	b, err := open(dir, Info{}, t0)
	if err != nil {
		t.Fatal(err)
	}
	if a.Path() == b.Path() {
		t.Error("the second session reused the first file")
	}
	a.Close()
	b.Close()
	if len(sessionFiles(dir)) != 2 {
		t.Errorf("files = %v", sessionFiles(dir))
	}
}

func TestACappedSessionSaysSo(t *testing.T) {
	old := maxOps
	maxOps = 3
	defer func() { maxOps = old }()
	j, err := open(t.TempDir(), Info{}, t0)
	if err != nil {
		t.Fatal(err)
	}
	for i := 0; i < 10; i++ {
		j.Record("n", map[string]string{"i": fmt.Sprint(i)})
	}
	j.Close()
	d := parse(t, j.Path())
	if len(d.Ops) != 4 || d.op(3)["k"] != "journal.capped" {
		t.Errorf("ops = %d, last = %v", len(d.Ops), d.op(len(d.Ops)-1))
	}
}

func TestCloseIsFinalAndANilJournalIsHarmless(t *testing.T) {
	j, err := open(t.TempDir(), Info{}, t0)
	if err != nil {
		t.Fatal(err)
	}
	j.Record("a", nil)
	if err := j.Close(); err != nil {
		t.Fatal(err)
	}
	j.Record("after", nil)
	if err := j.Close(); err != nil {
		t.Errorf("second Close: %v", err)
	}
	if d := parse(t, j.Path()); len(d.Ops) != 1 {
		t.Errorf("ops = %d: records after Close must be ignored", len(d.Ops))
	}

	var none *Journal
	none.Record("x", nil)
	if err := none.RecordOps([]Op{{Kind: "x"}}); err != nil || none.Close() != nil || none.Path() != "" {
		t.Error("a nil journal must do nothing")
	}
}

func TestConcurrentRecords(t *testing.T) {
	j, err := open(t.TempDir(), Info{}, t0)
	if err != nil {
		t.Fatal(err)
	}
	var wg sync.WaitGroup
	for g := 0; g < 8; g++ {
		wg.Add(1)
		go func() {
			defer wg.Done()
			for i := 0; i < 50; i++ {
				j.Record("n", map[string]string{"i": fmt.Sprint(i)})
			}
		}()
	}
	wg.Wait()
	j.Close()
	if d := parse(t, j.Path()); len(d.Ops) != 400 {
		t.Errorf("ops = %d, want 400", len(d.Ops))
	}
}
