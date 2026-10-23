package inventory

import (
	"errors"
	"fmt"
	"os"
	"path/filepath"
	"sort"
	"strconv"
	"strings"
	"sync"
)

// channelNames maps a channel number to its display name.
var channelNames = map[int]string{
	0: "Red",
	1: "Green",
	2: "Blue",
	4: "Gray",
}

// Service reads a PxInventory directory. All methods are safe for concurrent use.
type Service struct {
	root string
	// repo is the PxRepository folder (SetRepoDir); Open guesses it as the folder next to PxInventory.
	repo string

	mu     sync.Mutex
	active string
	// userDir is where the user's own ROI files go ("" until SetUserDir).
	userDir string
	// The pictures are read from the repository, which is usually a network share, so each one is
	// read once per session and then served from memory: nothing below touches the disk again
	// until ReloadPictures. pictures holds the composed Align pictures by model, medianFiles the
	// Median TIFFs of a model by light, surface and resolutions what picks among
	// the folders of a model (the host's Surface; the machine's and the model's resolution).
	pictures    map[string]*composed
	pictureList []string
	medianFiles map[string]*medianLookup
	surface     string
	resolutions []string

	// medianMu serializes the decoding of Median pictures; medianCache holds the decoded ones, most
	// recently used last, within maxMedianBytes.
	medianMu    sync.Mutex
	medianCache []*medianEntry

	cache *xmlCache
}

// Open opens the PxInventory directory root (or a directory containing one).
func Open(root string) (*Service, error) {
	dir, ok := resolveInventory(root)
	if !ok {
		return nil, fmt.Errorf("%w: %s", ErrNotFound, root)
	}
	return &Service{root: dir, repo: siblingDir(dir, "PxRepository"), cache: newXMLCache()}, nil
}

// Root returns the normalized PxInventory directory.
func (s *Service) Root() string {
	return s.root
}

// Models lists every model directory under INSPECT_SPEC.
func (s *Service) Models() ([]ModelEntry, error) {
	names, err := s.modelNames()
	if err != nil {
		return nil, err
	}

	s.mu.Lock()
	active := s.resolveActiveLocked(names)
	s.mu.Unlock()

	_, resolution := s.applicationInfo()

	entries := make([]ModelEntry, 0, len(names))
	for i, name := range names {
		created := ""
		if info, err := os.Stat(filepath.Join(s.root, "INSPECT_SPEC", name)); err == nil {
			created = info.ModTime().Format("2006-01-02 15:04:05")
		}
		state := ""
		if name == active {
			state = "Load"
		}
		entries = append(entries, ModelEntry{
			Index:      fmt.Sprintf("%02d", i+1),
			Created:    created,
			Name:       name,
			State:      state,
			Resolution: s.modelResolution(name, resolution),
		})
	}
	return entries, nil
}

// Active returns the currently selected model.
func (s *Service) Active() (ActiveModel, error) {
	names, err := s.modelNames()
	if err != nil {
		return ActiveModel{}, err
	}
	s.mu.Lock()
	active := s.resolveActiveLocked(names)
	s.mu.Unlock()
	if active == "" {
		return ActiveModel{}, errors.New("inventory: no models available")
	}
	return s.activeModel(active)
}

// ActiveName is the name of the active model as far as it is known without looking at the disk:
// empty until the first Active, Select or picture request has settled it.
func (s *Service) ActiveName() string {
	s.mu.Lock()
	defer s.mu.Unlock()
	return s.active
}

// Select switches the active model; the name must exist.
func (s *Service) Select(name string) (ActiveModel, error) {
	names, err := s.modelNames()
	if err != nil {
		return ActiveModel{}, err
	}
	found := false
	for _, n := range names {
		if n == name {
			found = true
			break
		}
	}
	if !found {
		return ActiveModel{}, fmt.Errorf("inventory: model %q not found", name)
	}
	s.mu.Lock()
	s.active = name
	s.mu.Unlock()
	return s.activeModel(name)
}

// Teach returns the specification data of the active model.
func (s *Service) Teach() (TeachSpec, error) {
	am, err := s.Active()
	if err != nil {
		return TeachSpec{}, err
	}
	side := s.sideFor(am.Name, am.Surface)

	alignPath := filepath.Join(s.root, "INSPECT_SPEC", am.Name, side, "AlignSpec.xml")
	global, sr := s.alignLines(alignPath)

	sets := s.specSets(am.Name, side)

	for _, set := range []*SpecSet{&sets.Unit, &sets.Dummy} {
		set.GlobalAlign = append([]AlignLine{}, global...)
		set.SrAlign = append([]AlignLine{}, sr...)
		set.Overlay = Overlay{MK: true}
		if set.Tree == nil {
			set.Tree = []SpecNode{}
		}
	}

	return sets, nil
}

// Analysis returns the light analysis of a node; the id must look like u-p3-c22 or d-p5.
func (s *Service) Analysis(nodeID string) (NodeAnalysis, error) {
	_, gp, pn, cn, hasChild, err := parseNodeID(nodeID)
	if err != nil {
		return nil, err
	}

	am, err := s.Active()
	if err != nil {
		return nil, err
	}
	side := s.sideFor(am.Name, am.Surface)

	dir := filepath.Join(s.root, "INSPECT_SPEC", am.Name, side)
	paramPath := filepath.Join(s.root, "SpecParameter.xml")
	params := s.specParameters(paramPath)

	result := make(NodeAnalysis, 3)
	for i := 0; i < 3; i++ {
		key := strconv.Itoa(i + 1)
		empty := s.emptyLight()
		result[key] = empty
		if !hasChild {
			continue
		}
		specPath := filepath.Join(dir, fmt.Sprintf("LIGHT%d", i), "InspectionSpec.xml")
		root, ok := s.cache.loadOptional(specPath)
		if !ok {
			continue
		}
		gpNode, ok := root.childByID("GPNODE", gp)
		if !ok {
			continue
		}
		pNode, ok := gpNode.childByID("PNODE", pn)
		if !ok {
			continue
		}
		cNode, ok := pNode.childByID("CNODE", cn)
		if !ok {
			continue
		}
		result[key] = buildLight(cNode, params)
	}
	return result, nil
}

// emptyLight returns a LightAnalysis with empty but non-nil tables.
func (s *Service) emptyLight() LightAnalysis {
	return LightAnalysis{
		Upper: []AnalysisRow{},
		Lower: []AnalysisRow{},
		Channels: map[string][]AnalysisRow{
			"red":   {},
			"green": {},
			"blue":  {},
		},
	}
}

// modelNames returns the sorted model directory names under INSPECT_SPEC.
func (s *Service) modelNames() ([]string, error) {
	dir := filepath.Join(s.root, "INSPECT_SPEC")
	entries, err := os.ReadDir(dir)
	if err != nil {
		return nil, err
	}
	var names []string
	for _, e := range entries {
		if !e.IsDir() {
			continue
		}
		names = append(names, e.Name())
	}
	sort.Slice(names, func(i, j int) bool {
		return strings.ToLower(names[i]) < strings.ToLower(names[j])
	})
	if names == nil {
		names = []string{}
	}
	return names, nil
}

// resolveActiveLocked returns the active model, falling back to the initial choice.
func (s *Service) resolveActiveLocked(names []string) string {
	for _, n := range names {
		if n == s.active {
			return n
		}
	}
	model, _ := s.applicationInfo()
	best := ""
	for _, n := range names {
		if model != "" && strings.HasPrefix(n, model+"-") {
			if n > best {
				best = n
			}
		}
	}
	if best != "" {
		s.active = best
		return best
	}
	if len(names) > 0 {
		s.active = names[0]
		return names[0]
	}
	s.active = ""
	return ""
}

// applicationInfo returns the Model base name and Resolution text from Application.xml.
func (s *Service) applicationInfo() (string, string) {
	path := filepath.Join(s.root, "Application.xml")
	root, ok := s.cache.loadOptional(path)
	if !ok {
		return "", ""
	}
	sys, ok := root.child("system")
	if !ok {
		return "", ""
	}
	return strings.TrimSpace(sys.attr("Model")), strings.TrimSpace(sys.attr("Resolution"))
}

// modelResolution returns the resolution text of a model, preferring a PxRepository decimal dir.
func (s *Service) modelResolution(name string, fallback string) string {
	base := modelBaseName(name)
	repo := filepath.Join(s.repoDir(), strings.ToLower(base))
	entries, err := os.ReadDir(repo)
	if err == nil {
		subdirs := make([]string, 0, len(entries))
		for _, e := range entries {
			if e.IsDir() {
				subdirs = append(subdirs, e.Name())
			}
		}
		sort.Slice(subdirs, func(i, j int) bool {
			return strings.ToLower(subdirs[i]) < strings.ToLower(subdirs[j])
		})
		for _, sub := range subdirs {
			if _, err := strconv.ParseFloat(strings.TrimSpace(sub), 64); err == nil {
				return sub
			}
		}
	}
	return fallback
}

// modelBaseName strips a trailing "-NN" revision suffix.
func modelBaseName(name string) string {
	if len(name) < 3 || name[len(name)-3] != '-' {
		return name
	}
	rev := name[len(name)-2:]
	if rev[0] < '0' || rev[0] > '9' || rev[1] < '0' || rev[1] > '9' {
		return name
	}
	return name[:len(name)-3]
}

// activeModel builds the ActiveModel for name.
func (s *Service) activeModel(name string) (ActiveModel, error) {
	_, resolution := s.applicationInfo()
	res := s.modelResolution(name, resolution)
	return ActiveModel{
		Name:       name,
		Base:       modelBaseName(name),
		Resolution: res,
		Surface:    s.surfaceName(),
	}, nil
}

// surfaceName returns "Top" for subsystem Surface 0 and "Bottom" otherwise.
func (s *Service) surfaceName() string {
	path := filepath.Join(s.root, "SystemList.xml")
	root, ok := s.cache.loadOptional(path)
	if !ok {
		return "Top"
	}
	sub, ok := root.child("system")
	if !ok {
		return "Top"
	}
	first, ok := sub.child("subsystem")
	if !ok {
		return "Top"
	}
	if first.attrInt("Surface") == 1 {
		return "Bottom"
	}
	return "Top"
}

// sideFor returns the TOP or BOTTOM directory present under the model, preferring the configured one.
func (s *Service) sideFor(model, surface string) string {
	preferred := "TOP"
	other := "BOTTOM"
	if surface == "Bottom" {
		preferred = "BOTTOM"
		other = "TOP"
	}
	base := filepath.Join(s.root, "INSPECT_SPEC", model)
	if isDir(filepath.Join(base, preferred)) {
		return preferred
	}
	if isDir(filepath.Join(base, other)) {
		return other
	}
	return preferred
}

// channelName returns the display name of a channel number.
func channelName(n int) string {
	if name, ok := channelNames[n]; ok {
		return name
	}
	return fmt.Sprintf("CH %d", n)
}

// alignLines reads the global and SR align lines from AlignSpec.xml.
func (s *Service) alignLines(path string) ([]AlignLine, []AlignLine) {
	global := []AlignLine{{Light: 1, Channel: channelName(0)}, {Light: 2, Channel: channelName(0)}, {Light: 3, Channel: channelName(0)}}
	sr := []AlignLine{{Light: 1, Channel: channelName(0)}}

	root, ok := s.cache.loadOptional(path)
	if !ok {
		return global, sr
	}
	if g, ok := root.child("GlobalAlign"); ok {
		global = []AlignLine{
			{Light: 1, Channel: channelName(g.attrInt("L1Channel"))},
			{Light: 2, Channel: channelName(g.attrInt("L2Channel"))},
			{Light: 3, Channel: channelName(g.attrInt("L3Channel"))},
		}
	}
	if r, ok := root.child("SRAlign"); ok {
		sr = []AlignLine{{Light: r.attrInt("Light") + 1, Channel: channelName(r.attrInt("Channel"))}}
	}
	return global, sr
}

// toneRefs are the reference colors used to map a SpecTreeNode color to a tone.
var toneRefs = []struct {
	name string
	r    int
	g    int
	b    int
}{
	{"root", 188, 143, 143},
	{"gold", 255, 201, 14},
	{"green", 0, 160, 0},
	{"silver", 192, 192, 192},
	{"violet", 102, 51, 255},
}

// toneFor maps an "r,g,b" color string to the nearest tone name.
func toneFor(color string) string {
	var r, g, b int
	parts := strings.Split(color, ",")
	if len(parts) == 3 {
		r, _ = strconv.Atoi(strings.TrimSpace(parts[0]))
		g, _ = strconv.Atoi(strings.TrimSpace(parts[1]))
		b, _ = strconv.Atoi(strings.TrimSpace(parts[2]))
	}
	best := toneRefs[0].name
	bestDist := -1
	for _, ref := range toneRefs {
		dr := r - ref.r
		dg := g - ref.g
		db := b - ref.b
		dist := dr*dr + dg*dg + db*db
		if bestDist < 0 || dist < bestDist {
			bestDist = dist
			best = ref.name
		}
	}
	return best
}

// nodeInfo is the name and tone of a SpecTreeNode.
type nodeInfo struct {
	name string
	tone string
}

// nodeTable holds the SpecTreeNode lookup tables by kind and id.
type nodeTable struct {
	gp map[int]nodeInfo
	p  map[int]nodeInfo
	c  map[int]nodeInfo
}

// readNodeTable parses SpecTreeNode.xml.
func (s *Service) readNodeTable() nodeTable {
	t := nodeTable{gp: map[int]nodeInfo{}, p: map[int]nodeInfo{}, c: map[int]nodeInfo{}}
	root, ok := s.cache.loadOptional(filepath.Join(s.root, "SpecTreeNode.xml"))
	if !ok {
		return t
	}
	fill := func(kind string, dst map[int]nodeInfo) {
		for _, group := range root.children(kind) {
			for _, n := range group.children("node") {
				id := n.attrInt("ID")
				dst[id] = nodeInfo{name: n.attr("Name"), tone: toneFor(n.attr("Color"))}
			}
		}
	}
	fill("gpnode", t.gp)
	fill("pnode", t.p)
	fill("cnode", t.c)
	return t
}

// lookup returns the info for a kind and id, defaulting to "Node <id>" and gold.
func (t nodeTable) lookup(kind string, id int) nodeInfo {
	var m map[int]nodeInfo
	switch kind {
	case "gpnode":
		m = t.gp
	case "pnode":
		m = t.p
	case "cnode":
		m = t.c
	}
	if info, ok := m[id]; ok && info.name != "" {
		return info
	}
	return nodeInfo{name: fmt.Sprintf("Node %d", id), tone: "gold"}
}

// readTreeNodeList returns the gpnode element with the given ID from SpecTreeNodeList.xml.
func (s *Service) readTreeNodeList(gp int) (rawNode, bool) {
	root, ok := s.cache.loadOptional(filepath.Join(s.root, "SpecTreeNodeList.xml"))
	if !ok {
		return rawNode{}, false
	}
	sys, ok := root.child("system")
	if !ok {
		return rawNode{}, false
	}
	return sys.childByID("gpnode", gp)
}

// checklist is the NodeCheck value of one node across the three lights.
type checklist struct {
	has   bool
	light [3]bool
}

// readChecklists parses the three LIGHT<n>/InspectionSpec.xml files of a model side.
func (s *Service) readChecklists(model, side string) map[string]checklist {
	out := make(map[string]checklist)
	dir := filepath.Join(s.root, "INSPECT_SPEC", model, side)
	for i := 0; i < 3; i++ {
		path := filepath.Join(dir, fmt.Sprintf("LIGHT%d", i), "InspectionSpec.xml")
		root, ok := s.cache.loadOptional(path)
		if !ok {
			continue
		}
		collectChecks(root, out, i)
	}
	return out
}

// collectChecks records the NodeCheck of every GPNODE/PNODE/CNODE into out.
func collectChecks(root rawNode, out map[string]checklist, light int) {
	for _, g := range root.children("GPNODE") {
		gid := strconv.Itoa(g.attrInt("ID"))
		recordCheck(out, "g"+gid, g, light)
		for _, p := range g.children("PNODE") {
			pid := strconv.Itoa(p.attrInt("ID"))
			recordCheck(out, "g"+gid+"/p"+pid, p, light)
			for _, c := range p.children("CNODE") {
				cid := strconv.Itoa(c.attrInt("ID"))
				recordCheck(out, "g"+gid+"/p"+pid+"/c"+cid, c, light)
			}
		}
	}
}

// recordCheck stores one node's NodeCheck under its path key.
func recordCheck(out map[string]checklist, key string, n rawNode, light int) {
	entry := out[key]
	entry.has = true
	entry.light[light] = n.attr("NodeCheck") == "1"
	out[key] = entry
}

// buildTree builds the SpecNode tree for one gpnode.
func (s *Service) buildTree(gp int, prefix string, nodes nodeTable, checks map[string]checklist) []SpecNode {
	list, ok := s.readTreeNodeList(gp)
	if !ok {
		return []SpecNode{}
	}
	tree := make([]SpecNode, 0)
	for _, p := range list.children("pnode") {
		pid := p.attrInt("ID")
		info := nodes.lookup("pnode", pid)
		parent := SpecNode{
			ID:   fmt.Sprintf("%s-p%d", prefix, pid),
			Name: info.name,
			Tone: info.tone,
		}
		if pid != 1 {
			key := "g" + strconv.Itoa(gp) + "/p" + strconv.Itoa(pid)
			light := checks[key]
			parent.LightChecked = append([]bool{}, light.light[:]...)
			parent.Checked = boolPtr(light.light[1])
		}
		for _, c := range p.children("cnode") {
			cid := c.attrInt("ID")
			cinfo := nodes.lookup("cnode", cid)
			child := SpecNode{
				ID:   fmt.Sprintf("%s-p%d-c%d", prefix, pid, cid),
				Name: cinfo.name,
				Tone: cinfo.tone,
			}
			if pid == 1 {
				switch cid {
				case 10:
					child.Align = "metal"
				case 11:
					child.Align = "sr"
				case 12:
					child.Align = "dmg"
				}
			} else {
				key := "g" + strconv.Itoa(gp) + "/p" + strconv.Itoa(pid) + "/c" + strconv.Itoa(cid)
				light := checks[key]
				child.LightChecked = append([]bool{}, light.light[:]...)
				child.Checked = boolPtr(light.light[1])
			}
			parent.Children = append(parent.Children, child)
		}
		tree = append(tree, parent)
	}
	return tree
}

// boolPtr returns a pointer to a fresh bool.
func boolPtr(v bool) *bool {
	b := v
	return &b
}

// specSets builds the Unit and Dummy SpecSets of a model side.
func (s *Service) specSets(model, side string) TeachSpec {
	nodes := s.readNodeTable()
	checks := s.readChecklists(model, side)
	return TeachSpec{
		Unit: SpecSet{
			GlobalAlign: []AlignLine{},
			SrAlign:     []AlignLine{},
			Tree:        s.buildTree(1, "u", nodes, checks),
		},
		Dummy: SpecSet{
			GlobalAlign: []AlignLine{},
			SrAlign:     []AlignLine{},
			Tree:        s.buildTree(2, "d", nodes, checks),
		},
	}
}

// specParameters reads the English strings of SpecParameter.xml keyed by ParamKey.
func (s *Service) specParameters(path string) map[int]string {
	out := make(map[int]string)
	root, ok := s.cache.loadOptional(path)
	if !ok {
		return out
	}
	packs := root.children("stringpack")
	if len(packs) == 0 {
		return out
	}
	pack := packs[0]
	for _, p := range packs {
		if strings.TrimSpace(p.attr("LangCode")) == "0" {
			pack = p
			break
		}
	}
	for _, str := range pack.children("string") {
		key := str.attrInt("ParamKey")
		out[key] = strings.TrimSpace(str.attr("Text"))
	}
	return out
}

// formatValue formats a number with three decimals, normalizing "-0.000" to "0.000".
func formatValue(v float64) string {
	text := fmt.Sprintf("%.3f", v)
	if text == "-0.000" {
		return "0.000"
	}
	return text
}

// toneForGroup maps SpecGroup to a table tone.
func toneForGroup(group int) string {
	switch group {
	case 1, 2:
		return "green"
	case 3, 4:
		return "yellow"
	default:
		return "plain"
	}
}

// paramName returns the parameter name for a key.
func paramName(params map[int]string, key int) string {
	if name := params[key]; name != "" {
		return name
	}
	return fmt.Sprintf("Param %d", key)
}

// rowFromNode builds an AnalysisRow from a MASTER/SUBMASTER element.
func rowFromNode(no int, n rawNode, params map[int]string) AnalysisRow {
	key := n.attrInt("ParamKey")
	group := n.attrInt("SpecGroup")
	row := AnalysisRow{
		No:   no,
		Name: paramName(params, key),
		Tone: toneForGroup(group),
	}
	if n.attr("ControlType") == "1" {
		row.Value = n.attrFloat("Val") != 0
	} else {
		row.Value = formatValue(n.attrFloat("Val"))
	}
	return row
}

// channelFromNode builds a channel-table row from an INSPECTION element.
func channelFromNode(no int, n rawNode, params map[int]string, val, min string) AnalysisRow {
	key := n.attrInt("ParamKey")
	row := AnalysisRow{
		No:   no,
		Name: paramName(params, key),
		Tone: toneForGroup(n.attrInt("SpecGroup")),
		Min:  formatValue(n.attrFloat(min)),
	}
	if n.attr("ControlType") == "1" {
		row.Value = n.attrFloat(val) != 0
	} else {
		row.Value = formatValue(n.attrFloat(val))
	}
	return row
}

// buildLight builds the LightAnalysis of one CNODE.
func buildLight(cnode rawNode, params map[int]string) LightAnalysis {
	la := LightAnalysis{
		Upper: []AnalysisRow{},
		Lower: []AnalysisRow{},
		Channels: map[string][]AnalysisRow{
			"red":   []AnalysisRow{},
			"green": []AnalysisRow{},
			"blue":  []AnalysisRow{},
		},
	}

	no := 0
	for _, n := range cnode.children("MASTER") {
		if n.attrInt("ParamKey") == 100 {
			continue
		}
		no++
		la.Upper = append(la.Upper, rowFromNode(no, n, params))
	}

	no = 0
	for _, n := range cnode.children("SUBMASTER") {
		no++
		la.Lower = append(la.Lower, rowFromNode(no, n, params))
	}

	var red, green, blue []AnalysisRow
	nRed, nGreen, nBlue := 0, 0, 0
	for _, n := range cnode.children("INSPECTION") {
		nRed++
		red = append(red, channelFromNode(nRed, n, params, "ValR", "MinValR"))
		nGreen++
		green = append(green, channelFromNode(nGreen, n, params, "ValG", "MinValG"))
		nBlue++
		blue = append(blue, channelFromNode(nBlue, n, params, "ValB", "MinValB"))
	}
	if red != nil {
		la.Channels["red"] = red
	}
	if green != nil {
		la.Channels["green"] = green
	}
	if blue != nil {
		la.Channels["blue"] = blue
	}
	return la
}

// parseNodeID parses an id like u-p3-c22 into its parts.
func parseNodeID(id string) (prefix string, gp, pn, cn int, hasChild bool, err error) {
	if len(id) < 4 || (id[0] != 'u' && id[0] != 'd') {
		return "", 0, 0, 0, false, fmt.Errorf("inventory: invalid node id %q", id)
	}
	prefix = string(id[0])
	if id[1] != '-' || id[2] != 'p' {
		return "", 0, 0, 0, false, fmt.Errorf("inventory: invalid node id %q", id)
	}
	rest := id[3:]
	if i := strings.Index(rest, "-c"); i >= 0 {
		pn, err = strconv.Atoi(rest[:i])
		if err != nil {
			return "", 0, 0, 0, false, fmt.Errorf("inventory: invalid node id %q", id)
		}
		cn, err = strconv.Atoi(rest[i+2:])
		if err != nil {
			return "", 0, 0, 0, false, fmt.Errorf("inventory: invalid node id %q", id)
		}
		hasChild = true
	} else {
		pn, err = strconv.Atoi(rest)
		if err != nil {
			return "", 0, 0, 0, false, fmt.Errorf("inventory: invalid node id %q", id)
		}
	}
	if prefix == "u" {
		gp = 1
	} else {
		gp = 2
	}
	return prefix, gp, pn, cn, hasChild, nil
}
