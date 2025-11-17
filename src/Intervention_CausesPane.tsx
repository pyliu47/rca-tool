// src/Intervention_CausesPane.tsx
import React from "react";
import type { RCANode } from "./types";
import type { TocBundle } from "./tocTypes.ts";
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
    useSortable,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

interface Props {
    root: RCANode;
    tocBundles: Record<string, TocBundle>;
    activeBundleId: string | null;
    setActiveBundleId: (id: string | null) => void;
    createNewBundle: () => void;
    updateBundle: (id: string, fn: (b: TocBundle) => TocBundle) => void;
    tocOrder: string[];
    reorderTocBundles: (fromIndex: number, toIndex: number) => void;
}

export const CausesPane: React.FC<Props> = ({
    root,
    tocBundles,
    activeBundleId,
    setActiveBundleId,
    createNewBundle,
    updateBundle,
    tocOrder,
    reorderTocBundles,
}) => {
    const activeBundle = activeBundleId ? tocBundles[activeBundleId] : null;

    const toggleCause = (causeId: string) => {
        if (!activeBundle) return;
        updateBundle(activeBundle.id, (b) => {
            const exists = b.causeIds.includes(causeId);
            return {
                ...b,
                causeIds: exists
                    ? b.causeIds.filter((id) => id !== causeId)
                    : [...b.causeIds, causeId],
            };
        });
    };

    return (
        <div className="cause-pane">
            {/* INTERVENTIONS LIST */}
            <div className="intervention-list">
                <div className="intervention-list-header">
                    <span>Interventions</span>
                    <button className="small-btn" onClick={createNewBundle}>
                        + New
                    </button>
                </div>

                <DndContext
                    sensors={useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 4 } }))}
                    collisionDetection={closestCenter}
                    onDragEnd={(e: DragEndEvent) => {
                        const { active, over } = e;
                        if (!over) return;
                        if (active.id === over.id) return;
                        const fromIndex = tocOrder.indexOf(String(active.id));
                        const toIndex = tocOrder.indexOf(String(over.id));
                        if (fromIndex === -1 || toIndex === -1) return;
                        // update order in parent
                        reorderTocBundles(fromIndex, toIndex);
                    }}
                >
                    <SortableContext items={tocOrder} strategy={verticalListSortingStrategy}>
                        <div className="intervention-items">
                            {tocOrder.map((id) => {
                                const b = tocBundles[id];
                                if (!b) return null;

                                const SortableRow: React.FC<{ id: string; name: string }> = ({ id, name }) => {
                                    const { attributes, listeners, setNodeRef, transform, transition } = useSortable({ id });
                                    const style: React.CSSProperties = {
                                        transform: transform ? CSS.Transform.toString(transform) : undefined,
                                        transition,
                                        touchAction: "none",
                                    };
                                    return (
                                        <div
                                            ref={setNodeRef}
                                            {...attributes}
                                            {...listeners}
                                            key={id}
                                            className={
                                                activeBundleId === id ? "intervention-item active" : "intervention-item"
                                            }
                                            style={style}
                                            onClick={() => setActiveBundleId(id)}
                                        >
                                            {name || "Untitled intervention"}
                                        </div>
                                    );
                                };

                                return <SortableRow key={id} id={id} name={b.name} />;
                            })}
                        </div>
                    </SortableContext>
                </DndContext>
            </div>

            {/* CAUSES */}
            <div className="cause-list">
                <div className="cause-header">
                    <span>Causes</span>
                    <span className="count">
                        {activeBundle ? activeBundle.causeIds.length : 0} selected
                    </span>
                </div>

                {root.children.map((cat) => (
                    <div key={cat.id} className="cause-category-block">
                        <div className="category-label">{cat.label}</div>
                        {cat.children.map((cause) => (
                            <label key={cause.id} className="cause-row">
                                <input
                                    type="checkbox"
                                    checked={activeBundle?.causeIds.includes(cause.id) || false}
                                    onChange={() => toggleCause(cause.id)}
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