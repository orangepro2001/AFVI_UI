package inventory

import (
	"bytes"
	"encoding/xml"
	"os"
	"strconv"
	"strings"
	"sync"
)

// rawXML is one parsed XML file, stripped of a leading UTF-8 BOM.
type rawXML struct {
	XMLName xml.Name
	Nodes   []rawNode `xml:",any"`
}

// rawNode is an element carrying only its attributes and children; text is ignored.
type rawNode struct {
	XMLName xml.Name
	Attrs   []xml.Attr `xml:",any,attr"`
	Nodes   []rawNode  `xml:",any"`
}

// attr returns the attribute named name or the empty string.
func (n rawNode) attr(name string) string {
	for _, a := range n.Attrs {
		if a.Name.Local == name {
			return a.Value
		}
	}
	return ""
}

// attrFloat parses the attribute name as a float, returning 0 on failure.
func (n rawNode) attrFloat(name string) float64 {
	f, err := strconv.ParseFloat(strings.TrimSpace(n.attr(name)), 64)
	if err != nil {
		return 0
	}
	return f
}

// attrInt parses the attribute name as an int, returning 0 on failure.
func (n rawNode) attrInt(name string) int {
	v, err := strconv.Atoi(strings.TrimSpace(n.attr(name)))
	if err != nil {
		return 0
	}
	return v
}

// child returns the first direct child element named name.
func (n rawNode) child(name string) (rawNode, bool) {
	for _, c := range n.Nodes {
		if c.XMLName.Local == name {
			return c, true
		}
	}
	return rawNode{}, false
}

// children returns every direct child element named name.
func (n rawNode) children(name string) []rawNode {
	var out []rawNode
	for _, c := range n.Nodes {
		if c.XMLName.Local == name {
			out = append(out, c)
		}
	}
	return out
}

// childByID returns the first direct child element named tag whose ID attribute equals id.
func (n rawNode) childByID(tag string, id int) (rawNode, bool) {
	want := strconv.Itoa(id)
	for _, c := range n.Nodes {
		if c.XMLName.Local != tag {
			continue
		}
		if strings.TrimSpace(c.attr("ID")) == want {
			return c, true
		}
	}
	return rawNode{}, false
}

// xmlCache caches parsed XML files keyed by path, validated by modification time and size.
type xmlCache struct {
	mu      sync.Mutex
	entries map[string]xmlCacheEntry
}

type xmlCacheEntry struct {
	modTime int64
	size    int64
	root    rawNode
}

// newXMLCache returns an empty cache.
func newXMLCache() *xmlCache {
	return &xmlCache{entries: make(map[string]xmlCacheEntry)}
}

// load parses the XML file at path, using the cache when the file is unchanged.
func (c *xmlCache) load(path string) (rawNode, error) {
	info, err := os.Stat(path)
	if err != nil {
		return rawNode{}, err
	}
	modTime := info.ModTime().UnixNano()
	size := info.Size()

	c.mu.Lock()
	if e, ok := c.entries[path]; ok && e.modTime == modTime && e.size == size {
		root := e.root
		c.mu.Unlock()
		return root, nil
	}
	c.mu.Unlock()

	data, err := os.ReadFile(path)
	if err != nil {
		return rawNode{}, err
	}
	data = bytes.TrimPrefix(data, []byte("\xef\xbb\xbf"))

	var doc rawXML
	if err := xml.Unmarshal(data, &doc); err != nil {
		return rawNode{}, err
	}
	root := rawNode{XMLName: doc.XMLName, Nodes: doc.Nodes}

	c.mu.Lock()
	c.entries[path] = xmlCacheEntry{modTime: modTime, size: size, root: root}
	c.mu.Unlock()
	return root, nil
}

// loadOptional parses path, returning nil and false when it does not exist or is invalid.
func (c *xmlCache) loadOptional(path string) (rawNode, bool) {
	root, err := c.load(path)
	if err != nil {
		return rawNode{}, false
	}
	return root, true
}
