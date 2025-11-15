// src/FishboneView.tsx
import React from "react";
import type { RCANode, PriorityLevel } from "./types";
import { usePanZoom } from "./usePanZoom";
import { Lock, Unlock } from "lucide-react";

interface Props {
    root: RCANode;
    selectedNodeId: string | null;
    onSelect: (id: string) => void;
    onAddCategory: () => void;
    onAddCause: (categoryId: string) => void;
    onLabelChange: (id: string, label: string) => void;
    onDelete: (id: string) => void;
    priorityByNode: Record<string, PriorityLevel>;
}

export const FishboneView: React.FC<Props> = ({
    root,
    selectedNodeId,
    onSelect,
    onAddCategory,
    onAddCause,
    onLabelChange,
    onDelete,
    priorityByNode,
}) => {
    // Logical canvas
    const width = 800;
    const height = 900;

    // Spine anchored on the left side
    const spineX = 80;
    const spineStartY = 60;
    const spineEndY = height - 60;

    const {
        pan,
        scale,
        isPanning,
        svgHandlers,
        zoomIn,
        zoomOut,
        resetView,
    } = usePanZoom();

    const [locked, setLocked] = React.useState(false);

    const categories = root.children;
    const spacing =
        categories.length > 0
            ? (spineEndY - spineStartY) / (categories.length + 1)
            : 0;

    return (
        <div className="pane pane-wide">
            <div className="pane-header">
                <span className="pane-title">Fishbone</span>
                <div style={{ display: "flex", gap: 4, alignItems: "center" }}>
                    {/* Lock toggle */}
                    <button
                        className="small-btn"
                        onClick={() => setLocked((v) => !v)}
                        title={locked ? "Unlock editing" : "Lock editing"}
                    >
                        {locked ? <Lock size={16} /> : <Unlock size={16} />}
                    </button>
                    <button className="small-btn" onClick={zoomOut}>
                        −
                    </button>
                    <button className="small-btn" onClick={zoomIn}>
                        +
                    </button>
                    <button
                        className="small-btn"
                        onClick={locked ? undefined : resetView}
                        disabled={locked}
                        title={locked ? "Unlock to reset diagram" : "Reset view"}
                    >
                        Reset
                    </button>
                    <button
                        className="small-btn"
                        onClick={locked ? undefined : onAddCategory}
                        disabled={locked}
                        title={locked ? "Unlock to add categories" : "Add category"}
                    >
                        + Category
                    </button>
                </div>
            </div>

            <div className="pane-body">
                <svg
                    viewBox={`0 0 ${width} ${height}`}
                    style={{
                        background: "white",
                        borderRadius: 8,
                        cursor: isPanning ? "grabbing" : "grab",
                    }}
                    {...svgHandlers}
                >
                    <g transform={`translate(${pan.x}, ${pan.y}) scale(${scale})`}>
                        {/* Vertical spine on the left */}
                        <line
                            x1={spineX}
                            y1={spineStartY}
                            x2={spineX}
                            y2={spineEndY}
                            stroke="#94a3b8"
                            strokeWidth={2}
                        />

                        {/* Editable Problem label at the top of the spine */}
                        <EditableText
                            x={spineX}
                            y={spineStartY - 14}
                            value={root.label || "Problem"}
                            fontSize={14}
                            fontWeight="bold"
                            disabled={locked}
                            onChange={(v) => onLabelChange(root.id, v)}
                        />

                        {/* Categories branching to the RIGHT of the spine */}
                        {categories.map((cat, i) => {
                            const catY = spineStartY + spacing * (i + 1);
                            const catX = spineX + 160; // fixed to the right
                            const selected = selectedNodeId === cat.id;

                            const catPriority = priorityByNode[cat.id];
                            const baseColors = getNodeColors(catPriority, true);
                            const stroke = selected ? "#3a7dff" : baseColors.stroke;
                            const strokeWidth = selected ? 2.6 : 1.4;

                            return (
                                <g key={cat.id}>
                                    {/* Bone from spine to category */}
                                    <line
                                        x1={spineX}
                                        y1={catY}
                                        x2={catX}
                                        y2={catY}
                                        stroke="#cbd5e1"
                                        strokeWidth={1.4}
                                    />

                                    {/* Category box (slightly pill-ish) */}
                                    <rect
                                        x={catX - 70}
                                        y={catY - 18}
                                        width={140}
                                        height={36}
                                        rx={10}
                                        fill={baseColors.fill}
                                        stroke={stroke}
                                        strokeWidth={strokeWidth}
                                        onClick={() => onSelect(cat.id)}
                                    />
                                    <EditableText
                                        x={catX}
                                        y={catY + 4}
                                        value={cat.label}
                                        disabled={locked}
                                        onChange={(v) => onLabelChange(cat.id, v)}
                                    />

                                    {/* + Cause / delete controls for category */}
                                    <text
                                        x={catX - 70}
                                        y={catY - 26}
                                        fontSize={10}
                                        fill={locked ? "#cbd5e1" : "#64748b"}
                                        style={{ cursor: locked ? "default" : "pointer" }}
                                        onClick={
                                            locked ? undefined : () => onAddCause(cat.id)
                                        }
                                    >
                                        + Cause
                                    </text>
                                    <text
                                        x={catX + 60}
                                        y={catY - 26}
                                        fontSize={12}
                                        fill={locked ? "#e5e7eb" : "#f97373"}
                                        style={{ cursor: locked ? "default" : "pointer" }}
                                        onClick={
                                            locked ? undefined : () => onDelete(cat.id)
                                        }
                                    >
                                        ✕
                                    </text>

                                    {/* Causes: stacked VERTICALLY under the category, to the right */}
                                    {cat.children.map((cause, j) => {
                                        const baseOffsetY = 0; // first cause starts below category
                                        const causeSpacingY = 32;
                                        const causeY =
                                            catY + baseOffsetY + j * causeSpacingY;
                                        const causeX = catX + 200; // fixed x to the right
                                        const sel = selectedNodeId === cause.id;

                                        const causePriority = priorityByNode[cause.id];
                                        const causeBase = getNodeColors(
                                            causePriority,
                                            false
                                        );
                                        const causeStroke = sel ? "#3a7dff" : causeBase.stroke;
                                        const causeStrokeWidth = sel ? 2.4 : 1.2;

                                        return (
                                            <g key={cause.id}>
                                                {/* connector from category to cause */}
                                                <line
                                                    x1={catX + 70}
                                                    y1={catY}
                                                    x2={causeX - 80}
                                                    y2={causeY}
                                                    stroke="#cbd5e1"
                                                    strokeWidth={1.2}
                                                />

                                                <rect
                                                    x={causeX - 80}
                                                    y={causeY - 14}
                                                    width={160}
                                                    height={28}
                                                    rx={8}
                                                    fill={causeBase.fill}
                                                    stroke={causeStroke}
                                                    strokeWidth={causeStrokeWidth}
                                                    onClick={() => onSelect(cause.id)}
                                                />
                                                <EditableText
                                                    x={causeX}
                                                    y={causeY + 4}
                                                    value={cause.label}
                                                    fontSize={11}
                                                    disabled={locked}
                                                    onChange={(v) =>
                                                        onLabelChange(cause.id, v)
                                                    }
                                                />
                                                <text
                                                    x={causeX + 70}
                                                    y={causeY - 16}
                                                    fontSize={10}
                                                    fill={locked ? "#e5e7eb" : "#f97373"}
                                                    style={{
                                                        cursor: locked ? "default" : "pointer",
                                                    }}
                                                    onClick={
                                                        locked
                                                            ? undefined
                                                            : () => onDelete(cause.id)
                                                    }
                                                >
                                                    ✕
                                                </text>
                                            </g>
                                        );
                                    })}
                                </g>
                            );
                        })}
                    </g>
                </svg>
            </div>
        </div>
    );
};

interface EditableProps {
    x: number;
    y: number;
    value: string;
    onChange: (v: string) => void;
    fontSize?: number;
    fontWeight?: string | number;
    disabled?: boolean;
}

const EditableText: React.FC<EditableProps> = ({
    x,
    y,
    value,
    onChange,
    fontSize = 12,
    fontWeight,
    disabled = false,
}) => {
    const [editing, setEditing] = React.useState(false);
    const [draft, setDraft] = React.useState(value);

    React.useEffect(() => setDraft(value), [value]);

    if (disabled) {
        return (
            <text
                x={x}
                y={y}
                textAnchor="middle"
                fontSize={fontSize}
                fontWeight={fontWeight}
                fill="#1e293b"
            >
                {value}
            </text>
        );
    }

    if (!editing) {
        return (
            <text
                x={x}
                y={y}
                textAnchor="middle"
                fontSize={fontSize}
                fontWeight={fontWeight}
                fill="#1e293b"
                style={{ cursor: "text" }}
                onClick={() => setEditing(true)}
            >
                {value}
            </text>
        );
    }

    return (
        <foreignObject x={x - 90} y={y - 14} width={180} height={28}>
            <input
                autoFocus
                value={draft}
                onBlur={() => {
                    onChange(draft.trim());
                    setEditing(false);
                }}
                onChange={(e) => setDraft(e.target.value)}
                onKeyDown={(e) => {
                    if (e.key === "Enter") {
                        onChange(draft.trim());
                        setEditing(false);
                    } else if (e.key === "Escape") {
                        setDraft(value);
                        setEditing(false);
                    }
                }}
                style={{
                    width: "100%",
                    height: "100%",
                    fontSize,
                    border: "1px solid #e2e8f0",
                    borderRadius: 8,
                    padding: "2px 6px",
                }}
            />
        </foreignObject>
    );
};

/** Pastel priority palette + friendly default colors */
function getNodeColors(
    priority: PriorityLevel | undefined,
    isCategory: boolean
): { fill: string; stroke: string } {
    switch (priority) {
        case "high":
            return { fill: "#ffe2e0", stroke: "#ff837a" }; // coral
        case "medium":
            return { fill: "#fff5d6", stroke: "#e3bd62" }; // honey
        case "low":
            return { fill: "#e6f8f3", stroke: "#6bbf99" }; // mint
        case "none":
        default:
            return isCategory
                ? { fill: "#eef2ff", stroke: "#94a3b8" } // soft blue
                : { fill: "#ffffff", stroke: "#cbd5e1" }; // neutral sticky note
    }
}