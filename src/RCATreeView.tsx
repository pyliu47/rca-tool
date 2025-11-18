// src/RCATreeView.tsx
import React from "react";
import type { RCANode, PriorityLevel, Persona } from "./types";
import { findNode } from "./utils";
import { Lock, Unlock, ZoomIn, ZoomOut, Trees } from "lucide-react";

interface Props {
    root: RCANode;
    focusNodeId: string | null; // category root
    selectedNodeId: string | null;
    onAddChild: (parentId: string) => void;
    onDelete: (id: string) => void;
    onLabelChange: (id: string, label: string) => void;
    onSelect: (id: string) => void;
    priorityByNode: Record<string, PriorityLevel>;
    personas: Persona[];
    onUpdateNodePersonas: (nodeId: string, personaIds: string[]) => void;
    onUpdatePersonas: (personas: Persona[]) => void;
    personaColors?: string[];
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
    onAddChild,
    onDelete,
    onLabelChange,
    onSelect,
    priorityByNode,
    personas,
    onUpdateNodePersonas,
    onUpdatePersonas,
    personaColors = [
        "#fce7f3", // pink
        "#dbeafe", // blue
        "#dcfce7", // green
        "#fef3c7", // yellow
        "#e9d5ff", // purple
        "#fed7aa", // orange
        "#cffafe", // cyan
        "#f5d4d4", // red-ish
        "#dbeafe", // light blue
        "#fce7f3", // light pink
        "#d1fae5", // teal
        "#fef08a", // lime
    ],
}) => {
    const minLogicalWidth = 400; // Smaller initial width so it's compact
    const cardWidth = 160;
    const minCardSpacing = 20;

    const [locked, setLocked] = React.useState(false);
    const [scale, setScale] = React.useState(1);
    const [personaDropdownOpen, setPersonaDropdownOpen] = React.useState<string | null>(null);
    const [personaDraft, setPersonaDraft] = React.useState("");
    const [addingNewPersona, setAddingNewPersona] = React.useState(false);

    const focusNode =
        focusNodeId && focusNodeId !== root.id ? findNode(root, focusNodeId) : null;

    /* ---------- Empty state ---------- */

    if (!focusNode) {
        return (
            <div className="pane pane-wide">
                <div className="pane-header">
                    <span className="pane-title">
                        <Trees size={16} />
                        RCA Tree
                    </span>
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

    // Determine root: use focusNode (category selected in fishbone or tree)
    let treeRoot = focusNode;

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
    const contentWidth = maxX - minX + 80; // Add extra padding for nodes and spacing
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
                    <Trees size={16} />
                    RCA Tree{" "}
                    {(() => {
                        const isCategory = root.children.some((child) => child.id === treeRoot.id);
                        const label = isCategory ? "Category" : "Cause";
                        return `(${label}: ${treeRoot.label})`;
                    })()}
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

            <div className="pane-body" style={{ overflow: "auto", position: "relative" }}>
                {/* Persona Legend - bottom right corner of pane, floating over canvas */}
                {(() => {
                    // Collect all persona IDs used in the tree
                    const usedPersonaIds = new Set<string>();
                    const collectPersonaIds = (node: RCANode) => {
                        if (node.personaIds) {
                            node.personaIds.forEach((id) => usedPersonaIds.add(id));
                        }
                        node.children.forEach(collectPersonaIds);
                    };
                    collectPersonaIds(treeRoot);

                    const usedPersonas = personas.filter((p) => usedPersonaIds.has(p.id));

                    return usedPersonas.length > 0 ? (
                        <div
                            style={{
                                position: "absolute",
                                bottom: "80px",
                                right: "12px",
                                backgroundColor: "#ffffff",
                                border: "1px solid #e2e8f0",
                                borderRadius: "8px",
                                padding: "8px 12px",
                                zIndex: 10,
                                maxWidth: "200px",
                                fontSize: "12px",
                                pointerEvents: "auto",
                                boxShadow: "0 1px 3px rgba(15, 23, 42, 0.12)",
                            }}
                        >
                            <div style={{ fontWeight: 600, marginBottom: "6px", color: "#334155" }}>
                                Personas
                            </div>
                            <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
                                {usedPersonas.map((p) => (
                                    <div
                                        key={p.id}
                                        style={{
                                            display: "flex",
                                            alignItems: "center",
                                            gap: "6px",
                                        }}
                                    >
                                        <div
                                            style={{
                                                width: "8px",
                                                height: "8px",
                                                borderRadius: "50%",
                                                backgroundColor: p.color || "#dbeafe",
                                                border: "0.8px solid #000000",
                                                flexShrink: 0,
                                            }}
                                        />
                                        <span style={{ color: "#475569" }}>{p.name}</span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    ) : null;
                })()}
                {/* Inner canvas sized to the diagram; keeps scrollbars aligned to SVG */}
                <div
                    style={{
                        position: "relative",
                        width: `${logicalWidth * scale}px`,
                        minHeight: `${logicalHeight * scale}px`,
                        margin: "0 auto",
                    }}
                >
                    <svg
                        viewBox={`0 0 ${logicalWidth} ${logicalHeight}`}
                        style={{
                            background: "white",
                            borderRadius: 8,
                            display: "block",
                            width: `${logicalWidth * scale}px`,
                            height: `${logicalHeight * scale}px`,
                        }}
                    >
                        <g>
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
                                const isSelected = p.node.id === selectedNodeId;
                                const isRoot = p.node.id === focusNode.id;
                                const priority = priorityByNode[p.node.id];

                                const base = getNodeColors(priority);
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
                                            onClick={() => onSelect(p.node.id)}
                                        />

                                        <EditableTextNode
                                            x={p.x}
                                            y={p.y}
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

                                        {/* Persona indicator dots - bottom right corner with dropdown */}
                                        {(p.node.personaIds || []).length > 0 && (
                                            <foreignObject
                                                x={p.x + nodeWidth / 2 - 35}
                                                y={p.y + nodeHeight / 2 - 10}
                                                width={32}
                                                height={14}
                                                style={{ pointerEvents: locked ? "none" : "auto" }}
                                            >
                                                <div
                                                    style={{
                                                        display: "flex",
                                                        gap: "3px",
                                                        alignItems: "center",
                                                        justifyContent: "flex-end",
                                                        width: "100%",
                                                        cursor: locked ? "default" : "pointer",
                                                        position: "relative",
                                                    }}
                                                    onClick={(e) => {
                                                        if (!locked) {
                                                            e.stopPropagation();
                                                            setPersonaDropdownOpen(
                                                                personaDropdownOpen === p.node.id ? null : p.node.id
                                                            );
                                                            setAddingNewPersona(false);
                                                            setPersonaDraft("");
                                                        }
                                                    }}
                                                    title="Click to manage personas for this cause"
                                                >
                                                    {personas
                                                        .filter((ps) => p.node.personaIds?.includes(ps.id))
                                                        .map((ps) => (
                                                            <div
                                                                key={ps.id}
                                                                style={{
                                                                    width: "7px",
                                                                    height: "7px",
                                                                    borderRadius: "50%",
                                                                    backgroundColor: ps.color || "#dbeafe",
                                                                    border: "0.8px solid #000000",
                                                                }}
                                                                title={ps.name}
                                                            />
                                                        ))}
                                                    {personaDropdownOpen === p.node.id && (
                                                        <div
                                                            style={{
                                                                position: "absolute",
                                                                bottom: "100%",
                                                                right: 0,
                                                                marginBottom: "8px",
                                                                backgroundColor: "#ffffff",
                                                                border: "1px solid #e5e7eb",
                                                                borderRadius: "6px",
                                                                boxShadow: "0 4px 6px rgba(0, 0, 0, 0.07)",
                                                                zIndex: 20,
                                                                maxHeight: "200px",
                                                                overflowY: "auto",
                                                                minWidth: "180px",
                                                                pointerEvents: "auto",
                                                            }}
                                                            onClick={(e) => e.stopPropagation()}
                                                        >
                                                            {addingNewPersona ? (
                                                                <div
                                                                    style={{
                                                                        padding: "8px 12px",
                                                                        borderBottom: "1px solid #e5e7eb",
                                                                        display: "flex",
                                                                        gap: "4px",
                                                                    }}
                                                                >
                                                                    <input
                                                                        autoFocus
                                                                        type="text"
                                                                        placeholder="Persona name..."
                                                                        value={personaDraft}
                                                                        onChange={(e) => setPersonaDraft(e.target.value)}
                                                                        onKeyDown={(e) => {
                                                                            if (e.key === "Enter") {
                                                                                e.preventDefault();
                                                                                if (personaDraft.trim()) {
                                                                                    const colorIndex = personas.length % personaColors.length;
                                                                                    const newPersona: Persona = {
                                                                                        id: `p${Date.now()}`,
                                                                                        name: personaDraft.trim(),
                                                                                        color: personaColors[colorIndex],
                                                                                    };
                                                                                    onUpdatePersonas([...personas, newPersona]);
                                                                                    onUpdateNodePersonas(p.node.id, [...(p.node.personaIds || []), newPersona.id]);
                                                                                    setPersonaDraft("");
                                                                                    setAddingNewPersona(false);
                                                                                    setPersonaDropdownOpen(null);
                                                                                }
                                                                            } else if (e.key === "Escape") {
                                                                                setAddingNewPersona(false);
                                                                                setPersonaDraft("");
                                                                            }
                                                                        }}
                                                                        style={{
                                                                            fontSize: "11px",
                                                                            padding: "4px 6px",
                                                                            border: "1px solid #cbd5e1",
                                                                            borderRadius: "4px",
                                                                            flex: 1,
                                                                            outline: "none",
                                                                            background: "#ffffff",
                                                                        }}
                                                                    />
                                                                    <button
                                                                        type="button"
                                                                        onClick={() => {
                                                                            if (personaDraft.trim()) {
                                                                                const colorIndex = personas.length % personaColors.length;
                                                                                const newPersona: Persona = {
                                                                                    id: `p${Date.now()}`,
                                                                                    name: personaDraft.trim(),
                                                                                    color: personaColors[colorIndex],
                                                                                };
                                                                                onUpdatePersonas([...personas, newPersona]);
                                                                                onUpdateNodePersonas(p.node.id, [...(p.node.personaIds || []), newPersona.id]);
                                                                                setPersonaDraft("");
                                                                                setAddingNewPersona(false);
                                                                                setPersonaDropdownOpen(null);
                                                                            }
                                                                        }}
                                                                        style={{
                                                                            fontSize: "10px",
                                                                            padding: "4px 8px",
                                                                            background: "#3b82f6",
                                                                            color: "#fff",
                                                                            border: "none",
                                                                            borderRadius: "4px",
                                                                            cursor: "pointer",
                                                                            fontWeight: 500,
                                                                        }}
                                                                    >
                                                                        + Add & select
                                                                    </button>
                                                                    <button
                                                                        type="button"
                                                                        onClick={() => {
                                                                            setAddingNewPersona(false);
                                                                            setPersonaDraft("");
                                                                        }}
                                                                        style={{
                                                                            fontSize: "10px",
                                                                            padding: "4px 8px",
                                                                            background: "#f1f5f9",
                                                                            border: "1px solid #cbd5e1",
                                                                            borderRadius: "4px",
                                                                            cursor: "pointer",
                                                                            color: "#475569",
                                                                            fontWeight: 500,
                                                                        }}
                                                                    >
                                                                        Cancel
                                                                    </button>
                                                                </div>
                                                            ) : null}
                                                            {personas.map((persona) => (
                                                                <div
                                                                    key={persona.id}
                                                                    onClick={() => {
                                                                        if (!p.node.personaIds?.includes(persona.id)) {
                                                                            onUpdateNodePersonas(p.node.id, [
                                                                                ...(p.node.personaIds || []),
                                                                                persona.id,
                                                                            ]);
                                                                        }
                                                                        setPersonaDropdownOpen(null);
                                                                    }}
                                                                    style={{
                                                                        padding: "8px 12px",
                                                                        cursor: "pointer",
                                                                        borderBottom: "1px solid #f3f4f6",
                                                                        fontSize: "12px",
                                                                        color: "#374151",
                                                                        transition: "background 120ms ease",
                                                                    }}
                                                                    onMouseEnter={(e) => {
                                                                        (e.currentTarget as HTMLElement).style.background = "#f9fafb";
                                                                    }}
                                                                    onMouseLeave={(e) => {
                                                                        (e.currentTarget as HTMLElement).style.background = "#ffffff";
                                                                    }}
                                                                >
                                                                    <span
                                                                        style={{
                                                                            display: "inline-block",
                                                                            width: "8px",
                                                                            height: "8px",
                                                                            borderRadius: "999px",
                                                                            backgroundColor: persona.color || "#0ea5e9",
                                                                            marginRight: "6px",
                                                                        }}
                                                                    />
                                                                    {persona.name}
                                                                </div>
                                                            ))}
                                                            <div
                                                                onClick={() => {
                                                                    setAddingNewPersona(true);
                                                                    setPersonaDraft("");
                                                                }}
                                                                style={{
                                                                    padding: "8px 12px",
                                                                    cursor: "pointer",
                                                                    fontSize: "12px",
                                                                    color: "#3b82f6",
                                                                    fontWeight: 500,
                                                                    borderTop: "1px solid #f3f4f6",
                                                                    transition: "background 120ms ease",
                                                                }}
                                                                onMouseEnter={(e) => {
                                                                    (e.currentTarget as HTMLElement).style.background = "#f0f9ff";
                                                                }}
                                                                onMouseLeave={(e) => {
                                                                    (e.currentTarget as HTMLElement).style.background = "#ffffff";
                                                                }}
                                                            >
                                                                + Add new persona
                                                            </div>
                                                        </div>
                                                    )}
                                                </div>
                                            </foreignObject>
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
    priority: PriorityLevel | undefined
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
            return { fill: "#f9fafb", stroke: "#cbd5e1" };
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