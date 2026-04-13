// src/NotesPane.tsx
import React from "react";
import type { RCANode, PriorityLevel, Persona, FishboneGroup, PerspectiveRole, NoteEntry } from "./types";
import { findNode } from "./utils";
import { ClipboardList } from "lucide-react";
import { IndicatorPanel } from "./IndicatorPanel";
import { IndicatorDetailPanel, MultiIndicatorView } from "./IndicatorDetailPanel";
import { NoteLog } from "./NoteLog";
import type { Annotation } from "./IndicatorDetailPanel";
import type { TocBundle } from "./tocTypes";

interface Props {
    root: RCANode;
    selectedNodeId: string | null;

    notes: NoteEntry[];
    onUpdateNotes: (notes: NoteEntry[]) => void;
    reviewPeriod: string;
    onChangeReviewPeriod?: (period: string) => void;

    priority: PriorityLevel;
    onChangePriority: (level: PriorityLevel) => void;

    personas: Persona[];
    onAddPersona?: (name: string) => Persona;
    onUpdatePersonas: (personas: Persona[]) => void;
    onUpdateNodePersonas: (nodeId: string, personaIds: string[]) => void;
    personaColors?: string[];
    groups?: FishboneGroup[];
    perspectiveRoles?: PerspectiveRole[];
    indicatorGroupOverrides?: Record<string, string>;
    tocBundles?: Record<string, TocBundle>;
}

export const NotesPane: React.FC<Props> = ({
    root,
    selectedNodeId,
    notes,
    onUpdateNotes,
    reviewPeriod,
    onChangeReviewPeriod,
    priority,
    onChangePriority,
    personas,
    onAddPersona,
    onUpdatePersonas: _onUpdatePersonas,
    onUpdateNodePersonas: _onUpdateNodePersonas,
    groups = [],
    perspectiveRoles,
    indicatorGroupOverrides,
    tocBundles,
}) => {
    const [selectedIndicatorId, setSelectedIndicatorId] = React.useState<string | null>(null);
    const [annotationMap, setAnnotationMap] = React.useState<Record<string, Annotation[]>>({});
    const [multiViewOpen, setMultiViewOpen] = React.useState(false);
    const [multiViewInitialId, setMultiViewInitialId] = React.useState<string | null>(null);

    const handleExpandIndicator = (id: string) => {
        setMultiViewInitialId(id);
        setMultiViewOpen(true);
    };

    const handleAddAnnotation = (indicatorId: string, ann: Omit<Annotation, "id">) => {
        const newAnn: Annotation = { ...ann, id: `ann-${Date.now()}` };
        setAnnotationMap(prev => ({ ...prev, [indicatorId]: [...(prev[indicatorId] ?? []), newAnn] }));
    };

    const handleDeleteAnnotation = (indicatorId: string, annId: string) => {
        setAnnotationMap(prev => ({ ...prev, [indicatorId]: (prev[indicatorId] ?? []).filter(a => a.id !== annId) }));
    };

    return (
        <>
        <div className="pane pane-narrow">
            <div className="pane-header">
                <span className="pane-title">
                    <ClipboardList size={16} />
                    Indicators / Observations
                </span>
                <button
                    onClick={() => handleExpandIndicator(selectedIndicatorId ?? "")}
                    title="Open multi-indicator view"
                    style={{
                        width: 22, height: 22, border: "1px solid #e2e8f0",
                        borderRadius: 5, background: "#f8fafc", cursor: "pointer",
                        display: "flex", alignItems: "center", justifyContent: "center",
                        fontSize: 11, color: "#94a3b8", padding: 0, flexShrink: 0,
                        marginLeft: "auto",
                    }}
                >⛶</button>
            </div>

            {/* Top half: Indicators — scrollable */}
            <div style={{ flex: 1, minHeight: 0, overflow: "auto", borderBottom: "2px solid #e2e8f0" }}>
                <IndicatorPanel
                    tocBundles={tocBundles}
                    groups={groups}
                    onSelectIndicator={setSelectedIndicatorId}
                    selectedIndicatorId={selectedIndicatorId}
                />
            </div>

            {/* Bottom half: Priority + Note Log */}
            <div style={{ flex: 1, minHeight: 0, display: "flex", flexDirection: "column" }}>

            {/* Priority strip — only when a node is selected */}
            {selectedNodeId && (
                <div style={{
                    padding: "6px 12px", borderBottom: "1px solid #e2e8f0",
                    background: "#f8fafc", display: "flex", alignItems: "center",
                    gap: 6, flexShrink: 0,
                }}>
                    <span style={{ fontSize: 11, color: "#4b5563" }}>Priority:</span>
                    <PriorityChip label="Low"  level="low"    current={priority} onClick={onChangePriority} />
                    <PriorityChip label="Med"  level="medium" current={priority} onClick={onChangePriority} />
                    <PriorityChip label="High" level="high"   current={priority} onClick={onChangePriority} />
                    <button className="small-btn" style={{ marginLeft: "auto", fontSize: 10 }}
                        onClick={() => onChangePriority("none")}>Clear</button>
                </div>
            )}

            {/* Note Log */}
            <div style={{ flex: 1, minHeight: 0, overflow: "hidden", display: "flex", flexDirection: "column" }}>
                <NoteLog
                    notes={notes}
                    onUpdate={onUpdateNotes}
                    reviewPeriod={reviewPeriod}
                    onChangeReviewPeriod={onChangeReviewPeriod}
                    root={root}
                    personas={personas}
                    onAddPersona={onAddPersona}
                    perspectiveRoles={perspectiveRoles}
                    filterNodeId={selectedNodeId ?? undefined}
                />
            </div>

            </div>
        </div>
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
        </>
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