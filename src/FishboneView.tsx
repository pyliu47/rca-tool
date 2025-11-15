// src/FishboneView.tsx — vertical spine on left, categories to the right,
// causes stacked vertically

import React from "react";
import type { RCANode } from "./types";
import { usePanZoom } from "./usePanZoom";

interface Props {
    root: RCANode;
    selectedNodeId: string | null;
    onSelect: (id: string) => void;
    onAddCategory: () => void;
    onAddCause: (categoryId: string) => void;
    onLabelChange: (id: string, label: string) => void;
    onDelete: (id: string) => void;
}

export const FishboneView: React.FC<Props> = ({
    root,
    selectedNodeId,
    onSelect,
    onAddCategory,
    onAddCause,
    onLabelChange,
    onDelete,
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

    const categories = root.children;
    const spacing =
        categories.length > 0
            ? (spineEndY - spineStartY) / (categories.length + 1)
            : 0;

    return (
        <div className="pane pane-wide">
            <div className="pane-header">
                <span className="pane-title">Fishbone</span>
                <div style={{ display: "flex", gap: 4 }}>
                    <button className="small-btn" onClick={zoomOut}>
                        −
                    </button>
                    <button className="small-btn" onClick={zoomIn}>
                        +
                    </button>
                    <button className="small-btn" onClick={resetView}>
                        Reset
                    </button>
                    <button className="small-btn" onClick={onAddCategory}>
                        + Category
                    </button>
                </div>
            </div>

            <div className="pane-body">
                <svg
                    viewBox={`0 0 ${width} ${height}`}
                    style={{
                        background: "white",
                        borderRadius: 4,
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
                            stroke="#000"
                            strokeWidth={2}
                        />

                        {/* Problem label at the top of the spine */}
                        <text
                            x={spineX}
                            y={spineStartY - 14}
                            textAnchor="middle"
                            fontSize={14}
                            fontWeight="bold"
                        >
                            Problem
                        </text>

                        {/* Categories branching to the RIGHT of the spine */}
                        {categories.map((cat, i) => {
                            const catY = spineStartY + spacing * (i + 1);
                            const catX = spineX + 160; // fixed to the right
                            const selected = selectedNodeId === cat.id;

                            return (
                                <g key={cat.id}>
                                    {/* Bone from spine to category */}
                                    <line
                                        x1={spineX}
                                        y1={catY}
                                        x2={catX}
                                        y2={catY}
                                        stroke="#000"
                                    />

                                    {/* Category box */}
                                    <rect
                                        x={catX - 60}
                                        y={catY - 15}
                                        width={120}
                                        height={30}
                                        rx={6}
                                        fill={selected ? "#e0f2fe" : "#f3f4f6"}
                                        stroke={selected ? "#0284c7" : "#94a3b8"}
                                        onClick={() => onSelect(cat.id)}
                                    />
                                    <EditableText
                                        x={catX}
                                        y={catY + 4}
                                        value={cat.label}
                                        onChange={(v) => onLabelChange(cat.id, v)}
                                    />

                                    {/* + Cause / delete controls for category */}
                                    <text
                                        x={catX - 60}
                                        y={catY - 22}
                                        fontSize={10}
                                        fill="#555"
                                        style={{ cursor: "pointer" }}
                                        onClick={() => onAddCause(cat.id)}
                                    >
                                        + Cause
                                    </text>
                                    <text
                                        x={catX + 48}
                                        y={catY - 22}
                                        fontSize={12}
                                        fill="#b91c1c"
                                        style={{ cursor: "pointer" }}
                                        onClick={() => onDelete(cat.id)}
                                    >
                                        ✕
                                    </text>

                                    {/* Causes: stacked VERTICALLY under the category, to the right */}
                                    {cat.children.map((cause, j) => {
                                        const baseOffsetY = 45; // first cause starts below category
                                        const causeSpacingY = 32;
                                        const causeY =
                                            catY + baseOffsetY + j * causeSpacingY;
                                        const causeX = catX + 200; // fixed x to the right
                                        const sel = selectedNodeId === cause.id;

                                        return (
                                            <g key={cause.id}>
                                                {/* diagonal-ish connector from category to cause stack */}
                                                <line
                                                    x1={catX + 60}
                                                    y1={catY}
                                                    x2={causeX - 70}
                                                    y2={causeY}
                                                    stroke="#000"
                                                />

                                                <rect
                                                    x={causeX - 70}
                                                    y={causeY - 12}
                                                    width={140}
                                                    height={24}
                                                    rx={4}
                                                    fill={sel ? "#e0f2fe" : "#fff"}
                                                    stroke={sel ? "#0284c7" : "#ccc"}
                                                    onClick={() => onSelect(cause.id)}
                                                />
                                                <EditableText
                                                    x={causeX + 4}
                                                    y={causeY + 4}
                                                    value={cause.label}
                                                    fontSize={10}
                                                    onChange={(v) => onLabelChange(cause.id, v)}
                                                />
                                                <text
                                                    x={causeX + 62}
                                                    y={causeY - 14}
                                                    fontSize={10}
                                                    fill="#b91c1c"
                                                    style={{ cursor: "pointer" }}
                                                    onClick={() => onDelete(cause.id)}
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
}

const EditableText: React.FC<EditableProps> = ({
    x,
    y,
    value,
    onChange,
    fontSize = 12,
}) => {
    const [editing, setEditing] = React.useState(false);
    const [draft, setDraft] = React.useState(value);

    React.useEffect(() => setDraft(value), [value]);

    if (!editing) {
        return (
            <text
                x={x}
                y={y}
                textAnchor="middle"
                fontSize={fontSize}
                style={{ cursor: "text" }}
                onClick={() => setEditing(true)}
            >
                {value}
            </text>
        );
    }

    return (
        <foreignObject x={x - 80} y={y - 12} width={160} height={24}>
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
                    }
                }}
                style={{
                    width: "100%",
                    height: "100%",
                    fontSize,
                    border: "1px solid #ccc",
                    borderRadius: 4,
                }}
            />
        </foreignObject>
    );
};