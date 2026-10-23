// Package journal keeps the record of what the user did in one run of the application: one XML file
// per session, one short line per operation, written as it happens. The files stay in the folder
// (the archive) and are what to look at when the question is "what was done to this model, when".
//
// The format is dense on purpose, attributes only, one element per line:
//
//	<?xml version="1.0" encoding="UTF-8"?>
//	<journal v="1" app="AFVI-UI" ver="dev" os="windows/amd64" start="2026-10-23T18:44:12.381+09:00">
//	<o t="1520" k="nav" page="teach"/>
//	<o t="9034" k="gv" h="…" light="2" max="168" mean="31.03" …/>
//	</journal>
//
// t is milliseconds since the session started, k the kind of operation; the other attributes are
// the details of that kind, sorted by name. The closing tag is written when the application ends;
// a file that lacks it (a crash, a power cut) is closed at the next start, so every file in the
// archive is well-formed XML.
//
// A nil *Journal is a journal that records nothing, so callers do not need to check.
package journal

import (
	"bufio"
	"bytes"
	"encoding/xml"
	"errors"
	"fmt"
	"os"
	"path/filepath"
	"regexp"
	"sort"
	"sync"
	"time"
)

const (
	// Keep is how many session files the archive keeps; older ones are deleted at the start of a session.
	Keep = 500
	// maxOpsDefault bounds one session: a runaway sender cannot fill the disk.
	maxOpsDefault = 200_000
	// maxValue is the longest attribute value kept (runes); longer ones are cut.
	maxValue = 400

	closing = "</journal>\n"
	ext     = ".xml"
)

// Info is what the header of a session file says about the application.
type Info struct {
	Version  string
	Platform string
}

// Op is one operation as the frontend reports it.
type Op struct {
	// At is when it happened, in Unix milliseconds on the sender's clock; 0 means "now".
	At int64 `json:"at"`
	// Kind is the name of the operation: letters, digits and . _ -
	Kind string `json:"k"`
	// Attrs are the details: short words and numbers.
	Attrs map[string]string `json:"a"`
}

// Journal is the file of the running session.
type Journal struct {
	mu     sync.Mutex
	f      *os.File
	w      *bufio.Writer
	path   string
	start  time.Time
	ops    int
	capped bool
	closed bool
}

// maxOps is maxOpsDefault; a variable so that a test can lower it.
var maxOps = maxOpsDefault

var (
	nameOK     = regexp.MustCompile(`^[A-Za-z_][A-Za-z0-9_.-]*$`)
	unsafeChar = regexp.MustCompile(`[^A-Za-z0-9_.-]`)
	// sessionFile is the name of a session file: the start time to the second, then a counter for the
	// rare second start.
	sessionFile = regexp.MustCompile(`^\d{8}-\d{6}(-\d+)?\.xml$`)
)

// Open starts a new session file in dir (created when missing). It first closes the files an
// earlier run left open and deletes the oldest files beyond Keep.
func Open(dir string, info Info) (*Journal, error) {
	return open(dir, info, time.Now())
}

func open(dir string, info Info, now time.Time) (*Journal, error) {
	if err := os.MkdirAll(dir, 0o755); err != nil {
		return nil, err
	}
	repairAll(dir)
	prune(dir, Keep-1)

	var f *os.File
	var path string
	for n := 0; ; n++ {
		name := now.Format("20060102-150405")
		if n > 0 {
			name = fmt.Sprintf("%s-%d", name, n)
		}
		path = filepath.Join(dir, name+ext)
		var err error
		f, err = os.OpenFile(path, os.O_WRONLY|os.O_CREATE|os.O_EXCL, 0o644)
		if err == nil {
			break
		}
		if !errors.Is(err, os.ErrExist) || n > 99 {
			return nil, err
		}
	}

	j := &Journal{f: f, w: bufio.NewWriter(f), path: path, start: now}
	fmt.Fprintf(j.w, "<?xml version=\"1.0\" encoding=\"UTF-8\"?>\n<journal v=\"1\" app=\"AFVI-UI\" ver=%s os=%s start=%s>\n",
		quote(info.Version), quote(info.Platform), quote(now.Format("2006-01-02T15:04:05.000Z07:00")))
	if err := j.w.Flush(); err != nil {
		f.Close()
		return nil, err
	}
	return j, nil
}

// Path is the session file.
func (j *Journal) Path() string {
	if j == nil {
		return ""
	}
	return j.path
}

// Record writes one operation that happened now.
func (j *Journal) Record(kind string, attrs map[string]string) {
	j.RecordOps([]Op{{Kind: kind, Attrs: attrs}})
}

// RecordOps writes the operations in order and flushes once. It returns an error only when the
// file cannot be written; operations with a bad kind are written as "invalid" rather than dropped.
func (j *Journal) RecordOps(ops []Op) error {
	if j == nil || len(ops) == 0 {
		return nil
	}
	j.mu.Lock()
	defer j.mu.Unlock()
	if j.closed {
		return nil
	}
	now := time.Now()
	for _, op := range ops {
		if j.ops >= maxOps {
			if !j.capped {
				j.capped = true
				j.writeLocked(now, "journal.capped", map[string]string{"max": fmt.Sprint(maxOps)})
			}
			break
		}
		at := now
		if op.At > 0 {
			at = time.UnixMilli(op.At)
		}
		j.writeLocked(at, op.Kind, op.Attrs)
		j.ops++
	}
	return j.w.Flush()
}

// writeLocked formats one line. Callers hold j.mu.
func (j *Journal) writeLocked(at time.Time, kind string, attrs map[string]string) {
	ms := at.Sub(j.start).Milliseconds()
	if ms < 0 {
		ms = 0
	}
	if !nameOK.MatchString(kind) {
		attrs = map[string]string{"name": kind}
		kind = "invalid"
	}
	var b bytes.Buffer
	fmt.Fprintf(&b, "<o t=\"%d\" k=%s", ms, quote(kind))
	names := make([]string, 0, len(attrs))
	for name := range attrs {
		names = append(names, name)
	}
	sort.Strings(names)
	for _, name := range names {
		out := name
		if !nameOK.MatchString(name) || name == "t" || name == "k" {
			// t and k belong to the line itself, and other odd names are not attribute names: the
			// sender's name is kept, made safe, behind a prefix.
			out = "x." + unsafeChar.ReplaceAllString(name, "_")
			if !nameOK.MatchString(out) {
				continue
			}
		}
		fmt.Fprintf(&b, " %s=%s", out, quote(attrs[name]))
	}
	b.WriteString("/>\n")
	j.w.Write(b.Bytes())
}

// Close writes the closing tag and closes the file; further records are ignored.
func (j *Journal) Close() error {
	if j == nil {
		return nil
	}
	j.mu.Lock()
	defer j.mu.Unlock()
	if j.closed {
		return nil
	}
	j.closed = true
	j.w.WriteString(closing)
	err := j.w.Flush()
	if serr := j.f.Sync(); err == nil {
		err = serr
	}
	if cerr := j.f.Close(); err == nil {
		err = cerr
	}
	return err
}

// quote is s as an XML attribute value in double quotes, cut to maxValue runes.
func quote(s string) string {
	if r := []rune(s); len(r) > maxValue {
		s = string(r[:maxValue]) + "…"
	}
	var b bytes.Buffer
	b.WriteByte('"')
	_ = xml.EscapeText(&b, []byte(s))
	b.WriteByte('"')
	return b.String()
}

// sessionFiles lists the session files of dir, oldest first (their names sort by start time).
func sessionFiles(dir string) []string {
	entries, err := os.ReadDir(dir)
	if err != nil {
		return nil
	}
	var names []string
	for _, e := range entries {
		if !e.IsDir() && sessionFile.MatchString(e.Name()) {
			names = append(names, e.Name())
		}
	}
	sort.Strings(names)
	return names
}

// repairAll closes every session file of dir that an earlier run left without its closing tag.
func repairAll(dir string) {
	for _, name := range sessionFiles(dir) {
		repair(filepath.Join(dir, name))
	}
}

// repair appends the end of a session to a file that lacks it: a line saying so, then the closing tag.
func repair(path string) {
	data, err := os.ReadFile(path)
	if err != nil || bytes.HasSuffix(bytes.TrimRight(data, " \r\n"), []byte("</journal>")) {
		return
	}
	f, err := os.OpenFile(path, os.O_WRONLY|os.O_APPEND, 0)
	if err != nil {
		return
	}
	defer f.Close()
	// A half-written last line would break the XML: cut the file back to the last full line.
	if !bytes.HasSuffix(data, []byte("\n")) {
		if cut := bytes.LastIndexByte(data, '\n'); cut >= 0 {
			if err := f.Truncate(int64(cut + 1)); err != nil {
				return
			}
		}
	}
	fmt.Fprintf(f, "<o k=\"session.unclosed\"/>\n%s", closing)
}

// prune deletes the oldest session files until at most keep are left.
func prune(dir string, keep int) {
	names := sessionFiles(dir)
	for len(names) > keep {
		_ = os.Remove(filepath.Join(dir, names[0]))
		names = names[1:]
	}
}
