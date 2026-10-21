//go:build ignore

// ciwait.go - wait for the pipeline of one commit: build server -> Windows tests -> nightly.
//
//	go run scripts/ciwait.go [-repo orangepro2001/AFVI_UI] [-sha SHA] [-timeout 20m] [-interval 20s]
//
// The commit is the head of main on GitHub unless -sha is given. It follows
//
//	build server   the commit status "afvi-ui-ci/server" (set by deploy/server/ci)
//	windows        the jobs "test" and "promote" of .github/workflows/windows.yml
//	nightly        the rolling prerelease, which must name the commit
//
// and prints a line whenever one of them changes. Exit 0: nightly is at the commit. Exit 1: a
// stage failed (the line says which and where to look). Exit 2: timeout.
//
// It only reads the public API, so no token is needed; GITHUB_TOKEN or GH_TOKEN, when set, is used
// (higher rate limit). Requests are conditional (ETag): answers that did not change do not count
// against the anonymous limit of 60 requests per hour.
package main

import (
	"encoding/json"
	"flag"
	"fmt"
	"io"
	"net/http"
	"os"
	"strings"
	"time"
)

type cached struct {
	etag string
	body []byte
}

var (
	token = firstEnv("GITHUB_TOKEN", "GH_TOKEN")
	cache = map[string]cached{}
)

func firstEnv(names ...string) string {
	for _, n := range names {
		if v := os.Getenv(n); v != "" {
			return v
		}
	}
	return ""
}

// get returns the body and status code of a GitHub API URL; a 304 answers from the cache.
func get(url string) ([]byte, int, error) {
	req, err := http.NewRequest("GET", url, nil)
	if err != nil {
		return nil, 0, err
	}
	req.Header.Set("Accept", "application/vnd.github+json")
	req.Header.Set("X-GitHub-Api-Version", "2022-11-28")
	if token != "" {
		req.Header.Set("Authorization", "Bearer "+token)
	}
	if c, ok := cache[url]; ok {
		req.Header.Set("If-None-Match", c.etag)
	}
	resp, err := (&http.Client{Timeout: 30 * time.Second}).Do(req)
	if err != nil {
		return nil, 0, err
	}
	defer resp.Body.Close()
	if resp.StatusCode == http.StatusNotModified {
		return cache[url].body, 200, nil
	}
	body, err := io.ReadAll(resp.Body)
	if err != nil {
		return nil, 0, err
	}
	if resp.StatusCode == 200 {
		if etag := resp.Header.Get("ETag"); etag != "" {
			cache[url] = cached{etag, body}
		}
	}
	if resp.StatusCode == 403 || resp.StatusCode == 429 {
		return body, resp.StatusCode, fmt.Errorf("GitHub answered %d (rate limit? set GITHUB_TOKEN): %s", resp.StatusCode, trim(string(body)))
	}
	return body, resp.StatusCode, nil
}

func trim(s string) string {
	if len(s) > 200 {
		return s[:200]
	}
	return s
}

// observed is everything one poll learns.
type observed struct {
	server    string // pending | success | failure | error | ""
	srvText   string
	jobs      map[string]string // job name -> "queued", "in_progress" or the conclusion
	jobURL    map[string]string
	nightly   string // the release name, "" when there is none
	nightlyOK bool
	assets    []string
}

func poll(api, sha string) (observed, error) {
	o := observed{jobs: map[string]string{}, jobURL: map[string]string{}}

	body, code, err := get(fmt.Sprintf("%s/commits/%s/statuses", api, sha))
	if err != nil {
		return o, err
	}
	if code == 200 {
		var list []struct {
			Context     string `json:"context"`
			State       string `json:"state"`
			Description string `json:"description"`
		}
		if json.Unmarshal(body, &list) == nil {
			for _, st := range list { // newest first
				if st.Context == "afvi-ui-ci/server" {
					o.server, o.srvText = st.State, st.Description
					break
				}
			}
		}
	}

	body, code, err = get(fmt.Sprintf("%s/commits/%s/check-runs?per_page=100", api, sha))
	if err != nil {
		return o, err
	}
	if code == 200 {
		var res struct {
			CheckRuns []struct {
				Name       string `json:"name"`
				Status     string `json:"status"`
				Conclusion string `json:"conclusion"`
				HTMLURL    string `json:"html_url"`
				App        struct {
					Slug string `json:"slug"`
				} `json:"app"`
			} `json:"check_runs"`
		}
		if json.Unmarshal(body, &res) == nil {
			for _, c := range res.CheckRuns {
				if c.App.Slug != "github-actions" || (c.Name != "test" && c.Name != "promote") {
					continue
				}
				state := c.Status
				if c.Status == "completed" {
					state = c.Conclusion
				}
				o.jobs[c.Name] = state
				o.jobURL[c.Name] = c.HTMLURL
			}
		}
	}

	body, code, err = get(api + "/releases/tags/nightly")
	if err != nil {
		return o, err
	}
	if code == 200 {
		var rel struct {
			Name   string `json:"name"`
			Target string `json:"target_commitish"`
			Assets []struct {
				Name string `json:"name"`
				Size int    `json:"size"`
			} `json:"assets"`
		}
		if json.Unmarshal(body, &rel) == nil {
			o.nightly = rel.Name
			o.nightlyOK = strings.Contains(rel.Name, sha[:7]) || rel.Target == sha
			for _, a := range rel.Assets {
				o.assets = append(o.assets, fmt.Sprintf("%s (%d bytes)", a.Name, a.Size))
			}
		}
	}
	return o, nil
}

func (o observed) line() string {
	srv := o.server
	if srv == "" {
		srv = "waiting"
	}
	win := func(name string) string {
		if s := o.jobs[name]; s != "" {
			return s
		}
		return "-"
	}
	nightly := "not yet"
	if o.nightlyOK {
		nightly = "READY"
	}
	return fmt.Sprintf("build server: %-8s  windows test: %-11s  promote: %-11s  nightly: %s", srv, win("test"), win("promote"), nightly)
}

func main() {
	repo := flag.String("repo", "orangepro2001/AFVI_UI", "owner/name")
	sha := flag.String("sha", "", "commit (default: head of main on GitHub)")
	timeout := flag.Duration("timeout", 20*time.Minute, "give up after this long")
	interval := flag.Duration("interval", 20*time.Second, "time between polls")
	flag.Parse()

	api := "https://api.github.com/repos/" + *repo
	if *sha == "" {
		body, _, err := get(api + "/commits/main")
		if err != nil {
			fmt.Fprintln(os.Stderr, "cannot read main:", err)
			os.Exit(1)
		}
		var c struct {
			SHA string `json:"sha"`
		}
		if json.Unmarshal(body, &c) != nil || len(c.SHA) < 7 {
			fmt.Fprintln(os.Stderr, "cannot read the head of main:", trim(string(body)))
			os.Exit(1)
		}
		*sha = c.SHA
	}
	if len(*sha) < 40 {
		body, _, err := get(api + "/commits/" + *sha)
		var c struct {
			SHA string `json:"sha"`
		}
		if err != nil || json.Unmarshal(body, &c) != nil || len(c.SHA) != 40 {
			fmt.Fprintln(os.Stderr, "unknown commit", *sha)
			os.Exit(1)
		}
		*sha = c.SHA
	}
	fmt.Printf("waiting for %s on %s (timeout %s)\n", (*sha)[:7], *repo, *timeout)

	start := time.Now()
	last := ""
	promotedButNotNightly := 0
	for {
		o, err := poll(api, *sha)
		if err != nil {
			fmt.Fprintln(os.Stderr, "poll:", err)
		} else {
			if l := o.line(); l != last {
				fmt.Printf("[%5.0fs] %s\n", time.Since(start).Seconds(), l)
				last = l
			}
			switch {
			case o.nightlyOK:
				fmt.Println("nightly is at the commit:")
				for _, a := range o.assets {
					fmt.Println("  ", a)
				}
				return
			case o.server == "failure" || o.server == "error":
				fmt.Printf("FAILED at the build server: %s\nlook at: ssh AI '~/ci/afvi-ui/bin/ci status' and out/main/<time>-%s/build.log\n", o.srvText, (*sha)[:7])
				os.Exit(1)
			}
			for _, name := range []string{"test", "promote"} {
				switch o.jobs[name] {
				case "failure", "cancelled", "timed_out", "action_required":
					fmt.Printf("FAILED at the windows workflow, job %q (%s): %s\n", name, o.jobs[name], o.jobURL[name])
					os.Exit(1)
				}
			}
			if o.jobs["promote"] == "success" {
				promotedButNotNightly++
				if promotedButNotNightly >= 3 {
					fmt.Printf("the promote job finished but nightly is %q, not %s: main probably moved on\n", o.nightly, (*sha)[:7])
					os.Exit(1)
				}
			}
		}
		if time.Since(start) > *timeout {
			fmt.Printf("TIMEOUT after %s: %s\n", *timeout, last)
			os.Exit(2)
		}
		time.Sleep(*interval)
	}
}
