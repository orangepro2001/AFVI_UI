//go:build ignore

// devapi.go - development HTTP server that serves the Go inventory parser to the browser.
// Run: go run scripts/devapi.go [-addr 127.0.0.1:8099] [-inventory <dir>]
// Without -inventory the data directory is discovered the same way as the Wails app.
package main

import (
	"encoding/json"
	"flag"
	"fmt"
	"log"
	"net/http"
	"net/url"

	"afvi/ui/internal/inventory"
)

func main() {
	addr := flag.String("addr", "127.0.0.1:8099", "listen address")
	dir := flag.String("inventory", "", "PxInventory directory (or its parent); empty = discover")
	flag.Parse()

	var discover func() (string, error)
	if *dir == "" {
		discover = inventory.Discover
	} else {
		discover = func() (string, error) { return *dir, nil }
	}
	lazy := inventory.NewLazy(discover)

	if svc, err := lazy.Service(); err != nil {
		log.Printf("inventory unavailable: %v (will retry on every request)", err)
	} else {
		log.Printf("inventory: %s", svc.Root())
	}
	log.Printf("listening on http://%s", *addr)

	http.HandleFunc("/api/", apiHandler(lazy))
	log.Fatal(http.ListenAndServe(*addr, nil))
}

// apiHandler serves the /api/<Method> routes.
func apiHandler(lazy *inventory.Lazy) http.HandlerFunc {
	methods := map[string]func(url.Values) (any, error){
		"GetModels": func(url.Values) (any, error) {
			svc, err := lazy.Service()
			if err != nil {
				return nil, err
			}
			return svc.Models()
		},
		"GetActiveModel": func(url.Values) (any, error) {
			svc, err := lazy.Service()
			if err != nil {
				return nil, err
			}
			return svc.Active()
		},
		"SelectModel": func(q url.Values) (any, error) {
			svc, err := lazy.Service()
			if err != nil {
				return nil, err
			}
			return svc.Select(q.Get("name"))
		},
		"GetTeachSpec": func(url.Values) (any, error) {
			svc, err := lazy.Service()
			if err != nil {
				return nil, err
			}
			return svc.Teach()
		},
		"GetNodeAnalysis": func(q url.Values) (any, error) {
			svc, err := lazy.Service()
			if err != nil {
				return nil, err
			}
			return svc.Analysis(q.Get("id"))
		},
	}

	return func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Access-Control-Allow-Origin", "*")
		if r.Method == http.MethodOptions {
			w.Header().Set("Access-Control-Allow-Methods", "GET, OPTIONS")
			w.Header().Set("Access-Control-Allow-Headers", "*")
			w.WriteHeader(http.StatusNoContent)
			return
		}

		method := r.URL.Path[len("/api/"):]
		handler, ok := methods[method]
		if !ok {
			writeJSON(w, http.StatusNotFound, map[string]string{"error": "unknown method"})
			return
		}
		result, err := handler(r.URL.Query())
		if err != nil {
			writeJSON(w, http.StatusInternalServerError, map[string]string{"error": err.Error()})
			return
		}
		writeJSON(w, http.StatusOK, result)
	}
}

// writeJSON encodes v as JSON with the given status code.
func writeJSON(w http.ResponseWriter, status int, v any) {
	w.Header().Set("Content-Type", "application/json; charset=utf-8")
	w.WriteHeader(status)
	if err := json.NewEncoder(w).Encode(v); err != nil {
		fmt.Fprintf(w, "{\"error\":%q}", err.Error())
	}
}
