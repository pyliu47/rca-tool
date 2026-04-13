// src/ReviewTab.tsx
import React from "react";
import type {
    RCANode, PriorityLevel, NoteEntry, PerspectiveRole, Persona,
    ActionItem, PriorityChange, InterventionReview,
} from "./types";
import type { TocBundle, ActivityItem } from "./tocTypes";
import { ActivityDetailsPane } from "./InterventionLayout";
import { IndicatorPanel } from "./IndicatorPanel";
import { IndicatorDetailPanel, MultiIndicatorView } from "./IndicatorDetailPanel";
import type { Annotation } from "./IndicatorDetailPanel";
import { NoteLog, formatPeriod } from "./NoteLog";

/* ── helpers ──────────────────────────────────────────────── */

function collectPeriods(
    notes: NoteEntry[],
    priorityLog: PriorityChange[],
    actionItems: ActionItem[],
    interventionReviews: InterventionReview[],
    currentPeriod: string,
): string[] {
    const set = new Set<string>([currentPeriod]);
    notes.forEach(n => set.add(n.period));
    priorityLog.forEach(c => set.add(c.period));
    actionItems.forEach(a => set.add(a.period));
    interventionReviews.forEach(r => set.add(r.period));
    return Array.from(set).sort((a, b) => b.localeCompare(a)); // newest first
}

function priorPeriodStr(period: string): string {
    const [y, m] = period.split("-").map(Number);
    const d = new Date(y, m - 2);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}


function flattenCauses(root: RCANode): Array<{ node: RCANode; cat: string; depth: number }> {
    const out: Array<{ node: RCANode; cat: string; depth: number }> = [];
    for (const cat of root.children) {
        const walk = (node: RCANode, depth: number) => {
            out.push({ node, cat: cat.label, depth });
            node.children.forEach(c => walk(c, depth + 1));
        };
        walk(cat, 0);
    }
    return out;
}

/* ── Priority helpers ─────────────────────────────────────── */

const PRIORITY_COLORS: Record<PriorityLevel, { bg: string; text: string; border: string }> = {
    high:   { bg: "#fee2e2", text: "#b91c1c", border: "#fca5a5" },
    medium: { bg: "#fef3c7", text: "#b45309", border: "#fcd34d" },
    low:    { bg: "#f0fdf4", text: "#4d7c6a", border: "#bbf7d0" },
    none:   { bg: "#f1f5f9", text: "#94a3b8", border: "#e2e8f0" },
};

const PriorityBadge: React.FC<{ level: PriorityLevel; small?: boolean }> = ({ level, small }) => {
    const pc = PRIORITY_COLORS[level];
    const label = level === "none" ? "—" : level[0].toUpperCase() + level.slice(1);
    return (
        <span style={{
            fontSize: small ? 8 : 9, padding: small ? "1px 5px" : "2px 7px",
            borderRadius: 999, background: pc.bg, color: pc.text,
            border: `1px solid ${pc.border}`, fontWeight: 600, whiteSpace: "nowrap",
        }}>{label}</span>
    );
};

/* ── Intervention status ─────────────────────────────────── */

type IStatus = InterventionReview["status"];

const ISTATUS_META: Record<IStatus, { label: string; color: string; bg: string }> = {
    "none":      { label: "No status", color: "#94a3b8", bg: "#f8fafc" },
    "on-track":  { label: "On Track",  color: "#16a34a", bg: "#f0fdf4" },
    "at-risk":   { label: "At Risk",   color: "#b45309", bg: "#fefce8" },
    "blocked":   { label: "Blocked",   color: "#b91c1c", bg: "#fef2f2" },
    "paused":    { label: "Paused",    color: "#64748b", bg: "#f1f5f9" },
};

/* ── SectionHeader ────────────────────────────────────────── */

const SectionHeader: React.FC<{ children: React.ReactNode }> = ({ children }) => (
    <div style={{
        fontSize: 9, fontWeight: 700, color: "#94a3b8",
        textTransform: "uppercase", letterSpacing: "0.07em", marginBottom: 10,
    }}>{children}</div>
);

/* ── Props ────────────────────────────────────────────────── */

export interface ReviewTabProps {
    root: RCANode;
    notes: NoteEntry[];
    onUpdateNotes: (notes: NoteEntry[]) => void;
    reviewPeriod: string;
    onChangeReviewPeriod: (p: string) => void;
    priorityByNode: Record<string, PriorityLevel>;
    onChangePriorityForNode: (nodeId: string, level: PriorityLevel) => void;
    priorityLog: PriorityChange[];
    actionItems: ActionItem[];
    onUpdateActionItems: (items: ActionItem[]) => void;
    interventionReviews: InterventionReview[];
    onUpdateInterventionReviews: (reviews: InterventionReview[]) => void;
    tocBundles: Record<string, TocBundle>;
    tocOrder: string[];
    perspectiveRoles: PerspectiveRole[];
    personas: Persona[];
    onAddPersona?: (name: string) => Persona;
    groups?: import("./types").FishboneGroup[];
    indicatorGroupOverrides?: Record<string, string>;
    updateBundle?: (id: string, fn: (b: TocBundle) => TocBundle) => void;
    onGoToSA?: (nodeId?: string) => void;
}

/* ── Period Sidebar ───────────────────────────────────────── */

const PeriodSidebar: React.FC<{
    periods: string[];
    selectedPeriod: string;
    onSelect: (p: string) => void;
    interventionReviews: InterventionReview[];
    notes: NoteEntry[];
    priorityLog: PriorityChange[];
    actionItems: ActionItem[];
    collapsed: boolean;
    onToggle: () => void;
}> = ({ periods, selectedPeriod, onSelect, interventionReviews, notes, priorityLog, actionItems, collapsed, onToggle }) => {
    const toggleBtn = (label: string) => (
        <button
            onClick={onToggle}
            title={collapsed ? "Expand periods" : "Collapse periods"}
            style={{
                width: 20, height: 20, border: "1px solid #e2e8f0",
                borderRadius: 4, background: "#f8fafc", cursor: "pointer",
                fontSize: 9, color: "#94a3b8", padding: 0,
                display: "flex", alignItems: "center", justifyContent: "center",
                flexShrink: 0, fontFamily: "monospace",
            }}
        >{label}</button>
    );

    if (collapsed) {
        return (
            <div style={{
                width: 32, flexShrink: 0,
                borderRight: "1px solid #e2e8f0",
                background: "white",
                display: "flex", flexDirection: "column",
                alignItems: "center", padding: "8px 0", gap: 6,
            }}>
                {toggleBtn(">>")}
                <div style={{ display: "flex", flexDirection: "column", gap: 4, alignItems: "center", marginTop: 2 }}>
                    {periods.map(period => {
                        const dominantReview = interventionReviews.find(r => r.period === period && r.status !== "none");
                        const status: IStatus = dominantReview?.status ?? "none";
                        const isSelected = period === selectedPeriod;
                        return (
                            <div
                                key={period}
                                onClick={() => onSelect(period)}
                                title={formatPeriod(period)}
                                style={{
                                    width: 8, height: 8, borderRadius: "50%", cursor: "pointer",
                                    background: isSelected ? "#3b82f6"
                                        : status !== "none" ? ISTATUS_META[status].color
                                        : "#e2e8f0",
                                    outline: isSelected ? "2px solid #bfdbfe" : "none",
                                    outlineOffset: 1,
                                }}
                            />
                        );
                    })}
                </div>
            </div>
        );
    }

    return (
        <div style={{
            width: 152, flexShrink: 0,
            borderRight: "1px solid #e2e8f0",
            background: "white",
            display: "flex", flexDirection: "column",
            overflowY: "auto",
        }}>
            <div style={{
                padding: "10px 12px 6px",
                display: "flex", alignItems: "center", gap: 6,
                flexShrink: 0,
            }}>
                <span style={{
                    fontSize: 9, fontWeight: 700, color: "#94a3b8",
                    textTransform: "uppercase", letterSpacing: "0.07em", flex: 1,
                }}>Periods</span>
                {toggleBtn("<<")}
            </div>

            {periods.map(period => {
                const periodReviews    = interventionReviews.filter(r => r.period === period);
                const obsCount         = notes.filter(n => n.period === period).length;
                const changeCount      = priorityLog.filter(c => c.period === period).length;
                const openActions      = actionItems.filter(a => a.period === period && !a.done).length;
                const dominantReview   = periodReviews.find(r => r.status !== "none");
                const status: IStatus  = dominantReview?.status ?? "none";
                const smeta            = ISTATUS_META[status];
                const isSelected       = period === selectedPeriod;
                const hasData          = obsCount > 0 || changeCount > 0 || periodReviews.length > 0;

                return (
                    <div
                        key={period}
                        onClick={() => onSelect(period)}
                        style={{
                            padding: "9px 12px 8px",
                            cursor: "pointer",
                            background: isSelected ? "#eff6ff" : "transparent",
                            borderLeft: `3px solid ${isSelected ? "#3b82f6" : "transparent"}`,
                            borderBottom: "1px solid #f8fafc",
                        }}
                    >
                        <div style={{
                            fontSize: 11, fontWeight: isSelected ? 700 : 500,
                            color: isSelected ? "#1e40af" : "#334155",
                            marginBottom: hasData ? 4 : 0,
                        }}>{formatPeriod(period)}</div>

                        {hasData && (
                            <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: "3px 5px" }}>
                                {status !== "none" && (
                                    <span style={{
                                        fontSize: 8, padding: "1px 5px", borderRadius: 999,
                                        background: smeta.bg, color: smeta.color, fontWeight: 700,
                                    }}>{smeta.label}</span>
                                )}
                                {obsCount > 0 && <span style={{ fontSize: 8, color: "#94a3b8" }}>{obsCount} obs</span>}
                                {changeCount > 0 && <span style={{ fontSize: 8, color: "#94a3b8" }}>{changeCount}Δ</span>}
                                {openActions > 0 && <span style={{ fontSize: 8, color: "#94a3b8" }}>{openActions} open</span>}
                            </div>
                        )}
                        {!hasData && (
                            <div style={{ fontSize: 8, color: "#cbd5e1", fontStyle: "italic" }}>no data yet</div>
                        )}
                    </div>
                );
            })}
        </div>
    );
};

/* ── RCA Update Prompt ────────────────────────────────────── */

interface FlaggedNode {
    id: string;
    label: string;
    reasons: string[];
}

const RCAUpdatePrompt: React.FC<{
    periodNotes: NoteEntry[];
    periodChanges: PriorityChange[];
    interventionReviews: InterventionReview[];
    tocBundles: Record<string, TocBundle>;
    reviewPeriod: string;
    allNodes: Array<{ node: RCANode; cat: string; depth: number }>;
    onGoToSA: (nodeId?: string) => void;
}> = ({ periodNotes, periodChanges, interventionReviews, tocBundles, reviewPeriod, allNodes, onGoToSA }) => {
    const flagged = new Map<string, FlaggedNode>();

    const touch = (id: string, label: string, reason: string) => {
        if (!flagged.has(id)) flagged.set(id, { id, label, reasons: [] });
        const f = flagged.get(id)!;
        if (!f.reasons.includes(reason)) f.reasons.push(reason);
    };

    // Observations referencing specific nodes
    periodNotes.forEach(note => {
        (note.causeIds ?? []).forEach(causeId => {
            const match = allNodes.find(n => n.node.id === causeId);
            if (match) touch(causeId, match.node.label, "New observation");
        });
    });

    // Priority changes this period
    periodChanges.forEach(c => {
        const verb = c.from === "none" ? "raised" : `${c.from} → ${c.to}`;
        touch(c.nodeId, c.nodeLabel, `Priority ${verb}`);
    });

    // Blocked or at-risk interventions → linked causes
    interventionReviews
        .filter(r => r.period === reviewPeriod && (r.status === "blocked" || r.status === "at-risk"))
        .forEach(r => {
            const bundle = tocBundles[r.bundleId];
            if (!bundle) return;
            const reason = r.status === "blocked" ? "Linked intervention blocked" : "Linked intervention at-risk";
            (bundle.causeIds ?? []).forEach(causeId => {
                const match = allNodes.find(n => n.node.id === causeId);
                if (match) touch(causeId, match.node.label, reason);
            });
        });

    const items = Array.from(flagged.values());
    const hasItems = items.length > 0;

    return (
        <div style={{ marginTop: 24, paddingTop: 16, borderTop: "1px solid #f1f5f9" }}>
            <SectionHeader>Update Situational Analysis</SectionHeader>

            {hasItems && (
                <>
                    <div style={{
                        background: "#fffbeb", border: "1px solid #fde68a",
                        borderRadius: 8, padding: "9px 11px", marginBottom: 8,
                        fontSize: 11, color: "#92400e", lineHeight: 1.5,
                    }}>
                        This review surfaced new data. Consider updating the RCA tree to reflect current understanding.
                    </div>

                    <div style={{ display: "flex", flexDirection: "column", gap: 4, marginBottom: 8 }}>
                        {items.map(item => (
                            <div key={item.id} style={{
                                display: "flex", alignItems: "flex-start", gap: 8,
                                padding: "7px 8px", borderRadius: 7,
                                border: "1px solid #f1f5f9", background: "#fafafa",
                            }}>
                                <div style={{ flex: 1, minWidth: 0 }}>
                                    <div style={{
                                        fontSize: 11, fontWeight: 600, color: "#1e293b",
                                        marginBottom: 3, lineHeight: 1.3,
                                    }}>{item.label}</div>
                                    <div style={{ display: "flex", flexWrap: "wrap", gap: 3 }}>
                                        {item.reasons.map(r => (
                                            <span key={r} style={{
                                                fontSize: 8, padding: "1px 6px", borderRadius: 999,
                                                background: r.includes("blocked") ? "#fef2f2"
                                                    : r.includes("at-risk") ? "#fefce8"
                                                    : "#f1f5f9",
                                                color: r.includes("blocked") ? "#b91c1c"
                                                    : r.includes("at-risk") ? "#92400e"
                                                    : "#64748b",
                                                border: `1px solid ${r.includes("blocked") ? "#fecaca" : r.includes("at-risk") ? "#fde68a" : "#e2e8f0"}`,
                                            }}>{r}</span>
                                        ))}
                                    </div>
                                </div>
                                <button
                                    onClick={() => onGoToSA(item.id)}
                                    style={{
                                        fontSize: 9, padding: "3px 8px", borderRadius: 5, flexShrink: 0,
                                        border: "1px solid #bfdbfe", background: "#eff6ff",
                                        color: "#1d4ed8", cursor: "pointer", fontWeight: 600,
                                        whiteSpace: "nowrap", marginTop: 1,
                                    }}
                                >Go to SA →</button>
                            </div>
                        ))}
                    </div>
                </>
            )}

            {!hasItems && (
                <div style={{ fontSize: 11, color: "#94a3b8", fontStyle: "italic", marginBottom: 8 }}>
                    No specific nodes flagged this period.
                </div>
            )}

            <button
                onClick={() => onGoToSA()}
                style={{
                    width: "100%", fontSize: 11, padding: "7px 12px", borderRadius: 6,
                    border: "1px solid #e2e8f0", background: "white",
                    color: "#334155", cursor: "pointer", fontWeight: 600,
                }}
            >Open Situational Analysis →</button>
        </div>
    );
};

/* ── ReviewTab ────────────────────────────────────────────── */

export const ReviewTab: React.FC<ReviewTabProps> = ({
    root, notes, onUpdateNotes,
    reviewPeriod, onChangeReviewPeriod,
    priorityByNode, onChangePriorityForNode,
    priorityLog, actionItems, onUpdateActionItems,
    interventionReviews, onUpdateInterventionReviews,
    tocBundles, tocOrder,
    perspectiveRoles, personas, onAddPersona,
    groups, indicatorGroupOverrides, updateBundle,
    onGoToSA,
}) => {
    const [selectedActivity, setSelectedActivity] = React.useState<{
        activity: ActivityItem;
        bundle: TocBundle;
    } | null>(null);

    const periodNotes   = notes.filter(n => n.period === reviewPeriod);
    const periodChanges = priorityLog.filter(c => c.period === reviewPeriod);
    const causes        = React.useMemo(() => flattenCauses(root), [root]);
    const periods       = React.useMemo(
        () => collectPeriods(notes, priorityLog, actionItems, interventionReviews, reviewPeriod),
        [notes, priorityLog, actionItems, interventionReviews, reviewPeriod],
    );

    const [sidebarCollapsed, setSidebarCollapsed] = React.useState(false);
    const [newReviewPicking, setNewReviewPicking] = React.useState(false);
    const [newReviewDraft, setNewReviewDraft]     = React.useState("");

    // Indicator panel state — mirrors NotesPane
    const [selectedIndicatorId, setSelectedIndicatorId] = React.useState<string | null>(null);
    const [annotationMap, setAnnotationMap]             = React.useState<Record<string, Annotation[]>>({});
    const [multiViewOpen, setMultiViewOpen]             = React.useState(false);
    const [multiViewInitialId, setMultiViewInitialId]   = React.useState<string | null>(null);

    const handleAddAnnotation = (indicatorId: string, ann: Omit<Annotation, "id">) => {
        const newAnn: Annotation = { ...ann, id: `ann-${Date.now()}` };
        setAnnotationMap(prev => ({ ...prev, [indicatorId]: [...(prev[indicatorId] ?? []), newAnn] }));
    };
    const handleDeleteAnnotation = (indicatorId: string, annId: string) => {
        setAnnotationMap(prev => ({ ...prev, [indicatorId]: (prev[indicatorId] ?? []).filter(a => a.id !== annId) }));
    };
    const handleExpandIndicator = (id: string) => {
        setMultiViewInitialId(id);
        setMultiViewOpen(true);
    };

    return (
        <>
        <div style={{ flex: 1, minHeight: 0, display: "flex", flexDirection: "column", background: "#f8fafc" }}>
            {/* ── Header ── */}
            <div style={{
                display: "flex", alignItems: "center", gap: 10,
                padding: "8px 20px", background: "white",
                borderBottom: "1px solid #e2e8f0", flexShrink: 0,
            }}>
                <span style={{ fontSize: 13, fontWeight: 700, color: "#1e293b" }}>Progress Review</span>
                <div style={{ width: 1, height: 16, background: "#e2e8f0" }} />
                <span style={{
                    fontSize: 11, fontWeight: 600, color: "#1e40af",
                    background: "#eff6ff", border: "1px solid #bfdbfe",
                    borderRadius: 5, padding: "3px 9px",
                }}>{formatPeriod(reviewPeriod)}</span>
                {(periodNotes.length > 0 || periodChanges.length > 0) && (
                    <span style={{ fontSize: 11, color: "#94a3b8" }}>
                        {[
                            periodNotes.length > 0 && `${periodNotes.length} observation${periodNotes.length > 1 ? "s" : ""}`,
                            periodChanges.length > 0 && `${periodChanges.length} priority change${periodChanges.length > 1 ? "s" : ""}`,
                        ].filter(Boolean).join(" · ")}
                    </span>
                )}
                <div style={{ flex: 1 }} />
                {newReviewPicking ? (
                    <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                        <input
                            type="month"
                            autoFocus
                            value={newReviewDraft}
                            onChange={e => setNewReviewDraft(e.target.value)}
                            onKeyDown={e => {
                                if (e.key === "Enter" && newReviewDraft) {
                                    onChangeReviewPeriod(newReviewDraft);
                                    setNewReviewPicking(false);
                                    setNewReviewDraft("");
                                }
                                if (e.key === "Escape") {
                                    setNewReviewPicking(false);
                                    setNewReviewDraft("");
                                }
                            }}
                            style={{
                                fontSize: 11, padding: "4px 8px", borderRadius: 6,
                                border: "1px solid #bfdbfe", outline: "none",
                                color: "#1e293b", background: "white",
                            }}
                        />
                        <button
                            onClick={() => {
                                if (newReviewDraft) {
                                    onChangeReviewPeriod(newReviewDraft);
                                    setNewReviewPicking(false);
                                    setNewReviewDraft("");
                                }
                            }}
                            disabled={!newReviewDraft}
                            style={{
                                fontSize: 11, fontWeight: 600, padding: "4px 10px",
                                borderRadius: 6, border: "none",
                                background: newReviewDraft ? "#3b82f6" : "#e2e8f0",
                                color: newReviewDraft ? "white" : "#94a3b8",
                                cursor: newReviewDraft ? "pointer" : "not-allowed",
                            }}
                        >Start</button>
                        <button
                            onClick={() => { setNewReviewPicking(false); setNewReviewDraft(""); }}
                            style={{
                                fontSize: 11, padding: "4px 8px", borderRadius: 6,
                                border: "1px solid #e2e8f0", background: "white",
                                color: "#94a3b8", cursor: "pointer",
                            }}
                        >Cancel</button>
                    </div>
                ) : (
                    <button
                        onClick={() => {
                            const now = new Date();
                            setNewReviewDraft(`${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`);
                            setNewReviewPicking(true);
                        }}
                        style={{
                            fontSize: 11, fontWeight: 600, padding: "5px 12px",
                            borderRadius: 6, border: "1px solid #bfdbfe",
                            background: "#eff6ff", color: "#1d4ed8",
                            cursor: "pointer", flexShrink: 0,
                        }}
                    >+ New Review</button>
                )}
            </div>

            {/* ── Body ── */}
            <div style={{ flex: 1, minHeight: 0, display: "flex" }}>

                {/* Period sidebar */}
                <PeriodSidebar
                    periods={periods}
                    selectedPeriod={reviewPeriod}
                    onSelect={onChangeReviewPeriod}
                    interventionReviews={interventionReviews}
                    notes={notes}
                    priorityLog={priorityLog}
                    actionItems={actionItems}
                    collapsed={sidebarCollapsed}
                    onToggle={() => setSidebarCollapsed(v => !v)}
                />

                {/* Left: Data */}
                <div style={{
                    flex: 3, display: "flex", flexDirection: "column",
                    overflow: "auto", padding: "16px 16px 16px 16px", gap: 16,
                }}>
                    {/* Indicators — exact same panel as tab 1 */}
                    <div style={{
                        background: "white", borderRadius: 10,
                        border: "1px solid #e2e8f0", overflow: "hidden",
                    }}>
                        <div style={{
                            display: "flex", alignItems: "center",
                            padding: "8px 10px 0", gap: 6,
                        }}>
                            <span style={{ fontSize: 10, fontWeight: 700, color: "#94a3b8", textTransform: "uppercase", letterSpacing: "0.07em", flex: 1 }}>Indicators</span>
                            <button
                                onClick={() => { if (selectedIndicatorId) handleExpandIndicator(selectedIndicatorId); else setMultiViewOpen(true); }}
                                title="Open multi-indicator view"
                                style={{
                                    width: 22, height: 22, border: "1px solid #e2e8f0",
                                    borderRadius: 5, background: "#f8fafc", cursor: "pointer",
                                    display: "flex", alignItems: "center", justifyContent: "center",
                                    fontSize: 11, color: "#94a3b8", padding: 0,
                                }}
                            >⛶</button>
                        </div>
                        <IndicatorPanel
                            tocBundles={tocBundles}
                            groups={groups}
                            onSelectIndicator={setSelectedIndicatorId}
                            selectedIndicatorId={selectedIndicatorId}
                        />
                    </div>

                    {/* Observations */}
                    <div style={{
                        background: "white", borderRadius: 10,
                        border: "1px solid #e2e8f0", overflow: "hidden",
                        display: "flex", flexDirection: "column",
                    }}>
                        <div style={{ maxHeight: 320, minHeight: 0, overflowY: "auto", display: "flex", flexDirection: "column" }}>
                            <NoteLog
                                notes={notes.filter(n => n.period === reviewPeriod)}
                                onUpdate={updated => {
                                    const others = notes.filter(n => n.period !== reviewPeriod);
                                    onUpdateNotes([...others, ...updated]);
                                }}
                                reviewPeriod={reviewPeriod}
                                onChangeReviewPeriod={onChangeReviewPeriod}
                                root={root}
                                personas={personas}
                                perspectiveRoles={perspectiveRoles}
                                onAddPersona={onAddPersona}
                            />
                        </div>
                    </div>

                    {/* Interventions */}
                    <InterventionsSection
                        tocBundles={tocBundles}
                        tocOrder={tocOrder}
                        reviewPeriod={reviewPeriod}
                        interventionReviews={interventionReviews}
                        onUpdateInterventionReviews={onUpdateInterventionReviews}
                        root={root}
                        onSelectActivity={(act, b) => { setSelectedIndicatorId(null); setSelectedActivity({ activity: act, bundle: b }); }}
                    />
                </div>

                {/* Right: Synthesis */}
                <div style={{
                    flex: 2, display: "flex", flexDirection: "column",
                    overflow: "hidden", borderLeft: "1px solid #e2e8f0",
                    background: "white",
                }}>
                    <div style={{ flex: 1, overflowY: "auto", padding: 16 }}>
                        <CausesSection
                            causes={causes}
                            priorityByNode={priorityByNode}
                            onChangePriority={onChangePriorityForNode}
                            periodNotes={periodNotes}
                        />
                        <div style={{ height: 4 }} />
                        <WhatChangedSection
                            periodNotes={periodNotes}
                            periodChanges={periodChanges}
                        />
                        <DecisionsSection
                            items={actionItems}
                            onUpdate={onUpdateActionItems}
                            reviewPeriod={reviewPeriod}
                            perspectiveRoles={perspectiveRoles}
                            personas={personas}
                        />
                        {onGoToSA && (
                            <RCAUpdatePrompt
                                periodNotes={periodNotes}
                                periodChanges={periodChanges}
                                interventionReviews={interventionReviews}
                                tocBundles={tocBundles}
                                reviewPeriod={reviewPeriod}
                                allNodes={causes}
                                onGoToSA={onGoToSA}
                            />
                        )}
                    </div>
                </div>

            </div>
        </div>

        {/* Indicator detail panel — same as tab 1 */}
        {multiViewOpen && (
            <MultiIndicatorView
                onClose={() => setMultiViewOpen(false)}
                tocBundles={tocBundles}
                initialIndicatorId={multiViewInitialId}
                annotationMap={annotationMap}
                onAddAnnotation={handleAddAnnotation}
                onDeleteAnnotation={handleDeleteAnnotation}
                groups={groups}
                perspectiveRoles={perspectiveRoles}
                indicatorGroupOverrides={indicatorGroupOverrides}
                personas={personas}
                notes={notes}
                onUpdateNotes={onUpdateNotes}
                reviewPeriod={reviewPeriod}
                onChangeReviewPeriod={onChangeReviewPeriod}
                root={root}
                onAddPersona={onAddPersona}
            />
        )}
        <IndicatorDetailPanel
            indicatorId={selectedIndicatorId}
            tocBundles={tocBundles}
            onClose={() => setSelectedIndicatorId(null)}
            annotations={selectedIndicatorId ? annotationMap[selectedIndicatorId] ?? [] : []}
            onAddAnnotation={ann => selectedIndicatorId && handleAddAnnotation(selectedIndicatorId, ann)}
            onDeleteAnnotation={annId => selectedIndicatorId && handleDeleteAnnotation(selectedIndicatorId, annId)}
            onExpand={() => selectedIndicatorId && handleExpandIndicator(selectedIndicatorId)}
        />

        {/* Activity detail panel — same layout as Intervention Design */}
        {selectedActivity && (
            <div style={{
                position: "fixed", top: 0, right: 0, width: 380, height: "100vh",
                zIndex: 300, display: "flex", flexDirection: "column",
                boxShadow: "-4px 0 24px rgba(15,23,42,0.12)",
            }}>
                <div className="intervention-notes-pane" style={{ flex: 1, overflowY: "auto", position: "relative" }}>
                    <ActivityDetailsPane
                        activity={selectedActivity.activity}
                        bundle={selectedActivity.bundle}
                        bundleId={selectedActivity.bundle.id}
                        onUpdate={updates => {
                            if (!updateBundle) return;
                            updateBundle(selectedActivity.bundle.id, b => ({
                                ...b,
                                activities: (b.activities || []).map(a =>
                                    a.id === selectedActivity.activity.id ? { ...a, ...updates } : a
                                ),
                            }));
                            // Keep the panel in sync with updated data
                            setSelectedActivity(prev => prev
                                ? { ...prev, activity: { ...prev.activity, ...updates } }
                                : null
                            );
                        }}
                        updateBundle={updateBundle}
                    />
                    <div style={{ position: "absolute", top: 8, right: 14 }}>
                        <button
                            onClick={() => setSelectedActivity(null)}
                            style={{
                                background: "none", border: "none", color: "#9ca3af",
                                cursor: "pointer", padding: 4, fontSize: 18,
                                display: "flex", alignItems: "center", justifyContent: "center",
                            }}
                            title="Close details"
                        >✕</button>
                    </div>
                </div>
            </div>
        )}
        </>
    );
};

/* ── Note field with prior-period context ─────────────────── */

const NoteField: React.FC<{
    label: string;
    value: string;
    onChange: (v: string) => void;
    placeholder: string;
    priorValue?: string;
    priorPeriodLabel?: string;
}> = ({ label, value, onChange, placeholder, priorValue, priorPeriodLabel }) => (
    <div style={{ display: "flex", flexDirection: "column", gap: 3 }}>
        <div style={{ fontSize: 10, fontWeight: 600, color: "#94a3b8", textTransform: "uppercase", letterSpacing: "0.05em" }}>
            {label}
        </div>
        {priorValue && (
            <div style={{
                fontSize: 10, color: "#94a3b8", lineHeight: 1.5,
                background: "#f8fafc", borderLeft: "2px solid #e2e8f0",
                padding: "4px 8px", borderRadius: "0 4px 4px 0",
                fontStyle: "italic",
            }}>
                <span style={{ fontWeight: 600, fontStyle: "normal" }}>{priorPeriodLabel}: </span>
                {priorValue}
            </div>
        )}
        <textarea
            value={value}
            onChange={e => onChange(e.target.value)}
            placeholder={placeholder}
            rows={2}
            style={{
                fontSize: 12, lineHeight: 1.55, resize: "vertical",
                border: "1px solid #e2e8f0", borderRadius: 6,
                padding: "5px 8px", outline: "none",
                fontFamily: "inherit", width: "100%",
                boxSizing: "border-box", color: "#334155",
                background: "white",
            }}
            onFocus={e => (e.target.style.borderColor = "#93c5fd")}
            onBlur={e => (e.target.style.borderColor = "#e2e8f0")}
        />
    </div>
);

/* ── Interventions Section ────────────────────────────────── */

const InterventionsSection: React.FC<{
    tocBundles: Record<string, TocBundle>;
    tocOrder: string[];
    reviewPeriod: string;
    interventionReviews: InterventionReview[];
    onUpdateInterventionReviews: (r: InterventionReview[]) => void;
    root: RCANode;
    onSelectActivity?: (act: ActivityItem, bundle: TocBundle) => void;
}> = ({ tocBundles, tocOrder, reviewPeriod, interventionReviews, onUpdateInterventionReviews, root, onSelectActivity }) => {
    const bundles = tocOrder.map(id => tocBundles[id]).filter(Boolean);
    if (bundles.length === 0) return null;

    const getReview = (bundleId: string): InterventionReview | undefined =>
        interventionReviews.find(r => r.bundleId === bundleId && r.period === reviewPeriod);

    const upsertReview = (bundleId: string, patch: Partial<Omit<InterventionReview, "id" | "bundleId" | "period">>) => {
        const existing = getReview(bundleId);
        if (existing) {
            onUpdateInterventionReviews(
                interventionReviews.map(r =>
                    r.bundleId === bundleId && r.period === reviewPeriod ? { ...r, ...patch } : r
                )
            );
        } else {
            onUpdateInterventionReviews([
                ...interventionReviews,
                { id: `ir-${Date.now()}`, bundleId, period: reviewPeriod, status: "none", noteProgress: "", noteBlocked: "", noteChanges: "", ...patch },
            ]);
        }
    };

    const linkedLabels = (bundle: TocBundle): string[] => {
        const labels: string[] = [];
        const walk = (node: RCANode) => {
            if (bundle.causeIds?.includes(node.id)) labels.push(node.label);
            node.children.forEach(walk);
        };
        root.children.forEach(walk);
        return labels;
    };

    return (
        <div style={{
            background: "white", borderRadius: 10,
            border: "1px solid #e2e8f0",
        }}>
            <div style={{
                padding: "8px 12px 6px", borderBottom: "1px solid #f1f5f9",
                fontSize: 10, fontWeight: 700, color: "#94a3b8",
                textTransform: "uppercase", letterSpacing: "0.07em",
                borderRadius: "10px 10px 0 0",
            }}>Interventions</div>

            <div style={{ display: "flex", flexDirection: "column", maxHeight: 480, overflowY: "auto", borderRadius: "0 0 10px 10px" }}>
                {bundles.map((bundle, i) => {
                    const review  = getReview(bundle.id);
                    const status  = review?.status        ?? "none";
                    const smeta   = ISTATUS_META[status];
                    const linked  = linkedLabels(bundle);
                    // all reviews for this bundle, sorted oldest→newest
                    const bundleReviews = interventionReviews
                        .filter(r => r.bundleId === bundle.id)
                        .sort((a, b) => a.period.localeCompare(b.period));
                    // prior period for context
                    const prior = priorPeriodStr(reviewPeriod);
                    const priorReview = interventionReviews.find(r => r.bundleId === bundle.id && r.period === prior);

                    return (
                        <InterventionCard
                            key={bundle.id}
                            bundle={bundle}
                            status={status}
                            noteProgress={review?.noteProgress ?? ""}
                            noteBlocked={review?.noteBlocked   ?? ""}
                            noteChanges={review?.noteChanges   ?? ""}
                            smeta={smeta}
                            linked={linked}
                            isLast={i === bundles.length - 1}
                            bundleReviews={bundleReviews}
                            reviewPeriod={reviewPeriod}
                            priorReview={priorReview}
                            onStatusChange={s    => upsertReview(bundle.id, { status: s })}
                            onProgressChange={n  => upsertReview(bundle.id, { noteProgress: n })}
                            onBlockedChange={n   => upsertReview(bundle.id, { noteBlocked: n })}
                            onChangesChange={n   => upsertReview(bundle.id, { noteChanges: n })}
                            onSelectActivity={onSelectActivity}
                        />
                    );
                })}
            </div>
        </div>
    );
};

const InterventionCard: React.FC<{
    bundle: TocBundle;
    status: IStatus;
    noteProgress: string;
    noteBlocked: string;
    noteChanges: string;
    smeta: { label: string; color: string; bg: string };
    linked: string[];
    isLast: boolean;
    bundleReviews: InterventionReview[];
    reviewPeriod: string;
    priorReview?: InterventionReview;
    onStatusChange: (s: IStatus) => void;
    onProgressChange: (n: string) => void;
    onBlockedChange: (n: string) => void;
    onChangesChange: (n: string) => void;
    onSelectActivity?: (act: ActivityItem, bundle: TocBundle) => void;
}> = ({
    bundle, status, noteProgress, noteBlocked, noteChanges,
    smeta, linked, isLast, bundleReviews, reviewPeriod, priorReview,
    onStatusChange, onProgressChange, onBlockedChange, onChangesChange,
    onSelectActivity,
}) => {
    const [expanded, setExpanded] = React.useState(false);
    const [showDetails, setShowDetails] = React.useState(false);
    const priorLabel = formatPeriod(priorPeriodStr(reviewPeriod));

    // History strip: last 6 reviews (oldest→newest), excluding current
    const historyReviews = bundleReviews.filter(r => r.period !== reviewPeriod).slice(-6);

    return (
        <div style={{ borderBottom: isLast ? "none" : "1px solid #f1f5f9" }}>
            {/* Header row */}
            <div
                onClick={() => setExpanded(v => !v)}
                style={{
                    display: "flex", alignItems: "center", gap: 8,
                    padding: "9px 12px", cursor: "pointer",
                    background: expanded ? "#fafafa" : "white",
                }}
            >
                <span style={{ fontSize: 10, color: "#94a3b8", flexShrink: 0 }}>
                    {expanded ? "▾" : "▸"}
                </span>
                <span style={{
                    fontSize: 11, fontWeight: 600, color: "#1e293b",
                    flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
                }}>{bundle.name || "Unnamed intervention"}</span>

                {/* Status history dots */}
                {historyReviews.length > 0 && (
                    <div style={{ display: "flex", alignItems: "center", gap: 2, flexShrink: 0 }}>
                        {historyReviews.map(r => {
                            const m = ISTATUS_META[r.status];
                            return (
                                <div key={r.period} title={`${formatPeriod(r.period)}: ${m.label}`} style={{
                                    width: 7, height: 7, borderRadius: "50%",
                                    background: r.status === "none" ? "#e2e8f0" : m.color,
                                    flexShrink: 0,
                                }} />
                            );
                        })}
                        <div style={{ width: 1, height: 10, background: "#e2e8f0", margin: "0 3px" }} />
                    </div>
                )}

                {/* Current status dropdown */}
                <div onClick={e => e.stopPropagation()} style={{ flexShrink: 0 }}>
                    <select
                        value={status}
                        onChange={e => onStatusChange(e.target.value as IStatus)}
                        style={{
                            fontSize: 9, padding: "2px 6px", borderRadius: 999,
                            border: `1px solid ${smeta.color}44`,
                            background: smeta.bg, color: smeta.color,
                            cursor: "pointer", outline: "none", fontWeight: 600,
                            appearance: "none", WebkitAppearance: "none",
                        }}
                    >
                        {(Object.keys(ISTATUS_META) as IStatus[]).map(s => (
                            <option key={s} value={s}>{ISTATUS_META[s].label}</option>
                        ))}
                    </select>
                </div>
            </div>

            {/* Expanded body */}
            {expanded && (
                <div style={{ padding: "0 12px 14px 12px", display: "flex", flexDirection: "column", gap: 12 }}>

                    {/* Linked causes */}
                    {linked.length > 0 && (
                        <div style={{ display: "flex", flexWrap: "wrap", gap: 4 }}>
                            {linked.map(l => (
                                <span key={l} style={{
                                    fontSize: 10, padding: "2px 8px", borderRadius: 999,
                                    background: "#f1f5f9", color: "#64748b",
                                    border: "1px solid #e8edf2",
                                }}>→ {l}</span>
                            ))}
                        </div>
                    )}

                    {/* Review notes — always visible */}
                    <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                        <NoteField
                            label="What's progressing?"
                            value={noteProgress}
                            onChange={onProgressChange}
                            placeholder="Activities on track, outputs delivered, positive signals…"
                            priorValue={priorReview?.noteProgress}
                            priorPeriodLabel={priorLabel}
                        />
                        <NoteField
                            label="What's blocked or at risk?"
                            value={noteBlocked}
                            onChange={onBlockedChange}
                            placeholder="Delays, blockers, unexpected challenges…"
                            priorValue={priorReview?.noteBlocked}
                            priorPeriodLabel={priorLabel}
                        />
                        <NoteField
                            label="What needs to change?"
                            value={noteChanges}
                            onChange={onChangesChange}
                            placeholder="Adjustments to activities, resources, timeline, approach…"
                            priorValue={priorReview?.noteChanges}
                            priorPeriodLabel={priorLabel}
                        />
                    </div>

                    {/* Activities & Outcomes — collapsed by default */}
                    {((bundle.activities && bundle.activities.length > 0) || (bundle.outcomes && bundle.outcomes.length > 0)) && (
                        <div style={{ borderTop: "1px solid #f1f5f9", paddingTop: 8 }}>
                            <button
                                onClick={() => setShowDetails(v => !v)}
                                style={{
                                    display: "flex", alignItems: "center", gap: 5,
                                    background: "none", border: "none", cursor: "pointer",
                                    padding: 0, fontSize: 10, color: "#94a3b8", fontWeight: 600,
                                    textTransform: "uppercase", letterSpacing: "0.05em",
                                }}
                            >
                                <span style={{ fontSize: 9 }}>{showDetails ? "▾" : "▸"}</span>
                                Activities & Outcomes
                                <span style={{
                                    fontSize: 9, padding: "0 5px", borderRadius: 999,
                                    background: "#f1f5f9", color: "#94a3b8",
                                }}>{(bundle.activities?.length ?? 0) + (bundle.outcomes?.length ?? 0)}</span>
                            </button>

                            {showDetails && (
                                <div style={{ marginTop: 8, display: "flex", flexDirection: "column", gap: 10 }}>
                                    {/* Activities grid */}
                                    {bundle.activities && bundle.activities.length > 0 && (
                                        <div style={{
                                            display: "grid",
                                            gridTemplateColumns: "repeat(3, 1fr)",
                                            gap: 6,
                                        }}>
                                            {bundle.activities.map(act => (
                                                <div
                                                    key={act.id}
                                                    onClick={() => onSelectActivity?.(act, bundle)}
                                                    title={act.description || act.label}
                                                    style={{
                                                        padding: "6px 8px", borderRadius: 6, cursor: "pointer",
                                                        background: "#f8fafc", border: "1px solid #e2e8f0",
                                                        display: "flex", flexDirection: "column", gap: 3,
                                                    }}
                                                    onMouseEnter={e => {
                                                        (e.currentTarget as HTMLElement).style.background = "#eff6ff";
                                                        (e.currentTarget as HTMLElement).style.borderColor = "#bfdbfe";
                                                    }}
                                                    onMouseLeave={e => {
                                                        (e.currentTarget as HTMLElement).style.background = "#f8fafc";
                                                        (e.currentTarget as HTMLElement).style.borderColor = "#e2e8f0";
                                                    }}
                                                >
                                                    <div style={{ fontSize: 11, fontWeight: 600, color: "#1e293b", lineHeight: 1.35 }}>
                                                        {act.label}
                                                    </div>
                                                    {act.actors && act.actors.length > 0 && (
                                                        <div style={{ display: "flex", flexWrap: "wrap", gap: 2 }}>
                                                            {act.actors.map(a => (
                                                                <span key={a} style={{
                                                                    fontSize: 9, padding: "0 5px", borderRadius: 999,
                                                                    background: "white", color: "#64748b",
                                                                    border: "1px solid #e2e8f0",
                                                                }}>{a}</span>
                                                            ))}
                                                        </div>
                                                    )}
                                                </div>
                                            ))}
                                        </div>
                                    )}

                                    {/* Outcomes */}
                                    {bundle.outcomes && bundle.outcomes.length > 0 && (
                                        <div style={{ display: "flex", flexWrap: "wrap", gap: 5 }}>
                                            {bundle.outcomes.map(out => (
                                                <div key={out.id} style={{
                                                    display: "flex", alignItems: "center", gap: 5,
                                                    padding: "3px 8px", borderRadius: 6, flexShrink: 0,
                                                    background: "#f0fdf4", border: "1px solid #d1fae5",
                                                }}>
                                                    {out.tier !== undefined && (
                                                        <span style={{
                                                            fontSize: 9, padding: "1px 4px", borderRadius: 3,
                                                            background: "#d1fae5", color: "#065f46",
                                                            fontWeight: 700, flexShrink: 0,
                                                        }}>T{out.tier}</span>
                                                    )}
                                                    <div style={{ fontSize: 10, color: "#065f46", fontWeight: 500 }}>{out.label}</div>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};

/* ── Causes Section ───────────────────────────────────────── */

const CausesSection: React.FC<{
    causes: Array<{ node: RCANode; cat: string; depth: number }>;
    priorityByNode: Record<string, PriorityLevel>;
    onChangePriority: (nodeId: string, level: PriorityLevel) => void;
    periodNotes: NoteEntry[];
}> = ({ causes, priorityByNode, onChangePriority, periodNotes }) => {
    const notable = causes.filter(({ node }) => {
        const p = priorityByNode[node.id];
        return (p && p !== "none") || periodNotes.some(n => n.causeIds.includes(node.id));
    });
    if (notable.length === 0) return null;

    return (
        <div style={{ marginBottom: 20 }}>
            <SectionHeader>Causes</SectionHeader>
            <div style={{ display: "flex", flexDirection: "column", gap: 1 }}>
                {notable.map(({ node, depth }) => {
                    const priority  = priorityByNode[node.id] ?? "none";
                    const noteCount = periodNotes.filter(n => n.causeIds.includes(node.id)).length;
                    const pc        = PRIORITY_COLORS[priority];
                    return (
                        <div key={node.id} style={{
                            display: "flex", alignItems: "center", gap: 6,
                            padding: `5px 0 5px ${depth * 12}px`,
                            borderBottom: "1px solid #f8fafc",
                        }}>
                            <span style={{
                                fontSize: 11, color: "#334155", flex: 1,
                                overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
                            }}>{node.label}</span>
                            {noteCount > 0 && (
                                <span style={{
                                    fontSize: 9, color: "#94a3b8",
                                    background: "#f1f5f9", borderRadius: 999, padding: "1px 6px",
                                }}>{noteCount}</span>
                            )}
                            <select
                                value={priority}
                                onChange={e => onChangePriority(node.id, e.target.value as PriorityLevel)}
                                style={{
                                    fontSize: 9, padding: "2px 5px", borderRadius: 4,
                                    border: `1px solid ${pc.border}`,
                                    background: pc.bg, color: pc.text,
                                    cursor: "pointer", outline: "none",
                                }}
                            >
                                <option value="none">—</option>
                                <option value="low">Low</option>
                                <option value="medium">Med</option>
                                <option value="high">High</option>
                            </select>
                        </div>
                    );
                })}
            </div>
        </div>
    );
};

/* ── What Changed Section ─────────────────────────────────── */

const WhatChangedSection: React.FC<{
    periodNotes: NoteEntry[];
    periodChanges: PriorityChange[];
}> = ({ periodNotes, periodChanges }) => {
    const [open, setOpen] = React.useState(false);
    const hasAnything = periodNotes.length > 0 || periodChanges.length > 0;
    const summary = [
        periodNotes.length > 0 && `${periodNotes.length} obs`,
        periodChanges.length > 0 && `${periodChanges.length} priority change${periodChanges.length > 1 ? "s" : ""}`,
    ].filter(Boolean).join(" · ");

    return (
        <div style={{ marginBottom: 20 }}>
            <button
                onClick={() => setOpen(v => !v)}
                style={{
                    display: "flex", alignItems: "center", gap: 6, width: "100%",
                    background: "none", border: "none", cursor: "pointer", padding: 0, marginBottom: open ? 8 : 0,
                }}
            >
                <span style={{
                    fontSize: 9, fontWeight: 700, color: "#94a3b8",
                    textTransform: "uppercase", letterSpacing: "0.07em", flex: 1, textAlign: "left",
                }}>What Changed</span>
                {hasAnything && !open && (
                    <span style={{ fontSize: 10, color: "#64748b" }}>{summary}</span>
                )}
                <span style={{ fontSize: 9, color: "#cbd5e1" }}>{open ? "▾" : "▸"}</span>
            </button>
            {open && (
                !hasAnything ? (
                    <div style={{ fontSize: 11, color: "#94a3b8", fontStyle: "italic" }}>
                        Nothing recorded yet this period.
                    </div>
                ) : (
                    <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                        {periodNotes.length > 0 && (
                            <div style={{
                                display: "flex", alignItems: "center", gap: 7,
                                fontSize: 12, color: "#334155",
                                padding: "5px 8px", background: "#f8fafc",
                                borderRadius: 6, border: "1px solid #f1f5f9",
                            }}>
                                <span style={{ fontSize: 13 }}>✎</span>
                                <span><strong>{periodNotes.length}</strong> new observation{periodNotes.length > 1 ? "s" : ""}</span>
                            </div>
                        )}
                        {periodChanges.map(c => (
                            <div key={c.id} style={{
                                display: "flex", alignItems: "center", gap: 6,
                                fontSize: 12, color: "#334155",
                                padding: "5px 8px", background: "#f8fafc",
                                borderRadius: 6, border: "1px solid #f1f5f9",
                            }}>
                                <span style={{ fontSize: 12, color: "#94a3b8" }}>↑</span>
                                <span style={{ flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                                    <strong>{c.nodeLabel}</strong>
                                </span>
                                <PriorityBadge level={c.from} small />
                                <span style={{ fontSize: 9, color: "#94a3b8" }}>→</span>
                                <PriorityBadge level={c.to} small />
                            </div>
                        ))}
                    </div>
                )
            )}
        </div>
    );
};

/* ── Decisions Section ────────────────────────────────────── */

const DecisionsSection: React.FC<{
    items: ActionItem[];
    onUpdate: (items: ActionItem[]) => void;
    reviewPeriod: string;
    perspectiveRoles: PerspectiveRole[];
    personas: Persona[];
}> = ({ items, onUpdate, reviewPeriod, perspectiveRoles, personas }) => {
    const [draft, setDraft]           = React.useState("");
    const [draftOwner, setDraftOwner] = React.useState("");
    const [adding, setAdding]         = React.useState(false);

    const voiceOptions = perspectiveRoles.length > 0 ? perspectiveRoles : personas;
    const thisPeriod   = items.filter(i => i.period === reviewPeriod);
    const carryOver    = items.filter(i => i.period !== reviewPeriod && !i.done);

    const addItem = () => {
        if (!draft.trim()) return;
        onUpdate([...items, { id: `action-${Date.now()}`, text: draft.trim(), owner: draftOwner, period: reviewPeriod, done: false }]);
        setDraft(""); setDraftOwner(""); setAdding(false);
    };
    const toggle = (id: string) =>
        onUpdate(items.map(i => i.id === id ? { ...i, done: !i.done } : i));

    return (
        <div>
            <SectionHeader>Decisions & Actions</SectionHeader>
            {carryOver.length > 0 && (
                <div style={{ marginBottom: 10 }}>
                    <div style={{
                        fontSize: 8, fontWeight: 700, color: "#cbd5e1",
                        textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 4,
                    }}>Carry-over</div>
                    {carryOver.map(item => <ActionRow key={item.id} item={item} onToggle={() => toggle(item.id)} faded />)}
                </div>
            )}
            {thisPeriod.map(item => <ActionRow key={item.id} item={item} onToggle={() => toggle(item.id)} />)}
            {adding ? (
                <div style={{
                    background: "#f8fafc", borderRadius: 7, border: "1px solid #e2e8f0",
                    padding: 8, display: "flex", flexDirection: "column", gap: 6, marginTop: 6,
                }}>
                    <textarea
                        autoFocus value={draft}
                        onChange={e => setDraft(e.target.value)}
                        onKeyDown={e => {
                            if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); addItem(); }
                            if (e.key === "Escape") setAdding(false);
                        }}
                        placeholder="Describe the decision or action…"
                        rows={2}
                        style={{
                            fontSize: 11, lineHeight: 1.5, resize: "none",
                            border: "none", outline: "none", background: "transparent",
                            fontFamily: "inherit", width: "100%", boxSizing: "border-box", minHeight: 40,
                        }}
                    />
                    <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
                        <select
                            value={draftOwner} onChange={e => setDraftOwner(e.target.value)}
                            style={{
                                fontSize: 10, flex: 1, padding: "3px 6px", borderRadius: 4,
                                border: "1px solid #e2e8f0",
                                color: draftOwner ? "#334155" : "#94a3b8", background: "white",
                            }}
                        >
                            <option value="">Assign owner…</option>
                            {voiceOptions.map(v => <option key={v.id} value={v.name}>{v.name}</option>)}
                        </select>
                        <button onClick={addItem} style={{
                            fontSize: 10, padding: "3px 10px", borderRadius: 5,
                            border: "none", background: "#3b82f6", color: "white",
                            cursor: "pointer", fontWeight: 600, flexShrink: 0,
                        }}>Add</button>
                        <button onClick={() => setAdding(false)} style={{
                            fontSize: 10, padding: "3px 8px", borderRadius: 5,
                            border: "1px solid #e2e8f0", background: "white",
                            color: "#94a3b8", cursor: "pointer", flexShrink: 0,
                        }}>Cancel</button>
                    </div>
                </div>
            ) : (
                <button onClick={() => setAdding(true)} style={{
                    marginTop: 6, fontSize: 10, padding: "5px 10px", borderRadius: 5,
                    border: "1px dashed #cbd5e1", background: "transparent",
                    color: "#94a3b8", cursor: "pointer", width: "100%", textAlign: "left",
                }}>+ Add decision / action</button>
            )}
        </div>
    );
};

/* ── ActionRow ────────────────────────────────────────────── */

const ActionRow: React.FC<{ item: ActionItem; onToggle: () => void; faded?: boolean }> = ({ item, onToggle, faded }) => (
    <div style={{ display: "flex", alignItems: "flex-start", gap: 7, padding: "4px 0", opacity: faded || item.done ? 0.5 : 1 }}>
        <button onClick={onToggle} style={{
            width: 14, height: 14, borderRadius: 3, marginTop: 2, flexShrink: 0,
            border: `1.5px solid ${item.done ? "#22c55e" : "#cbd5e1"}`,
            background: item.done ? "#22c55e" : "white",
            cursor: "pointer", padding: 0,
            display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: 8, color: "white",
        }}>{item.done ? "✓" : ""}</button>
        <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 11, color: "#334155", lineHeight: 1.4, textDecoration: item.done ? "line-through" : "none" }}>{item.text}</div>
            {item.owner && <div style={{ fontSize: 9, color: "#94a3b8", marginTop: 1 }}>@{item.owner}</div>}
        </div>
    </div>
);
