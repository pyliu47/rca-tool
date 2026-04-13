// src/SettingsPanel.tsx
import React from "react";
import type { FishboneGroup, PerspectiveRole } from "./types";
import { INDICATORS, CAT_META, type IndicatorCategory } from "./indicatorData";

/* -------------------------------------------------------
   Shared palette
------------------------------------------------------- */

const PALETTE = [
    "#7c3aed", "#0369a1", "#047857", "#b45309",
    "#f472b6", "#fb923c", "#34d399", "#38bdf8",
    "#818cf8", "#f87171", "#fbbf24", "#a3e635",
];

/* -------------------------------------------------------
   Reusable inline group / role editor
------------------------------------------------------- */

interface EditableItem {
    id: string;
    name: string;
    color: string;
}

interface ItemEditorProps<T extends EditableItem> {
    items: T[];
    onUpdate: (items: T[]) => void;
    addLabel?: string;
    newItemName?: string;
}

function ItemEditor<T extends EditableItem>({
    items, onUpdate, addLabel = "+ Add", newItemName = "New",
}: ItemEditorProps<T>) {
    const [editingId, setEditingId] = React.useState<string | null>(null);
    const [colorPickerId, setColorPickerId] = React.useState<string | null>(null);
    const [dragId, setDragId] = React.useState<string | null>(null);
    const [dragOverId, setDragOverId] = React.useState<string | null>(null);
    const pickerRef = React.useRef<HTMLDivElement>(null);

    React.useEffect(() => {
        if (!colorPickerId) return;
        const h = (e: MouseEvent) => {
            if (pickerRef.current && !pickerRef.current.contains(e.target as Node))
                setColorPickerId(null);
        };
        document.addEventListener("mousedown", h);
        return () => document.removeEventListener("mousedown", h);
    }, [colorPickerId]);

    return (
        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            {items.map(item => (
                <div
                    key={item.id}
                    draggable
                    onDragStart={() => setDragId(item.id)}
                    onDragEnter={() => setDragOverId(item.id)}
                    onDragOver={e => e.preventDefault()}
                    onDrop={() => {
                        if (!dragId || dragId === item.id) return;
                        const from = items.findIndex(x => x.id === dragId);
                        const to = items.findIndex(x => x.id === item.id);
                        const next = [...items];
                        next.splice(to, 0, next.splice(from, 1)[0]);
                        onUpdate(next);
                    }}
                    onDragEnd={() => { setDragId(null); setDragOverId(null); }}
                    style={{
                        display: "flex", alignItems: "center", gap: 8,
                        padding: "8px 10px", borderRadius: 8,
                        border: `1px solid ${dragOverId === item.id && dragId !== item.id ? item.color : "#e2e8f0"}`,
                        background: "white",
                        cursor: "grab",
                        opacity: dragId === item.id ? 0.4 : 1,
                        position: "relative",
                    }}
                >
                    {/* Drag handle */}
                    <span style={{ color: "#cbd5e1", fontSize: 12, cursor: "grab", userSelect: "none" }}>⠿</span>

                    {/* Color swatch → picker */}
                    <div style={{ position: "relative" }}>
                        <div
                            onClick={() => setColorPickerId(colorPickerId === item.id ? null : item.id)}
                            style={{
                                width: 18, height: 18, borderRadius: "50%",
                                background: item.color, cursor: "pointer", flexShrink: 0,
                                border: "2px solid rgba(0,0,0,0.12)",
                                boxShadow: colorPickerId === item.id ? `0 0 0 2px ${item.color}55` : "none",
                            }}
                            title="Change color"
                        />
                        {colorPickerId === item.id && (
                            <div ref={pickerRef} style={{
                                position: "absolute", top: 24, left: 0, zIndex: 200,
                                background: "white", borderRadius: 10,
                                border: "1px solid #e2e8f0",
                                boxShadow: "0 8px 24px rgba(0,0,0,0.12)",
                                padding: 10,
                            }}>
                                <div style={{ display: "grid", gridTemplateColumns: "repeat(6, 22px)", gap: 5, marginBottom: 8 }}>
                                    {PALETTE.map(c => (
                                        <div key={c}
                                            onClick={() => {
                                                onUpdate(items.map(x => x.id === item.id ? { ...x, color: c } : x));
                                                setColorPickerId(null);
                                            }}
                                            style={{
                                                width: 22, height: 22, borderRadius: "50%", background: c,
                                                cursor: "pointer", border: item.color === c ? "2.5px solid #1e293b" : "2.5px solid transparent",
                                                boxSizing: "border-box",
                                            }}
                                        />
                                    ))}
                                </div>
                                <div style={{ display: "flex", alignItems: "center", gap: 6, borderTop: "1px solid #f1f5f9", paddingTop: 8 }}>
                                    <input type="color" value={item.color}
                                        onChange={e => onUpdate(items.map(x => x.id === item.id ? { ...x, color: e.target.value } : x))}
                                        style={{ width: 28, height: 28, padding: 1, border: "1px solid #e2e8f0", borderRadius: 5, cursor: "pointer" }}
                                    />
                                    <span style={{ fontSize: 10, color: "#94a3b8" }}>Custom</span>
                                    <span style={{ fontSize: 10, color: "#94a3b8", marginLeft: 4 }}>{item.color}</span>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Editable name */}
                    {editingId === item.id ? (
                        <input
                            autoFocus
                            defaultValue={item.name}
                            onBlur={e => {
                                const v = e.target.value.trim();
                                if (v) onUpdate(items.map(x => x.id === item.id ? { ...x, name: v } : x));
                                setEditingId(null);
                            }}
                            onKeyDown={e => {
                                if (e.key === "Enter") (e.target as HTMLInputElement).blur();
                                if (e.key === "Escape") setEditingId(null);
                            }}
                            style={{
                                flex: 1, fontSize: 13, padding: "3px 8px",
                                border: "1px solid #cbd5e1", borderRadius: 5,
                                outline: "none", color: "#1e293b",
                            }}
                        />
                    ) : (
                        <span
                            onDoubleClick={() => setEditingId(item.id)}
                            style={{ flex: 1, fontSize: 13, color: "#1e293b", cursor: "text", userSelect: "none" }}
                            title="Double-click to rename"
                        >{item.name}</span>
                    )}

                    {/* Colored preview pill */}
                    <span style={{
                        fontSize: 9, padding: "2px 8px", borderRadius: 999,
                        background: `${item.color}18`, color: item.color,
                        border: `1px solid ${item.color}40`, fontWeight: 600,
                        flexShrink: 0,
                    }}>{item.name}</span>

                    {/* Delete */}
                    <button
                        onClick={() => onUpdate(items.filter(x => x.id !== item.id))}
                        style={{ background: "none", border: "none", cursor: "pointer", color: "#94a3b8", fontSize: 15, lineHeight: 1, padding: "0 2px" }}
                        title="Remove"
                    >×</button>
                </div>
            ))}

            <button
                onClick={() => {
                    const usedColors = items.map(x => x.color);
                    const color = PALETTE.find(c => !usedColors.includes(c)) ?? PALETTE[items.length % PALETTE.length];
                    const id = `item-${Date.now()}`;
                    onUpdate([...items, { id, name: newItemName, color } as T]);
                    setEditingId(id);
                }}
                style={{
                    fontSize: 12, padding: "8px 12px", borderRadius: 7,
                    border: "1px dashed #cbd5e1", background: "transparent",
                    color: "#94a3b8", cursor: "pointer", textAlign: "left",
                    width: "100%",
                }}
            >{addLabel}</button>
        </div>
    );
}

/* -------------------------------------------------------
   Indicator ↔ Group assignment table
------------------------------------------------------- */

interface IndicatorAssignmentProps {
    groups: FishboneGroup[];
    overrides: Record<string, string>;     // indicatorId → groupId
    onChangeOverride: (indicatorId: string, groupId: string) => void;
}

const IndicatorAssignment: React.FC<IndicatorAssignmentProps> = ({ groups, overrides, onChangeOverride }) => {
    const cats: IndicatorCategory[] = ["intent", "access", "readiness", "service", "outcome"];

    return (
        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            {cats.map(cat => {
                const catInds = INDICATORS.filter(i => i.category === cat);
                return (
                    <div key={cat}>
                        <div style={{
                            fontSize: 9, fontWeight: 700, textTransform: "uppercase",
                            letterSpacing: "0.07em", color: CAT_META[cat].color, marginBottom: 6,
                        }}>
                            {CAT_META[cat].label}
                        </div>
                        {catInds.map(ind => {
                            const assignedId = overrides[ind.id] ?? cat;
                            const assigned = groups.find(g => g.id === assignedId);
                            return (
                                <div key={ind.id} style={{
                                    display: "flex", alignItems: "center", gap: 10,
                                    padding: "5px 8px", borderRadius: 6,
                                    border: "1px solid #f1f5f9", marginBottom: 3,
                                    background: assigned ? `${assigned.color}08` : "#fafafa",
                                }}>
                                    <span style={{ flex: 1, fontSize: 12, color: "#334155" }}>{ind.name}</span>
                                    <select
                                        value={assignedId}
                                        onChange={e => onChangeOverride(ind.id, e.target.value)}
                                        style={{
                                            fontSize: 11, padding: "2px 6px", borderRadius: 5,
                                            border: `1px solid ${assigned?.color ?? "#e2e8f0"}40`,
                                            background: assigned ? `${assigned.color}18` : "#f9fafb",
                                            color: assigned?.color ?? "#475569",
                                            outline: "none", cursor: "pointer",
                                            fontWeight: 600,
                                        }}
                                    >
                                        {groups.map(g => (
                                            <option key={g.id} value={g.id}>{g.name}</option>
                                        ))}
                                    </select>
                                </div>
                            );
                        })}
                    </div>
                );
            })}
        </div>
    );
};

/* -------------------------------------------------------
   Main SettingsPanel
------------------------------------------------------- */

type SettingsTab = "groups" | "perspectives" | "indicators";

interface SettingsPanelProps {
    groups: FishboneGroup[];
    onUpdateGroups: (groups: FishboneGroup[]) => void;
    perspectiveRoles: PerspectiveRole[];
    onUpdatePerspectiveRoles: (roles: PerspectiveRole[]) => void;
    indicatorGroupOverrides: Record<string, string>;
    onUpdateIndicatorOverride: (indicatorId: string, groupId: string) => void;
    onClose: () => void;
}

export const SettingsPanel: React.FC<SettingsPanelProps> = ({
    groups, onUpdateGroups,
    perspectiveRoles, onUpdatePerspectiveRoles,
    indicatorGroupOverrides, onUpdateIndicatorOverride,
    onClose,
}) => {
    const [tab, setTab] = React.useState<SettingsTab>("groups");

    const tabs: Array<{ id: SettingsTab; label: string; desc: string }> = [
        { id: "groups",       label: "Groups",       desc: "Domain groups used across the journey map and indicator views" },
        { id: "perspectives", label: "Perspectives",  desc: "Stakeholder roles for attributing analysis notes" },
        { id: "indicators",   label: "Indicators",    desc: "Assign indicators to groups" },
    ];

    return (
        <div style={{
            position: "fixed", inset: 0, zIndex: 400,
            background: "rgba(15,23,42,0.35)", display: "flex", alignItems: "center", justifyContent: "center",
        }}
            onClick={e => { if (e.target === e.currentTarget) onClose(); }}
        >
            <div style={{
                width: 620, maxHeight: "85vh", background: "white",
                borderRadius: 14, boxShadow: "0 20px 60px rgba(0,0,0,0.18)",
                display: "flex", flexDirection: "column", overflow: "hidden",
            }}>
                {/* Header */}
                <div style={{
                    padding: "16px 20px 0", display: "flex", alignItems: "center", gap: 12,
                    borderBottom: "1px solid #f1f5f9",
                }}>
                    <div style={{ flex: 1 }}>
                        <div style={{ fontSize: 15, fontWeight: 700, color: "#1e293b" }}>Settings</div>
                        <div style={{ fontSize: 11, color: "#94a3b8", marginTop: 1 }}>
                            {tabs.find(t => t.id === tab)?.desc}
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        style={{ background: "none", border: "none", cursor: "pointer", color: "#94a3b8", fontSize: 18, lineHeight: 1, padding: 4 }}
                    >×</button>

                    {/* Tabs */}
                    <div style={{ position: "absolute", bottom: 0, left: 20, display: "flex", gap: 2 }} />
                </div>

                {/* Tab bar */}
                <div style={{ display: "flex", gap: 0, padding: "0 20px", borderBottom: "1px solid #e2e8f0", flexShrink: 0 }}>
                    {tabs.map(t => (
                        <button key={t.id} onClick={() => setTab(t.id)} style={{
                            fontSize: 12, padding: "10px 14px", border: "none", background: "none",
                            cursor: "pointer", fontWeight: tab === t.id ? 600 : 400,
                            color: tab === t.id ? "#1e293b" : "#94a3b8",
                            borderBottom: tab === t.id ? "2px solid #1e293b" : "2px solid transparent",
                            marginBottom: -1,
                        }}>{t.label}</button>
                    ))}
                </div>

                {/* Body */}
                <div style={{ flex: 1, overflowY: "auto", padding: "20px" }}>
                    {tab === "groups" && (
                        <ItemEditor<FishboneGroup>
                            items={groups}
                            onUpdate={onUpdateGroups}
                            addLabel="+ Add group"
                            newItemName="New Group"
                        />
                    )}

                    {tab === "perspectives" && (
                        <ItemEditor<PerspectiveRole>
                            items={perspectiveRoles}
                            onUpdate={onUpdatePerspectiveRoles}
                            addLabel="+ Add perspective role"
                            newItemName="New Role"
                        />
                    )}

                    {tab === "indicators" && (
                        groups.length === 0 ? (
                            <div style={{ textAlign: "center", color: "#94a3b8", fontSize: 13, padding: "40px 0" }}>
                                Add groups first, then assign indicators to them.
                            </div>
                        ) : (
                            <IndicatorAssignment
                                groups={groups}
                                overrides={indicatorGroupOverrides}
                                onChangeOverride={onUpdateIndicatorOverride}
                            />
                        )
                    )}
                </div>

                {/* Footer */}
                <div style={{
                    padding: "12px 20px", borderTop: "1px solid #f1f5f9",
                    display: "flex", justifyContent: "flex-end",
                }}>
                    <button onClick={onClose} style={{
                        fontSize: 12, padding: "7px 20px", borderRadius: 7,
                        background: "#1e293b", color: "white", border: "none",
                        cursor: "pointer", fontWeight: 600,
                    }}>Done</button>
                </div>
            </div>
        </div>
    );
};
