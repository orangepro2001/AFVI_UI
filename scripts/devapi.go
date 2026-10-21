//go:build ignore

// devapi.go - development HTTP server that serves the Go inventory parser to the browser.
// Run: go run scripts/devapi.go [-addr 127.0.0.1:8099] [-config <file>]
// The host folders are configured in the Connector dialog of the app; the browser uses the same
// configuration through ?api=http://127.0.0.1:8099.
package main

import (
	"encoding/json"
	"errors"
	"flag"
	"fmt"
	"log"
	"net/http"

	"afvi/ui/internal/connector"
)

func main() {
	addr := flag.String("addr", "127.0.0.1:8099", "listen address")
	cfgFile := flag.String("config", "", "connector config file; empty = the default in the user config dir")
	flag.Parse()

	file := *cfgFile
	if file == "" {
		def, err := connector.DefaultFile()
		if err != nil {
			log.Fatalf("connector config file: %v", err)
		}
		file = def
	}
	hub := connector.NewHub(connector.NewStore(file))

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
