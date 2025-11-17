// src/RCATreeView.tsx
import React from "react";
import type { RCANode, PriorityLevel } from "./types";
import { findNode } from "./utils";
import { Lock, Unlock, ZoomIn, ZoomOut } from "lucide-react";

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

/* ---------- Text wrapping helpers ---------- */

const MAX_CHARS_PER_LINE = 20;

function wrapLabel(label: string): string[] {
    const words = label.split(/\s+/);
    const lines: string[] = [];
    let current = "";

    words.forEach((word) => {
        if ((current + word).length > MAX_CHARS_PER_LINE && current) {
            lines.push(current.trim());
            current = word;
        } else {
            current += (current ? " " : "") + word;
        }
    });

    if (current) lines.push(current.trim());
    return lines.length ? lines : [label];
}

function getCardHeight(label: string): number {
    const lines = wrapLabel(label);
    const lineHeight = 18; // px
    // some vertical padding + space for all lines
    return Math.max(40, lines.length * lineHeight + 12);
}

/* ---------- Main component ---------- */

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
    const minLogicalWidth = 400; // Smaller initial width so it's compact
    const cardWidth = 160;
    const minCardSpacing = 20;

    const [locked, setLocked] = React.useState(false);
    const [scale, setScale] = React.useState(1);
    const [fishboneRoot, setFishboneRoot] = React.useState<string | null>(null);
    const [internalSelection, setInternalSelection] =
        React.useState<string | null>(null);

    React.useEffect(() => {
        // Update fishboneRoot when selectedNodeId changes
        setFishboneRoot(selectedNodeId);
    }, [selectedNodeId]);

    const focusNode =
        focusNodeId && focusNodeId !== root.id ? findNode(root, focusNodeId) : null;

    /* ---------- Empty state ---------- */

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

    /* ---------- Layout ---------- */

    // Determine root: use fishboneRoot (Fishbone selection) or focusNode (category)
    let treeRoot = focusNode;

    if (fishboneRoot && fishboneRoot !== root.id) {
        const node = findNode(root, fishboneRoot);
        if (node) {
            treeRoot = node;
        }
    }

    const levelCounts = getNodeCountsByLevel(treeRoot);
    const maxNodesAtAnyLevel = Math.max(...levelCounts);
    // Use a temporary large width to layout tree without initial centering constraints
    const layoutWidth = maxNodesAtAnyLevel * (cardWidth + minCardSpacing) + 500;

    // Layout tree - root will be positioned at layoutWidth/2
    const allPositioned = layoutTree(treeRoot, layoutWidth);
    const byId = new Map<string, PositionedNode>();
    allPositioned.forEach((p) => byId.set(p.node.id, p));

    // Calculate actual bounds from positioned nodes
    let minX = Infinity,
        maxX = -Infinity;
    let maxY = 0;
    allPositioned.forEach((p) => {
        const h = getCardHeight(p.node.label);
        const w = cardWidth;
        const left = p.x - w / 2;
        const right = p.x + w / 2;
        const bottom = p.y + h / 2;

        minX = Math.min(minX, left);
        maxX = Math.max(maxX, right);
        maxY = Math.max(maxY, bottom);
    });

    // Determine final logical width (compact if fits, expanded if needed)
    const contentWidth = maxX - minX + 50; // Reduced padding since offset will center
    const logicalWidth = Math.max(minLogicalWidth, contentWidth);
    const logicalHeight = Math.max(400, maxY + 100);

    // Center the content within the final logical width
    const contentCenterX = (minX + maxX) / 2;
    const logicalCenterX = logicalWidth / 2;
    const offsetX = logicalCenterX - contentCenterX;

    allPositioned.forEach((p) => {
        p.x += offsetX;
    });

    /* ---------- Render ---------- */

    return (
        <div className="pane pane-wide">
            <div className="pane-header">
                <span className="pane-title">
                    RCA Tree{" "}
                    {treeRoot.id !== focusNode.id
                        ? `(Cause: ${treeRoot.label})`
                        : `(Category: ${focusNode.label})`}
                </span>
                <div style={{ display: "flex", gap: 4, alignItems: "center" }}>
                    <button
                        className="small-btn"
                        onClick={() => setScale((s) => Math.min(3, s + 0.2))}
                        title="Zoom in"
                    >
                        <ZoomIn size={16} />
                    </button>
                    <button
                        className="small-btn"
                        onClick={() => setScale((s) => Math.max(0.5, s - 0.2))}
                        title="Zoom out"
                    >
                        <ZoomOut size={16} />
                    </button>
                    <button
                        className="small-btn"
                        onClick={() => setLocked((v) => !v)}
                        title={locked ? "Unlock editing" : "Lock editing"}
                    >
                        {locked ? <Lock size={16} /> : <Unlock size={16} />}
                    </button>
                </div>
            </div>

            <div className="pane-body" style={{ overflow: "auto" }}>
                {/* Inner canvas sized to the diagram; keeps scrollbars aligned to SVG */}
                <div
                    style={{
                        position: "relative",
                        width: `${logicalWidth}px`,
                        minHeight: logicalHeight,
                        margin: "0 auto",
                    }}
                >
                    <svg
                        viewBox={`0 0 ${logicalWidth} ${logicalHeight}`}
                        style={{
                            background: "white",
                            borderRadius: 8,
                            display: "block",
                            width: "100%",
                            height: `${logicalHeight}px`,
                        }}
                    >
                        <g
                            transform={`
                translate(${logicalWidth / 2}, ${logicalHeight / 2})
                scale(${scale})
                translate(-${logicalWidth / 2}, -${logicalHeight / 2})
              `}
                        >
                            {/* Edges */}
                            {allPositioned.map((p) =>
                                p.node.children.map((child) => {
                                    const c = byId.get(child.id);
                                    if (!c) return null;

                                    const pHeight = getCardHeight(p.node.label);
                                    const cHeight = getCardHeight(child.label);
                                    const parentBottom = p.y + pHeight / 2;
                                    const childTop = c.y - cHeight / 2;
                                    const midY = (parentBottom + childTop) / 2;

                                    return (
                                        <path
                                            key={`${p.node.id}-${child.id}`}
                                            d={`M ${p.x} ${parentBottom} C ${p.x} ${midY} ${c.x} ${midY} ${c.x} ${childTop}`}
                                            stroke="#cbd5e1"
                                            strokeWidth={1}
                                            fill="none"
                                        />
                                    );
                                })
                            )}

                            {/* Nodes */}
                            {allPositioned.map((p) => {
                                const nodeWidth = cardWidth;
                                const nodeHeight = getCardHeight(p.node.label);
                                const isSelected = p.node.id === internalSelection;
                                const isRoot = p.node.id === focusNode.id;
                                const priority = priorityByNode[p.node.id];

                                const base = getNodeColors(priority, isRoot);
                                const stroke = isSelected ? "#3a7dff" : base.stroke;
                                const strokeWidth = isSelected ? 2.4 : 1.4;

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
                                            onClick={() => setInternalSelection(p.node.id)}
                                        />

                                        <EditableTextNode
                                            x={p.x}
                                            y={p.y}
                                            boxWidth={nodeWidth - 8}
                                            boxHeight={nodeHeight - 8}
                                            value={p.node.label}
                                            disabled={locked}
                                            onSelect={() => setInternalSelection(p.node.id)}
                                            onChange={(v) => onLabelChange(p.node.id, v)}
                                        />

                                        {/* + Why? */}
                                        <text
                                            x={p.x - nodeWidth / 2 + 6}
                                            y={p.y + nodeHeight / 2 + 14}
                                            fontSize={10}
                                            fill={locked ? "#cbd5e1" : "#16a34a"}
                                            style={{ cursor: locked ? "default" : "pointer" }}
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
                                                y={p.y - nodeHeight / 2 - 6}
                                                fontSize={12}
                                                fill={locked ? "#e5e7eb" : "#f97373"}
                                                style={{ cursor: locked ? "default" : "pointer" }}
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
        </div>
    );
};

/* ---------- Layout helpers ---------- */

function getNodeCountsByLevel(root: RCANode): number[] {
    const counts: number[] = [];
    const queue: { node: RCANode; level: number }[] = [{ node: root, level: 0 }];

    while (queue.length) {
        const { node, level } = queue.shift()!;
        counts[level] = (counts[level] || 0) + 1;
        node.children.forEach((child) =>
            queue.push({ node: child, level: level + 1 })
        );
    }
    return counts;
}

function layoutTree(root: RCANode, width: number): PositionedNode[] {
    const nodes: PositionedNode[] = [];
    const cardWidth = 160;
    const minHorizontalSpacing = 40; // Minimum gap between siblings

    // Map to store subtree width for each node
    const subtreeWidths = new Map<string, number>();

    // Calculate subtree width (how much space this node and all descendants need)
    function calculateSubtreeWidth(node: RCANode): number {
        if (node.children.length === 0) {
            return cardWidth;
        }

        const childWidths = node.children.map((child) => calculateSubtreeWidth(child));
        const totalChildWidth =
            childWidths.reduce((sum, w) => sum + w + minHorizontalSpacing, 0) -
            minHorizontalSpacing;

        subtreeWidths.set(node.id, Math.max(cardWidth, totalChildWidth));
        return subtreeWidths.get(node.id)!;
    }

    calculateSubtreeWidth(root);

    // Build level structure
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

    // Position nodes
    const nodesByLevel: PositionedNode[][] = [];
    let currentLevelY = 60;

    levels.forEach((levelNodes, level) => {
        const levelNodesPositioned: PositionedNode[] = [];
        const topY = currentLevelY;

        // For each node at this level, find its parent's X position
        levelNodes.forEach((node) => {
            const cardHeight = getCardHeight(node.label);

            // Find parent node and its X position
            let parentX = width / 2; // Default to center if root
            if (level > 0) {
                const parentNode = levels[level - 1].find((parent) =>
                    parent.children.some((child) => child.id === node.id)
                );
                if (parentNode) {
                    const parentPos = nodesByLevel[level - 1]?.find(
                        (p) => p.node.id === parentNode.id
                    );
                    if (parentPos) {
                        parentX = parentPos.x;
                    }
                }
            }

            levelNodesPositioned.push({
                node,
                level,
                x: parentX,
                y: topY + cardHeight / 2,
            });
        });

        // Group children by parent and position them with proper spacing
        const childrenByParent = new Map<string, PositionedNode[]>();
        levelNodesPositioned.forEach((pos) => {
            const parent = levels[level - 1]?.find((p) =>
                p.children.some((c) => c.id === pos.node.id)
            );
            const parentId = parent?.id || "root";
            if (!childrenByParent.has(parentId)) {
                childrenByParent.set(parentId, []);
            }
            childrenByParent.get(parentId)!.push(pos);
        });

        // Position children with dynamic spacing based on subtree widths
        childrenByParent.forEach((children) => {
            if (children.length === 1) {
                // Single child: directly under parent
                children[0].x = children[0].x;
            } else {
                // Multiple children: calculate total width needed
                const totalWidth =
                    children.reduce((sum, child) => {
                        const subtreeWidth = subtreeWidths.get(child.node.id) || cardWidth;
                        return sum + subtreeWidth + minHorizontalSpacing;
                    }, 0) - minHorizontalSpacing;

                // Position children so their center of mass is at parent's X
                const startX = children[0].x - totalWidth / 2;
                let currentX = startX;

                children.forEach((child) => {
                    const subtreeWidth = subtreeWidths.get(child.node.id) || cardWidth;
                    child.x = currentX + subtreeWidth / 2; // Position at center of subtree
                    currentX += subtreeWidth + minHorizontalSpacing;
                });
            }
        });

        nodesByLevel[level] = levelNodesPositioned;
        nodes.push(...levelNodesPositioned);

        // Calculate the maximum bottom of all cards at this level
        let maxBottom = topY;
        levelNodesPositioned.forEach((p) => {
            const cardHeight = getCardHeight(p.node.label);
            const cardBottom = p.y + cardHeight / 2;
            maxBottom = Math.max(maxBottom, cardBottom);
        });

        // Next level starts below this level with 40px spacing
        currentLevelY = maxBottom + 40;
    });

    return nodes;
}

/* ---------- Colors ---------- */

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
                ? { fill: "#fff5d6", stroke: "#e3bd62" }
                : { fill: "#f9fafb", stroke: "#cbd5e1" };
    }
}

/* ---------- Editable text node ---------- */

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

    const lines = React.useMemo(() => wrapLabel(value), [value]);
    const lineHeight = fontSize * 1.2;
    const totalTextHeight = (lines.length - 1) * lineHeight;
    const startY = y - totalTextHeight / 2; // center block in card

    if (disabled && !editing) {
        return (
            <g>
                {lines.map((line, idx) => (
                    <text
                        key={idx}
                        x={x}
                        y={startY + idx * lineHeight}
                        textAnchor="middle"
                        fontSize={fontSize}
                        fill="#1e293b"
                    >
                        {line}
                    </text>
                ))}
            </g>
        );
    }

    if (!editing) {
        return (
            <g style={{ cursor: "text" }}>
                {lines.map((line, idx) => (
                    <text
                        key={idx}
                        x={x}
                        y={startY + idx * lineHeight}
                        textAnchor="middle"
                        fontSize={fontSize}
                        fill="#1e293b"
                        onClick={(e) => {
                            e.stopPropagation();
                            onSelect?.();
                            setEditing(true);
                        }}
                    >
                        {line}
                    </text>
                ))}
            </g>
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