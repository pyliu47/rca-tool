// src/CausesPane.tsx
import React from "react";
import type { RCANode } from "./types";
import { AlertCircle } from "lucide-react";

interface CausesPaneProps {
    root: RCANode;
    selectedCauseIds: string[];
    onToggleCause: (id: string) => void;
}

export const CausesPane: React.FC<CausesPaneProps> = ({
    root,
    selectedCauseIds,
    onToggleCause,
}) => {
    const categories = root.children;

    const isSelected = (id: string) => selectedCauseIds.includes(id);

    return (
        <div className="pane" style={{ flex: 1, minWidth: 0 }}>
            <div className="pane-header">
                <span className="pane-title">
                    <AlertCircle size={16} />
                    Causes
                </span>
                {selectedCauseIds.length > 0 && (
                    <span style={{ fontSize: 11, color: "#64748b" }}>
                        {selectedCauseIds.length} selected
                    </span>
                )}
            </div>
            <div className="pane-body" style={{ overflowY: "auto", padding: 8 }}>
                {categories.length === 0 && (
                    <div style={{ fontSize: 13, color: "#94a3b8" }}>
                        Add categories and causes in the Root Cause Analysis tab to see
                        them here.
                    </div>
                )}

                {categories.map((cat) => (
                    <div key={cat.id} style={{ marginBottom: 12 }}>
                        <div
                            style={{
                                fontSize: 12,
                                fontWeight: 600,
                                color: "#475569",
                                marginBottom: 4,
                            }}
                        >
                            {cat.label}
                        </div>
                        {cat.children.length === 0 && (
                            <div
                                style={{
                                    fontSize: 12,
                                    color: "#9ca3af",
                                    marginLeft: 4,
                                    fontStyle: "italic",
                                }}
                            >
                                No causes yet
                            </div>
                        )}
                        {cat.children.map((cause) => (
                            <label
                                key={cause.id}
                                style={{
                                    display: "flex",
                                    alignItems: "center",
                                    gap: 6,
                                    fontSize: 12,
                                    padding: "3px 4px",
                                    borderRadius: 6,
                                    cursor: "pointer",
                                    backgroundColor: isSelected(cause.id)
                                        ? "#dbeafe"
                                        : "transparent",
                                }}
                            >
                                <input
                                    type="checkbox"
                                    checked={isSelected(cause.id)}
                                    onChange={() => onToggleCause(cause.id)}
                                />
                                <span>{cause.label}</span>
                            </label>
                        ))}
                    </div>
                ))}
            </div>
        </div>
    );
};