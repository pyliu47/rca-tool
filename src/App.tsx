// src/App.tsx
import React from "react";
import type { Diagram, CauseTemplate } from "./types";
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

const templates: CauseTemplate[] = [
  { id: "t1", label: "High staff turnover" },
  { id: "t2", label: "Limited CHW availability" },
  { id: "t3", label: "Unreliable microplanning" },
  { id: "t4", label: "Supply stockouts" },
  { id: "t5", label: "Poor supervision" },
];

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

const App: React.FC = () => {
  const [diagram, setDiagram] = React.useState<Diagram>(createInitialDiagram);

  // Which node is selected (for highlighting, cause bank insert, notes)
  const [selectedNodeId, setSelectedNodeId] = React.useState<string | null>(
    null
  );

  // Which category is the root of the RCA tree
  const [focusNodeId, setFocusNodeId] = React.useState<string | null>(null);

  // Notes keyed by node ID
  const [notesByNode, setNotesByNode] = React.useState<Record<string, string>>(
    {}
  );

  const isCategory = (id: string | null): boolean => {
    if (!id) return false;
    return diagram.root.children.some((child) => child.id === id);
  };

  const handleSelectNode = (id: string) => {
    setSelectedNodeId(id);
    // If you click a category (top-level child of root), it becomes RCA root
    if (isCategory(id)) {
      setFocusNodeId(id);
    }
  };

  const updateRoot = (fn: (root: any) => any) => {
    setDiagram((prev) => ({ ...prev, root: fn(prev.root) }));
  };

  const addCategory = () => {
    updateRoot((root) => ({
      ...root,
      children: [...root.children, createNode("New category")],
    }));
  };

  const addCause = (categoryId: string) => {
    updateRoot((root) => addChildNode(root, categoryId, "New cause"));
  };

  const addWhy = (parentId: string) => {
    updateRoot((root) => addChildNode(root, parentId, "Why?"));
  };

  const deleteNodeById = (id: string) => {
    updateRoot((root) => deleteNode(root, id));
    if (selectedNodeId === id) setSelectedNodeId(null);
    if (focusNodeId === id) setFocusNodeId(null);

    // Remove notes for the deleted node (optional; keep if you want history)
    setNotesByNode((prev) => {
      const copy = { ...prev };
      delete copy[id];
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
    setNotesByNode((prev) => ({
      ...prev,
      [selectedNodeId]: text,
    }));
  };

  const currentNote =
    selectedNodeId && notesByNode[selectedNodeId]
      ? notesByNode[selectedNodeId]
      : "";

  return (
    <div className="app-root">
      {/* Header */}
      <header className="app-header">
        <input
          className="title-input"
          value={diagram.title}
          onChange={(e) =>
            setDiagram((prev) => ({ ...prev, title: e.target.value }))
          }
        />
        <button
          className="secondary-btn"
          onClick={() => {
            const blob = new Blob(
              [JSON.stringify({ diagram, notesByNode }, null, 2)],
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

      {/* Three-column main: Fishbone | RCA Tree | Notes */}
      <main className="app-main">
        <FishboneView
          root={diagram.root}
          selectedNodeId={selectedNodeId}
          onSelect={handleSelectNode}
          onAddCategory={addCategory}
          onAddCause={addCause}
          onLabelChange={changeLabel}
          onDelete={deleteNodeById}
        />

        <RCATreeView
          root={diagram.root}
          focusNodeId={focusNodeId}
          selectedNodeId={selectedNodeId}
          onSelect={handleSelectNode}
          onAddChild={addWhy}
          onDelete={deleteNodeById}
          onLabelChange={changeLabel}
        />

        <NotesPane
          root={diagram.root}
          selectedNodeId={selectedNodeId}
          noteText={currentNote}
          onChangeNote={handleChangeNote}
        />
      </main>

      {/* Cause bank footer */}
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