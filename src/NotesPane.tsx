// src/NotesPane.tsx
import React from "react";
import type { RCANode, PriorityLevel, Persona } from "./types";
import { findNode } from "./utils";
import { ClipboardList } from "lucide-react";

interface Props {
    root: RCANode;
    selectedNodeId: string | null;
    noteText: string;
    onChangeNote: (text: string) => void;

    priority: PriorityLevel;
    onChangePriority: (level: PriorityLevel) => void;

    personas: Persona[];
    onUpdatePersonas: (personas: Persona[]) => void;
    onUpdateNodePersonas: (nodeId: string, personaIds: string[]) => void;
    personaColors?: string[];
}

export const NotesPane: React.FC<Props> = ({
    root,
    selectedNodeId,
    noteText,
    onChangeNote,
    priority,
    onChangePriority,
    personas,
    onUpdatePersonas,
    onUpdateNodePersonas,
    personaColors = [
        "#f472b6", // darker pink
        "#0ea5e9", // darker blue
        "#10b981", // darker green
        "#eab308", // darker yellow
        "#a855f7", // darker purple
        "#f97316", // darker orange
        "#06b6d4", // darker cyan
        "#ef4444", // darker red
        "#3b82f6", // darker blue
        "#ec4899", // darker pink
        "#14b8a6", // darker teal
        "#84cc16", // darker lime
    ],
}) => {
    const node = selectedNodeId ? findNode(root, selectedNodeId) : null;
    const [personaDraft, setPersonaDraft] = React.useState("");
    const [dropdownOpen, setDropdownOpen] = React.useState(false);
    const [addingNewPersona, setAddingNewPersona] = React.useState(false);
    const [deletingPersonaId, setDeletingPersonaId] = React.useState<string | null>(null);
    const dropdownRef = React.useRef<HTMLDivElement>(null);

    // Close dropdown when clicking outside
    React.useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setDropdownOpen(false);
            }
        };

        if (dropdownOpen) {
            document.addEventListener("mousedown", handleClickOutside);
            return () => document.removeEventListener("mousedown", handleClickOutside);
        }
    }, [dropdownOpen]);

    const handleAddPersona = (name: string) => {
        if (name.trim() && node) {
            const colorIndex = personas.length % personaColors.length;
            const newPersona: Persona = {
                id: `p${Date.now()}`,
                name: name.trim(),
                color: personaColors[colorIndex],
            };
            // Add persona to global database
            onUpdatePersonas([...personas, newPersona]);
            // Auto-tag the new persona to the current node
            onUpdateNodePersonas(node.id, [...(node.personaIds || []), newPersona.id]);
            setPersonaDraft("");
            setAddingNewPersona(false);
            setDropdownOpen(false);
        }
    };

    return (
        <div className="pane pane-narrow">
            <div className="pane-header">
                <span className="pane-title">
                    <ClipboardList size={16} />
                    Changelog
                </span>
            </div>

            {node && (
                <div
                    style={{
                        padding: "6px 12px",
                        borderBottom: "1px solid #e2e8f0",
                        backgroundColor: "#f9fafb",
                        fontSize: "12px",
                        color: "#475569",
                    }}
                >
                    For: <strong>{node.label}</strong>
                </div>
            )}

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

                        {/* Personas section */}
                        <div style={{ marginTop: 6 }}>
                            <label style={{ fontSize: 11, color: "#4b5563", display: "flex", alignItems: "center", gap: 4, marginBottom: 6 }}>
                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                    <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                                    <circle cx="9" cy="7" r="4" />
                                    <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
                                    <path d="M16 3.13a4 4 0 0 1 0 7.75" />
                                </svg>
                                Personas
                            </label>
                            <div style={{ display: "flex", gap: "6px", flexWrap: "wrap", marginBottom: "10px" }}>
                                {personas
                                    .filter((p) => node?.personaIds?.includes(p.id))
                                    .map((persona) => (
                                        <div
                                            key={persona.id}
                                            className="persona-chip"
                                            style={{ backgroundColor: persona.color || "#dbeafe" }}
                                        >
                                            <span>{persona.name}</span>
                                            <button
                                                onClick={() => {
                                                    const updatedIds = (node?.personaIds || []).filter((id) => id !== persona.id);
                                                    onUpdateNodePersonas(node!.id, updatedIds);
                                                }}
                                                style={{
                                                    border: "none",
                                                    background: "transparent",
                                                    cursor: "pointer",
                                                    padding: 0,
                                                    display: "flex",
                                                    alignItems: "center",
                                                }}
                                                title="Remove persona from this cause"
                                            >
                                                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                                                    <line x1="18" y1="6" x2="6" y2="18" />
                                                    <line x1="6" y1="6" x2="18" y2="18" />
                                                </svg>
                                            </button>
                                        </div>
                                    ))}
                            </div>

                            <div style={{ position: "relative" }} ref={dropdownRef}>
                                <button
                                    type="button"
                                    className="btn-add"
                                    onClick={() => setDropdownOpen(!dropdownOpen)}
                                >
                                    + Add persona
                                </button>

                                <div
                                    style={{
                                        display: dropdownOpen ? "block" : "none",
                                        position: "absolute",
                                        top: "100%",
                                        left: 0,
                                        marginTop: "4px",
                                        backgroundColor: "#ffffff",
                                        border: "1px solid #e5e7eb",
                                        borderRadius: "6px",
                                        boxShadow: "0 4px 6px rgba(0, 0, 0, 0.07)",
                                        zIndex: 10,
                                        maxHeight: "200px",
                                        overflowY: "auto",
                                        minWidth: "200px",
                                    }}
                                >
                                    {addingNewPersona ? (
                                        <div
                                            style={{
                                                padding: "8px 12px",
                                                borderBottom: "1px solid #e5e7eb",
                                                display: "flex",
                                                gap: "4px",
                                            }}
                                        >
                                            <input
                                                autoFocus
                                                type="text"
                                                placeholder="Persona name..."
                                                value={personaDraft}
                                                onChange={(e) => setPersonaDraft(e.target.value)}
                                                onKeyDown={(e) => {
                                                    if (e.key === "Enter") {
                                                        e.preventDefault();
                                                        handleAddPersona(personaDraft);
                                                    } else if (e.key === "Escape") {
                                                        setAddingNewPersona(false);
                                                        setPersonaDraft("");
                                                    }
                                                }}
                                                style={{
                                                    fontSize: "11px",
                                                    padding: "4px 6px",
                                                    border: "1px solid #cbd5e1",
                                                    borderRadius: "4px",
                                                    flex: 1,
                                                    outline: "none",
                                                    background: "#ffffff",
                                                }}
                                                onFocus={(e) => {
                                                    (e.currentTarget as HTMLElement).style.borderColor =
                                                        "#3b82f6";
                                                }}
                                                onBlur={(e) => {
                                                    (e.currentTarget as HTMLElement).style.borderColor =
                                                        "#cbd5e1";
                                                }}
                                            />
                                            <button
                                                type="button"
                                                onClick={() => {
                                                    handleAddPersona(personaDraft);
                                                }}
                                                style={{
                                                    fontSize: "10px",
                                                    padding: "4px 8px",
                                                    background: "#3b82f6",
                                                    color: "#fff",
                                                    border: "none",
                                                    borderRadius: "4px",
                                                    cursor: "pointer",
                                                    fontWeight: 500,
                                                }}
                                                onMouseEnter={(e) => {
                                                    (e.currentTarget as HTMLElement).style.background =
                                                        "#2563eb";
                                                }}
                                                onMouseLeave={(e) => {
                                                    (e.currentTarget as HTMLElement).style.background =
                                                        "#3b82f6";
                                                }}
                                            >
                                                + Add
                                            </button>
                                            <button
                                                type="button"
                                                onClick={() => {
                                                    setAddingNewPersona(false);
                                                    setPersonaDraft("");
                                                }}
                                                style={{
                                                    fontSize: "10px",
                                                    padding: "4px 8px",
                                                    background: "#f1f5f9",
                                                    border: "1px solid #cbd5e1",
                                                    borderRadius: "4px",
                                                    cursor: "pointer",
                                                    color: "#475569",
                                                    fontWeight: 500,
                                                }}
                                                onMouseEnter={(e) => {
                                                    (e.currentTarget as HTMLElement).style.background =
                                                        "#e2e8f0";
                                                }}
                                                onMouseLeave={(e) => {
                                                    (e.currentTarget as HTMLElement).style.background =
                                                        "#f1f5f9";
                                                }}
                                            >
                                                Cancel
                                            </button>
                                        </div>
                                    ) : null}
                                    <>
                                        {personas.map((persona) => {
                                            const isSelected = node?.personaIds?.includes(persona.id) || false;
                                            return (
                                                <div
                                                    key={persona.id}
                                                    style={{
                                                        display: "flex",
                                                        justifyContent: "space-between",
                                                        alignItems: "center",
                                                        padding: "8px 12px",
                                                        borderBottom: "1px solid #f3f4f6",
                                                        fontSize: "12px",
                                                        color: isSelected ? "#1e293b" : "#374151",
                                                        backgroundColor: isSelected ? "#eff6ff" : "transparent",
                                                        transition: "background 120ms ease",
                                                    }}
                                                    onMouseEnter={(e) => {
                                                        (e.currentTarget as HTMLElement).style.background = isSelected ? "#eff6ff" : "#f9fafb";
                                                    }}
                                                    onMouseLeave={(e) => {
                                                        (e.currentTarget as HTMLElement).style.background = isSelected ? "#eff6ff" : "#ffffff";
                                                    }}
                                                >
                                                    <button
                                                        onClick={() => {
                                                            if (node) {
                                                                if (isSelected) {
                                                                    const updatedIds = (node.personaIds || []).filter((id) => id !== persona.id);
                                                                    onUpdateNodePersonas(node.id, updatedIds);
                                                                } else {
                                                                    onUpdateNodePersonas(node.id, [
                                                                        ...(node.personaIds || []),
                                                                        persona.id,
                                                                    ]);
                                                                }
                                                            }
                                                            setDropdownOpen(false);
                                                        }}
                                                        style={{
                                                            flex: 1,
                                                            textAlign: "left",
                                                            background: "transparent",
                                                            border: "none",
                                                            cursor: "pointer",
                                                            padding: 0,
                                                            fontSize: "inherit",
                                                            fontWeight: "inherit",
                                                            color: "inherit",
                                                            display: "flex",
                                                            alignItems: "center",
                                                            gap: "6px",
                                                        }}
                                                    >
                                                        {isSelected && <span style={{ color: "#3b82f6", fontWeight: "bold" }}>✓</span>}
                                                        <span
                                                            style={{
                                                                display: "inline-block",
                                                                width: "8px",
                                                                height: "8px",
                                                                borderRadius: "999px",
                                                                backgroundColor: persona.color || "#dbeafe",
                                                            }}
                                                        />
                                                        {persona.name}
                                                    </button>
                                                    <button
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            setDeletingPersonaId(persona.id);
                                                        }}
                                                        style={{
                                                            background: "transparent",
                                                            border: "none",
                                                            cursor: "pointer",
                                                            padding: "2px 6px",
                                                            fontSize: "12px",
                                                            color: "#9ca3af",
                                                            fontWeight: 600,
                                                            transition: "color 120ms ease",
                                                        }}
                                                        onMouseEnter={(e) => {
                                                            (e.currentTarget as HTMLElement).style.color = "#6b7280";
                                                        }}
                                                        onMouseLeave={(e) => {
                                                            (e.currentTarget as HTMLElement).style.color = "#9ca3af";
                                                        }}
                                                        title="Delete this persona from the database"
                                                    >
                                                        ✕
                                                    </button>
                                                </div>
                                            );
                                        })}
                                        <div
                                            onClick={() => {
                                                setAddingNewPersona(true);
                                                setPersonaDraft("");
                                            }}
                                            style={{
                                                padding: "8px 12px",
                                                cursor: "pointer",
                                                fontSize: "12px",
                                                color: "#3b82f6",
                                                fontWeight: 500,
                                                borderTop: "1px solid #f3f4f6",
                                                transition: "background 120ms ease",
                                            }}
                                            onMouseEnter={(e) => {
                                                (e.currentTarget as HTMLElement).style.background =
                                                    "#f0f9ff";
                                            }}
                                            onMouseLeave={(e) => {
                                                (e.currentTarget as HTMLElement).style.background =
                                                    "#ffffff";
                                            }}
                                        >
                                            + Add new persona
                                        </div>
                                    </>
                                </div>
                            </div>
                        </div>

                        {/* DELETE CONFIRMATION DIALOG */}
                        {deletingPersonaId && (
                            <div style={{
                                position: 'fixed',
                                top: 0,
                                left: 0,
                                right: 0,
                                bottom: 0,
                                backgroundColor: 'rgba(0, 0, 0, 0.5)',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                zIndex: 1000,
                            }}>
                                <div style={{
                                    backgroundColor: '#ffffff',
                                    borderRadius: '8px',
                                    padding: '20px',
                                    maxWidth: '400px',
                                    boxShadow: '0 10px 25px rgba(0, 0, 0, 0.2)',
                                }}>
                                    <h3 style={{ marginTop: 0, marginBottom: '12px', color: '#1e293b', fontSize: '16px', fontWeight: 600 }}>
                                        Delete Persona?
                                    </h3>
                                    <p style={{ marginBottom: '16px', color: '#64748b', fontSize: '13px', lineHeight: '1.5' }}>
                                        Are you sure you want to delete <strong>"{personas.find(p => p.id === deletingPersonaId)?.name}"</strong> from the database? This will remove it from all causes.
                                    </p>
                                    <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
                                        <button
                                            type="button"
                                            onClick={() => setDeletingPersonaId(null)}
                                            style={{
                                                fontSize: '12px',
                                                padding: '6px 12px',
                                                background: '#f1f5f9',
                                                border: '1px solid #cbd5e1',
                                                borderRadius: '4px',
                                                cursor: 'pointer',
                                                color: '#475569',
                                                fontWeight: 500,
                                                transition: 'all 120ms ease',
                                            }}
                                            onMouseEnter={(e) => {
                                                (e.currentTarget as HTMLElement).style.background = '#e2e8f0';
                                            }}
                                            onMouseLeave={(e) => {
                                                (e.currentTarget as HTMLElement).style.background = '#f1f5f9';
                                            }}
                                        >
                                            Cancel
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => {
                                                onUpdatePersonas(personas.filter((p) => p.id !== deletingPersonaId));
                                                setDeletingPersonaId(null);
                                            }}
                                            style={{
                                                fontSize: '12px',
                                                padding: '6px 12px',
                                                background: '#ef4444',
                                                border: 'none',
                                                borderRadius: '4px',
                                                cursor: 'pointer',
                                                color: '#ffffff',
                                                fontWeight: 500,
                                                transition: 'all 120ms ease',
                                            }}
                                            onMouseEnter={(e) => {
                                                (e.currentTarget as HTMLElement).style.background = '#dc2626';
                                            }}
                                            onMouseLeave={(e) => {
                                                (e.currentTarget as HTMLElement).style.background = '#ef4444';
                                            }}
                                        >
                                            Delete
                                        </button>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* Notes textarea */}
                        <textarea
                            className="notes-textarea"
                            placeholder="Write notes about this cause (e.g., what changed, when, decisions taken, etc.)"
                            value={noteText}
                            onChange={(e) => onChangeNote(e.target.value)}
                            style={{ flex: 1 }}
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