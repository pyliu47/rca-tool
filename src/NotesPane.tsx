// src/NotesPane.tsx
import React from "react";
import type { RCANode } from "./types";
import { findNode } from "./utils";

interface Props {
    root: RCANode;
    selectedNodeId: string | null;
    noteText: string;
    onChangeNote: (text: string) => void;
}

export const NotesPane: React.FC<Props> = ({
    root,
    selectedNodeId,
    noteText,
    onChangeNote,
}) => {
    const node = selectedNodeId ? findNode(root, selectedNodeId) : null;

    return (
        <div className="pane pane-narrow">
            <div className="pane-header">
                <span className="pane-title">Change Log</span>
                {node && (
                    <span style={{ fontSize: 11, color: "#4b5563" }}>
                        For: <strong>{node.label}</strong>
                    </span>
                )}
            </div>

            <div className="pane-body">
                {!node ? (
                    <div
                        style={{
                            width: "100%",
                            height: "100%",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            color: "#9ca3af",
                            fontSize: 13,
                        }}
                    >
                        Select a cause in the RCA tree to add notes
                    </div>
                ) : (
                    <textarea
                        className="notes-textarea"
                        placeholder="Write notes about this cause here (e.g., history, changes over time, hypotheses, decisions, etc.)"
                        value={noteText}
                        onChange={(e) => onChangeNote(e.target.value)}
                    />
                )}
            </div>
        </div>
    );
};