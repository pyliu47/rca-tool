// src/RCATreeView.tsx
import React from "react";
import type { RCANode } from "./types";
import { findNode } from "./utils";
import { usePanZoom } from "./usePanZoom";

interface Props {
    root: RCANode;
    focusNodeId: string | null;       // category root
    selectedNodeId: string | null;    // for highlighting & bank insertion
    onSelect: (id: string) => void;
    onAddChild: (parentId: string) => void;
    onDelete: (id: string) => void;
    onLabelChange: (id: string, label: string) => void;
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

    const focusNode =
        focusNodeId && focusNodeId !== root.id
            ? findNode(root, focusNodeId)
            : null;

    if (!focusNode) {
        return (
            <div className="pane pane-wide">
                <div className="pane-header">
                    <span className="pane-title">RCA Tree</span>
                </div>
                <div
                    style={{
                        flex: 1,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        background: "white",
                        borderRadius: 4,
                        color: "#6b7280",
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
                        borderRadius: 4,
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
                                        stroke="#b0b0b0"
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

                            return (
                                <g key={p.node.id}>
                                    <rect
                                        x={p.x - nodeWidth / 2}
                                        y={p.y - nodeHeight / 2}
                                        width={nodeWidth}
                                        height={nodeHeight}
                                        rx={6}
                                        ry={6}
                                        fill={
                                            isRoot ? "#fef3c7" : isSelected ? "#e0f2fe" : "#f9fafb"
                                        }
                                        stroke={
                                            isRoot ? "#f59e0b" : isSelected ? "#0ea5e9" : "#d1d5db"
                                        }
                                        onClick={() => onSelect(p.node.id)}
                                    />

                                    <foreignObject
                                        x={p.x - nodeWidth / 2 + 4}
                                        y={p.y - nodeHeight / 2 + 4}
                                        width={nodeWidth - 8}
                                        height={nodeHeight - 8}
                                    >
                                        <input
                                            value={p.node.label}
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                onSelect(p.node.id);
                                            }}
                                            onChange={(e) =>
                                                onLabelChange(p.node.id, e.target.value)
                                            }
                                            style={{
                                                width: "100%",
                                                height: "100%",
                                                border: "none",
                                                outline: "none",
                                                fontSize: 12,
                                                textAlign: "center",
                                                background: "transparent",
                                            }}
                                        />
                                    </foreignObject>

                                    {/* + Why? */}
                                    <text
                                        x={p.x - nodeWidth / 2 + 4}
                                        y={p.y + nodeHeight / 2 + 14}
                                        fontSize={10}
                                        fill="#15803d"
                                        style={{ cursor: "pointer" }}
                                        onClick={() => onAddChild(p.node.id)}
                                    >
                                        + Why?
                                    </text>

                                    {/* Delete (not root) */}
                                    {!isRoot && (
                                        <text
                                            x={p.x + nodeWidth / 2 - 10}
                                            y={p.y - nodeHeight / 2 - 4}
                                            fontSize={12}
                                            fill="#b91c1c"
                                            style={{ cursor: "pointer" }}
                                            onClick={() => onDelete(p.node.id)}
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