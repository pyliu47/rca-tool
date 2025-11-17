// src/FishboneView.tsx
import React from "react";
import type { RCANode, PriorityLevel } from "./types";
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
    onReorderCategories: (fromId: string, toId: string) => void;
    onReorderCauses: (categoryId: string, fromId: string, toId: string) => void;
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
    onReorderCategories,
    onReorderCauses,
}) => {
    const [locked, setLocked] = React.useState(false);
    const [zoom, setZoom] = React.useState(1);

    const categories = root.children;

    // Move category up or down in the list
    const moveCategoryByOffset = (id: string, offset: number) => {
        const currentIdx = categories.findIndex((cat) => cat.id === id);
        const targetIdx = currentIdx + offset;
        if (targetIdx < 0 || targetIdx >= categories.length) return;
        onReorderCategories(id, categories[targetIdx].id);
    };

    // Helper function to wrap text and get lines
    const getWrappedLines = (text: string, maxCharsPerLine: number): string[] => {
        const words = text.split(/\s+/);
        const wrappedLines: string[] = [];
        let currentLine = "";

        words.forEach((word) => {
            // If word is longer than maxCharsPerLine, break it into chunks
            if (word.length > maxCharsPerLine) {
                // First, finish the current line if it has content
                if (currentLine) {
                    wrappedLines.push(currentLine.trim());
                    currentLine = "";
                }
                // Break the long word into chunks
                for (let i = 0; i < word.length; i += maxCharsPerLine) {
                    wrappedLines.push(word.substring(i, i + maxCharsPerLine));
                }
            } else if ((currentLine + " " + word).length > maxCharsPerLine && currentLine) {
                // Word fits on next line
                wrappedLines.push(currentLine.trim());
                currentLine = word;
            } else {
                // Word fits on current line
                currentLine += (currentLine ? " " : "") + word;
            }
        });
        if (currentLine) wrappedLines.push(currentLine.trim());
        return wrappedLines;
    };

    // Calculate box height based on wrapped text (12px font = 14.4px with 1.2 line height)
    const calculateBoxHeight = (text: string, maxCharsPerLine: number): number => {
        const lines = getWrappedLines(text, maxCharsPerLine);
        return Math.max(36, lines.length * 17 + 4); // 17px per line + 4px padding
    };

    // Calculate cause box height
    const calculateCauseBoxHeight = (text: string): number => {
        const lines = getWrappedLines(text, 20);
        return Math.max(28, lines.length * 16 + 2); // 16px per line + 2px padding
    };

    // Move cause up or down within its category
    const moveCauseByOffset = (categoryId: string, causeId: string, offset: number) => {
        const category = categories.find((cat) => cat.id === categoryId);
        if (!category) return;
        const currentIdx = category.children.findIndex((cause) => cause.id === causeId);
        const targetIdx = currentIdx + offset;
        if (targetIdx < 0 || targetIdx >= category.children.length) return;
        onReorderCauses(categoryId, causeId, category.children[targetIdx].id);
    };

    // Spine and canvas constants
    const minHeight = 600;
    const width = 500;
    const spineX = 80;
    const spineStartY = 50;

    // Initial spacing calculation (will be refined based on content)
    const initialSpacing = 120;

    // Calculate adjusted Y positions for all categories, cascading shifts
    const adjustedCategoryYs: number[] = [];
    let currentYOffset = 0; // cumulative offset from shifts

    categories.forEach((_, i) => {
        const baseY = spineStartY + initialSpacing * (i + 1) + currentYOffset;

        let adjustedCatY = baseY;
        if (i > 0) {
            const prevCatData = categories[i - 1];
            const prevAdjustedY = adjustedCategoryYs[i - 1];
            const prevCatBoxHeight = calculateBoxHeight(prevCatData.label, 18);
            const prevCatBoxHalfHeight = prevCatBoxHeight / 2;

            // Calculate the actual Y position of the lowest cause in previous category
            const causeSpacingY = 20;
            let prevLowestCauseY = prevAdjustedY + prevCatBoxHalfHeight; // Start from bottom of category box
            if (prevCatData.children.length > 0) {
                // Calculate height of each cause and find the actual extent
                let totalCauseHeight = 0;
                prevCatData.children.forEach((cause, j) => {
                    const causeHeight = calculateCauseBoxHeight(cause.label);
                    totalCauseHeight += causeHeight;
                    if (j < prevCatData.children.length - 1) {
                        totalCauseHeight += causeSpacingY; // Add spacing between causes
                    }
                });
                prevLowestCauseY += totalCauseHeight;
            }
            const minSpacingAfterPrevious = 50; // minimum gap between lowest cause and next category

            // Adjust this category if previous category's causes extend too far
            const minAllowedY = prevLowestCauseY + minSpacingAfterPrevious;
            adjustedCatY = Math.max(baseY, minAllowedY);

            // Update the cumulative offset for next category
            const shift = adjustedCatY - baseY;
            currentYOffset += shift;
        }

        adjustedCategoryYs.push(adjustedCatY);
    });

    // Calculate canvas height based on lowest cause
    let spineEndYCalculated = spineStartY + 60; // default minimum
    categories.forEach((cat, i) => {
        const adjustedCatY = adjustedCategoryYs[i];
        const causeSpacingY = 20;

        // Calculate the lowest point this category reaches
        let lowestCauseY = adjustedCatY; // Start from where first cause is (category center)
        if (cat.children.length > 0) {
            // Sum up all cause heights and spacing
            let totalCauseHeight = 0;
            cat.children.forEach((cause, j) => {
                const causeHeight = calculateCauseBoxHeight(cause.label);
                totalCauseHeight += causeHeight;
                if (j < cat.children.length - 1) {
                    totalCauseHeight += causeSpacingY; // Add spacing between causes
                }
            });
            lowestCauseY = adjustedCatY + (totalCauseHeight / 2); // Causes extend equally above and below center
        }
        spineEndYCalculated = Math.max(spineEndYCalculated, lowestCauseY + 40);
    });

    const height = Math.max(minHeight, spineEndYCalculated);
    const spineEndY = height - 60;

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
                    <button
                        className="small-btn"
                        onClick={() => setZoom((z) => Math.max(0.5, z - 0.1))}
                        title="Zoom out"
                    >
                        −
                    </button>
                    <button
                        className="small-btn"
                        onClick={() => setZoom((z) => Math.min(2, z + 0.1))}
                        title="Zoom in"
                    >
                        +
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

            <div className="pane-body" style={{ overflow: "auto", overflowX: "hidden" }}>
                <svg
                    viewBox={`0 0 ${width} ${height}`}
                    width="100%"
                    height={height * zoom}
                    style={{
                        background: "white",
                        borderRadius: 8,
                        display: "block",
                    }}
                >
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
                        const adjustedCatY = adjustedCategoryYs[i];
                        const catX = spineX + 120; // fixed to the right
                        const selected = selectedNodeId === cat.id;

                        const catPriority = priorityByNode[cat.id];
                        const baseColors = getNodeColors(catPriority, true);
                        const stroke = selected ? "#3a7dff" : baseColors.stroke;
                        const strokeWidth = selected ? 2.6 : 1.4;

                        // Calculate dynamic box height for category
                        const catBoxHeight = calculateBoxHeight(cat.label, 18);
                        const catBoxHalfHeight = catBoxHeight / 2;

                        return (
                            <g key={cat.id}>
                                {/* Bone from spine to category - smooth bezier curve */}
                                <path
                                    d={`M ${spineX} ${adjustedCatY} Q ${(spineX + catX) / 2} ${adjustedCatY} ${catX} ${adjustedCatY}`}
                                    stroke="#cbd5e1"
                                    strokeWidth={1}
                                    fill="none"
                                />

                                {/* Category box (slightly pill-ish) - dynamic height */}
                                <rect
                                    x={catX - 75}
                                    y={adjustedCatY - catBoxHalfHeight}
                                    width={150}
                                    height={catBoxHeight}
                                    rx={10}
                                    fill={baseColors.fill}
                                    stroke={stroke}
                                    strokeWidth={strokeWidth}
                                    onClick={() => onSelect(cat.id)}
                                    style={{
                                        cursor: "pointer",
                                    }}
                                />
                                {/* Reorder arrows - only show when selected, hidden when locked */}
                                {!locked && selected && (
                                    <g style={{ pointerEvents: "auto" }}>
                                        {/* Up arrow - move category up */}
                                        {i > 0 && (
                                            <g onClick={() => moveCategoryByOffset(cat.id, -1)}>
                                                <title>Move up</title>
                                                <text
                                                    x={catX + 50}
                                                    y={adjustedCatY + catBoxHalfHeight + 14}
                                                    fontSize={12}
                                                    fontWeight="bold"
                                                    fill="#94a3b8"
                                                    style={{
                                                        cursor: "pointer",
                                                        userSelect: "none",
                                                    }}
                                                >
                                                    ▲
                                                </text>
                                            </g>
                                        )}
                                        {/* Down arrow - move category down */}
                                        {i < categories.length - 1 && (
                                            <g onClick={() => moveCategoryByOffset(cat.id, 1)}>
                                                <title>Move down</title>
                                                <text
                                                    x={catX + 65}
                                                    y={adjustedCatY + catBoxHalfHeight + 14}
                                                    fontSize={12}
                                                    fontWeight="bold"
                                                    fill="#94a3b8"
                                                    style={{
                                                        cursor: "pointer",
                                                        userSelect: "none",
                                                    }}
                                                >
                                                    ▼
                                                </text>
                                            </g>
                                        )}
                                    </g>
                                )}
                                <EditableText
                                    x={catX}
                                    y={adjustedCatY}
                                    value={cat.label}
                                    disabled={locked}
                                    onChange={(v) => onLabelChange(cat.id, v)}
                                />

                                {/* + Cause and delete controls - only show when selected, hidden when locked */}
                                {!locked && selected && (
                                    <>
                                        <text
                                            x={catX - 70}
                                            y={adjustedCatY - catBoxHalfHeight - 6}
                                            fontSize={11}
                                            fill="#3b82f6"
                                            style={{
                                                cursor: "pointer",
                                                userSelect: "none",
                                                fontWeight: "500",
                                            }}
                                            onClick={() => onAddCause(cat.id)}
                                        >
                                            + Cause
                                        </text>
                                        <text
                                            x={catX + 60}
                                            y={adjustedCatY - catBoxHalfHeight - 6}
                                            fontSize={11}
                                            fill="#94a3b8"
                                            style={{
                                                cursor: "pointer",
                                                userSelect: "none",
                                            }}
                                            onClick={() => onDelete(cat.id)}
                                        >
                                            ✕
                                        </text>
                                    </>
                                )}

                                {/* Pre-calculate all cause Y positions for this category */}
                                {(() => {
                                    const causeSpacingY = 20; // constant vertical gap between cause boxes
                                    const causeYPositions: number[] = [];
                                    let currentTopY = adjustedCatY - (calculateCauseBoxHeight(cat.children[0]?.label || "") / 2);

                                    // Calculate Y position for each cause
                                    cat.children.forEach((cause) => {
                                        const causeBoxHeight = calculateCauseBoxHeight(cause.label);
                                        const causeBoxHalfHeight = causeBoxHeight / 2;

                                        // Center of this cause = top + half height
                                        const causeY = currentTopY + causeBoxHalfHeight;
                                        causeYPositions.push(causeY);

                                        // Move to next cause: bottom of this cause + spacing
                                        currentTopY += causeBoxHeight + causeSpacingY;
                                    });

                                    // Render all causes with pre-calculated positions
                                    return cat.children.map((cause, j) => {
                                        const causeBoxHeight = calculateCauseBoxHeight(cause.label);
                                        const causeBoxHalfHeight = causeBoxHeight / 2;
                                        const causeY = causeYPositions[j];
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
                                                {/* connector from category to cause - cubic bezier curve */}
                                                <path
                                                    d={`M ${catX + 75} ${adjustedCatY} C ${catX + 120} ${adjustedCatY} ${causeX - 130} ${causeY} ${causeX - 80} ${causeY}`}
                                                    stroke="#cbd5e1"
                                                    strokeWidth={1}
                                                    fill="none"
                                                />

                                                <rect
                                                    x={causeX - 85}
                                                    y={causeY - causeBoxHalfHeight}
                                                    width={170}
                                                    height={causeBoxHeight}
                                                    rx={8}
                                                    fill={causeBase.fill}
                                                    stroke={causeStroke}
                                                    strokeWidth={causeStrokeWidth}
                                                    onClick={() => onSelect(cause.id)}
                                                    style={{
                                                        cursor: "pointer",
                                                    }}
                                                />
                                                {/* Reorder arrows for causes - only show when selected, hidden when locked */}
                                                {!locked && sel && (
                                                    <g style={{ pointerEvents: "auto" }}>
                                                        {/* Up arrow - move cause up */}
                                                        {j > 0 && (
                                                            <g onClick={() => moveCauseByOffset(cat.id, cause.id, -1)}>
                                                                <title>Move up</title>
                                                                <text
                                                                    x={causeX + 90}
                                                                    y={causeY}
                                                                    fontSize={11}
                                                                    fontWeight="bold"
                                                                    fill="#94a3b8"
                                                                    style={{
                                                                        cursor: "pointer",
                                                                        userSelect: "none",
                                                                    }}
                                                                >
                                                                    ▲
                                                                </text>
                                                            </g>
                                                        )}
                                                        {/* Down arrow - move cause down */}
                                                        {j < cat.children.length - 1 && (
                                                            <g onClick={() => moveCauseByOffset(cat.id, cause.id, 1)}>
                                                                <title>Move down</title>
                                                                <text
                                                                    x={causeX + 105}
                                                                    y={causeY}
                                                                    fontSize={11}
                                                                    fontWeight="bold"
                                                                    fill="#94a3b8"
                                                                    style={{
                                                                        cursor: "pointer",
                                                                        userSelect: "none",
                                                                    }}
                                                                >
                                                                    ▼
                                                                </text>
                                                            </g>
                                                        )}
                                                    </g>
                                                )}
                                                <EditableText
                                                    x={causeX}
                                                    y={causeY}
                                                    value={cause.label}
                                                    fontSize={11}
                                                    maxCharsPerLine={30}
                                                    disabled={locked}
                                                    onChange={(v) =>
                                                        onLabelChange(cause.id, v)
                                                    }
                                                />
                                                {/* Delete button - only show when selected, hidden when locked */}
                                                {!locked && sel && (
                                                    <text
                                                        x={causeX + 70}
                                                        y={causeY - causeBoxHalfHeight - 6}
                                                        fontSize={11}
                                                        fill="#94a3b8"
                                                        style={{
                                                            cursor: "pointer",
                                                            userSelect: "none",
                                                        }}
                                                        onClick={() => onDelete(cause.id)}
                                                    >
                                                        ✕
                                                    </text>
                                                )}
                                            </g>
                                        );
                                    });
                                })()}
                            </g>
                        );
                    })}
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
    maxCharsPerLine?: number;
}

const EditableText: React.FC<EditableProps> = ({
    x,
    y,
    value,
    onChange,
    fontSize = 12,
    fontWeight,
    disabled = false,
    maxCharsPerLine = 20,
}) => {
    const [editing, setEditing] = React.useState(false);
    const [draft, setDraft] = React.useState(value);

    React.useEffect(() => setDraft(value), [value]);

    if (disabled) {
        const words = value.split(/\s+/);
        const wrappedLines: string[] = [];
        let currentLine = "";

        words.forEach((word) => {
            // If word is longer than maxCharsPerLine, break it into chunks
            if (word.length > maxCharsPerLine) {
                // First, finish the current line if it has content
                if (currentLine) {
                    wrappedLines.push(currentLine.trim());
                    currentLine = "";
                }
                // Break the long word into chunks
                for (let i = 0; i < word.length; i += maxCharsPerLine) {
                    wrappedLines.push(word.substring(i, i + maxCharsPerLine));
                }
            } else if ((currentLine + " " + word).length > maxCharsPerLine && currentLine) {
                // Word fits on next line
                wrappedLines.push(currentLine.trim());
                currentLine = word;
            } else {
                // Word fits on current line
                currentLine += (currentLine ? " " : "") + word;
            }
        });
        if (currentLine) wrappedLines.push(currentLine.trim());

        const lineHeight = fontSize! * 1.2;
        const totalHeight = (wrappedLines.length - 1) * lineHeight;
        const startY = y - totalHeight / 2;

        return (
            <g>
                {wrappedLines.map((line, idx) => (
                    <text
                        key={idx}
                        x={x}
                        y={startY + idx * lineHeight}
                        textAnchor="middle"
                        dominantBaseline="middle"
                        fontSize={fontSize}
                        fontWeight={fontWeight}
                        fill="#1e293b"
                    >
                        {line}
                    </text>
                ))}
            </g>
        );
    }

    if (!editing) {
        const words = value.split(/\s+/);
        const wrappedLines: string[] = [];
        let currentLine = "";

        words.forEach((word) => {
            // If word is longer than maxCharsPerLine, break it into chunks
            if (word.length > maxCharsPerLine) {
                // First, finish the current line if it has content
                if (currentLine) {
                    wrappedLines.push(currentLine.trim());
                    currentLine = "";
                }
                // Break the long word into chunks
                for (let i = 0; i < word.length; i += maxCharsPerLine) {
                    wrappedLines.push(word.substring(i, i + maxCharsPerLine));
                }
            } else if ((currentLine + " " + word).length > maxCharsPerLine && currentLine) {
                // Word fits on next line
                wrappedLines.push(currentLine.trim());
                currentLine = word;
            } else {
                // Word fits on current line
                currentLine += (currentLine ? " " : "") + word;
            }
        });
        if (currentLine) wrappedLines.push(currentLine.trim());

        const lineHeight = fontSize! * 1.2;
        const totalHeight = (wrappedLines.length - 1) * lineHeight;
        const startY = y - totalHeight / 2;

        return (
            <g style={{ cursor: "text" }} onClick={() => setEditing(true)}>
                {wrappedLines.map((line, idx) => (
                    <text
                        key={idx}
                        x={x}
                        y={startY + idx * lineHeight}
                        textAnchor="middle"
                        dominantBaseline="middle"
                        fontSize={fontSize}
                        fontWeight={fontWeight}
                        fill="#1e293b"
                    >
                        {line}
                    </text>
                ))}
            </g>
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