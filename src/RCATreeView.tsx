// src/RCATreeView.tsx
import React from "react";
import type { RCANode, PriorityLevel } from "./types";
import { findNode } from "./utils";
import { usePanZoom } from "./usePanZoom";
import { Lock, Unlock } from "lucide-react";

interface Props {
    root: RCANode;
    focusNodeId: string | null; // category root
    selectedNodeId: string | null;
    onSelect: (id: string) => void;
    onAddChild: (parentId: string) => void;
    onDelete: (id: string) => void;
    onLabelChange: (id: string, label: string) => void;
    priorityByNode: Record<string, PriorityLevel>;
}

interface PositionedNode {
    node: RCANode;
    x: number;
    y: number;
    level: number;
}

export const RCATreeView: React.FC<Props> = ({
    root,
    focusNodeId,
    selectedNodeId,
    onSelect,
    onAddChild,
    onDelete,
    onLabelChange,
    priorityByNode,
}) => {
    const width = 800;
    const levelHeight = 100;

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

    const focusNode =
        focusNodeId && focusNodeId !== root.id
            ? findNode(root, focusNodeId)
            : null;

    if (!focusNode) {
        return (
            <div className="pane pane-wide">
                <div className="pane-header">
                    <span className="pane-title">RCA Tree</span>
                    <div style={{ display: "flex", gap: 4, alignItems: "center" }}>
                        <button
                            className="small-btn"
                            onClick={() => setLocked((v) => !v)}
                            title={locked ? "Unlock editing" : "Lock editing"}
                        >
                            {locked ? <Lock size={16} /> : <Unlock size={16} />}
                        </button>
                    </div>
                </div>
                <div
                    style={{
                        flex: 1,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        background: "white",
                        borderRadius: "0 0 12px 12px",
                        color: "#64748b",
                        fontSize: 13,
                    }}
                >
                    Select a category in the fishbone to start the RCA tree
                </div>
            </div>
        );
    }

    const positioned = layoutTree(focusNode, width, levelHeight);
    const byId = new Map<string, PositionedNode>();
    positioned.forEach((p) => byId.set(p.node.id, p));

    const totalHeight = (maxLevel(positioned) + 1) * levelHeight + 200;

    return (
        <div className="pane pane-wide">
            <div className="pane-header">
                <span className="pane-title">
                    RCA Tree (category: {focusNode.label})
                </span>
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
                    <button className="small-btn" onClick={resetView}>
                        Reset
                    </button>
                </div>
            </div>

            <div className="pane-body">
                <svg
                    viewBox={`0 0 ${width} ${totalHeight}`}
                    style={{
                        background: "white",
                        borderRadius: 8,
                        cursor: isPanning ? "grabbing" : "grab",
                    }}
                    {...svgHandlers}
                >
                    <g transform={`translate(${pan.x}, ${pan.y}) scale(${scale})`}>
                        {/* Edges */}
                        {positioned.map((p) =>
                            p.node.children.map((child) => {
                                const c = byId.get(child.id);
                                if (!c) return null;
                                return (
                                    <line
                                        key={`${p.node.id}-${child.id}`}
                                        x1={p.x}
                                        y1={p.y + 30}
                                        x2={c.x}
                                        y2={c.y - 30}
                                        stroke="#cbd5e1"
                                        strokeWidth={1.2}
                                    />
                                );
                            })
                        )}

                        {/* Nodes */}
                        {positioned.map((p) => {
                            const nodeWidth = 160;
                            const nodeHeight = 40;
                            const isSelected = p.node.id === selectedNodeId;
                            const isRoot = p.node.id === focusNode.id;

                            const priority = priorityByNode[p.node.id];
                            const base = getNodeColors(priority, isRoot);
                            const stroke = isSelected ? "#3a7dff" : base.stroke;
                            const strokeWidth = isSelected ? 2.6 : 1.4;

                            return (
                                <g key={p.node.id}>
                                    <rect
                                        x={p.x - nodeWidth / 2}
                                        y={p.y - nodeHeight / 2}
                                        width={nodeWidth}
                                        height={nodeHeight}
                                        rx={10}
                                        ry={10}
                                        fill={base.fill}
                                        stroke={stroke}
                                        strokeWidth={strokeWidth}
                                        onClick={() => onSelect(p.node.id)}
                                    />

                                    {/* Editable label – same popout behavior as Fishbone, with lock */}
                                    <EditableTextNode
                                        x={p.x}
                                        y={p.y + 3}
                                        boxWidth={nodeWidth - 8}
                                        boxHeight={nodeHeight - 8}
                                        value={p.node.label}
                                        disabled={locked}
                                        onSelect={() => onSelect(p.node.id)}
                                        onChange={(v) => onLabelChange(p.node.id, v)}
                                    />

                                    {/* + Why? */}
                                    <text
                                        x={p.x - nodeWidth / 2 + 6}
                                        y={p.y + nodeHeight / 2 + 14}
                                        fontSize={10}
                                        fill={locked ? "#cbd5e1" : "#16a34a"}
                                        style={{
                                            cursor: locked ? "default" : "pointer",
                                        }}
                                        onClick={
                                            locked ? undefined : () => onAddChild(p.node.id)
                                        }
                                    >
                                        + Why?
                                    </text>

                                    {/* Delete (not root) */}
                                    {!isRoot && (
                                        <text
                                            x={p.x + nodeWidth / 2 - 10}
                                            y={p.y - nodeHeight / 2 - 4}
                                            fontSize={12}
                                            fill={locked ? "#e5e7eb" : "#f97373"}
                                            style={{
                                                cursor: locked ? "default" : "pointer",
                                            }}
                                            onClick={
                                                locked ? undefined : () => onDelete(p.node.id)
                                            }
                                        >
                                            ✕
                                        </text>
                                    )}
                                </g>
                            );
                        })}
                    </g>
                </svg>
            </div>
        </div>
    );
};

/* ------------ Layout helpers ------------ */

function layoutTree(
    root: RCANode,
    width: number,
    levelHeight: number
): PositionedNode[] {
    const nodes: PositionedNode[] = [];
    const levels: RCANode[][] = [];
    const queue: { node: RCANode; level: number }[] = [{ node: root, level: 0 }];

    while (queue.length) {
        const { node, level } = queue.shift()!;
        if (!levels[level]) levels[level] = [];
        levels[level].push(node);
        node.children.forEach((child) =>
            queue.push({ node: child, level: level + 1 })
        );
    }

    levels.forEach((levelNodes, level) => {
        const spacing = width / (levelNodes.length + 1);
        levelNodes.forEach((node, idx) => {
            nodes.push({
                node,
                level,
                x: spacing * (idx + 1),
                y: 60 + level * levelHeight,
            });
        });
    });

    return nodes;
}

function maxLevel(nodes: PositionedNode[]): number {
    return nodes.reduce((max, n) => Math.max(max, n.level), 0);
}

/** Match fishbone palette */
function getNodeColors(
    priority: PriorityLevel | undefined,
    isRoot: boolean
): { fill: string; stroke: string } {
    switch (priority) {
        case "high":
            return { fill: "#ffe2e0", stroke: "#ff837a" };
        case "medium":
            return { fill: "#fff5d6", stroke: "#e3bd62" };
        case "low":
            return { fill: "#e6f8f3", stroke: "#6bbf99" };
        case "none":
        default:
            return isRoot
                ? { fill: "#fff5d6", stroke: "#e3bd62" } // root a soft honey
                : { fill: "#f9fafb", stroke: "#cbd5e1" };
    }
}

/* ------------ Editable text for RCA nodes ------------ */

interface EditableNodeProps {
    x: number;
    y: number;
    value: string;
    onChange: (v: string) => void;
    onSelect?: () => void;
    boxWidth?: number;
    boxHeight?: number;
    fontSize?: number;
    disabled?: boolean;
}

const EditableTextNode: React.FC<EditableNodeProps> = ({
    x,
    y,
    value,
    onChange,
    onSelect,
    boxWidth = 160,
    boxHeight = 28,
    fontSize = 12,
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
                fill="#1e293b"
                style={{ cursor: "text" }}
                onClick={(e) => {
                    e.stopPropagation();
                    onSelect?.();
                    setEditing(true);
                }}
            >
                {value}
            </text>
        );
    }

    return (
        <foreignObject
            x={x - boxWidth / 2}
            y={y - boxHeight / 2}
            width={boxWidth}
            height={boxHeight}
        >
            <input
                autoFocus
                value={draft}
                onClick={(e) => e.stopPropagation()}
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
                    textAlign: "center",
                }}
            />
        </foreignObject>
    );
};