// src/InterventionLayout.tsx
import React from "react";
import {
    DndContext,
    closestCenter,
    KeyboardSensor,
    PointerSensor,
    useSensor,
    useSensors,
} from "@dnd-kit/core";
import { arrayMove, SortableContext, sortableKeyboardCoordinates, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { Users, ArrowDown, ArrowUp, AlertCircle, Target, Zap, Gauge } from "lucide-react";
import { CausesPane } from "./Intervention_CausesPane.tsx";
import { ToCBuilderPane, type FocalCauseInfo } from "./Intervention_TocBuilderPane.tsx";
import type { RCANode } from "./types";
import type { TocBundle, ActivityItem, OutcomeItem } from "./tocTypes.tsx";

interface Props {
    root: RCANode;
    tocBundles: Record<string, TocBundle>;
    tocOrder: string[];
    reorderTocBundles: (fromIndex: number, toIndex: number) => void;
    activeBundleId: string | null;
    setActiveBundleId: (id: string | null) => void;
    createNewBundle: () => void;
    updateBundle: (id: string, fn: (b: TocBundle) => TocBundle) => void;
}

type TocSelectionType = "none" | "activity" | "input" | "output" | "outcome";

interface TocSelected {
    type: TocSelectionType;
    bundleId: string | null;
    itemId: string | null; // activity/outcome ID
}

const InterventionLayout: React.FC<Props> = ({
    root,
    tocBundles,
    tocOrder,
    reorderTocBundles,
    activeBundleId,
    setActiveBundleId,
    createNewBundle,
    updateBundle,
}) => {
    const bundle = activeBundleId ? tocBundles[activeBundleId] : null;

    // State for which item is selected in the design view
    const [tocSelected, setTocSelected] = React.useState<TocSelected>({
        type: "none",
        bundleId: null,
        itemId: null,
    });

    // State for details pane visibility
    const [detailsPaneOpen, setDetailsPaneOpen] = React.useState(false);

    // Build focalCauses from bundle.causeIds
    const focalCauses: FocalCauseInfo[] = React.useMemo(() => {
        if (!bundle) return [];

        const causes: FocalCauseInfo[] = [];

        bundle.causeIds.forEach((causeId) => {
            // Find the cause in the RCA tree
            for (const category of root.children) {
                const cause = category.children.find((c) => c.id === causeId);
                if (cause) {
                    causes.push({
                        id: cause.id,
                        categoryLabel: category.label,
                        causeLabel: cause.label,
                        underlyingCauses: cause.children?.map((c) => c.label) || [],
                    });
                    return; // Move to next causeId
                }
            }
        });

        return causes;
    }, [bundle, root]);

    // Helper to parse selectedItemId and get the actual item details
    const getSelectedItemDetails = () => {
        if (!tocSelected.itemId || !bundle || tocSelected.bundleId !== activeBundleId) {
            return null;
        }

        const [type, id] = tocSelected.itemId.split(":");

        if (type === "activity") {
            const activity = (bundle.activities || []).find((a) => a.id === id);
            return activity ? { type: "activity" as const, item: activity } : null;
        } else if (type === "outcome") {
            const outcome = (bundle.outcomes || []).find((o) => o.id === id);
            return outcome ? { type: "outcome" as const, item: outcome } : null;
        }

        return null;
    };

    const selectedDetails = getSelectedItemDetails();

    // Handle selection from the builder pane
    const handleSelectItem = (selection: string | null) => {
        if (!selection || !activeBundleId) {
            setTocSelected({ type: "none", bundleId: null, itemId: null });
            setDetailsPaneOpen(false);
            return;
        }

        const [type] = selection.split(":");

        if (type === "activity" || type === "outcome") {
            setTocSelected({
                type: type as TocSelectionType,
                bundleId: activeBundleId,
                itemId: selection,
            });
            setDetailsPaneOpen(true);
        }
    };

    return (
        <div className="intervention-main">
            {/* LEFT SIDEBAR */}
            <div className="intervention-sidebar">
                <CausesPane
                    root={root}
                    tocBundles={tocBundles}
                    tocOrder={tocOrder}
                    reorderTocBundles={reorderTocBundles}
                    activeBundleId={activeBundleId}
                    setActiveBundleId={setActiveBundleId}
                    createNewBundle={createNewBundle}
                    updateBundle={updateBundle}
                />
            </div>

            {/* CENTER WORKSPACE */}
            <div className="intervention-workspace">
                {bundle ? (
                    <ToCBuilderPane
                        bundle={bundle}
                        focalCauses={focalCauses}
                        onUpdateBundle={(updatedBundle) => updateBundle(bundle.id, () => updatedBundle)}
                        selectedItemId={tocSelected.bundleId === activeBundleId ? tocSelected.itemId : null}
                        onSelectItem={handleSelectItem}
                    />
                ) : (
                    <div className="no-bundle-selected">
                        <h2>Create or select an intervention to begin</h2>
                    </div>
                )}
            </div>

            {/* RIGHT DETAILS PANE - Only show when open and item is selected */}
            {detailsPaneOpen && selectedDetails && (
                <div className="intervention-notes-pane">
                    <>
                        {selectedDetails.type === "activity" && bundle && (
                            <ActivityDetailsPane
                                activity={selectedDetails.item as ActivityItem}
                                bundle={bundle}
                                onUpdate={(updates) => {
                                    if (activeBundleId) {
                                        updateBundle(activeBundleId, (b) => ({
                                            ...b,
                                            activities: (b.activities || []).map((a) =>
                                                a.id === (selectedDetails.item as ActivityItem).id
                                                    ? { ...a, ...updates }
                                                    : a
                                            ),
                                        }));
                                    }
                                }}
                            />
                        )}

                        {selectedDetails.type === "outcome" && (
                            <OutcomeDetailsPane
                                outcome={selectedDetails.item as OutcomeItem}
                                bundle={bundle!}
                                onUpdate={(updates) => {
                                    if (activeBundleId) {
                                        updateBundle(activeBundleId, (b) => ({
                                            ...b,
                                            outcomes: (b.outcomes || []).map((o) =>
                                                o.id === (selectedDetails.item as OutcomeItem).id
                                                    ? { ...o, ...updates }
                                                    : o
                                            ),
                                        }));
                                    }
                                }}
                                onBundleUpdate={(updates) => {
                                    if (activeBundleId) {
                                        updateBundle(activeBundleId, (b) => ({
                                            ...b,
                                            ...updates,
                                        }));
                                    }
                                }}
                            />
                        )}
                    </>
                    <div style={{ position: "absolute", top: "8px", right: "14px" }}>
                        <button
                            onClick={() => setDetailsPaneOpen(false)}
                            style={{
                                background: "none",
                                border: "none",
                                color: "#9ca3af",
                                cursor: "pointer",
                                padding: "4px",
                                fontSize: "18px",
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "center",
                            }}
                            title="Close details"
                        >
                            ✕
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
};

// ============ DRAGGABLE ITEM CARD ============

interface DraggableItemProps {
    id: string;
    label: string;
    onDelete: () => void;
    onLabelChange: (newLabel: string) => void;
}

const DraggableItemCard: React.FC<DraggableItemProps> = ({
    id,
    label,
    onDelete,
    onLabelChange,
}) => {
    const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
        id,
    });

    const contentEditableRef = React.useRef<HTMLDivElement>(null);

    // Sync the label prop to the contentEditable div
    React.useEffect(() => {
        if (contentEditableRef.current && contentEditableRef.current.textContent !== label) {
            contentEditableRef.current.textContent = label;
        }
    }, [label]);

    const style = {
        transform: CSS.Transform.toString(transform),
        transition,
        opacity: isDragging ? 0.5 : 1,
    };

    return (
        <div
            ref={setNodeRef}
            style={{
                ...style,
                padding: '8px 10px',
                background: '#ffffff',
                border: '1px solid #e5e7eb',
                borderRadius: '6px',
                display: 'flex',
                alignItems: 'flex-start',
                gap: '6px',
                boxShadow: '0 1px 2px rgba(15, 23, 42, 0.04)',
                transition: 'all 120ms ease',
                cursor: isDragging ? 'grabbing' : 'grab',
            }}
            onMouseEnter={(e) => {
                if (!isDragging) {
                    (e.currentTarget as HTMLElement).style.borderColor = '#cbd5e1';
                    (e.currentTarget as HTMLElement).style.boxShadow = '0 2px 4px rgba(15, 23, 42, 0.08)';
                }
            }}
            onMouseLeave={(e) => {
                if (!isDragging) {
                    (e.currentTarget as HTMLElement).style.borderColor = '#e5e7eb';
                    (e.currentTarget as HTMLElement).style.boxShadow = '0 1px 2px rgba(15, 23, 42, 0.04)';
                }
            }}
        >
            <div
                {...attributes}
                {...listeners}
                style={{
                    flex: '0 0 14px',
                    cursor: isDragging ? 'grabbing' : 'grab',
                    color: '#cbd5e1',
                    fontSize: '14px',
                    display: 'flex',
                    alignItems: 'flex-start',
                    justifyContent: 'center',
                    paddingTop: '4px',
                }}
            >
                ⋮⋮
            </div>
            <div
                ref={contentEditableRef}
                contentEditable
                suppressContentEditableWarning
                onInput={(e) => onLabelChange(e.currentTarget.textContent || '')}
                style={{
                    flex: 1,
                    padding: '0',
                    fontSize: '12px',
                    fontWeight: 400,
                    background: 'transparent',
                    outline: 'none',
                    color: '#1e293b',
                    wordWrap: 'break-word',
                    overflowWrap: 'break-word',
                    whiteSpace: 'normal',
                    minHeight: '18px',
                    lineHeight: '1.5',
                }}
            />
            <button
                type="button"
                onClick={onDelete}
                style={{
                    padding: '0',
                    width: '18px',
                    height: '18px',
                    background: 'none',
                    border: 'none',
                    color: '#94a3b8',
                    fontSize: '14px',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    transition: 'color 120ms ease',
                }}
                onMouseEnter={(e) => {
                    (e.currentTarget as HTMLElement).style.color = '#64748b';
                }}
                onMouseLeave={(e) => {
                    (e.currentTarget as HTMLElement).style.color = '#94a3b8';
                }}
            >
                ✕
            </button>
        </div>
    );
};

// ============ ACTIVITY DETAILS PANE ============

interface ActivityDetailsPaneProps {
    activity: ActivityItem;
    bundle: TocBundle;
    onUpdate: (updates: Partial<ActivityItem>) => void;
}

const ActivityDetailsPane: React.FC<ActivityDetailsPaneProps> = ({
    activity,
    bundle,
    onUpdate,
}) => {
    // Local state for actor management
    const [isAddingActor, setIsAddingActor] = React.useState(false);
    const [actorDraft, setActorDraft] = React.useState("");
    const [addingNewActor, setAddingNewActor] = React.useState(false);

    // Available actors - from bundle
    const availableActors = React.useMemo(() => {
        const set = new Set<string>();
        (bundle.actors || []).forEach((a) => set.add(a));
        (activity.actors || []).forEach((a) => set.add(a));
        return Array.from(set).sort();
    }, [bundle.actors, activity.actors]);

    // Add actor helper
    const handleAddActor = (name: string) => {
        if (!name.trim()) return;
        if ((activity.actors || []).includes(name.trim())) return; // Already exists

        const newActors = [...(activity.actors || []), name.trim()];
        onUpdate({ actors: newActors });

        // Also add to bundle actors if not already there
        if (!(bundle.actors || []).includes(name.trim())) {
            // This would need to be handled by parent, for now just update activity
        }

        setActorDraft("");
        setIsAddingActor(false);
        setAddingNewActor(false);
    };

    // Input helpers
    const addInput = () => {
        onUpdate({
            inputs: [...(activity.inputs || []), { id: `in-${Date.now()}`, label: "", notes: "" }],
        });
    };

    const updateInput = (id: string, updates: Partial<{ label: string; notes: string }>) => {
        onUpdate({
            inputs: (activity.inputs || []).map((inp) =>
                inp.id === id ? { ...inp, ...updates } : inp
            ),
        });
    };

    const removeInput = (id: string) => {
        onUpdate({
            inputs: (activity.inputs || []).filter((inp) => inp.id !== id),
        });
    };

    const handleInputDragEnd = (e: any) => {
        const { active, over } = e;
        if (!over || active.id === over.id) return;

        const inputs = activity.inputs || [];
        const activeIndex = inputs.findIndex((i) => i.id === active.id);
        const overIndex = inputs.findIndex((i) => i.id === over.id);

        if (activeIndex !== -1 && overIndex !== -1) {
            onUpdate({ inputs: arrayMove(inputs, activeIndex, overIndex) });
        }
    };

    // Output helpers
    const addOutput = () => {
        onUpdate({
            outputs: [...(activity.outputs || []), { id: `out-${Date.now()}`, label: "", notes: "" }],
        });
    };

    const updateOutput = (id: string, updates: Partial<{ label: string; notes: string }>) => {
        onUpdate({
            outputs: (activity.outputs || []).map((out) =>
                out.id === id ? { ...out, ...updates } : out
            ),
        });
    };

    const removeOutput = (id: string) => {
        onUpdate({
            outputs: (activity.outputs || []).filter((out) => out.id !== id),
        });
    };

    const handleOutputDragEnd = (e: any) => {
        const { active, over } = e;
        if (!over || active.id === over.id) return;

        const outputs = activity.outputs || [];
        const activeIndex = outputs.findIndex((o) => o.id === active.id);
        const overIndex = outputs.findIndex((o) => o.id === over.id);

        if (activeIndex !== -1 && overIndex !== -1) {
            onUpdate({ outputs: arrayMove(outputs, activeIndex, overIndex) });
        }
    };

    // Assumption helpers
    const addAssumption = () => {
        onUpdate({
            assumptions: [...(activity.assumptions || []), { id: `ass-${Date.now()}`, label: "", notes: "" }],
        });
    };

    const updateAssumption = (id: string, updates: Partial<{ label: string; notes: string }>) => {
        onUpdate({
            assumptions: (activity.assumptions || []).map((ass) =>
                ass.id === id ? { ...ass, ...updates } : ass
            ),
        });
    };

    const removeAssumption = (id: string) => {
        onUpdate({
            assumptions: (activity.assumptions || []).filter((ass) => ass.id !== id),
        });
    };

    const handleAssumptionDragEnd = (e: any) => {
        const { active, over } = e;
        if (!over || active.id === over.id) return;

        const assumptions = activity.assumptions || [];
        const activeIndex = assumptions.findIndex((a) => a.id === active.id);
        const overIndex = assumptions.findIndex((a) => a.id === over.id);

        if (activeIndex !== -1 && overIndex !== -1) {
            onUpdate({ assumptions: arrayMove(assumptions, activeIndex, overIndex) });
        }
    };

    const sensors = useSensors(
        useSensor(PointerSensor, {
            activationConstraint: {
                distance: 8,
            },
        }),
        useSensor(KeyboardSensor, {
            coordinateGetter: sortableKeyboardCoordinates,
        })
    );

    return (
        <>
            <div className="notes-pane-header">
                <div className="notes-pane-title">
                    <div style={{ fontSize: '12px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em', color: '#6b7280', display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <Zap size={16} />
                        Activity
                    </div>
                </div>
            </div>

            <div className="notes-pane-content" style={{ overflowY: 'auto', height: '100%' }}>
                <div style={{ marginBottom: '14px' }}>
                    <label className="section-label section-label-block">
                        Name
                    </label>
                    <input
                        type="text"
                        className="input-field"
                        value={activity.label || ""}
                        onChange={(e) => onUpdate({ label: e.target.value })}
                        style={{
                            width: '100%',
                            padding: '10px 10px',
                            fontSize: '14px',
                            fontWeight: 600,
                            border: '1px solid #e5e7eb',
                            borderRadius: '6px',
                            boxSizing: 'border-box',
                            background: '#ffffff',
                            transition: 'all 120ms ease',
                            boxShadow: '0 1px 2px rgba(15, 23, 42, 0.04)',
                        }}
                    />
                </div>

                <div style={{ marginBottom: '16px' }}>
                    <label className="section-label section-label-block">
                        Description
                    </label>
                    <textarea
                        className="input-field"
                        value={activity.description || ""}
                        onChange={(e) => onUpdate({ description: e.target.value })}
                        placeholder="Describe what this activity involves..."
                        style={{
                            width: '100%',
                            padding: '8px 10px',
                            fontSize: '13px',
                            border: '1px solid #e5e7eb',
                            borderRadius: '6px',
                            boxSizing: 'border-box',
                            minHeight: '70px',
                            fontFamily: 'inherit',
                            background: '#ffffff',
                            transition: 'all 120ms ease',
                            boxShadow: '0 1px 2px rgba(15, 23, 42, 0.04)',
                            resize: 'vertical',
                        }}
                    />
                </div>

                {/* ACTORS SECTION */}
                <div style={{ marginBottom: '16px' }}>
                    <label className="section-label section-label-flex">
                        <Users size={18} />
                        Actors/Personnel
                    </label>
                    <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', marginBottom: '10px' }}>
                        {(activity.actors || []).map((actor) => (
                            <span
                                key={actor}
                                className="pill"
                            >
                                {actor}
                                <button
                                    type="button"
                                    className="pill-remove-btn"
                                    onClick={() =>
                                        onUpdate({
                                            actors: (activity.actors || []).filter((a) => a !== actor),
                                        })
                                    }
                                >
                                    ✕
                                </button>
                            </span>
                        ))}
                    </div>

                    {!isAddingActor ? (
                        <button
                            type="button"
                            className="btn-add"
                            onClick={() => setIsAddingActor(true)}
                        >
                            + Add actor
                        </button>
                    ) : (
                        <div style={{ position: 'relative', display: 'flex', gap: '6px' }}>
                            <button
                                className="btn-dropdown"
                                onClick={(e) => {
                                    const dropdown = (e.currentTarget.nextElementSibling as HTMLElement);
                                    if (dropdown) dropdown.style.display = dropdown.style.display === 'none' || !dropdown.style.display ? 'block' : 'none';
                                }}
                            >
                                Select actor...
                            </button>

                            <div style={{
                                display: 'none',
                                position: 'absolute',
                                top: '100%',
                                left: 0,
                                marginTop: '4px',
                                backgroundColor: '#ffffff',
                                border: '1px solid #e5e7eb',
                                borderRadius: '6px',
                                boxShadow: '0 4px 6px rgba(0, 0, 0, 0.07)',
                                zIndex: 10,
                                maxHeight: '200px',
                                overflowY: 'auto',
                                minWidth: '200px',
                            }}>
                                {addingNewActor ? (
                                    <div style={{ padding: '8px 12px', borderBottom: '1px solid #e5e7eb', display: 'flex', gap: '4px' }}>
                                        <input
                                            autoFocus
                                            type="text"
                                            placeholder="Actor name..."
                                            value={actorDraft}
                                            onChange={(e) => setActorDraft(e.target.value)}
                                            onKeyDown={(e) => {
                                                if (e.key === "Enter") {
                                                    e.preventDefault();
                                                    handleAddActor(actorDraft);
                                                } else if (e.key === "Escape") {
                                                    setAddingNewActor(false);
                                                    setActorDraft("");
                                                }
                                            }}
                                            style={{
                                                fontSize: '11px',
                                                padding: '4px 6px',
                                                border: '1px solid #cbd5e1',
                                                borderRadius: '4px',
                                                flex: 1,
                                                outline: 'none',
                                                background: '#ffffff',
                                            }}
                                            onFocus={(e) => {
                                                (e.currentTarget as HTMLElement).style.borderColor = '#3b82f6';
                                            }}
                                            onBlur={(e) => {
                                                (e.currentTarget as HTMLElement).style.borderColor = '#cbd5e1';
                                            }}
                                        />
                                        <button
                                            type="button"
                                            onClick={() => {
                                                handleAddActor(actorDraft);
                                                setIsAddingActor(false);
                                            }}
                                            style={{
                                                fontSize: '10px',
                                                padding: '4px 8px',
                                                background: '#3b82f6',
                                                color: '#fff',
                                                border: 'none',
                                                borderRadius: '4px',
                                                cursor: 'pointer',
                                                fontWeight: 500,
                                            }}
                                            onMouseEnter={(e) => {
                                                (e.currentTarget as HTMLElement).style.background = '#2563eb';
                                            }}
                                            onMouseLeave={(e) => {
                                                (e.currentTarget as HTMLElement).style.background = '#3b82f6';
                                            }}
                                        >
                                            Add
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => {
                                                setAddingNewActor(false);
                                                setActorDraft("");
                                            }}
                                            style={{
                                                fontSize: '10px',
                                                padding: '4px 8px',
                                                background: '#f1f5f9',
                                                border: '1px solid #cbd5e1',
                                                borderRadius: '4px',
                                                cursor: 'pointer',
                                                color: '#475569',
                                                fontWeight: 500,
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
                                    </div>
                                ) : (
                                    <>
                                        {availableActors
                                            .filter((a) => !(activity.actors || []).includes(a))
                                            .map((a) => (
                                                <button
                                                    key={a}
                                                    onClick={() => {
                                                        handleAddActor(a);
                                                        setIsAddingActor(false);
                                                    }}
                                                    style={{
                                                        display: 'block',
                                                        width: '100%',
                                                        padding: '8px 12px',
                                                        textAlign: 'left',
                                                        fontSize: '11px',
                                                        fontWeight: 500,
                                                        color: '#64748b',
                                                        backgroundColor: 'transparent',
                                                        border: 'none',
                                                        cursor: 'pointer',
                                                        transition: 'all 120ms ease',
                                                    }}
                                                    onMouseEnter={(e) => {
                                                        (e.currentTarget as HTMLElement).style.backgroundColor = '#f1f5f9';
                                                    }}
                                                    onMouseLeave={(e) => {
                                                        (e.currentTarget as HTMLElement).style.backgroundColor = 'transparent';
                                                    }}
                                                >
                                                    {a}
                                                </button>
                                            ))}
                                        <button
                                            onClick={() => setAddingNewActor(true)}
                                            style={{
                                                display: 'block',
                                                width: '100%',
                                                padding: '8px 12px',
                                                textAlign: 'left',
                                                fontSize: '11px',
                                                fontWeight: 500,
                                                color: '#3b82f6',
                                                backgroundColor: 'transparent',
                                                border: 'none',
                                                borderTop: '1px solid #e5e7eb',
                                                cursor: 'pointer',
                                                transition: 'all 120ms ease',
                                            }}
                                            onMouseEnter={(e) => {
                                                (e.currentTarget as HTMLElement).style.backgroundColor = '#eff6ff';
                                            }}
                                            onMouseLeave={(e) => {
                                                (e.currentTarget as HTMLElement).style.backgroundColor = 'transparent';
                                            }}
                                        >
                                            + Add new...
                                        </button>
                                    </>
                                )}
                            </div>

                            <button
                                type="button"
                                onClick={() => setIsAddingActor(false)}
                                style={{
                                    fontSize: '12px',
                                    padding: '6px 10px',
                                    background: '#f1f5f9',
                                    border: '1px solid #cbd5e1',
                                    borderRadius: '6px',
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
                        </div>
                    )}
                </div>

                {/* INPUTS SECTION */}
                <div style={{ marginBottom: '16px' }}>
                    <label className="section-label section-label-flex">
                        <ArrowDown size={18} />
                        Inputs
                    </label>

                    {(activity.inputs || []).length === 0 ? (
                        <div className="empty-state empty-state-blue">
                            <div style={{ fontWeight: 500, marginBottom: '6px' }}>What resources are needed?</div>
                            <div style={{ fontSize: '11px', color: '#1e3a8a', lineHeight: '1.4' }}>
                                Think about: funding, equipment, personnel, training materials, technology, partnerships, or community engagement.
                            </div>
                        </div>
                    ) : null}

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', marginBottom: '8px' }}>
                        <DndContext
                            sensors={sensors}
                            collisionDetection={closestCenter}
                            onDragEnd={handleInputDragEnd}
                        >
                            <SortableContext
                                items={(activity.inputs || []).map((i) => i.id)}
                                strategy={verticalListSortingStrategy}
                            >
                                {(activity.inputs || []).map((input) => (
                                    <DraggableItemCard
                                        key={input.id}
                                        id={input.id}
                                        label={input.label}
                                        onLabelChange={(newLabel) => updateInput(input.id, { label: newLabel })}
                                        onDelete={() => removeInput(input.id)}
                                    />
                                ))}
                            </SortableContext>
                        </DndContext>
                    </div>
                    <button
                        type="button"
                        onClick={addInput}
                        className="btn-add"
                    >
                        + Add input
                    </button>
                </div>

                {/* OUTPUTS SECTION */}
                <div style={{ marginBottom: '16px' }}>
                    <label className="section-label section-label-flex">
                        <ArrowUp size={18} />
                        Outputs
                    </label>

                    {(activity.outputs || []).length === 0 ? (
                        <div className="empty-state empty-state-green">
                            <div style={{ fontWeight: 500, marginBottom: '6px' }}>What does this activity produce or deliver?</div>
                            <div style={{ fontSize: '11px', color: '#15803d', lineHeight: '1.4' }}>
                                Consider tangible results: reports, trained people, distributed materials, sessions conducted, systems deployed, or policies established.
                            </div>
                        </div>
                    ) : null}

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', marginBottom: '8px' }}>
                        <DndContext
                            sensors={sensors}
                            collisionDetection={closestCenter}
                            onDragEnd={handleOutputDragEnd}
                        >
                            <SortableContext
                                items={(activity.outputs || []).map((o) => o.id)}
                                strategy={verticalListSortingStrategy}
                            >
                                {(activity.outputs || []).map((output) => (
                                    <DraggableItemCard
                                        key={output.id}
                                        id={output.id}
                                        label={output.label}
                                        onLabelChange={(newLabel) => updateOutput(output.id, { label: newLabel })}
                                        onDelete={() => removeOutput(output.id)}
                                    />
                                ))}
                            </SortableContext>
                        </DndContext>
                    </div>
                    <button
                        type="button"
                        onClick={addOutput}
                        className="btn-add"
                    >
                        + Add output
                    </button>
                </div>

                {/* ASSUMPTIONS SECTION */}
                <div style={{ marginBottom: '16px' }}>
                    <label className="section-label section-label-flex">
                        <AlertCircle size={18} />
                        Assumptions
                    </label>

                    {(activity.assumptions || []).length === 0 ? (
                        <div className="empty-state empty-state-red">
                            <div style={{ fontWeight: 500, marginBottom: '6px' }}>What must be true for this to work?</div>
                            <div style={{ fontSize: '11px', color: '#dc2626', lineHeight: '1.4' }}>
                                These are the conditions, behaviors, or external factors that need to exist. Examples: staff buy-in, funding availability, policy support, community readiness, or no major supply disruptions.
                            </div>
                        </div>
                    ) : null}

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', marginBottom: '8px' }}>
                        <DndContext
                            sensors={sensors}
                            collisionDetection={closestCenter}
                            onDragEnd={handleAssumptionDragEnd}
                        >
                            <SortableContext
                                items={(activity.assumptions || []).map((a) => a.id)}
                                strategy={verticalListSortingStrategy}
                            >
                                {(activity.assumptions || []).map((assumption) => (
                                    <DraggableItemCard
                                        key={assumption.id}
                                        id={assumption.id}
                                        label={assumption.label}
                                        onLabelChange={(newLabel) => updateAssumption(assumption.id, { label: newLabel })}
                                        onDelete={() => removeAssumption(assumption.id)}
                                    />
                                ))}
                            </SortableContext>
                        </DndContext>
                    </div>
                    <button
                        type="button"
                        onClick={addAssumption}
                        className="btn-add"
                    >
                        + Add assumption
                    </button>
                </div>

                {/* OUTCOMES SECTION */}
                <div>
                    <label className="section-label section-label-flex">
                        <Target size={18} />
                        Contributes to Outcomes
                    </label>
                    {bundle.outcomes && bundle.outcomes.length > 0 ? (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                            {bundle.outcomes.map((outcome) => {
                                const isContributing = (activity.contributingOutcomeIds || []).includes(outcome.id);
                                return (
                                    <label
                                        key={outcome.id}
                                        style={{
                                            display: 'flex',
                                            alignItems: 'flex-start',
                                            gap: '6px',
                                            fontSize: '12px',
                                            color: '#1e293b',
                                            cursor: 'pointer',
                                            padding: '6px 4px',
                                            transition: 'all 120ms ease',
                                        }}
                                        onMouseEnter={(e) => {
                                            (e.currentTarget as HTMLElement).style.background = '#f1f5f9';
                                            (e.currentTarget as HTMLElement).style.borderRadius = '4px';
                                        }}
                                        onMouseLeave={(e) => {
                                            (e.currentTarget as HTMLElement).style.background = 'transparent';
                                        }}
                                    >
                                        <input
                                            type="checkbox"
                                            checked={isContributing}
                                            onChange={(e) => {
                                                if (e.target.checked) {
                                                    onUpdate({
                                                        contributingOutcomeIds: [
                                                            ...(activity.contributingOutcomeIds || []),
                                                            outcome.id,
                                                        ],
                                                    });
                                                } else {
                                                    onUpdate({
                                                        contributingOutcomeIds: (activity.contributingOutcomeIds || []).filter(
                                                            (id) => id !== outcome.id
                                                        ),
                                                    });
                                                }
                                            }}
                                            style={{
                                                flex: '0 0 14px',
                                                marginTop: '2px',
                                                cursor: 'pointer',
                                            }}
                                        />
                                        <span style={{ flex: 1, wordWrap: 'break-word', overflowWrap: 'break-word', whiteSpace: 'normal' }}>{outcome.label}</span>
                                    </label>
                                );
                            })}
                        </div>
                    ) : (
                        <div style={{ fontSize: '11px', color: '#94a3b8', fontStyle: 'italic' }}>
                            No outcomes yet
                        </div>
                    )}
                </div>
            </div>
        </>
    );
};

// ============ OUTCOME DETAILS PANE ============

interface OutcomeDetailsPaneProps {
    outcome: OutcomeItem;
    bundle: TocBundle;
    onUpdate: (updates: Partial<OutcomeItem>) => void;
    onBundleUpdate?: (updates: Partial<TocBundle>) => void;
}

const OutcomeDetailsPane: React.FC<OutcomeDetailsPaneProps> = ({
    outcome,
    bundle,
    onUpdate,
    onBundleUpdate,
}) => {
    const sensors = useSensors(
        useSensor(PointerSensor, {
            activationConstraint: {
                distance: 8,
            },
        }),
        useSensor(KeyboardSensor, {
            coordinateGetter: sortableKeyboardCoordinates,
        })
    );

    // Data source management
    const [isAddingSource, setIsAddingSource] = React.useState(false);
    const [sourceDraft, setSourceDraft] = React.useState("");
    const [openSourceDropdownId, setOpenSourceDropdownId] = React.useState<string | null>(null);

    const handleAddDataSource = (name: string) => {
        const trimmed = name.trim();
        if (trimmed && onBundleUpdate) {
            onBundleUpdate({
                dataSources: [...(bundle.dataSources || []), trimmed],
            });
            setSourceDraft("");
            setIsAddingSource(false);
        }
    };

    // Indicator helpers
    const addIndicator = () => {
        onUpdate({
            indicators: [...(outcome.indicators || []), { id: `ind-${Date.now()}`, label: "", type: "quantitative", sourceIds: [] }],
        });
    };

    const updateIndicator = (id: string, updates: Partial<{ label: string; type: "quantitative" | "qualitative"; sourceIds: string[] }>) => {
        onUpdate({
            indicators: (outcome.indicators || []).map((ind) =>
                ind.id === id ? { ...ind, ...updates } : ind
            ),
        });
    };

    const removeIndicator = (id: string) => {
        onUpdate({
            indicators: (outcome.indicators || []).filter((ind) => ind.id !== id),
        });
    };

    const handleIndicatorDragEnd = (e: any) => {
        const { active, over } = e;
        if (!over || active.id === over.id) return;

        const indicators = outcome.indicators || [];
        const activeIndex = indicators.findIndex((i) => i.id === active.id);
        const overIndex = indicators.findIndex((i) => i.id === over.id);

        if (activeIndex !== -1 && overIndex !== -1) {
            onUpdate({ indicators: arrayMove(indicators, activeIndex, overIndex) });
        }
    };
    return (
        <>
            <div className="notes-pane-header">
                <div className="notes-pane-title">
                    <div style={{ fontSize: '12px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em', color: '#6b7280', display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <Target size={16} />
                        Outcome
                    </div>
                </div>
            </div>

            <div className="notes-pane-content" style={{ overflowY: 'auto', height: '100%' }}>
                <div style={{ marginBottom: '14px' }}>
                    <label className="section-label section-label-block">
                        Name
                    </label>
                    <textarea
                        value={outcome.label || ""}
                        onChange={(e) => onUpdate({ label: e.target.value })}
                        placeholder="Enter outcome name..."
                        className="input-field"
                        style={{
                            width: '100%',
                            padding: '10px 10px',
                            fontWeight: 600,
                            fontSize: '14px',
                            border: '1px solid #e5e7eb',
                            borderRadius: '6px',
                            boxSizing: 'border-box',
                            background: '#ffffff',
                            transition: 'all 120ms ease',
                            boxShadow: '0 1px 2px rgba(15, 23, 42, 0.04)',
                            minHeight: '44px',
                            fontFamily: 'inherit',
                            resize: 'vertical',
                        }}
                    />
                </div>

                <div style={{ marginBottom: '16px' }}>
                    <label className="section-label section-label-block">
                        Description
                    </label>
                    <textarea
                        value={outcome.description || ""}
                        onChange={(e) => onUpdate({ description: e.target.value })}
                        placeholder="Describe what this outcome involves..."
                        className="input-field"
                        style={{
                            width: '100%',
                            padding: '8px 10px',
                            fontSize: '13px',
                            border: '1px solid #e5e7eb',
                            borderRadius: '6px',
                            boxSizing: 'border-box',
                            minHeight: '70px',
                            fontFamily: 'inherit',
                            background: '#ffffff',
                            transition: 'all 120ms ease',
                            boxShadow: '0 1px 2px rgba(15, 23, 42, 0.04)',
                            resize: 'vertical',
                        }}
                    />
                </div>

                <div style={{ marginBottom: '16px' }}>
                    <label className="section-label section-label-block">
                        Tier
                    </label>
                    <select
                        value={outcome.tier || ""}
                        onChange={(e) => onUpdate({ tier: e.target.value ? Number(e.target.value) : undefined })}
                        className="input-field"
                        style={{
                            width: '100%',
                            padding: '8px 10px',
                            fontSize: '13px',
                            border: '1px solid #e5e7eb',
                            borderRadius: '6px',
                            boxSizing: 'border-box',
                            background: '#ffffff',
                            transition: 'all 120ms ease',
                            boxShadow: '0 1px 2px rgba(15, 23, 42, 0.04)',
                        }}
                    >
                        <option value="">-- No tier --</option>
                        <option value="1">Short-term</option>
                        <option value="2">Intermediate</option>
                        <option value="3">Long-term</option>
                    </select>
                </div>

                <div style={{ marginBottom: '16px' }}>
                    <label className="section-label section-label-flex">
                        <Gauge size={18} />
                        Indicators
                    </label>

                    {(outcome.indicators || []).length === 0 ? (
                        <div className="empty-state empty-state-yellow">
                            <div style={{ fontWeight: 500, marginBottom: '6px' }}>How will you measure progress?</div>
                            <div style={{ fontSize: '11px', lineHeight: '1.4' }}>
                                Add specific, measurable indicators that show whether this outcome is being achieved.
                            </div>
                        </div>
                    ) : null}

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '8px' }}>
                        <DndContext
                            sensors={sensors}
                            collisionDetection={closestCenter}
                            onDragEnd={handleIndicatorDragEnd}
                        >
                            <SortableContext
                                items={(outcome.indicators || []).map((i) => i.id)}
                                strategy={verticalListSortingStrategy}
                            >
                                {(outcome.indicators || []).map((indicator) => {
                                    const selectedSourceLabels = indicator.sourceIds
                                        .map(id => bundle.dataSources[parseInt(id.split('-')[1])])
                                        .filter(Boolean);

                                    return (
                                        <div
                                            key={indicator.id}
                                            style={{
                                                padding: '8px 10px',
                                                backgroundColor: '#ffffff',
                                                border: '1px solid #e5e7eb',
                                                borderRadius: '6px',
                                                display: 'flex',
                                                flexDirection: 'column',
                                                gap: '10px',
                                                boxShadow: '0 1px 2px rgba(15, 23, 42, 0.04)',
                                                transition: 'all 120ms ease',
                                            }}
                                        >
                                            {/* Label Input & Type Pill */}
                                            <div style={{ display: 'flex', gap: '8px', alignItems: 'flex-start' }}>
                                                <input
                                                    type="text"
                                                    value={indicator.label}
                                                    onChange={(e) => updateIndicator(indicator.id, { label: e.target.value })}
                                                    placeholder="What are you measuring?"
                                                    className="input-field"
                                                    style={{
                                                        flex: 1,
                                                        padding: '8px 10px',
                                                        fontSize: '12px',
                                                        border: '1px solid #e5e7eb',
                                                        borderRadius: '6px',
                                                        boxSizing: 'border-box',
                                                        background: '#ffffff',
                                                        transition: 'all 120ms ease',
                                                        boxShadow: '0 1px 2px rgba(15, 23, 42, 0.04)',
                                                    }}
                                                />

                                                {/* Type Pill */}
                                                <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                                                    <button
                                                        onClick={(e) => {
                                                            const dropdown = (e.currentTarget.nextElementSibling as HTMLElement);
                                                            if (dropdown) dropdown.style.display = dropdown.style.display === 'none' || !dropdown.style.display ? 'block' : 'none';
                                                        }}
                                                        className="pill"
                                                        style={{
                                                            padding: '6px 10px',
                                                            fontSize: '11px',
                                                            fontWeight: 600,
                                                            whiteSpace: 'nowrap',
                                                        }}
                                                    >
                                                        {indicator.type === 'quantitative' ? 'Quantitative' : 'Qualitative'}
                                                    </button>

                                                    <div style={{
                                                        display: 'none',
                                                        position: 'absolute',
                                                        top: '100%',
                                                        right: 0,
                                                        marginTop: '4px',
                                                        backgroundColor: '#ffffff',
                                                        border: '1px solid #e5e7eb',
                                                        borderRadius: '6px',
                                                        boxShadow: '0 4px 6px rgba(0, 0, 0, 0.07)',
                                                        zIndex: 10,
                                                    }}>
                                                        <button
                                                            onClick={(e) => {
                                                                updateIndicator(indicator.id, { type: 'quantitative' });
                                                                const dropdown = (e.currentTarget.parentElement as HTMLElement);
                                                                if (dropdown) dropdown.style.display = 'none';
                                                            }}
                                                            style={{
                                                                display: 'block',
                                                                width: '100%',
                                                                padding: '8px 12px',
                                                                textAlign: 'left',
                                                                fontSize: '11px',
                                                                fontWeight: 500,
                                                                color: indicator.type === 'quantitative' ? '#0c4a6e' : '#64748b',
                                                                backgroundColor: indicator.type === 'quantitative' ? '#dbeafe' : 'transparent',
                                                                border: 'none',
                                                                cursor: 'pointer',
                                                                transition: 'all 120ms ease',
                                                            }}
                                                            onMouseEnter={(e) => {
                                                                (e.currentTarget as HTMLElement).style.backgroundColor = '#dbeafe';
                                                            }}
                                                            onMouseLeave={(e) => {
                                                                (e.currentTarget as HTMLElement).style.backgroundColor = indicator.type === 'quantitative' ? '#dbeafe' : 'transparent';
                                                            }}
                                                        >
                                                            Quantitative
                                                        </button>
                                                        <button
                                                            onClick={(e) => {
                                                                updateIndicator(indicator.id, { type: 'qualitative' });
                                                                const dropdown = (e.currentTarget.parentElement as HTMLElement);
                                                                if (dropdown) dropdown.style.display = 'none';
                                                            }}
                                                            style={{
                                                                display: 'block',
                                                                width: '100%',
                                                                padding: '8px 12px',
                                                                textAlign: 'left',
                                                                fontSize: '11px',
                                                                fontWeight: 500,
                                                                color: indicator.type === 'qualitative' ? '#0c4a6e' : '#64748b',
                                                                backgroundColor: indicator.type === 'qualitative' ? '#dbeafe' : 'transparent',
                                                                border: 'none',
                                                                cursor: 'pointer',
                                                                transition: 'all 120ms ease',
                                                            }}
                                                            onMouseEnter={(e) => {
                                                                (e.currentTarget as HTMLElement).style.backgroundColor = '#dbeafe';
                                                            }}
                                                            onMouseLeave={(e) => {
                                                                (e.currentTarget as HTMLElement).style.backgroundColor = indicator.type === 'qualitative' ? '#dbeafe' : 'transparent';
                                                            }}
                                                        >
                                                            Qualitative
                                                        </button>
                                                    </div>
                                                </div>

                                                {/* Delete Button */}
                                                <button
                                                    onClick={() => removeIndicator(indicator.id)}
                                                    style={{
                                                        fontSize: '16px',
                                                        padding: '4px 6px',
                                                        backgroundColor: 'transparent',
                                                        color: '#0284c7',
                                                        border: 'none',
                                                        borderRadius: '4px',
                                                        cursor: 'pointer',
                                                        transition: 'all 120ms ease',
                                                        lineHeight: '1',
                                                    }}
                                                    onMouseEnter={(e) => {
                                                        (e.currentTarget as HTMLElement).style.color = '#0369a1';
                                                        (e.currentTarget as HTMLElement).style.backgroundColor = '#eff6ff';
                                                    }}
                                                    onMouseLeave={(e) => {
                                                        (e.currentTarget as HTMLElement).style.color = '#0284c7';
                                                        (e.currentTarget as HTMLElement).style.backgroundColor = 'transparent';
                                                    }}
                                                >
                                                    ✕
                                                </button>
                                            </div>

                                            {/* Data Source Pills */}
                                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', alignItems: 'flex-start' }}>
                                                {selectedSourceLabels.map((source, idx) => (
                                                    <div
                                                        key={idx}
                                                        className="pill"
                                                    >
                                                        <span>{source}</span>
                                                        <button
                                                            onClick={() => {
                                                                const sourceId = `ds-${bundle.dataSources.indexOf(source)}`;
                                                                const newSourceIds = indicator.sourceIds.filter(id => id !== sourceId);
                                                                updateIndicator(indicator.id, { sourceIds: newSourceIds });
                                                            }}
                                                            className="pill-remove-btn"
                                                        >
                                                            ✕
                                                        </button>
                                                    </div>
                                                ))}

                                                {/* Dropdown to Select Sources */}
                                                <div style={{ position: 'relative' }}>
                                                    <button
                                                        onClick={() => {
                                                            setOpenSourceDropdownId(openSourceDropdownId === indicator.id ? null : indicator.id);
                                                        }}
                                                        className="btn-dropdown"
                                                    >
                                                        + Add source
                                                    </button>

                                                    <div style={{
                                                        display: openSourceDropdownId === indicator.id ? 'block' : 'none',
                                                        position: 'absolute',
                                                        top: '100%',
                                                        left: 0,
                                                        marginTop: '4px',
                                                        backgroundColor: '#ffffff',
                                                        border: '1px solid #e5e7eb',
                                                        borderRadius: '6px',
                                                        boxShadow: '0 4px 6px rgba(0, 0, 0, 0.07)',
                                                        zIndex: 10,
                                                        maxHeight: '200px',
                                                        overflowY: 'auto',
                                                        minWidth: '200px',
                                                    }}>
                                                        {isAddingSource ? (
                                                            <div style={{ padding: '8px 12px', borderBottom: '1px solid #e5e7eb', display: 'flex', gap: '4px' }}>
                                                                <input
                                                                    autoFocus
                                                                    type="text"
                                                                    placeholder="Source name..."
                                                                    value={sourceDraft}
                                                                    onChange={(e) => setSourceDraft(e.target.value)}
                                                                    onKeyDown={(e) => {
                                                                        if (e.key === "Enter") {
                                                                            e.preventDefault();
                                                                            handleAddDataSource(sourceDraft);
                                                                        } else if (e.key === "Escape") {
                                                                            setIsAddingSource(false);
                                                                            setSourceDraft("");
                                                                        }
                                                                    }}
                                                                    style={{
                                                                        fontSize: '11px',
                                                                        padding: '4px 6px',
                                                                        border: '1px solid #cbd5e1',
                                                                        borderRadius: '4px',
                                                                        flex: 1,
                                                                        outline: 'none',
                                                                        background: '#ffffff',
                                                                    }}
                                                                    onFocus={(e) => {
                                                                        (e.currentTarget as HTMLElement).style.borderColor = '#3b82f6';
                                                                    }}
                                                                    onBlur={(e) => {
                                                                        (e.currentTarget as HTMLElement).style.borderColor = '#cbd5e1';
                                                                    }}
                                                                />
                                                                <button
                                                                    type="button"
                                                                    onClick={() => handleAddDataSource(sourceDraft)}
                                                                    style={{
                                                                        fontSize: '10px',
                                                                        padding: '4px 8px',
                                                                        background: '#3b82f6',
                                                                        color: '#fff',
                                                                        border: 'none',
                                                                        borderRadius: '4px',
                                                                        cursor: 'pointer',
                                                                        fontWeight: 500,
                                                                    }}
                                                                    onMouseEnter={(e) => {
                                                                        (e.currentTarget as HTMLElement).style.background = '#2563eb';
                                                                    }}
                                                                    onMouseLeave={(e) => {
                                                                        (e.currentTarget as HTMLElement).style.background = '#3b82f6';
                                                                    }}
                                                                >
                                                                    Add
                                                                </button>
                                                                <button
                                                                    type="button"
                                                                    onClick={() => {
                                                                        setIsAddingSource(false);
                                                                        setSourceDraft("");
                                                                    }}
                                                                    style={{
                                                                        fontSize: '10px',
                                                                        padding: '4px 8px',
                                                                        background: '#f1f5f9',
                                                                        border: '1px solid #cbd5e1',
                                                                        borderRadius: '4px',
                                                                        cursor: 'pointer',
                                                                        color: '#475569',
                                                                        fontWeight: 500,
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
                                                            </div>
                                                        ) : (
                                                            <>
                                                                {bundle.dataSources.map((source, idx) => {
                                                                    const sourceId = `ds-${idx}`;
                                                                    const isSelected = indicator.sourceIds.includes(sourceId);
                                                                    return (
                                                                        <button
                                                                            key={idx}
                                                                            onClick={() => {
                                                                                let newSourceIds = [...indicator.sourceIds];
                                                                                if (isSelected) {
                                                                                    newSourceIds = newSourceIds.filter(id => id !== sourceId);
                                                                                } else {
                                                                                    newSourceIds.push(sourceId);
                                                                                }
                                                                                updateIndicator(indicator.id, { sourceIds: newSourceIds });
                                                                                setOpenSourceDropdownId(null);
                                                                            }}
                                                                            style={{
                                                                                display: 'block',
                                                                                width: '100%',
                                                                                padding: '8px 12px',
                                                                                textAlign: 'left',
                                                                                fontSize: '11px',
                                                                                fontWeight: isSelected ? 600 : 400,
                                                                                color: isSelected ? '#0c4a6e' : '#64748b',
                                                                                backgroundColor: isSelected ? '#dbeafe' : 'transparent',
                                                                                border: 'none',
                                                                                cursor: 'pointer',
                                                                                transition: 'all 120ms ease',
                                                                            }}
                                                                            onMouseEnter={(e) => {
                                                                                (e.currentTarget as HTMLElement).style.backgroundColor = isSelected ? '#dbeafe' : '#f1f5f9';
                                                                            }}
                                                                            onMouseLeave={(e) => {
                                                                                (e.currentTarget as HTMLElement).style.backgroundColor = isSelected ? '#dbeafe' : 'transparent';
                                                                            }}
                                                                        >
                                                                            {isSelected && '✓ '}{source}
                                                                        </button>
                                                                    );
                                                                })}
                                                                <button
                                                                    onClick={() => setIsAddingSource(true)}
                                                                    style={{
                                                                        display: 'block',
                                                                        width: '100%',
                                                                        padding: '8px 12px',
                                                                        textAlign: 'left',
                                                                        fontSize: '11px',
                                                                        fontWeight: 500,
                                                                        color: '#3b82f6',
                                                                        backgroundColor: 'transparent',
                                                                        border: 'none',
                                                                        borderTop: '1px solid #e5e7eb',
                                                                        cursor: 'pointer',
                                                                        transition: 'all 120ms ease',
                                                                    }}
                                                                    onMouseEnter={(e) => {
                                                                        (e.currentTarget as HTMLElement).style.backgroundColor = '#eff6ff';
                                                                    }}
                                                                    onMouseLeave={(e) => {
                                                                        (e.currentTarget as HTMLElement).style.backgroundColor = 'transparent';
                                                                    }}
                                                                >
                                                                    + Add new...
                                                                </button>
                                                            </>
                                                        )}
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })}
                            </SortableContext>
                        </DndContext>
                    </div>
                    <button
                        type="button"
                        onClick={addIndicator}
                        className="btn-add"
                    >
                        + Add indicator
                    </button>
                </div>
            </div>
        </>
    );
};

export default InterventionLayout;
