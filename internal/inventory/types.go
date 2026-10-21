package inventory

// The JSON shapes of this file are the contract with the frontend: every type mirrors a type of
// frontend/src/api/types.ts (same field names through the json tags). Slices are never nil, so
// that they encode as [] and never as null (see TestNoNullInJSON).

// ModelEntry is one row of the "Choose Model Names" dialog (ModelEntry in api/types.ts).
type ModelEntry struct {
	// Index is the 1-based row number, zero padded to two digits: "01".
	Index string `json:"index"`
	// Created is the modification time of the model folder: "2026-05-04 11:28:12".
	Created string `json:"created"`
	// Name is the folder name under PxInventory/INSPECT_SPEC: "6ST2001Q01-00".
	Name string `json:"name"`
	// State is "Load" for the model that is loaded and empty for every other one.
	State      string `json:"state"`
	Resolution string `json:"resolution"`
}

// ActiveModel is the model the UI works with (ActiveModel in api/types.ts).
type ActiveModel struct {
	// Name is the folder name under INSPECT_SPEC: "6ST2001Q01-00".
	Name string `json:"name"`
	// Base is Name without the revision suffix: "6ST2001Q01".
	Base       string `json:"base"`
	Resolution string `json:"resolution"`
	// Surface is "Top" or "Bottom" (SystemList.xml, subsystem Surface 0 / 1).
	Surface string `json:"surface"`
}

// SpecNode is one chip of the specification tree (SpecNode in api/types.ts).
type SpecNode struct {
	// ID is "u-p3" for a parent node and "u-p3-c22" for a child (u: Unit, d: Dummy).
	ID string `json:"id"`
	// Name comes from SpecTreeNode.xml.
	Name string `json:"name"`
	// Tone is one of root, gold, green, silver, violet (the nearest SpecTone to the Color
	// attribute of SpecTreeNode.xml).
	Tone string `json:"tone"`
	// Checked is nil for the nodes without a checkbox (Align / ROI and its children), else the
	// NodeCheck of Light-2.
	Checked *bool `json:"checked,omitempty"`
	// LightChecked is the NodeCheck of Light-1, Light-2 and Light-3, in that order; omitted when
	// Checked is nil.
	LightChecked []bool `json:"lightChecked,omitempty"`
	// Align is "metal", "sr" or "dmg" for the children 10, 11 and 12 of Align / ROI.
	Align    string     `json:"align,omitempty"`
	Children []SpecNode `json:"children,omitempty"`
}

// AlignLine is one "Light : n  Channel : Red" line of the Specification panel.
type AlignLine struct {
	Light   int    `json:"light"`
	Channel string `json:"channel"`
}

// Overlay holds the four Overlay check boxes. They are screen state, no XML file has them.
type Overlay struct {
	MK bool `json:"mk"`
	AC bool `json:"ac"`
	IC bool `json:"ic"`
	SK bool `json:"sk"`
}

// SpecSet is the Specification panel of one tab: Unit or Dummy (SpecSet in api/types.ts).
type SpecSet struct {
	GlobalAlign []AlignLine `json:"globalAlign"`
	SrAlign     []AlignLine `json:"srAlign"`
	Overlay     Overlay     `json:"overlay"`
	Tree        []SpecNode  `json:"tree"`
}

// TeachSpec is what GetTeachSpec returns. The pictures of the Align / ROI nodes are not part of
// it: the frontend adds them (TeachSnapshot.alignImages).
type TeachSpec struct {
	Unit  SpecSet `json:"unit"`
	Dummy SpecSet `json:"dummy"`
}

// AnalysisRow is one row of the analysis tables (AnalysisRow in api/types.ts).
type AnalysisRow struct {
	No   int    `json:"no"`
	Name string `json:"name"`
	// Value is a bool for a switch row (ControlType 1) and the number printed with three
	// decimals ("-2.000") for every other row.
	Value any `json:"value"`
	// Min is only set in the channel table.
	Min string `json:"min,omitempty"`
	// Tone is "green", "yellow" or "plain".
	Tone string `json:"tone"`
}

// LightAnalysis is what the three tables show for one Light tab (LightAnalysis in api/types.ts).
type LightAnalysis struct {
	Upper []AnalysisRow `json:"upper"`
	Lower []AnalysisRow `json:"lower"`
	// Channels has the keys "red", "green" and "blue".
	Channels map[string][]AnalysisRow `json:"channels"`
}

// NodeAnalysis is the analysis of one node by Light tab; the keys are "1", "2" and "3".
type NodeAnalysis map[string]LightAnalysis
