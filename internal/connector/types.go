// Package connector keeps which of the three hosts (FM1, FM2, BM) the application reads and where
// each host's data folder is. The choice lives in a small JSON file in the user's configuration
// directory (the local "database"); nothing is read from environment variables.
package connector

// Machines are the hosts of the Connector dialog, in the order the dialog shows them.
var Machines = []string{"FM1", "FM2", "BM"}

// The status of one host in a Config.
const (
	// StatusUnset: no folder is stored for the host.
	StatusUnset = "unset"
	// StatusOK: the folder exists and directly contains PxInventory and PxRepository.
	StatusOK = "ok"
	// StatusInvalid: a folder is stored but the check fails (moved, deleted, wrong folder).
	StatusInvalid = "invalid"
)

// PathCheck is the result of checking one folder: it must be an absolute path to a directory that
// directly contains the directories PxInventory and PxRepository.
type PathCheck struct {
	OK bool `json:"ok"`
	// Message says what is wrong; empty when OK. One of: "path is empty", "path must be absolute",
	// "folder not found", "not a folder", "PxInventory is missing", "PxRepository is missing",
	// "PxInventory and PxRepository are missing".
	Message string `json:"message"`
}

// Machine is one host as the dialog shows it.
type Machine struct {
	// ID is one of Machines.
	ID string `json:"id"`
	// Path is the stored folder, "" when none.
	Path string `json:"path"`
	// Status is StatusUnset, StatusOK or StatusInvalid; it is checked again on every Config call.
	Status string `json:"status"`
	// Message is the PathCheck message when Status is StatusInvalid, otherwise "".
	Message string `json:"message"`
}

// Config is the state of the Connector dialog.
type Config struct {
	// Machines always has the three hosts of Machines, in that order.
	Machines []Machine `json:"machines"`
	// Active is the host the application reads its models and inventory from; "" when none is
	// configured yet.
	Active string `json:"active"`
}

// MachinePath is one folder the dialog applies.
type MachinePath struct {
	ID   string `json:"id"`
	Path string `json:"path"`
}

// SaveInput is what the dialog applies: the folders (an empty path clears a host) and the host to
// read from. Hosts missing from Machines keep the stored folder.
type SaveInput struct {
	Machines []MachinePath `json:"machines"`
	Active   string        `json:"active"`
}
