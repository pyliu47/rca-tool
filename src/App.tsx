// src/App.tsx
import React from "react";
import type { Diagram, CauseTemplate, RCANode, PriorityLevel } from "./types";
import { createNode, addChildNode, deleteNode, renameNode } from "./utils";

import { FishboneView } from "./FishboneView";
import { RCATreeView } from "./RCATreeView";
import { CauseBank } from "./CauseBank";
import { NotesPane } from "./NotesPane";

/* ---------------------------------------------------
   1. Default Cause Bank
----------------------------------------------------*/

const templates: CauseTemplate[] = [
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
   3. App Component
----------------------------------------------------*/

const App: React.FC = () => {
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

  /* ---------------------------------------------------
     Helpers
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
     Diagram Modification
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
        setSelectedNodeId(null);
        setFocusNodeId(null);
      } catch (err) {
        alert("Failed to import JSON: " + err);
      }
    };
    reader.readAsText(file);
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
          onClick={() => document.getElementById("import-json-input")?.click()}
        >
          Import JSON
        </button>

        <button
          className="secondary-btn"
          onClick={() => {
            const blob = new Blob(
              [
                JSON.stringify(
                  { diagram, notesByNode, priorityByNode },
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
          }}
        >
          Export JSON
        </button>
      </header>

      {/* MAIN THREE-PANE LAYOUT */}
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
        />

        <RCATreeView
          root={diagram.root}
          focusNodeId={focusNodeId}
          selectedNodeId={selectedNodeId}
          onSelect={handleSelectNode}
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

      {/* CAUSE BANK */}
      <footer className="app-footer">
        <CauseBank
          templates={templates}
          onInsertUnderSelected={insertFromBank}
        />
      </footer>
    </div>
  );
};

export default App;