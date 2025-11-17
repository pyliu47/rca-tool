// src/App.tsx
import React from "react";
import type { Diagram, RCANode, PriorityLevel } from "./types";
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
   1. Default Cause Bank
----------------------------------------------------*/

const templates = [
  { id: "t1", label: "High staff turnover" },
  { id: "t2", label: "Limited CHW availability" },
  { id: "t3", label: "Unreliable microplanning" },
  { id: "t4", label: "Supply stockouts" },
  { id: "t5", label: "Poor supervision" },
];

/* ---------------------------------------------------
   2. Initial Diagram Setup
----------------------------------------------------*/

const createInitialDiagram = (): Diagram => ({
  id: "diag-1",
  title: "New RCA Diagram",
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
  inputs: [],
  activities: [],
  outputs: [],
  outcomes: [],
  assumptions: {
    inputs: [],
    activities: [],
    outputs: [],
    outcomes: [],
  },
  risks: "",
  gender: "none",
  genderNotes: "",
  actors: [],
  evidence: [],
  priority: "none",
});

/* ---------------------------------------------------
   4. App Component
----------------------------------------------------*/

const App: React.FC = () => {
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
  const [tocBundles, setTocBundles] = React.useState<Record<string, TocBundle>>(
    {}
  );
  const [activeBundleId, setActiveBundleId] = React.useState<string | null>(
    null
  );
  // Keep an explicit order for the toc bundles so we can reorder them in the UI
  const [tocOrder, setTocOrder] = React.useState<string[]>([]);

  /* ---------------------------------------------------
     RCA Helpers
  ----------------------------------------------------*/

  const isCategory = (id: string | null): boolean => {
    if (!id) return false;
    return diagram.root.children.some((child) => child.id === id);
  };

  const handleSelectNode = (id: string) => {
    setSelectedNodeId(id);
    if (isCategory(id)) {
      setFocusNodeId(id);
    }
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
            />

            <RCATreeView
              root={diagram.root}
              focusNodeId={focusNodeId}
              selectedNodeId={selectedNodeId}
              onAddChild={addWhy}
              onDelete={deleteNodeById}
              onLabelChange={changeLabel}
              priorityByNode={priorityByNode}
            />

            <NotesPane
              root={diagram.root}
              selectedNodeId={selectedNodeId}
              noteText={currentNote}
              onChangeNote={handleChangeNote}
              priority={currentPriority}
              onChangePriority={handleChangePriority}
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