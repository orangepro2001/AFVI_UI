//go:build ignore

// devapi.go - development HTTP server that serves the Go inventory parser to the browser.
// Run from the repository root: go run scripts/devapi.go [-addr 127.0.0.1:8099] [-config <file>]
// The browser reaches it through ?api=http://127.0.0.1:8099. It never touches the configuration of
// the installed app (%AppData%\AFVI-UI): by default it keeps its own git-ignored .dev/connector.json,
// which is filled from the reference data in design/repo/{FM1,FM2,BM} the first time. The folders can
// be changed in the Connector dialog; -config picks another file.
package main

import (
	"encoding/json"
	"errors"
	"flag"
	"fmt"
	"log"
	"net/http"
	"os"
	"path/filepath"

	"afvi/ui/internal/connector"
	"afvi/ui/internal/inventory"
)

// devConfig is the development configuration file, relative to the repository root.
const devConfig = ".dev/connector.json"

// devRoiDir keeps the ROIs the developer draws; the installed app's folder is never touched.
const devRoiDir = ".dev/roi"

// referenceRoot holds the reference data of the three hosts: design/repo/FM1, FM2 and BM.
const referenceRoot = "design/repo"

func main() {
	addr := flag.String("addr", "127.0.0.1:8099", "listen address")
	cfgFile := flag.String("config", "", "connector config file; empty = "+devConfig+", seeded from "+referenceRoot)
	flag.Parse()

	file := *cfgFile
	seed := false
	if file == "" {
		file = devConfig
		seed = true
	}
	_, statErr := os.Stat(file)
	fresh := errors.Is(statErr, os.ErrNotExist)
	hub := connector.NewHub(connector.NewStore(file))
	hub.SetRoiDir(devRoiDir)
	if seed && fresh {
		seedFromReference(hub)
	}

	log.Printf("config: %s", file)
	if active := hub.Config().Active; active == "" {
		log.Printf("no host configured")
	} else {
		log.Printf("active host: %s", active)
	}
	log.Printf("listening on http://%s", *addr)

	http.HandleFunc("/api/", apiHandler(hub))
	log.Fatal(http.ListenAndServe(*addr, nil))
}

// seedFromReference points every host whose reference folder exists in design/repo at it and makes
// FM1 (else the first one found) the active host. Folders that fail the Connector check are skipped.
func seedFromReference(hub *connector.Hub) {
	in := connector.SaveInput{}
	for _, id := range connector.Machines {
		dir, err := filepath.Abs(filepath.Join(referenceRoot, id))
		if err != nil {
			continue
		}
		if check := connector.Check(dir); !check.OK {
			log.Printf("reference %s skipped: %s (%s)", id, check.Message, dir)
			continue
		}
		in.Machines = append(in.Machines, connector.MachinePath{ID: id, Path: dir})
		if in.Active == "" {
			in.Active = id
		}
	}
	if len(in.Machines) == 0 {
		return
	}
	if _, err := hub.Save(in); err != nil {
		log.Printf("seed %s: %v", devConfig, err)
		return
	}
	log.Printf("seeded %s from %s", devConfig, referenceRoot)
}

// apiHandler serves the /api/<Method> routes.
func apiHandler(hub *connector.Hub) http.HandlerFunc {
	methods := map[string]func(*http.Request) (any, error){
		"GetModels": func(*http.Request) (any, error) {
			svc, err := hub.Inventory()
			if err != nil {
				return nil, err
			}
			return svc.Models()
		},
		"GetActiveModel": func(*http.Request) (any, error) {
			svc, err := hub.Inventory()
			if err != nil {
				return nil, err
			}
			return svc.Active()
		},
		"SelectModel": func(r *http.Request) (any, error) {
			svc, err := hub.Inventory()
			if err != nil {
				return nil, err
			}
			return svc.Select(r.URL.Query().Get("name"))
		},
		"GetTeachSpec": func(*http.Request) (any, error) {
			svc, err := hub.Inventory()
			if err != nil {
				return nil, err
			}
			return svc.Teach()
		},
		"GetNodeAnalysis": func(r *http.Request) (any, error) {
			svc, err := hub.Inventory()
			if err != nil {
				return nil, err
			}
			return svc.Analysis(r.URL.Query().Get("id"))
		},
		"GetAlignView": func(*http.Request) (any, error) {
			svc, err := hub.Inventory()
			if err != nil {
				return nil, err
			}
			return svc.AlignView()
		},
		"SaveAlignRois": func(r *http.Request) (any, error) {
			if r.Method != http.MethodPost {
				return nil, errMethodNotAllowed
			}
			var rois []inventory.AlignRoi
			if err := json.NewDecoder(r.Body).Decode(&rois); err != nil {
				return nil, &statusError{code: http.StatusBadRequest, msg: err.Error()}
			}
			svc, err := hub.Inventory()
			if err != nil {
				return nil, err
			}
			return svc.SaveAlignRois(rois)
		},
		"ResetAlignRois": func(r *http.Request) (any, error) {
			if r.Method != http.MethodPost {
				return nil, errMethodNotAllowed
			}
			svc, err := hub.Inventory()
			if err != nil {
				return nil, err
			}
			return svc.ResetAlignRois()
		},
		"GetConnector": func(*http.Request) (any, error) {
			return hub.Config(), nil
		},
		"CheckMachinePath": func(r *http.Request) (any, error) {
			return connector.Check(r.URL.Query().Get("path")), nil
		},
		"SaveConnector": func(r *http.Request) (any, error) {
			if r.Method != http.MethodPost {
				return nil, errMethodNotAllowed
			}
			var in connector.SaveInput
			if err := json.NewDecoder(r.Body).Decode(&in); err != nil {
				return nil, &statusError{code: http.StatusBadRequest, msg: err.Error()}
			}
			return hub.Save(in)
		},
		"PickFolder": func(*http.Request) (any, error) {
			return nil, fmt.Errorf("the folder dialog is only available in the app window")
		},
	}

	return func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Access-Control-Allow-Origin", "*")
		if r.Method == http.MethodOptions {
			w.Header().Set("Access-Control-Allow-Methods", "GET, POST, OPTIONS")
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
		result, err := handler(r)
		if err != nil {
			if errors.Is(err, errMethodNotAllowed) {
				writeJSON(w, http.StatusMethodNotAllowed, map[string]string{"error": "POST required"})
				return
			}
			var se *statusError
			if errors.As(err, &se) {
				writeJSON(w, se.code, map[string]string{"error": se.msg})
				return
			}
			writeJSON(w, http.StatusInternalServerError, map[string]string{"error": err.Error()})
			return
		}
		writeJSON(w, http.StatusOK, result)
	}
}

// errMethodNotAllowed signals a handler that only accepts a different HTTP method.
var errMethodNotAllowed = errors.New("method not allowed")

// statusError is a handler error with a specific HTTP status code.
type statusError struct {
	code int
	msg  string
}

// Error implements the error interface.
func (e *statusError) Error() string { return e.msg }

// writeJSON encodes v as JSON with the given status code.
func writeJSON(w http.ResponseWriter, status int, v any) {
	w.Header().Set("Content-Type", "application/json; charset=utf-8")
	w.WriteHeader(status)
	if err := json.NewEncoder(w).Encode(v); err != nil {
		fmt.Fprintf(w, "{\"error\":%q}", err.Error())
	}
}
