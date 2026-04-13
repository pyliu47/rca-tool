// src/NoteLog.tsx
import React from "react";
import type { NoteEntry, RCANode, Persona, PerspectiveRole } from "./types";

/* -------------------------------------------------------
   Helpers
------------------------------------------------------- */

export const formatPeriod = (val: string) => {
    if (!val) return "";
    const [year, month] = val.split("-");
    const months = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
    return `${months[parseInt(month, 10) - 1] ?? ""} ${year}`;
};

function flattenNodes(node: RCANode, depth = 0): Array<{ id: string; label: string; depth: number }> {
    const out: Array<{ id: string; label: string; depth: number }> = [];
    if (depth > 0) out.push({ id: node.id, label: node.label, depth });
    node.children.forEach(c => out.push(...flattenNodes(c, depth + 1)));
    return out;
}

/** Maps every non-root node id → its depth-1 category label */
function buildCategoryMap(root: RCANode): Record<string, string> {
    const map: Record<string, string> = {};
    for (const cat of root.children) {
        const walk = (node: RCANode) => {
            map[node.id] = cat.label;
            node.children.forEach(walk);
        };
        walk(cat);
    }
    return map;
}

/* -------------------------------------------------------
   TagPicker
------------------------------------------------------- */

interface TagOption {
    id: string;
    label: string;
    sublabel?: string;
    color?: string;
    depth?: number;
}

interface TagPickerProps {
    options: TagOption[];
    selectedIds: string[];
    onChange: (ids: string[]) => void;
    addLabel: string;
    onAddNew?: (name: string) => { id: string; label: string };
}

const TagPicker: React.FC<TagPickerProps> = ({ options, selectedIds, onChange, addLabel, onAddNew }) => {
    const [open, setOpen] = React.useState(false);
    const [query, setQuery] = React.useState("");
    const ref = React.useRef<HTMLDivElement>(null);

    React.useEffect(() => {
        if (!open) return;
        const h = (e: MouseEvent) => {
            if (ref.current && !ref.current.contains(e.target as Node)) {
                setOpen(false);
                setQuery("");
            }
        };
        document.addEventListener("mousedown", h);
        return () => document.removeEventListener("mousedown", h);
    }, [open]);

    const filtered = query
        ? options.filter(o => o.label.toLowerCase().includes(query.toLowerCase()))
        : options;

    return (
        <div ref={ref} style={{ position: "relative", display: "inline-block" }}>
            <button
                onClick={() => setOpen(v => !v)}
                style={{
                    fontSize: 9, padding: "2px 8px", borderRadius: 999,
                    border: "1px dashed #cbd5e1", background: "transparent",
                    color: "#94a3b8", cursor: "pointer", fontWeight: 600,
                    lineHeight: 1.6,
                }}
            >+ {addLabel}</button>

            {open && (
                <div style={{
                    position: "absolute", top: "calc(100% + 4px)", left: 0, zIndex: 600,
                    background: "white", borderRadius: 8,
                    border: "1px solid #e2e8f0",
                    boxShadow: "0 8px 24px rgba(0,0,0,0.13)",
                    minWidth: 210, maxHeight: 230,
                    display: "flex", flexDirection: "column",
                    overflow: "hidden",
                }}>
                    <div style={{ padding: "6px 8px", borderBottom: "1px solid #f1f5f9", flexShrink: 0 }}>
                        <input
                            autoFocus
                            value={query}
                            onChange={e => setQuery(e.target.value)}
                            placeholder="Search…"
                            style={{
                                width: "100%", fontSize: 11,
                                border: "1px solid #e2e8f0", borderRadius: 5,
                                padding: "4px 8px", outline: "none",
                                fontFamily: "inherit", boxSizing: "border-box",
                            }}
                        />
                    </div>

                    <div style={{ overflowY: "auto", flex: 1 }}>
                        {filtered.length === 0 && !onAddNew && (
                            <div style={{ fontSize: 11, color: "#94a3b8", padding: "8px 12px", fontStyle: "italic" }}>
                                No results
                            </div>
                        )}
                        {filtered.map(o => {
                            const selected = selectedIds.includes(o.id);
                            return (
                                <div
                                    key={o.id}
                                    onClick={() => onChange(
                                        selected
                                            ? selectedIds.filter(id => id !== o.id)
                                            : [...selectedIds, o.id]
                                    )}
                                    style={{
                                        fontSize: 11, padding: "6px 12px",
                                        paddingLeft: o.depth ? 12 + (o.depth - 1) * 12 : 12,
                                        cursor: "pointer",
                                        display: "flex", alignItems: "center", gap: 8,
                                        background: selected ? "#f8fafc" : "white",
                                        color: "#334155",
                                    }}
                                >
                                    {/* Checkbox */}
                                    <span style={{
                                        width: 13, height: 13, borderRadius: 3, flexShrink: 0,
                                        border: `1.5px solid ${selected ? "#1e293b" : "#cbd5e1"}`,
                                        background: selected ? "#1e293b" : "white",
                                        display: "flex", alignItems: "center", justifyContent: "center",
                                        fontSize: 8, color: "white",
                                    }}>{selected ? "✓" : ""}</span>

                                    <span style={{ flex: 1, fontSize: o.depth && o.depth > 1 ? 10 : 11 }}>
                                        {o.sublabel && (
                                            <span style={{ color: "#94a3b8", marginRight: 3 }}>{o.sublabel} ›</span>
                                        )}
                                        {o.label}
                                    </span>

                                    {o.color && (
                                        <span style={{
                                            width: 8, height: 8, borderRadius: "50%",
                                            background: o.color, flexShrink: 0,
                                        }} />
                                    )}
                                </div>
                            );
                        })}

                        {onAddNew && query.trim() && !filtered.some(o => o.label.toLowerCase() === query.trim().toLowerCase()) && (
                            <div
                                onClick={() => {
                                    const item = onAddNew(query.trim());
                                    onChange([...selectedIds, item.id]);
                                    setQuery("");
                                    setOpen(false);
                                }}
                                style={{
                                    fontSize: 11, padding: "7px 12px", cursor: "pointer",
                                    color: "#3b82f6", fontWeight: 600,
                                    borderTop: "1px solid #f1f5f9",
                                }}
                            >+ Add "{query.trim()}"</div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
};

/* -------------------------------------------------------
   NoteCard
------------------------------------------------------- */

interface NoteCardProps {
    entry: NoteEntry;
    causeOptions: TagOption[];
    personaOptions: TagOption[];
    onChange: (entry: NoteEntry) => void;
    onDelete: () => void;
    onAddPersona?: (name: string) => { id: string; label: string };
    /** If true, card starts in edit mode (used for newly created entries) */
    defaultEditing?: boolean;
}

const iconBtnStyle: React.CSSProperties = {
    background: "none", border: "none", cursor: "pointer",
    color: "#cbd5e1", fontSize: 14, lineHeight: 1, padding: "0 2px",
    display: "flex", alignItems: "center",
};

const NoteCard: React.FC<NoteCardProps> = ({
    entry, causeOptions, personaOptions, onChange, onDelete, onAddPersona, defaultEditing = false,
}) => {
    const [isEditing, setIsEditing] = React.useState(defaultEditing);

    /* ── Compressed view ─────────────────────────────────── */
    if (!isEditing) {
        const hasTags = entry.causeIds.length > 0 || entry.personaIds.length > 0;
        return (
            <div style={{
                borderRadius: 8, border: "1px solid #e2e8f0",
                background: "white", padding: "8px 12px",
                display: "flex", flexDirection: "column", gap: 5,
                boxShadow: "0 1px 3px rgba(0,0,0,0.04)",
            }}>
                {/* Header row */}
                <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
                    <span style={{
                        color: "#d1d5db", fontSize: 13, cursor: "grab",
                        lineHeight: 1, userSelect: "none", flexShrink: 0,
                    }}>⠿</span>
                    <span style={{
                        fontSize: 9, fontWeight: 700, color: "#94a3b8",
                        textTransform: "uppercase", letterSpacing: "0.07em",
                    }}>{formatPeriod(entry.period)}</span>
                    <div style={{ flex: 1 }} />
                    <button
                        onClick={() => setIsEditing(true)}
                        title="Edit"
                        style={{ ...iconBtnStyle, color: "#94a3b8", fontSize: 12 }}
                    >✎</button>
                    <button
                        onClick={onDelete}
                        title="Delete"
                        style={iconBtnStyle}
                    >×</button>
                </div>

                {/* Text preview — up to 3 lines */}
                {entry.text ? (
                    <div style={{
                        fontSize: 11, color: "#334155", lineHeight: 1.55,
                        overflow: "hidden",
                        display: "-webkit-box",
                        WebkitLineClamp: 3,
                        WebkitBoxOrient: "vertical",
                    }}>{entry.text}</div>
                ) : (
                    <div style={{ fontSize: 11, color: "#cbd5e1", fontStyle: "italic" }}>
                        No text — click ✎ to edit
                    </div>
                )}

                {/* Read-only cause chips */}
                {entry.causeIds.length > 0 && (
                    <div style={{ display: "flex", flexWrap: "wrap", gap: 3 }}>
                        {entry.causeIds.map(id => {
                            const opt = causeOptions.find(o => o.id === id);
                            if (!opt) return null;
                            return (
                                <span key={id} style={{
                                    fontSize: 9, padding: "1px 7px", borderRadius: 999,
                                    background: "#f1f5f9", color: "#475569",
                                    border: "1px solid #e2e8f0", fontWeight: 500,
                                }}>
                                    {opt.sublabel && (
                                        <span style={{ opacity: 0.55, marginRight: 2 }}>{opt.sublabel} ›</span>
                                    )}
                                    {opt.label}
                                </span>
                            );
                        })}
                    </div>
                )}

                {/* Voice — dot + text */}
                {entry.personaIds.length > 0 && (
                    <div style={{ display: "flex", flexWrap: "wrap", gap: 6, alignItems: "center" }}>
                        {entry.personaIds.map(id => {
                            const opt = personaOptions.find(o => o.id === id);
                            if (!opt) return null;
                            return (
                                <span key={id} style={{
                                    display: "inline-flex", alignItems: "center", gap: 4,
                                    fontSize: 10, color: "#334155",
                                }}>
                                    <span style={{
                                        width: 7, height: 7, borderRadius: "50%", flexShrink: 0,
                                        background: opt.color ?? "#94a3b8",
                                    }} />
                                    {opt.label}
                                </span>
                            );
                        })}
                    </div>
                )}
            </div>
        );
    }

    /* ── Edit view ───────────────────────────────────────── */
    return (
        <div style={{
            borderRadius: 8, border: "1px solid #93c5fd",
            background: "white", padding: "10px 12px",
            display: "flex", flexDirection: "column", gap: 8,
            boxShadow: "0 2px 8px rgba(59,130,246,0.08)",
        }}>
            {/* Period stamp + done + delete */}
            <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
                <span style={{
                    fontSize: 9, fontWeight: 700, color: "#94a3b8",
                    textTransform: "uppercase", letterSpacing: "0.07em",
                }}>{formatPeriod(entry.period)}</span>
                <div style={{ flex: 1 }} />
                <button
                    onClick={() => setIsEditing(false)}
                    title="Done"
                    style={{ ...iconBtnStyle, color: "#22c55e", fontSize: 13 }}
                >✓</button>
                <button
                    onClick={onDelete}
                    title="Delete"
                    style={iconBtnStyle}
                >×</button>
            </div>

            {/* Text */}
            <textarea
                autoFocus
                value={entry.text}
                onChange={e => onChange({ ...entry, text: e.target.value })}
                placeholder="Write an observation…"
                style={{
                    width: "100%", boxSizing: "border-box",
                    fontSize: 11, lineHeight: 1.6, color: "#1e293b",
                    border: "none", outline: "none",
                    resize: "none", fontFamily: "inherit",
                    background: "transparent", minHeight: 50, padding: 0,
                }}
                rows={3}
            />

            {/* Cause tags */}
            <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: 4 }}>
                <span style={{
                    fontSize: 8, fontWeight: 700, color: "#94a3b8",
                    textTransform: "uppercase", letterSpacing: "0.07em", marginRight: 2,
                }}>Cause</span>
                {entry.causeIds.map(id => {
                    const opt = causeOptions.find(o => o.id === id);
                    if (!opt) return null;
                    return (
                        <span key={id} style={{
                            fontSize: 9, padding: "2px 7px", borderRadius: 999,
                            background: "#f1f5f9", color: "#475569",
                            border: "1px solid #e2e8f0", fontWeight: 500,
                            display: "inline-flex", alignItems: "center", gap: 3,
                        }}>
                            {opt.label}
                            <button
                                onClick={() => onChange({ ...entry, causeIds: entry.causeIds.filter(x => x !== id) })}
                                style={{ background: "none", border: "none", cursor: "pointer", color: "#94a3b8", fontSize: 11, lineHeight: 1, padding: 0 }}
                            >×</button>
                        </span>
                    );
                })}
                <TagPicker
                    options={causeOptions}
                    selectedIds={entry.causeIds}
                    onChange={ids => onChange({ ...entry, causeIds: ids })}
                    addLabel="tag cause"
                />
            </div>

            {/* Voice (persona) tags */}
            <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: 4 }}>
                <span style={{
                    fontSize: 8, fontWeight: 700, color: "#94a3b8",
                    textTransform: "uppercase", letterSpacing: "0.07em", marginRight: 2,
                }}>Voice</span>
                {entry.personaIds.map(id => {
                    const opt = personaOptions.find(o => o.id === id);
                    if (!opt) return null;
                    return (
                        <span key={id} style={{
                            fontSize: 9, padding: "2px 7px", borderRadius: 999,
                            background: opt.color ?? "#f1f5f9", color: "#1e293b",
                            border: "1px solid rgba(0,0,0,0.08)", fontWeight: 500,
                            display: "inline-flex", alignItems: "center", gap: 3,
                        }}>
                            {opt.label}
                            <button
                                onClick={() => onChange({ ...entry, personaIds: entry.personaIds.filter(x => x !== id) })}
                                style={{ background: "none", border: "none", cursor: "pointer", color: "rgba(0,0,0,0.3)", fontSize: 11, lineHeight: 1, padding: 0 }}
                            >×</button>
                        </span>
                    );
                })}
                <TagPicker
                    options={personaOptions}
                    selectedIds={entry.personaIds}
                    onChange={ids => onChange({ ...entry, personaIds: ids })}
                    addLabel="tag voice"
                    onAddNew={onAddPersona}
                />
            </div>
        </div>
    );
};

/* -------------------------------------------------------
   NoteLog
------------------------------------------------------- */

export interface NoteLogProps {
    notes: NoteEntry[];
    onUpdate: (notes: NoteEntry[]) => void;
    reviewPeriod: string;
    onChangeReviewPeriod?: (period: string) => void;
    root: RCANode;
    personas: Persona[];
    onAddPersona?: (name: string) => Persona;
    /** When set, voice options come from settings perspectives instead of diagram personas */
    perspectiveRoles?: PerspectiveRole[];
    /** When set, only show notes tagged to this node and pre-tag new entries */
    filterNodeId?: string;
}

export const NoteLog: React.FC<NoteLogProps> = ({
    notes, onUpdate, reviewPeriod, onChangeReviewPeriod,
    root, personas, onAddPersona, perspectiveRoles, filterNodeId,
}) => {
    const [newEntryId, setNewEntryId] = React.useState<string | null>(null);
    const [dragId, setDragId] = React.useState<string | null>(null);
    const [dragOverId, setDragOverId] = React.useState<string | null>(null);

    // Build cause options with category sublabels
    const categoryMap = React.useMemo(() => buildCategoryMap(root), [root]);
    const causeOptions: TagOption[] = React.useMemo(
        () => flattenNodes(root).map(n => ({
            id: n.id,
            label: n.label,
            depth: n.depth,
            sublabel: n.depth > 1 ? categoryMap[n.id] : undefined,
        })),
        [root, categoryMap]
    );

    // Voice options: prefer perspectiveRoles from settings when present
    const voiceSource: Array<{ id: string; name: string; color?: string }> =
        perspectiveRoles && perspectiveRoles.length > 0 ? perspectiveRoles : personas;
    const personaOptions: TagOption[] = voiceSource.map(p => ({
        id: p.id, label: p.name, color: p.color,
    }));
    // Only allow "add new" when sourced from diagram personas (not settings)
    const addPersonaFn = perspectiveRoles && perspectiveRoles.length > 0 ? undefined : onAddPersona;

    // Filter and sort
    const visible = filterNodeId
        ? notes.filter(n => n.causeIds.includes(filterNodeId))
        : notes;

    // Group by period, periods newest first; preserve array order within each period
    const grouped: [string, NoteEntry[]][] = React.useMemo(() => {
        const map = new Map<string, NoteEntry[]>();
        visible.forEach(n => {
            if (!map.has(n.period)) map.set(n.period, []);
            map.get(n.period)!.push(n);
        });
        return [...map.entries()].sort(([a], [b]) => b.localeCompare(a));
    }, [visible]);

    const addEntry = () => {
        const id = `note-${Date.now()}`;
        const entry: NoteEntry = {
            id,
            period: reviewPeriod,
            text: "",
            causeIds: filterNodeId ? [filterNodeId] : [],
            personaIds: [],
            createdAt: Date.now(),
        };
        onUpdate([...notes, entry]);
        setNewEntryId(id);
    };

    const updateEntry = (updated: NoteEntry) =>
        onUpdate(notes.map(n => n.id === updated.id ? updated : n));

    const deleteEntry = (id: string) =>
        onUpdate(notes.filter(n => n.id !== id));

    const handleAddPersona = addPersonaFn
        ? (name: string) => {
            const p = addPersonaFn(name);
            return { id: p.id, label: p.name };
        }
        : undefined;

    const filteredNodeLabel = filterNodeId
        ? (causeOptions.find(o => o.id === filterNodeId)?.label ?? null)
        : null;

    return (
        <div style={{ display: "flex", flexDirection: "column", height: "100%", minHeight: 0 }}>
            {/* Header */}
            <div style={{
                display: "flex", alignItems: "center", gap: 8,
                padding: "8px 12px", borderBottom: "1px solid #e2e8f0",
                flexShrink: 0, background: "#fafafa",
            }}>
                <span style={{
                    fontSize: 9, fontWeight: 700, color: "#94a3b8",
                    textTransform: "uppercase", letterSpacing: "0.07em", flex: 1,
                }}>
                    {filteredNodeLabel ?? "Observations"}
                </span>

                {/* Period badge + optional change button */}
                <span style={{
                    fontSize: 10, fontWeight: 600, color: "#64748b",
                    background: "#f1f5f9", border: "1px solid #e2e8f0",
                    borderRadius: 5, padding: "2px 7px",
                    position: "relative", cursor: onChangeReviewPeriod ? "pointer" : "default",
                }}>
                    {formatPeriod(reviewPeriod)}
                    {onChangeReviewPeriod && (
                        <input
                            type="month"
                            value={reviewPeriod}
                            onChange={e => onChangeReviewPeriod(e.target.value)}
                            title="Change review period"
                            style={{
                                position: "absolute", inset: 0, opacity: 0,
                                cursor: "pointer", width: "100%", height: "100%",
                            }}
                        />
                    )}
                </span>

                <button
                    onClick={addEntry}
                    style={{
                        fontSize: 10, padding: "3px 9px", borderRadius: 5,
                        border: "1px solid #e2e8f0", background: "white",
                        color: "#475569", cursor: "pointer", fontWeight: 600,
                        flexShrink: 0,
                    }}
                >+ Entry</button>
            </div>

            {/* Body */}
            <div style={{ flex: 1, overflowY: "auto", padding: "10px 12px", display: "flex", flexDirection: "column", gap: 0 }}>
                {visible.length === 0 ? (
                    <div style={{
                        color: "#94a3b8", fontSize: 12, textAlign: "center",
                        padding: "32px 0", fontStyle: "italic",
                    }}>
                        {filterNodeId ? "No entries tagged to this cause." : "No entries yet."}
                    </div>
                ) : (
                    grouped.map(([period, entries]) => (
                        <div key={period} style={{ marginBottom: 14 }}>
                            {/* Period divider */}
                            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
                                <span style={{
                                    fontSize: 9, fontWeight: 700, color: "#94a3b8",
                                    textTransform: "uppercase", letterSpacing: "0.07em",
                                    whiteSpace: "nowrap",
                                }}>{formatPeriod(period)}</span>
                                <div style={{ flex: 1, height: 1, background: "#f1f5f9" }} />
                            </div>

                            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                                {entries.map(entry => (
                                    <div
                                        key={entry.id}
                                        draggable
                                        onDragStart={e => {
                                            e.dataTransfer.effectAllowed = "move";
                                            setDragId(entry.id);
                                        }}
                                        onDragEnter={() => setDragOverId(entry.id)}
                                        onDragOver={e => e.preventDefault()}
                                        onDrop={() => {
                                            if (!dragId || dragId === entry.id) return;
                                            const fromIdx = notes.findIndex(n => n.id === dragId);
                                            const toIdx = notes.findIndex(n => n.id === entry.id);
                                            if (fromIdx < 0 || toIdx < 0) return;
                                            const next = [...notes];
                                            next.splice(toIdx, 0, next.splice(fromIdx, 1)[0]);
                                            onUpdate(next);
                                            setDragId(null);
                                            setDragOverId(null);
                                        }}
                                        onDragEnd={() => { setDragId(null); setDragOverId(null); }}
                                        style={{
                                            opacity: dragId === entry.id ? 0.35 : 1,
                                            outline: dragOverId === entry.id && dragId !== entry.id
                                                ? "2px solid #93c5fd" : "none",
                                            borderRadius: 8,
                                            transition: "opacity 0.12s",
                                        }}
                                    >
                                        <NoteCard
                                            entry={entry}
                                            causeOptions={causeOptions}
                                            personaOptions={personaOptions}
                                            onChange={updateEntry}
                                            onDelete={() => deleteEntry(entry.id)}
                                            onAddPersona={handleAddPersona}
                                            defaultEditing={entry.id === newEntryId}
                                        />
                                    </div>
                                ))}
                            </div>
                        </div>
                    ))
                )}
            </div>
        </div>
    );
};
