// src/InterventionToCBuilderPane.tsx
import React from "react";
import type { TocBundle, ActivityItem } from "./tocTypes";

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

import { SortablePill } from "./SortablePill";
import Card from "./components/Card";

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
}

/**
 * Right-hand ToC / Intervention builder pane.
 * Assumes TocBundle has fields:
 *  - name, description
 *  - inputs: string[]
 *  - outputs: string[]
 *  - outcomes: string[]
 *  - activities: ActivityItem[]
 *  - assumptions?: { inputs: string[]; activities: string[]; outputs: string[]; outcomes: string[] }
 *  - risksExternal?: string
 *  - genderEquity?: string
 */
export const ToCBuilderPane: React.FC<Props> = ({
    bundle,
    focalCauses,
    onUpdateBundle,
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
            activationConstraint: { distance: 4 }, // avoid accidental drags on click
        })
    );

    type ColumnKey = "inputs" | "outputs" | "outcomes";

    const reorderColumn = (column: ColumnKey, fromIndex: number, toIndex: number) => {
        const currentArr = (bundle as any)[column] as string[] | undefined;
        if (!currentArr) return;

        const reordered = arrayMove(currentArr, fromIndex, toIndex);

        onUpdateBundle({
            ...bundle,
            [column]: reordered,
        });
    };

    const handleDragEnd = (event: DragEndEvent) => {
        const { active, over } = event;
        if (!over || active.id === over.id) return;

        const [activeCol, activeIndexStr] = String(active.id).split(":");
        const [overCol, overIndexStr] = String(over.id).split(":");

        if (activeCol !== overCol) return; // only reorder within same column

        const fromIndex = Number(activeIndexStr);
        const toIndex = Number(overIndexStr);

        // Handle activities reordering
        if (activeCol === "activities") {
            const currentActivities = bundle.activities || [];
            const reordered = arrayMove(currentActivities, fromIndex, toIndex);
            updateField("activities" as keyof TocBundle, reordered);
            return;
        }

        if (
            !["inputs", "outputs", "outcomes"].includes(activeCol) ||
            Number.isNaN(fromIndex) ||
            Number.isNaN(toIndex)
        ) {
            return;
        }

        reorderColumn(activeCol as ColumnKey, fromIndex, toIndex);
    };

    // ------------- GENERAL UPDATE HELPERS -------------

    const updateField = (field: keyof TocBundle, value: any) => {
        onUpdateBundle({
            ...bundle,
            [field]: value,
        });
    };

    const updateArrayField = (
        field: ColumnKey,
        updater: (arr: string[]) => string[]
    ) => {
        const current = ((bundle as any)[field] as string[]) || [];
        const next = updater(current);
        updateField(field, next);
    };

    // Inputs / Outputs / Outcomes

    const addArrayItem = (field: ColumnKey, defaultLabel: string) => {
        updateArrayField(field, (arr) => [...arr, defaultLabel]);
    };

    const changeArrayItem = (
        field: ColumnKey,
        idx: number,
        value: string
    ) => {
        updateArrayField(field, (arr) =>
            arr.map((v, i) => (i === idx ? value : v))
        );
    };

    const removeArrayItem = (field: ColumnKey, idx: number) => {
        updateArrayField(field, (arr) => arr.filter((_, i) => i !== idx));
    };

    // Activities & actors

    const updateActivities = (updateFn: (items: ActivityItem[]) => ActivityItem[]) => {
        const current = bundle.activities || [];
        const next = updateFn(current);
        updateField("activities" as keyof TocBundle, next);
    };

    const addActivity = () => {
        updateActivities((items) => [
            ...items,
            {
                id: `act-${Date.now()}`,
                label: "",
                actors: [],
            },
        ]);
    };

    const updateActivityLabel = (id: string, label: string) => {
        updateActivities((items) =>
            items.map((a) => (a.id === id ? { ...a, label } : a))
        );
    };

    const removeActivity = (id: string) => {
        updateActivities((items) => items.filter((a) => a.id !== id));
    };

    const addActor = (activityId: string, name: string) => {
        if (!name.trim()) return;

        // Check if actor already exists on this activity
        const activity = bundle.activities?.find((a) => a.id === activityId);
        if (activity?.actors?.includes(name.trim())) {
            return; // Don't add duplicate
        }

        // add to activity
        updateActivities((items) =>
            items.map((a) =>
                a.id === activityId
                    ? { ...a, actors: [...(a.actors || []), name.trim()] }
                    : a
            )
        );

        // also register actor globally on the bundle so it appears in the pick-list
        if (!(bundle.actors || []).includes(name.trim())) {
            updateField("actors" as keyof TocBundle, [...(bundle.actors || []), name.trim()]);
        }
    };

    const removeActor = (activityId: string, name: string) => {
        updateActivities((items) =>
            items.map((a) =>
                a.id === activityId
                    ? { ...a, actors: (a.actors || []).filter((n) => n !== name) }
                    : a
            )
        );
    };

    // Activity "add actor" draft inputs – keep local in this component
    const [actorDraftByActivity, setActorDraftByActivity] = React.useState<
        Record<string, string>
    >({});

    // UI state: per-activity add-actor toggle and mode
    const [isAddingActorByActivity, setIsAddingActorByActivity] = React.useState<
        Record<string, boolean>
    >({});

    const [addingNewActorByActivity, setAddingNewActorByActivity] = React.useState<
        Record<string, boolean>
    >({});

    // derive available actors (global bundle actors and any actors already used on activities)
    const availableActors = React.useMemo(() => {
        const set = new Set<string>();
        (bundle.actors || []).forEach((a) => set.add(a));
        (bundle.activities || []).forEach((act) => (act.actors || []).forEach((a) => set.add(a)));
        return Array.from(set).sort();
    }, [bundle]);

    const changeActorDraft = (activityId: string, value: string) => {
        setActorDraftByActivity((prev) => ({ ...prev, [activityId]: value }));
    };

    // Assumptions helpers – expects bundle.assumptions with keys per column
    const ensureAssumptions = () => {
        if (!bundle.assumptions) {
            return {
                inputs: [] as string[],
                activities: [] as string[],
                outputs: [] as string[],
                outcomes: [] as string[],
            };
        }
        return bundle.assumptions;
    };

    type AssumptionCol = "inputs" | "activities" | "outputs" | "outcomes";

    const updateAssumptionCol = (col: AssumptionCol, updater: (arr: string[]) => string[]) => {
        const current = ensureAssumptions();
        const nextCol = updater((current as any)[col] || []);
        const updated = { ...current, [col]: nextCol };
        updateField("assumptions" as keyof TocBundle, updated);
    };

    const addAssumption = (col: AssumptionCol) => {
        updateAssumptionCol(col, (arr) => [...arr, ""]);
    };

    const changeAssumption = (col: AssumptionCol, index: number, value: string) => {
        updateAssumptionCol(col, (arr) =>
            arr.map((v, i) => (i === index ? value : v))
        );
    };

    const removeAssumption = (col: AssumptionCol, index: number) => {
        updateAssumptionCol(col, (arr) => arr.filter((_, i) => i !== index));
    };

    const assumptions = ensureAssumptions();

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
                        className="input-line"
                        value={bundle.description || ""}
                        onChange={(e) => updateField("description", e.target.value)}
                        placeholder="Briefly describe this intervention..."
                        style={{ resize: "vertical", minHeight: "60px" }}
                    />
                </section>

                {/* Focal causes */}
                <section className="toc-section">
                    <div className="section-title">Focal causes</div>

                    {focalCauses.length === 0 ? (
                        <div className="focal-empty">
                            Select causes on the left to anchor this intervention.
                        </div>
                    ) : (
                        <div className="focal-causes-container">
                            {(() => {
                                const rows: FocalCauseInfo[][] = [];
                                for (let i = 0; i < focalCauses.length; i += 4) {
                                    rows.push(focalCauses.slice(i, i + 4));
                                }
                                return rows.map((row, rowIdx) => (
                                    <div key={rowIdx} className="focal-causes-row">
                                        {row.map((c) => (
                                            <div key={c.id} className="focal-card">
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
                                        ))}
                                    </div>
                                ));
                            })()}
                        </div>
                    )}
                </section>

                {/* LOGIC CHAIN */}
                <section className="toc-section">
                    <div className="section-title">Logic chain</div>
                    <p className="logic-subtitle">
                        Add inputs, activities, outputs, and outcomes, and note key
                        assumptions under the column where they matter.
                    </p>

                    <DndContext
                        sensors={sensors}
                        collisionDetection={closestCenter}
                        onDragEnd={handleDragEnd}
                    >
                        <div className="logic-row">
                            {/* Inputs column */}
                            <div className="logic-col">
                                <div className="logic-col-title">Inputs</div>

                                <SortableContext
                                    items={(bundle.inputs || []).map((_, idx) => `inputs:${idx}`)}
                                    strategy={verticalListSortingStrategy}
                                >
                                    {(bundle.inputs || []).map((value, index) => (
                                        <SortablePill key={`inputs:${index}`} id={`inputs:${index}`}>
                                            <div className="logic-pill">
                                                <Card
                                                    title={value}
                                                    placeholder="Input..."
                                                    editableTitle
                                                    onTitleChange={(v: string) => changeArrayItem("inputs", index, v)}
                                                    headerRight={<button type="button" onClick={() => removeArrayItem("inputs", index)}>✕</button>}
                                                    className="logic-card"
                                                />
                                            </div>
                                        </SortablePill>
                                    ))}
                                </SortableContext>

                                <button
                                    type="button"
                                    className="small-btn"
                                    onClick={() => addArrayItem("inputs", "")}
                                >
                                    + Add input
                                </button>

                                <div className="assumption-subtitle">Assumptions</div>
                                {(assumptions.inputs || []).map((val, idx) => (
                                    <div key={`ain-${idx}`} className="assumption-pill">
                                        <Card
                                            title={val}
                                            placeholder="Assumption..."
                                            editableTitle
                                            onTitleChange={(v: string) => changeAssumption("inputs", idx, v)}
                                            headerRight={<button type="button" onClick={() => removeAssumption("inputs", idx)}>✕</button>}
                                            className="logic-card"
                                        />
                                    </div>
                                ))}
                                <button
                                    type="button"
                                    className="tiny-btn"
                                    onClick={() => addAssumption("inputs")}
                                >
                                    + Add assumption
                                </button>
                            </div>

                            {/* Activities column */}
                            <div className="logic-col">
                                <div className="logic-col-title">Activities</div>

                                <SortableContext
                                    items={(bundle.activities || []).map((_, idx) => `activities:${idx}`)}
                                    strategy={verticalListSortingStrategy}
                                >
                                    {(bundle.activities || []).map((act, index) => (
                                        <SortablePill key={`activities:${index}`} id={`activities:${index}`}>
                                            <div className="activity-pill">
                                                <Card
                                                    title={act.label}
                                                    placeholder="Activity..."
                                                    editableTitle
                                                    onTitleChange={(v: string) => updateActivityLabel(act.id, v)}
                                                    headerRight={<button type="button" onClick={() => removeActivity(act.id)}>✕</button>}
                                                    className="activity-card"
                                                >
                                                    <div className="activity-actor-row">
                                                        <span className="activity-actor-label">Actors:</span>
                                                        <div>
                                                            <div className="actor-chip-row">
                                                                {(act.actors || []).map((actorName) => (
                                                                    <span key={actorName} className="actor-chip">
                                                                        {actorName}
                                                                        <button
                                                                            type="button"
                                                                            onClick={() => removeActor(act.id, actorName)}
                                                                        >
                                                                            ✕
                                                                        </button>
                                                                    </span>
                                                                ))}
                                                            </div>

                                                            <div className="activity-actor-add">
                                                                {!isAddingActorByActivity[act.id] ? (
                                                                    <button
                                                                        type="button"
                                                                        className="tiny-btn"
                                                                        onClick={() => setIsAddingActorByActivity((p) => ({ ...p, [act.id]: true }))}
                                                                    >
                                                                        + Add actor
                                                                    </button>
                                                                ) : (
                                                                    <div className="actor-add-ui">
                                                                        {!addingNewActorByActivity[act.id] ? (
                                                                            <div className="actor-select-row">
                                                                                <select
                                                                                    autoFocus
                                                                                    value=""
                                                                                    onChange={(e) => {
                                                                                        const v = e.target.value;
                                                                                        if (v === "__new__") {
                                                                                            setAddingNewActorByActivity((p) => ({ ...p, [act.id]: true }));
                                                                                        } else if (v) {
                                                                                            addActor(act.id, v);
                                                                                            setIsAddingActorByActivity((p) => ({ ...p, [act.id]: false }));
                                                                                        }
                                                                                    }}
                                                                                >
                                                                                    <option value="">Select actor...</option>
                                                                                    {availableActors.map((a) => (
                                                                                        <option key={a} value={a}>{a}</option>
                                                                                    ))}
                                                                                    <option value="__new__">Add new...</option>
                                                                                </select>
                                                                                <button type="button" className="tiny-btn" onClick={() => setIsAddingActorByActivity((p) => ({ ...p, [act.id]: false }))}>Cancel</button>
                                                                            </div>
                                                                        ) : (
                                                                            <div className="actor-input-row">
                                                                                <input
                                                                                    autoFocus
                                                                                    value={actorDraftByActivity[act.id] || ""}
                                                                                    placeholder="Actor name..."
                                                                                    onChange={(e) => changeActorDraft(act.id, e.target.value)}
                                                                                    onKeyDown={(e) => {
                                                                                        if (e.key === "Enter") {
                                                                                            e.preventDefault();
                                                                                            const draft = actorDraftByActivity[act.id];
                                                                                            if (draft && draft.trim()) {
                                                                                                addActor(act.id, draft);
                                                                                                setActorDraftByActivity((p) => ({ ...p, [act.id]: "" }));
                                                                                                setIsAddingActorByActivity((p) => ({ ...p, [act.id]: false }));
                                                                                                setAddingNewActorByActivity((p) => ({ ...p, [act.id]: false }));
                                                                                            }
                                                                                        } else if (e.key === "Escape") {
                                                                                            // cancel on Escape
                                                                                            setIsAddingActorByActivity((p) => ({ ...p, [act.id]: false }));
                                                                                            setAddingNewActorByActivity((p) => ({ ...p, [act.id]: false }));
                                                                                            setActorDraftByActivity((p) => ({ ...p, [act.id]: "" }));
                                                                                        }
                                                                                    }}
                                                                                />
                                                                                <button
                                                                                    type="button"
                                                                                    className="icon-btn"
                                                                                    title="Add actor"
                                                                                    onClick={() => {
                                                                                        const draft = actorDraftByActivity[act.id];
                                                                                        if (draft && draft.trim()) {
                                                                                            addActor(act.id, draft);
                                                                                            setActorDraftByActivity((p) => ({ ...p, [act.id]: "" }));
                                                                                            setIsAddingActorByActivity((p) => ({ ...p, [act.id]: false }));
                                                                                            setAddingNewActorByActivity((p) => ({ ...p, [act.id]: false }));
                                                                                        }
                                                                                    }}
                                                                                >
                                                                                    ＋
                                                                                </button>
                                                                                <button
                                                                                    type="button"
                                                                                    className="icon-btn"
                                                                                    title="Cancel"
                                                                                    onClick={() => {
                                                                                        setIsAddingActorByActivity((p) => ({ ...p, [act.id]: false }));
                                                                                        setAddingNewActorByActivity((p) => ({ ...p, [act.id]: false }));
                                                                                        setActorDraftByActivity((p) => ({ ...p, [act.id]: "" }));
                                                                                    }}
                                                                                >
                                                                                    ✕
                                                                                </button>
                                                                            </div>
                                                                        )}
                                                                    </div>
                                                                )}
                                                            </div>
                                                        </div>
                                                    </div>
                                                </Card>
                                            </div>
                                        </SortablePill>
                                    ))}
                                </SortableContext>

                                <button
                                    type="button"
                                    className="small-btn"
                                    onClick={addActivity}
                                >
                                    + Add activity
                                </button>

                                <div className="assumption-subtitle">Assumptions</div>
                                {(assumptions.activities || []).map((val, idx) => (
                                    <div key={`aact-${idx}`} className="assumption-pill">
                                        <Card
                                            title={val}
                                            placeholder="Assumption..."
                                            editableTitle
                                            onTitleChange={(v: string) => changeAssumption("activities", idx, v)}
                                            headerRight={<button type="button" onClick={() => removeAssumption("activities", idx)}>✕</button>}
                                            className="logic-card"
                                        />
                                    </div>
                                ))}
                                <button
                                    type="button"
                                    className="tiny-btn"
                                    onClick={() => addAssumption("activities")}
                                >
                                    + Add assumption
                                </button>
                            </div>

                            {/* Outputs column */}
                            <div className="logic-col">
                                <div className="logic-col-title">Outputs</div>

                                <SortableContext
                                    items={(bundle.outputs || []).map((_, idx) => `outputs:${idx}`)}
                                    strategy={verticalListSortingStrategy}
                                >
                                    {(bundle.outputs || []).map((value, index) => (
                                        <SortablePill
                                            key={`outputs:${index}`}
                                            id={`outputs:${index}`}
                                        >
                                            <div className="logic-pill">
                                                <Card
                                                    title={value}
                                                    placeholder="Output..."
                                                    editableTitle
                                                    onTitleChange={(v: string) => changeArrayItem("outputs", index, v)}
                                                    headerRight={<button type="button" onClick={() => removeArrayItem("outputs", index)}>✕</button>}
                                                    className="logic-card"
                                                />
                                            </div>
                                        </SortablePill>
                                    ))}
                                </SortableContext>

                                <button
                                    type="button"
                                    className="small-btn"
                                    onClick={() => addArrayItem("outputs", "")}
                                >
                                    + Add output
                                </button>

                                <div className="assumption-subtitle">Assumptions</div>
                                {(assumptions.outputs || []).map((val, idx) => (
                                    <div key={`aout-${idx}`} className="assumption-pill">
                                        <Card
                                            title={val}
                                            placeholder="Assumption..."
                                            editableTitle
                                            onTitleChange={(v: string) => changeAssumption("outputs", idx, v)}
                                            headerRight={<button type="button" onClick={() => removeAssumption("outputs", idx)}>✕</button>}
                                            className="logic-card"
                                        />
                                    </div>
                                ))}
                                <button
                                    type="button"
                                    className="tiny-btn"
                                    onClick={() => addAssumption("outputs")}
                                >
                                    + Add assumption
                                </button>
                            </div>

                            {/* Outcomes column */}
                            <div className="logic-col">
                                <div className="logic-col-title">Outcomes</div>

                                <SortableContext
                                    items={(bundle.outcomes || []).map(
                                        (_, idx) => `outcomes:${idx}`
                                    )}
                                    strategy={verticalListSortingStrategy}
                                >
                                    {(bundle.outcomes || []).map((value, index) => (
                                        <SortablePill
                                            key={`outcomes:${index}`}
                                            id={`outcomes:${index}`}
                                        >
                                            <div className="logic-pill">
                                                <Card
                                                    title={value}
                                                    placeholder="Outcome..."
                                                    editableTitle
                                                    onTitleChange={(v: string) => changeArrayItem("outcomes", index, v)}
                                                    headerRight={<button type="button" onClick={() => removeArrayItem("outcomes", index)}>✕</button>}
                                                    className="logic-card"
                                                />
                                            </div>
                                        </SortablePill>
                                    ))}
                                </SortableContext>

                                <button
                                    type="button"
                                    className="small-btn"
                                    onClick={() => addArrayItem("outcomes", "")}
                                >
                                    + Add outcome
                                </button>

                                <div className="assumption-subtitle">Assumptions</div>
                                {(assumptions.outcomes || []).map((val, idx) => (
                                    <div key={`aoutc-${idx}`} className="assumption-pill">
                                        <Card
                                            title={val}
                                            placeholder="Assumption..."
                                            editableTitle
                                            onTitleChange={(v: string) => changeAssumption("outcomes", idx, v)}
                                            headerRight={<button type="button" onClick={() => removeAssumption("outcomes", idx)}>✕</button>}
                                            className="logic-card"
                                        />
                                    </div>
                                ))}
                                <button
                                    type="button"
                                    className="tiny-btn"
                                    onClick={() => addAssumption("outcomes")}
                                >
                                    + Add assumption
                                </button>
                            </div>
                        </div>
                    </DndContext>
                </section>

                {/* Risks & external factors */}
                <section className="toc-section">
                    <div className="section-title">Risks & external factors</div>
                    <textarea
                        className="textarea"
                        value={bundle.risks || ""}
                        onChange={(e) => updateField("risks", e.target.value)}
                        placeholder="Contextual risks..."
                    />
                </section>

                {/* Gender & equity section removed per request */}
            </div>
        </div>
    );
};