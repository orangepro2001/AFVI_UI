//go:build ignore

// mock-github.go - a small stand-in for the parts of the GitHub REST API that deploy/server/ci
// uses, to rehearse the build server without touching GitHub (docs/CI.md, "Testing the driver").
//
//	go run deploy/server/mock-github.go [-addr 127.0.0.1:8098] [-data DIR]
//
// Point the driver at it:
//
//	AFVI_CI_API=http://127.0.0.1:8098 AFVI_CI_UPLOADS=http://127.0.0.1:8098 GITHUB_TOKEN=x ci build main
//
// It implements releases (list, by tag, create, patch, delete), release assets (upload), tag
// deletion and commit statuses, all in memory. Uploaded files are kept in DIR/<release id>/<name>.
// A release that becomes public (created without draft, or a draft patched to draft=false) is
// what makes GitHub start a "release: published" workflow: the mock prints "EVENT release
// published <tag>" for it. GET /_state shows everything as JSON.
package main

import (
	"crypto/sha256"
	"encoding/hex"
	"encoding/json"
	"flag"
	"fmt"
	"io"
	"log"
	"net/http"
	"os"
	"path/filepath"
	"strconv"
	"strings"
	"sync"
)

type asset struct {
	Name   string `json:"name"`
	Size   int    `json:"size"`
	SHA256 string `json:"sha256"`
}

type release struct {
	ID         int     `json:"id"`
	TagName    string  `json:"tag_name"`
	Target     string  `json:"target_commitish"`
	Name       string  `json:"name"`
	Body       string  `json:"body"`
	Draft      bool    `json:"draft"`
	Prerelease bool    `json:"prerelease"`
	HTMLURL    string  `json:"html_url"`
	Assets     []asset `json:"assets"`
}

type status struct {
	SHA         string `json:"sha"`
	State       string `json:"state"`
	Context     string `json:"context"`
	Description string `json:"description"`
}

type server struct {
	mu       sync.Mutex
	data     string
	next     int
	releases []*release
	tags     map[string]string
	statuses []status
	events   []string
}

func (s *server) find(id int) *release {
	for _, r := range s.releases {
		if r.ID == id {
			return r
		}
	}
	return nil
}

func (s *server) publish(r *release) {
	s.tags[r.TagName] = r.Target
	s.events = append(s.events, "release published "+r.TagName)
	log.Printf("EVENT release published %s", r.TagName)
}

func reply(w http.ResponseWriter, code int, v any) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(code)
	if v != nil {
		_ = json.NewEncoder(w).Encode(v)
	}
}

func (s *server) handle(w http.ResponseWriter, req *http.Request) {
	s.mu.Lock()
	defer s.mu.Unlock()

	if got := req.Header.Get("Authorization"); req.URL.Path != "/_state" && !strings.HasPrefix(got, "Bearer ") {
		reply(w, 401, map[string]string{"message": "Requires authentication"})
		return
	}
	parts := strings.Split(strings.Trim(req.URL.Path, "/"), "/")
	log.Printf("%s %s", req.Method, req.URL.RequestURI())

	if req.URL.Path == "/_state" {
		reply(w, 200, map[string]any{"releases": s.releases, "tags": s.tags, "statuses": s.statuses, "events": s.events})
		return
	}
	// /repos/<owner>/<repo>/...
	if len(parts) < 3 || parts[0] != "repos" {
		reply(w, 404, map[string]string{"message": "Not Found"})
		return
	}
	rest := parts[3:]
	key := strings.Join(rest, "/")
	switch {
	case len(rest) == 0 && req.Method == "GET":
		reply(w, 200, map[string]string{"full_name": parts[1] + "/" + parts[2]})

	case key == "releases" && req.Method == "GET":
		reply(w, 200, s.releases)

	case len(rest) == 3 && rest[0] == "releases" && rest[1] == "tags" && req.Method == "GET":
		for _, r := range s.releases {
			if r.TagName == rest[2] && !r.Draft {
				reply(w, 200, r)
				return
			}
		}
		reply(w, 404, map[string]string{"message": "Not Found"})

	case key == "releases" && req.Method == "POST":
		r := &release{Assets: []asset{}}
		if err := json.NewDecoder(req.Body).Decode(r); err != nil {
			reply(w, 400, map[string]string{"message": err.Error()})
			return
		}
		s.next++
		r.ID = s.next
		r.HTMLURL = fmt.Sprintf("http://mock.invalid/%s/%s/releases/tag/%s", parts[1], parts[2], r.TagName)
		if r.Draft {
			r.HTMLURL = fmt.Sprintf("http://mock.invalid/%s/%s/releases/untagged-%d", parts[1], parts[2], r.ID)
		}
		s.releases = append(s.releases, r)
		if !r.Draft {
			s.publish(r)
		}
		reply(w, 201, r)

	case len(rest) == 2 && rest[0] == "releases" && (req.Method == "PATCH" || req.Method == "DELETE"):
		id, _ := strconv.Atoi(rest[1])
		r := s.find(id)
		if r == nil {
			reply(w, 404, map[string]string{"message": "Not Found"})
			return
		}
		if req.Method == "DELETE" {
			for i, x := range s.releases {
				if x == r {
					s.releases = append(s.releases[:i], s.releases[i+1:]...)
					break
				}
			}
			_ = os.RemoveAll(filepath.Join(s.data, strconv.Itoa(r.ID)))
			reply(w, 204, nil)
			return
		}
		var patch struct {
			Draft      *bool `json:"draft"`
			Prerelease *bool `json:"prerelease"`
		}
		if err := json.NewDecoder(req.Body).Decode(&patch); err != nil {
			reply(w, 400, map[string]string{"message": err.Error()})
			return
		}
		wasDraft := r.Draft
		if patch.Draft != nil {
			r.Draft = *patch.Draft
		}
		if patch.Prerelease != nil {
			r.Prerelease = *patch.Prerelease
		}
		if wasDraft && !r.Draft {
			r.HTMLURL = fmt.Sprintf("http://mock.invalid/%s/%s/releases/tag/%s", parts[1], parts[2], r.TagName)
			s.publish(r)
		}
		reply(w, 200, r)

	case len(rest) == 3 && rest[0] == "releases" && rest[2] == "assets" && req.Method == "POST":
		id, _ := strconv.Atoi(rest[1])
		r := s.find(id)
		name := req.URL.Query().Get("name")
		if r == nil || name == "" {
			reply(w, 404, map[string]string{"message": "Not Found"})
			return
		}
		for _, a := range r.Assets {
			if a.Name == name {
				reply(w, 422, map[string]string{"message": "Validation Failed: already_exists"})
				return
			}
		}
		body, err := io.ReadAll(req.Body)
		if err != nil {
			reply(w, 400, map[string]string{"message": err.Error()})
			return
		}
		dir := filepath.Join(s.data, strconv.Itoa(r.ID))
		if err := os.MkdirAll(dir, 0o755); err != nil {
			reply(w, 500, map[string]string{"message": err.Error()})
			return
		}
		if err := os.WriteFile(filepath.Join(dir, name), body, 0o644); err != nil {
			reply(w, 500, map[string]string{"message": err.Error()})
			return
		}
		sum := sha256.Sum256(body)
		a := asset{Name: name, Size: len(body), SHA256: hex.EncodeToString(sum[:])}
		r.Assets = append(r.Assets, a)
		reply(w, 201, a)

	case len(rest) >= 4 && rest[0] == "git" && rest[1] == "refs" && rest[2] == "tags" && req.Method == "DELETE":
		tag := strings.Join(rest[3:], "/")
		if _, ok := s.tags[tag]; !ok {
			reply(w, 422, map[string]string{"message": "Reference does not exist"})
			return
		}
		delete(s.tags, tag)
		reply(w, 204, nil)

	case len(rest) == 2 && rest[0] == "statuses" && req.Method == "POST":
		var st status
		if err := json.NewDecoder(req.Body).Decode(&st); err != nil {
			reply(w, 400, map[string]string{"message": err.Error()})
			return
		}
		st.SHA = rest[1]
		s.statuses = append(s.statuses, st)
		reply(w, 201, st)

	default:
		reply(w, 404, map[string]string{"message": "Not Found (mock)"})
	}
}

func main() {
	addr := flag.String("addr", "127.0.0.1:8098", "listen address")
	data := flag.String("data", "", "folder for uploaded files (default: a temporary one)")
	flag.Parse()

	dir := *data
	if dir == "" {
		d, err := os.MkdirTemp("", "mock-github-")
		if err != nil {
			log.Fatal(err)
		}
		dir = d
	}
	s := &server{data: dir, tags: map[string]string{}, releases: []*release{}}
	log.Printf("mock GitHub on http://%s, uploads in %s", *addr, dir)
	log.Fatal(http.ListenAndServe(*addr, http.HandlerFunc(s.handle)))
}
