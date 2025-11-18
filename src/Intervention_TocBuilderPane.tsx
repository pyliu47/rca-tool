// src/InterventionToCBuilderPane.tsx
import React from "react";
import type { TocBundle, ActivityItem, OutcomeItem } from "./tocTypes";

import {
    DndContext,
    closestCenter,
    PointerSensor,
    useSensor,
    useSensors,
    type DragEndEvent,
} from "@dnd-kit/core";
import {
    SortableContext,
    verticalListSortingStrategy,
    arrayMove,
} from "@dnd-kit/sortable";
import { Zap, Target } from "lucide-react";

import { SortablePill } from "./SortablePill";
import Card from "./components/Card";
import { TocDiagramWithTitle } from "./TocDiagram";

// --------- Props ---------

export interface FocalCauseInfo {
    id: string;
    categoryLabel: string;
    causeLabel: string;
    underlyingCauses?: string[];
}

interface Props {
    bundle: TocBundle | null;
    focalCauses: FocalCauseInfo[];
    onUpdateBundle: (bundle: TocBundle) => void;
    selectedItemId: string | null;
    onSelectItem: (id: string | null) => void;
}

// Helper function to get tier label
const getTierLabel = (tier?: number): string => {
    const tierNames: Record<number, string> = {
        1: "Short-term",
        2: "Intermediate",
        3: "Long-term",
    };
    return tier ? tierNames[tier] : "Unset";
};

/**
 * Theory of Change / Intervention builder pane.
 * New structure: Causes (focal) → Activities → Outcomes
 */
export const ToCBuilderPane: React.FC<Props> = ({
    bundle,
    focalCauses,
    onUpdateBundle,
    selectedItemId,
    onSelectItem,
}) => {
    // If no bundle selected => show placeholder
    if (!bundle) {
        return (
            <div className="intervention-workspace">
                <div className="no-bundle-selected">
                    Create or select an intervention to begin
                </div>
            </div>
        );
    }

    // ------------- DRAG & DROP SETUP -------------

    const sensors = useSensors(
        useSensor(PointerSensor, {
            activationConstraint: { distance: 4 },
        })
    );

    const handleDragEnd = (event: DragEndEvent) => {
        const { active, over } = event;
        if (!over || active.id === over.id) return;

        const activeId = String(active.id);
        const overId = String(over.id);

        // Handle activities reordering
        if (activeId.startsWith("activity:") && overId.startsWith("activity:")) {
            const activeIdx = Number(activeId.split(":")[1]);
            const overIdx = Number(overId.split(":")[1]);

            if (!Number.isNaN(activeIdx) && !Number.isNaN(overIdx)) {
                const reordered = arrayMove(bundle.activities || [], activeIdx, overIdx);
                onUpdateBundle({ ...bundle, activities: reordered });
            }
            return;
        }

        // Handle outcomes reordering
        if (activeId.startsWith("outcome:") && overId.startsWith("outcome:")) {
            const activeIdx = Number(activeId.split(":")[1]);
            const overIdx = Number(overId.split(":")[1]);

            if (!Number.isNaN(activeIdx) && !Number.isNaN(overIdx)) {
                const reordered = arrayMove(bundle.outcomes || [], activeIdx, overIdx);
                onUpdateBundle({ ...bundle, outcomes: reordered });
            }
            return;
        }
    };

    // ------------- UPDATE HELPERS -------------

    const updateField = (field: keyof TocBundle, value: any) => {
        onUpdateBundle({
            ...bundle,
            [field]: value,
        });
    };

    // Activities
    const addActivity = () => {
        const newActivity: ActivityItem = {
            id: `act-${Date.now()}`,
            label: "",
            description: "",
            actors: [],
            inputIds: [],
            outputIds: [],
            assumptionIds: [],
            inputs: [],
            outputs: [],
            assumptions: [],
        };
        updateField("activities", [...(bundle.activities || []), newActivity]);
    };

    const updateActivity = (id: string, updates: Partial<ActivityItem>) => {
        const updated = (bundle.activities || []).map((a) =>
            a.id === id ? { ...a, ...updates } : a
        );
        updateField("activities", updated);
    };

    const removeActivity = (id: string) => {
        const filtered = (bundle.activities || []).filter((a) => a.id !== id);
        updateField("activities", filtered);
    };

    // Outcomes
    const addOutcome = () => {
        const newOutcome: OutcomeItem = {
            id: `outcome-${Date.now()}`,
            label: "",
            description: "",
            tier: undefined,
            contributingActivityIds: [],
        };
        updateField("outcomes", [...(bundle.outcomes || []), newOutcome]);
    };

    const updateOutcome = (id: string, updates: Partial<OutcomeItem>) => {
        const updated = (bundle.outcomes || []).map((o) =>
            o.id === id ? { ...o, ...updates } : o
        );
        updateField("outcomes", updated);
    };

    const removeOutcome = (id: string) => {
        const filtered = (bundle.outcomes || []).filter((o) => o.id !== id);
        updateField("outcomes", filtered);
    };

    // Local state for reordering focal causes (UI-only, no backend update)
    const [focalCausesOrder] = React.useState<string[]>(
        focalCauses.map((c) => c.id)
    );

    // Reorder display based on local state
    const orderedFocalCauses = React.useMemo(() => {
        const ordered: FocalCauseInfo[] = [];
        for (const id of focalCausesOrder) {
            const cause = focalCauses.find((c) => c.id === id);
            if (cause) ordered.push(cause);
        }
        // Add any new causes that weren't in the order
        for (const cause of focalCauses) {
            if (!ordered.find((c) => c.id === cause.id)) {
                ordered.push(cause);
            }
        }
        return ordered;
    }, [focalCausesOrder, focalCauses]);

    // -----------------------------------
    // RENDER
    // -----------------------------------

    return (
        <div className="intervention-workspace">
            <div className="toc-pane">
                {/* Name + description */}
                <section className="toc-section">
                    <div className="section-title">Intervention Name</div>
                    <input
                        className="input-line"
                        value={bundle.name || ""}
                        onChange={(e) => updateField("name", e.target.value)}
                        placeholder="Intervention name..."
                    />

                    <div className="section-title">Description</div>
                    <textarea
                        className="textarea"
                        value={bundle.description || ""}
                        onChange={(e) => updateField("description", e.target.value)}
                        placeholder="Briefly describe this intervention..."
                    />
                </section>

                {/* Focal causes */}
                <section className="toc-section">
                    <div className="section-title">Focal causes</div>

                    {orderedFocalCauses.length === 0 ? (
                        <div className="focal-empty">
                            Select causes on the left to anchor this intervention.
                        </div>
                    ) : (
                        <DndContext
                            sensors={sensors}
                            collisionDetection={closestCenter}
                            onDragEnd={handleDragEnd}
                        >
                            <SortableContext
                                items={orderedFocalCauses.map((_, idx) => `focal:${idx}`)}
                                strategy={verticalListSortingStrategy}
                            >
                                <div className="focal-causes-container">
                                    {(() => {
                                        const rows: (FocalCauseInfo & { index: number })[][] = [];
                                        for (let i = 0; i < orderedFocalCauses.length; i += 4) {
                                            rows.push(
                                                orderedFocalCauses.slice(i, i + 4).map((c, colIdx) => ({
                                                    ...c,
                                                    index: i + colIdx,
                                                }))
                                            );
                                        }
                                        return rows.map((row, rowIdx) => (
                                            <div key={rowIdx} className="focal-causes-row">
                                                {row.map((c) => (
                                                    <SortablePill key={`focal:${c.index}`} id={`focal:${c.index}`}>
                                                        <div className="focal-card">
                                                            <div className="focal-cause-header">
                                                                <div className="focal-cause-label">
                                                                    {c.causeLabel}
                                                                </div>
                                                                {c.categoryLabel && (
                                                                    <div className="focal-category">
                                                                        {c.categoryLabel}
                                                                    </div>
                                                                )}
                                                            </div>
                                                            {c.underlyingCauses && c.underlyingCauses.length > 0 && (
                                                                <ul className="underlying-list">
                                                                    {c.underlyingCauses.map((u, idx) => (
                                                                        <li key={idx} className="underlying-item">
                                                                            {u}
                                                                        </li>
                                                                    ))}
                                                                </ul>
                                                            )}
                                                        </div>
                                                    </SortablePill>
                                                ))}
                                            </div>
                                        ));
                                    })()}
                                </div>
                            </SortableContext>
                        </DndContext>
                    )}
                </section>

                {/* THREE-COLUMN LAYOUT: Activities and Outcomes */}
                <section className="toc-section">
                    <div className="section-title" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <Zap size={16} />
                        Activities
                    </div>

                    {(bundle.activities || []).length === 0 ? (
                        <div style={{
                            padding: '16px',
                            backgroundColor: '#f0fdf4',
                            borderRadius: '8px',
                            border: '1px solid #dcfce7',
                            marginBottom: '12px'
                        }}>
                            <div style={{ fontSize: '13px', fontWeight: 600, color: '#166534', marginBottom: '8px' }}>
                                How might we achieve this through action?
                            </div>
                            <div style={{ fontSize: '12px', color: '#4b5563', lineHeight: '1.5', marginBottom: '12px' }}>
                                <p style={{ margin: '0 0 8px 0' }}>
                                    <strong>If</strong> we implement activities that directly address the focal causes, <strong>then</strong> we'll move toward the desired outcomes.
                                </p>
                                <p style={{ margin: '0 0 8px 0' }}>
                                    Consider what your team or organization needs to <em>do</em>:
                                </p>
                                <ul style={{ margin: '8px 0', paddingLeft: '20px' }}>
                                    <li>Train or build capacity (e.g., "Train staff on inventory management")</li>
                                    <li>Distribute resources or tools (e.g., "Provide cold chain equipment")</li>
                                    <li>Establish new processes (e.g., "Set up data monitoring system")</li>
                                    <li>Conduct awareness or engagement (e.g., "Community health education campaign")</li>
                                </ul>
                            </div>
                        </div>
                    ) : null}

                    <DndContext
                        sensors={sensors}
                        collisionDetection={closestCenter}
                        onDragEnd={handleDragEnd}
                    >
                        <div className="logic-row">
                            {/* Activities column */}
                            <div className="logic-col">
                                <SortableContext
                                    items={(bundle.activities || []).map((_, idx) => `activity:${idx}`)}
                                    strategy={verticalListSortingStrategy}
                                >
                                    <div className="logic-col-items">
                                        {(bundle.activities || []).map((activity, index) => (
                                            <SortablePill key={`activity:${index}`} id={`activity:${index}`}>
                                                <div
                                                    className={`activity-pill ${selectedItemId === `activity:${activity.id}` ? 'selected' : ''}`}
                                                    onClick={() => onSelectItem(`activity:${activity.id}`)}
                                                >
                                                    <Card
                                                        title={activity.label}
                                                        placeholder="Activity..."
                                                        editableTitle
                                                        onTitleChange={(v: string) => updateActivity(activity.id, { label: v })}
                                                        headerRight={<button type="button" onClick={() => removeActivity(activity.id)}>✕</button>}
                                                        className="activity-card"
                                                    >
                                                        <div style={{ fontSize: '11px', color: '#64748b' }}>
                                                            {(activity.actors || []).length > 0 && (
                                                                <div>{(activity.actors || []).join(", ")}</div>
                                                            )}
                                                        </div>
                                                    </Card>
                                                </div>
                                            </SortablePill>
                                        ))}
                                    </div>
                                </SortableContext>

                                <button
                                    type="button"
                                    className="small-btn"
                                    onClick={addActivity}
                                    style={{ width: '100%', marginBottom: '10px' }}
                                >
                                    + Add activity
                                </button>
                            </div>
                        </div>
                    </DndContext>
                </section>

                {/* Outcomes Section */}
                <section className="toc-section">
                    <div className="section-title" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <Target size={16} />
                        Outcomes
                    </div>

                    {(bundle.outcomes || []).length === 0 ? (
                        <div style={{
                            padding: '16px',
                            backgroundColor: '#fef3c7',
                            borderRadius: '8px',
                            border: '1px solid #fde68a',
                            marginBottom: '12px'
                        }}>
                            <div style={{ fontSize: '13px', fontWeight: 600, color: '#92400e', marginBottom: '8px' }}>
                                What changes do we expect to see?
                            </div>
                            <div style={{ fontSize: '12px', color: '#4b5563', lineHeight: '1.5', marginBottom: '12px' }}>
                                <p style={{ margin: '0 0 8px 0' }}>
                                    <strong>If</strong> our activities are successful, <strong>then</strong> we should observe these specific improvements or changes in behavior, capacity, or conditions.
                                </p>
                                <p style={{ margin: '0 0 8px 0' }}>
                                    Good outcomes describe the <em>state of change</em>, not the activity itself:
                                </p>
                                <ul style={{ margin: '8px 0', paddingLeft: '20px' }}>
                                    <li><strong>What improves:</strong> "Improved vaccine cold chain management"</li>
                                    <li><strong>Who changes:</strong> "Staff confidence in inventory procedures"</li>
                                    <li><strong>How systems shift:</strong> "Reduced product wastage due to temperature excursions"</li>
                                    <li><strong>Access/equity increases:</strong> "Equitable vaccine access across all service points"</li>
                                </ul>
                            </div>
                        </div>
                    ) : null}

                    <DndContext
                        sensors={sensors}
                        collisionDetection={closestCenter}
                        onDragEnd={handleDragEnd}
                    >
                        <div className="logic-row">
                            {/* Outcomes column */}
                            <div className="logic-col">
                                <SortableContext
                                    items={(bundle.outcomes || []).map((_, idx) => `outcome:${idx}`)}
                                    strategy={verticalListSortingStrategy}
                                >
                                    <div className="logic-col-items">
                                        {(bundle.outcomes || []).map((outcome, index) => (
                                            <SortablePill key={`outcome:${index}`} id={`outcome:${index}`}>
                                                <div
                                                    className={`activity-pill ${selectedItemId === `outcome:${outcome.id}` ? 'selected' : ''}`}
                                                    onClick={() => onSelectItem(`outcome:${outcome.id}`)}
                                                >
                                                    <Card
                                                        title={outcome.label}
                                                        placeholder="Outcome..."
                                                        editableTitle
                                                        onTitleChange={(v: string) => updateOutcome(outcome.id, { label: v })}
                                                        headerRight={<button type="button" onClick={() => removeOutcome(outcome.id)}>✕</button>}
                                                        className="activity-card"
                                                    >
                                                        <div style={{ fontSize: '11px', color: '#64748b' }}>
                                                            {outcome.tier && <div>{getTierLabel(outcome.tier)}</div>}
                                                        </div>
                                                    </Card>
                                                </div>
                                            </SortablePill>
                                        ))}
                                    </div>
                                </SortableContext>

                                <button
                                    type="button"
                                    className="small-btn"
                                    onClick={addOutcome}
                                    style={{ width: '100%', marginBottom: '10px' }}
                                >
                                    + Add outcome
                                </button>
                            </div>
                        </div>
                    </DndContext>
                </section>

                {/* Theory of Change Diagram */}
                <section className="toc-section">
                    <TocDiagramWithTitle bundle={bundle} focalCauses={orderedFocalCauses} />
                </section>
            </div>
        </div>
    );
};
