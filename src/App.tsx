// src/App.tsx
import React from "react";
import type { Diagram, RCANode, PriorityLevel, Persona } from "./types";
import {
  createNode,
  addChildNode,
  deleteNode,
  renameNode,
} from "./utils";

import { FishboneView } from "./FishboneView";
import { RCATreeView } from "./RCATreeView";
import { CauseBank } from "./CauseBank";
import { NotesPane } from "./NotesPane";
import InterventionLayout from "./InterventionLayout";

import type { TocBundle } from "./tocTypes";

/* ---------------------------------------------------
   0. Color Palette for Personas (12 colors)
----------------------------------------------------*/

const PERSONA_COLORS = [
  "#fce7f3", // pink
  "#dbeafe", // blue
  "#dcfce7", // green
  "#fef3c7", // yellow
  "#e9d5ff", // purple
  "#fed7aa", // orange
  "#cffafe", // cyan
  "#f5d4d4", // red-ish
  "#dbeafe", // light blue
  "#fce7f3", // light pink
  "#d1fae5", // teal
  "#fef08a", // lime
];

/* ---------------------------------------------------
   1. Default Personas (Health Sector)
----------------------------------------------------*/

const defaultPersonas: Persona[] = [
  { id: "p1", name: "Mother/Caregiver", color: PERSONA_COLORS[0] },
  { id: "p2", name: "Community Health Worker", color: PERSONA_COLORS[1] },
  { id: "p3", name: "Community Leader", color: PERSONA_COLORS[2] },
  { id: "p4", name: "Health Facility Manager", color: PERSONA_COLORS[3] },
  { id: "p5", name: "Supply Chain Manager", color: PERSONA_COLORS[4] },
];

/* ---------------------------------------------------
   2. Default Cause Bank
----------------------------------------------------*/

const templates = [
  { id: "t1", label: "High staff turnover" },
  { id: "t2", label: "Limited CHW availability" },
  { id: "t3", label: "Unreliable microplanning" },
  { id: "t4", label: "Supply stockouts" },
  { id: "t5", label: "Poor supervision" },
];

/* ---------------------------------------------------
   3. Initial Diagram Setup
----------------------------------------------------*/

const createInitialDiagram = (): Diagram => ({
  id: "diag-1",
  title: "New RCA Diagram",
  personas: defaultPersonas,
  root: {
    id: "root",
    label: "Describe the problem",
    children: [
      {
        ...createNode("Workforce"),
        children: [
          createNode("High staff turnover"),
          createNode("Limited CHW availability"),
        ],
      },
      {
        ...createNode("Supply"),
        children: [createNode("Cold chain stockouts")],
      },
      {
        ...createNode("Planning"),
        children: [createNode("Unreliable microplanning")],
      },
    ],
  },
});

/* ---------------------------------------------------
   3. Create Empty ToC Bundle
----------------------------------------------------*/

const createEmptyBundle = (id: string): TocBundle => ({
  id,
  name: "",
  description: "",
  causeIds: [],
  activities: [],
  outcomes: [],
  risks: "",
  gender: "none",
  genderNotes: "",
  actors: [],
  dataSources: [],
  evidence: [],
  priority: "none",
});

const createDefaultColdChainBundle = (id: string, coldChainCauseId: string): TocBundle => ({
  id,
  name: "Improve Cold Chain Management",
  description: "A comprehensive intervention to address cold chain stockouts through improved inventory management and equipment maintenance.",
  causeIds: coldChainCauseId ? [coldChainCauseId] : [],
  activities: [
    {
      id: "act-1",
      label: "Conduct cold chain audit and gap analysis",
      description: "Perform comprehensive audit to identify gaps in cold chain operations",
      actors: ["Supply Chain Manager", "Facility In-Charge"],
      inputIds: [],
      outputIds: [],
      assumptionIds: [],
      inputs: [
        { id: "in-1-1", label: "Audit tools and templates", notes: "" },
        { id: "in-1-2", label: "Staff time", notes: "" },
      ],
      outputs: [
        { id: "out-1-1", label: "Audit report with findings", notes: "" },
      ],
      assumptions: [
        { id: "as-1-1", label: "Staff availability to participate in audit" },
      ],
    },
    {
      id: "act-2",
      label: "Implement preventive maintenance schedule",
      description: "Establish and enforce regular maintenance schedule for equipment",
      actors: ["Equipment Technician", "Facility Staff"],
      inputIds: [],
      outputIds: [],
      assumptionIds: [],
      inputs: [
        { id: "in-2-1", label: "Equipment manuals", notes: "" },
        { id: "in-2-2", label: "Maintenance supplies", notes: "" },
      ],
      outputs: [
        { id: "out-2-1", label: "Maintenance schedule and log system", notes: "" },
      ],
      assumptions: [
        { id: "as-2-1", label: "Technicians will consistently follow the maintenance schedule" },
      ],
    },
    {
      id: "act-3",
      label: "Train staff on inventory management",
      description: "Conduct training sessions for facility staff",
      actors: ["Health Officer", "Facility Staff"],
      inputIds: [],
      outputIds: [],
      assumptionIds: [],
      inputs: [
        { id: "in-3-1", label: "Training curriculum", notes: "" },
      ],
      outputs: [
        { id: "out-3-1", label: "Staff trained", notes: "" },
      ],
      assumptions: [
        { id: "as-3-1", label: "Staff will apply training knowledge" },
      ],
    },
  ],
  outcomes: [
    {
      id: "out-1",
      label: "Improved vaccine availability",
      description: "",
      tier: 3,
      contributingActivityIds: ["act-1"],
      indicators: [
        { id: "ind-1-1", label: "% of facilities with adequate stock", type: "quantitative", sourceIds: ["ds-0", "ds-1"] },
      ],
    },
    {
      id: "out-2",
      label: "Reduced product wastage",
      description: "",
      tier: 3,
      contributingActivityIds: ["act-2"],
      indicators: [
        { id: "ind-2-1", label: "Vaccine waste reduction rate", type: "quantitative", sourceIds: ["ds-2"] },
      ],
    },
    {
      id: "out-3",
      label: "Staff confidence in cold chain management",
      description: "",
      tier: 2,
      contributingActivityIds: ["act-3"],
      indicators: [
        { id: "ind-3-1", label: "Staff confidence level", type: "qualitative", sourceIds: ["ds-3"] },
      ],
    },
  ],
  risks: "Staff resistance to new systems; Supply chain disruptions; Budget constraints",
  gender: "none",
  genderNotes: "",
  actors: ["Supply Chain Manager", "Facility In-Charge", "Equipment Technician", "Facility Staff", "Health Officer"],
  dataSources: [
    "Facility inventory reports",
    "Monthly facility audits",
    "Facility records",
    "Staff survey responses",
  ],
  evidence: [],
  priority: "high",
});

/* ---------------------------------------------------
   4. App Component
----------------------------------------------------*/

const App: React.FC = () => {
  // Active tab state
  const [activeTab, setActiveTab] = React.useState<"rca" | "toc">("rca");

  const [diagram, setDiagram] = React.useState<Diagram>(createInitialDiagram);

  // node selection (fishbone or RCA tree)
  const [selectedNodeId, setSelectedNodeId] = React.useState<string | null>(
    null
  );

  // which category controls the RCA tree
  const [focusNodeId, setFocusNodeId] = React.useState<string | null>(null);

  // Changelog notes per nodeId
  const [notesByNode, setNotesByNode] = React.useState<Record<string, string>>(
    {}
  );

  // Priority per nodeId
  const [priorityByNode, setPriorityByNode] = React.useState<
    Record<string, PriorityLevel>
  >({});

  // ToC bundles (intervention design)
  // Initialize with default supply chain intervention
  const defaultColdChainId = "bundle-cold-chain";

  // Get the cold chain cause ID from the current diagram
  const getColdChainCauseId = (): string => {
    const supplyCategory = diagram.root.children.find(c => c.label === "Supply");
    const supplyCause = supplyCategory?.children.find(c => c.label === "Cold chain stockouts");
    return supplyCause?.id || "";
  };

  const [tocBundles, setTocBundles] = React.useState<Record<string, TocBundle>>(() => {
    return {
      [defaultColdChainId]: createDefaultColdChainBundle(defaultColdChainId, getColdChainCauseId()),
    };
  });
  const [activeBundleId, setActiveBundleId] = React.useState<string | null>(
    defaultColdChainId
  );
  // Keep an explicit order for the toc bundles so we can reorder them in the UI
  const [tocOrder, setTocOrder] = React.useState<string[]>([defaultColdChainId]);

  /* ---------------------------------------------------
     RCA Helpers
  ----------------------------------------------------*/

  const isCategory = (id: string) => {
    return diagram.root.children.some((child) => child.id === id);
  };

  const isDirectCause = (id: string) => {
    // Check if node is a direct child of any category (first-level cause, not sub-cause)
    return diagram.root.children.some((category) =>
      category.children.some((cause) => cause.id === id)
    );
  };

  const handleSelectNode = (id: string) => {
    setSelectedNodeId(id);
    if (isCategory(id)) {
      setFocusNodeId(id);
    } else if (isDirectCause(id)) {
      // Most proximal causes (direct children of category) become tree root
      setFocusNodeId(id);
    }
    // Sub-causes and deeper: don't change focusNodeId
  };

  const handleSelectNodeInRCATree = (id: string) => {
    setSelectedNodeId(id);
    // Don't change focusNodeId - RCA tree selection is independent
  };

  const updateRoot = (fn: (root: RCANode) => RCANode) => {
    setDiagram((prev) => ({ ...prev, root: fn(prev.root) }));
  };

  /* ---------------------------------------------------
     Diagram Modification (RCA)
  ----------------------------------------------------*/

  const addCategory = () => {
    updateRoot((root) => ({
      ...root,
      children: [...root.children, createNode("New category")],
    }));
  };

  const addCause = (categoryId: string) => {
    updateRoot((root) => addChildNode(root, categoryId, "New cause"));
  };

  const addWhy = (nodeId: string) => {
    updateRoot((root) => addChildNode(root, nodeId, "Why?"));
  };

  const deleteNodeById = (nodeId: string) => {
    updateRoot((root) => deleteNode(root, nodeId));

    if (selectedNodeId === nodeId) setSelectedNodeId(null);
    if (focusNodeId === nodeId) setFocusNodeId(null);

    // Remove notes for deleted node
    setNotesByNode((prev) => {
      const copy = { ...prev };
      delete copy[nodeId];
      return copy;
    });

    // Remove priority for deleted node
    setPriorityByNode((prev) => {
      const copy = { ...prev };
      delete copy[nodeId];
      return copy;
    });
  };

  const changeLabel = (id: string, label: string) => {
    updateRoot((root) => renameNode(root, id, label || "Untitled"));
  };

  const reorderCategories = (fromId: string, toId: string) => {
    updateRoot((root) => {
      const fromIdx = root.children.findIndex((cat) => cat.id === fromId);
      const toIdx = root.children.findIndex((cat) => cat.id === toId);
      if (fromIdx === -1 || toIdx === -1) return root;
      const newChildren = [...root.children];
      [newChildren[fromIdx], newChildren[toIdx]] = [newChildren[toIdx], newChildren[fromIdx]];
      return { ...root, children: newChildren };
    });
  };

  const reorderCauses = (categoryId: string, fromId: string, toId: string) => {
    updateRoot((root) => {
      const category = root.children.find((cat) => cat.id === categoryId);
      if (!category) return root;
      const fromIdx = category.children.findIndex((cause) => cause.id === fromId);
      const toIdx = category.children.findIndex((cause) => cause.id === toId);
      if (fromIdx === -1 || toIdx === -1) return root;
      const newCauses = [...category.children];
      [newCauses[fromIdx], newCauses[toIdx]] = [newCauses[toIdx], newCauses[fromIdx]];
      const newChildren = root.children.map((cat) =>
        cat.id === categoryId ? { ...cat, children: newCauses } : cat
      );
      return { ...root, children: newChildren };
    });
  };

  const insertFromBank = (templateId: string) => {
    if (!selectedNodeId) return;
    const t = templates.find((x) => x.id === templateId);
    if (!t) return;

    updateRoot((root) => addChildNode(root, selectedNodeId, t.label));
  };

  const handleChangeNote = (text: string) => {
    if (!selectedNodeId) return;
    setNotesByNode((prev) => ({ ...prev, [selectedNodeId]: text }));
  };

  const handleChangePriority = (level: PriorityLevel) => {
    if (!selectedNodeId) return;
    setPriorityByNode((prev) => ({ ...prev, [selectedNodeId]: level }));
  };

  const currentNote =
    selectedNodeId && notesByNode[selectedNodeId]
      ? notesByNode[selectedNodeId]
      : "";

  const currentPriority: PriorityLevel =
    selectedNodeId && priorityByNode[selectedNodeId]
      ? priorityByNode[selectedNodeId]
      : "none";

  /* ---------------------------------------------------
     ToC Bundles (Intervention Design)
  ----------------------------------------------------*/

  const createNewBundle = () => {
    const id = "toc_" + Math.random().toString(36).slice(2, 9);
    const bundle = createEmptyBundle(id);
    setTocBundles((prev) => ({ ...prev, [id]: bundle }));
    setActiveBundleId(id);
    setTocOrder((prev) => [...prev, id]);
  };

  const updateBundle = (id: string, fn: (b: TocBundle) => TocBundle) => {
    setTocBundles((prev) => ({ ...prev, [id]: fn(prev[id]) }));
  };

  const reorderTocBundles = (fromIndex: number, toIndex: number) => {
    setTocOrder((prev) => {
      const next = [...prev];
      const [moved] = next.splice(fromIndex, 1);
      next.splice(toIndex, 0, moved);
      return next;
    });
  };

  /* ---------------------------------------------------
     JSON Import Logic
  ----------------------------------------------------*/

  const handleImportJSON = (file: File) => {
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const json = JSON.parse(event.target?.result as string);

        if (!json.diagram || !json.diagram.root) {
          alert("Invalid JSON: missing diagram.root");
          return;
        }

        setDiagram(json.diagram);
        setNotesByNode(json.notesByNode || {});
        setPriorityByNode(json.priorityByNode || {});
        setTocBundles(json.tocBundles || {});
        setActiveBundleId(json.activeBundleId || null);
        // initialize toc order from imported bundles (preserve order if present)
        setTocOrder(json.tocOrder || Object.keys(json.tocBundles || {}));
        setSelectedNodeId(null);
        setFocusNodeId(null);
      } catch (err) {
        alert("Failed to import JSON: " + err);
      }
    };
    reader.readAsText(file);
  };

  const handleExportJSON = () => {
    const blob = new Blob(
      [
        JSON.stringify(
          {
            diagram,
            notesByNode,
            priorityByNode,
            tocBundles,
            activeBundleId,
          },
          null,
          2
        ),
      ],
      { type: "application/json" }
    );
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${diagram.title}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  /* ---------------------------------------------------
     Rendering
  ----------------------------------------------------*/

  return (
    <div className="app-root">
      {/* HEADER */}
      <header className="app-header">
        <input
          className="title-input"
          value={diagram.title}
          onChange={(e) =>
            setDiagram((prev) => ({ ...prev, title: e.target.value }))
          }
        />

        {/* Hidden input for JSON import */}
        <input
          type="file"
          accept="application/json"
          id="import-json-input"
          style={{ display: "none" }}
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) handleImportJSON(file);
          }}
        />

        <button
          className="secondary-btn"
          onClick={() =>
            document.getElementById("import-json-input")?.click()
          }
        >
          Import JSON
        </button>

        <button className="secondary-btn" onClick={handleExportJSON}>
          Export JSON
        </button>
      </header>

      {/* TAB STRIP */}
      <div className="tab-strip">
        <span
          className={activeTab === "rca" ? "tab active" : "tab"}
          onClick={() => setActiveTab("rca")}
        >
          Root Cause Analysis
        </span>
        <span
          className={activeTab === "toc" ? "tab active" : "tab"}
          onClick={() => setActiveTab("toc")}
        >
          Intervention Design
        </span>
      </div>

      {/* MAIN LAYOUT */}
      {activeTab === "rca" ? (
        <>
          <main className="app-main">
            <FishboneView
              root={diagram.root}
              selectedNodeId={selectedNodeId}
              onSelect={handleSelectNode}
              onAddCategory={addCategory}
              onAddCause={addCause}
              onLabelChange={changeLabel}
              onDelete={deleteNodeById}
              priorityByNode={priorityByNode}
              onReorderCategories={reorderCategories}
              onReorderCauses={reorderCauses}
              personas={diagram.personas || []}
            />

            <RCATreeView
              root={diagram.root}
              focusNodeId={focusNodeId}
              selectedNodeId={selectedNodeId}
              onSelect={handleSelectNodeInRCATree}
              onAddChild={addWhy}
              onDelete={deleteNodeById}
              onLabelChange={changeLabel}
              priorityByNode={priorityByNode}
              personas={diagram.personas || []}
              onUpdateNodePersonas={(nodeId, personaIds) => {
                const updateNodePersonas = (node: RCANode): RCANode => {
                  if (node.id === nodeId) {
                    return { ...node, personaIds };
                  }
                  return {
                    ...node,
                    children: node.children.map(updateNodePersonas),
                  };
                };
                setDiagram((prev) => ({
                  ...prev,
                  root: updateNodePersonas(prev.root),
                }));
              }}
              onUpdatePersonas={(personas) => {
                setDiagram((prev) => ({ ...prev, personas }));
              }}
              personaColors={PERSONA_COLORS}
            />

            <NotesPane
              root={diagram.root}
              selectedNodeId={selectedNodeId}
              noteText={currentNote}
              onChangeNote={handleChangeNote}
              priority={currentPriority}
              onChangePriority={handleChangePriority}
              personas={diagram.personas || []}
              onUpdatePersonas={(personas) => {
                setDiagram((prev) => ({
                  ...prev,
                  personas,
                }));
              }}
              onUpdateNodePersonas={(nodeId, personaIds) => {
                const updateNodePersonas = (node: RCANode): RCANode => {
                  if (node.id === nodeId) {
                    return { ...node, personaIds };
                  }
                  return {
                    ...node,
                    children: node.children.map(updateNodePersonas),
                  };
                };
                setDiagram((prev) => ({
                  ...prev,
                  root: updateNodePersonas(prev.root),
                }));
              }}
              personaColors={PERSONA_COLORS}
            />
          </main>

          <footer className="app-footer">
            <CauseBank
              templates={templates}
              onInsertUnderSelected={insertFromBank}
            />
          </footer>
        </>
      ) : (
        <InterventionLayout
          root={diagram.root}
          tocBundles={tocBundles}
          tocOrder={tocOrder}
          reorderTocBundles={reorderTocBundles}
          activeBundleId={activeBundleId}
          setActiveBundleId={setActiveBundleId}
          createNewBundle={createNewBundle}
          updateBundle={updateBundle}
        />
      )}
    </div>
  );
};

export default App;