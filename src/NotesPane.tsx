// src/NotesPane.tsx
import React from "react";
import type { RCANode, PriorityLevel } from "./types";
import { findNode } from "./utils";

interface Props {
    root: RCANode;
    selectedNodeId: string | null;
    noteText: string;
    onChangeNote: (text: string) => void;

    priority: PriorityLevel;
    onChangePriority: (level: PriorityLevel) => void;
}

export const NotesPane: React.FC<Props> = ({
    root,
    selectedNodeId,
    noteText,
    onChangeNote,
    priority,
    onChangePriority,
}) => {
    const node = selectedNodeId ? findNode(root, selectedNodeId) : null;

    return (
        <div className="pane pane-narrow">
            <div className="pane-header">
                <span className="pane-title">Changelog</span>
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
                            textAlign: "center",
                            padding: 8,
                        }}
                    >
                        Select a cause or node in the RCA tree to view its changelog and
                        priority
                    </div>
                ) : (
                    <div
                        style={{
                            display: "flex",
                            flexDirection: "column",
                            height: "100%",
                            gap: 6,
                        }}
                    >
                        {/* Priority controls */}
                        <div
                            style={{
                                display: "flex",
                                gap: 6,
                                alignItems: "center",
                                flexWrap: "wrap",
                            }}
                        >
                            <span style={{ fontSize: 11, color: "#4b5563" }}>
                                Priority:
                            </span>
                            <PriorityChip
                                label="Low"
                                level="low"
                                current={priority}
                                onClick={onChangePriority}
                            />
                            <PriorityChip
                                label="Med"
                                level="medium"
                                current={priority}
                                onClick={onChangePriority}
                            />
                            <PriorityChip
                                label="High"
                                level="high"
                                current={priority}
                                onClick={onChangePriority}
                            />
                            <button
                                className="small-btn"
                                style={{ marginLeft: "auto", fontSize: 10 }}
                                onClick={() => onChangePriority("none")}
                            >
                                Clear
                            </button>
                        </div>

                        {/* Notes textarea */}
                        <textarea
                            className="notes-textarea"
                            placeholder="Write notes about this cause (e.g., what changed, when, decisions taken, etc.)"
                            value={noteText}
                            onChange={(e) => onChangeNote(e.target.value)}
                        />
                    </div>
                )}
            </div>
        </div>
    );
};

const PriorityChip: React.FC<{
    label: string;
    level: PriorityLevel;
    current: PriorityLevel;
    onClick: (level: PriorityLevel) => void;
}> = ({ label, level, current, onClick }) => {
    const isActive = current === level;

    const colors: Record<PriorityLevel, { bg: string; border: string }> = {
        high: { bg: "#fee2e2", border: "#b91c1c" },
        medium: { bg: "#fef3c7", border: "#f59e0b" },
        low: { bg: "#ecfdf3", border: "#16a34a" },
        none: { bg: "#f3f4f6", border: "#d1d5db" },
    };

    const { bg, border } = colors[level];

    return (
        <button
            type="button"
            onClick={() => onClick(level)}
            style={{
                fontSize: 10,
                padding: "2px 8px",
                borderRadius: 999,
                border: `1px solid ${isActive ? border : "#d1d5db"}`,
                background: isActive ? bg : "#ffffff",
                cursor: "pointer",
            }}
        >
            {label}
        </button>
    );
};