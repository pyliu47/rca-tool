import React from "react";
import type { TocBundle } from "./tocTypes";
import { Network, Users } from "lucide-react";

interface FocalCauseInfo {
    id: string;
    categoryLabel: string;
    causeLabel: string;
    underlyingCauses?: string[];
}

interface TocDiagramProps {
    bundle: TocBundle;
    focalCauses?: FocalCauseInfo[];
}

const TocDiagram: React.FC<TocDiagramProps> = ({ bundle, focalCauses = [] }) => {
    const causes = focalCauses || [];
    const activities = bundle.activities || [];
    const outcomes = bundle.outcomes || [];

    if (activities.length === 0 && outcomes.length === 0) {
        return null;
    }

    const getTierLabel = (tier?: number): string => {
        const tierNames: Record<number, string> = {
            1: "Short-term",
            2: "Intermediate",
            3: "Long-term",
        };
        return tier ? tierNames[tier] : "Unset";
    };

    // Helper to render arrow separator
    const ArrowSeparator = () => (
        <div style={{ display: "flex", alignItems: "center", color: "#cbd5e1", fontSize: "20px", paddingBottom: "12px", minWidth: "32px", justifyContent: "center" }}>
            →
        </div>
    );

    return (
        <div style={{ marginTop: "0", padding: "16px", backgroundColor: "#f8fafc", borderRadius: "8px", border: "1px solid #e2e8f0", width: "100%", maxWidth: "100%", overflowX: "auto" }}>
            {activities.length === 0 || outcomes.length === 0 ? (
                <div style={{ fontSize: "12px", color: "#64748b", fontStyle: "italic" }}>
                    Add activities and outcomes to see the theory of change diagram.
                </div>
            ) : (
                <>
                    <div style={{ display: "flex", width: "100%", gap: "12px", paddingBottom: "8px", alignItems: "flex-start" }}>
                        {/* FOCAL CAUSES COLUMN */}
                        <div style={{ flex: "0.6 1 0", minWidth: "160px", maxWidth: "260px" }}>
                            <div style={{ fontSize: "11px", fontWeight: 600, color: "#475569", textTransform: "uppercase", marginBottom: "8px" }}>
                                Focal Causes
                            </div>
                            {causes.length === 0 ? (
                                <div style={{ fontSize: "10px", color: "#cbd5e1", fontStyle: "italic", padding: "8px" }}>
                                    Select causes from RCA
                                </div>
                            ) : (
                                <div style={{ display: "flex", flexDirection: "column", gap: "8px", width: "100%" }}>
                                    {causes.map((cause) => (
                                        <div
                                            key={cause.id}
                                            style={{
                                                width: "100%",
                                                boxSizing: "border-box",
                                                padding: "8px",
                                                backgroundColor: "#ffffff",
                                                border: "1px solid #e2e8f0",
                                                borderRadius: "6px",
                                                fontSize: "11px",
                                                fontWeight: 500,
                                                lineHeight: "1.3",
                                                wordWrap: "break-word",
                                                overflowWrap: "break-word",
                                            }}
                                        >
                                            <div style={{ fontWeight: 600, color: "#1e293b", marginBottom: "4px" }}>
                                                {cause.causeLabel}
                                            </div>
                                            {cause.categoryLabel && (
                                                <div style={{ fontSize: "10px", color: "#64748b" }}>
                                                    {cause.categoryLabel}
                                                </div>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>

                        <ArrowSeparator />

                        {/* INPUTS COLUMN */}
                        <div style={{ flex: "1 1 0", minWidth: "160px", maxWidth: "260px" }}>
                            <div style={{ fontSize: "11px", fontWeight: 600, color: "#475569", textTransform: "uppercase", marginBottom: "8px" }}>
                                Inputs
                            </div>
                            {activities.every((a) => (a.inputs || []).length === 0) ? (
                                <div style={{ fontSize: "10px", color: "#cbd5e1", fontStyle: "italic", padding: "8px" }}>
                                    Add to activities
                                </div>
                            ) : (
                                <div style={{ display: "flex", flexDirection: "column", gap: "8px", width: "100%" }}>
                                    {activities.flatMap((activity) =>
                                        (activity.inputs || []).map((input) => (
                                            <div
                                                key={`${activity.id}-${input.id}`}
                                                style={{
                                                    width: "100%",
                                                    boxSizing: "border-box",
                                                    padding: "8px",
                                                    backgroundColor: "#ffffff",
                                                    border: "1px solid #e2e8f0",
                                                    borderRadius: "6px",
                                                    fontSize: "11px",
                                                    color: "#1e293b",
                                                    fontWeight: 500,
                                                    lineHeight: "1.3",
                                                    wordWrap: "break-word",
                                                    overflowWrap: "break-word",
                                                }}
                                            >
                                                {input.label}
                                            </div>
                                        ))
                                    )}
                                </div>
                            )}
                        </div>

                        <ArrowSeparator />

                        {/* ACTIVITIES COLUMN */}
                        <div style={{ flex: "1 1 0", minWidth: "160px", maxWidth: "260px" }}>
                            <div style={{ fontSize: "11px", fontWeight: 600, color: "#475569", textTransform: "uppercase", marginBottom: "8px" }}>
                                Activities
                            </div>

                            <div style={{ display: "flex", flexDirection: "column", gap: "8px", width: "100%" }}>
                                {activities.map((activity) => {
                                    return (
                                        <div
                                            key={activity.id}
                                            style={{
                                                width: "100%",
                                                boxSizing: "border-box",
                                                padding: "8px",
                                                backgroundColor: "#ffffff",
                                                border: "1px solid #e2e8f0",
                                                borderRadius: "6px",
                                                fontSize: "11px",
                                                fontWeight: 500,
                                                lineHeight: "1.3",
                                                wordWrap: "break-word",
                                                overflowWrap: "break-word",
                                            }}
                                        >
                                            {/* Activity name */}
                                            <div style={{ fontWeight: 600, color: "#1e293b", marginBottom: "4px" }}>
                                                {activity.label || "(Untitled)"}
                                            </div>

                                            {/* Personnel */}
                                            {(activity.actors || []).length > 0 && (
                                                <div style={{ fontSize: "10px", color: "#64748b", display: "flex", alignItems: "center", gap: "4px" }}>
                                                    <Users size={12} />
                                                    <span style={{ fontWeight: 500 }}>{(activity.actors || []).join(", ")}</span>
                                                </div>
                                            )}
                                        </div>
                                    );
                                })}
                            </div>
                        </div>

                        <ArrowSeparator />

                        {/* OUTPUTS COLUMN */}
                        <div style={{ flex: "1 1 0", minWidth: "160px", maxWidth: "260px" }}>
                            <div style={{ fontSize: "11px", fontWeight: 600, color: "#475569", textTransform: "uppercase", marginBottom: "8px" }}>
                                Outputs
                            </div>
                            {activities.every((a) => (a.outputs || []).length === 0) ? (
                                <div style={{ fontSize: "10px", color: "#cbd5e1", fontStyle: "italic", padding: "8px" }}>
                                    Add to activities
                                </div>
                            ) : (
                                <div style={{ display: "flex", flexDirection: "column", gap: "8px", width: "100%" }}>
                                    {activities.flatMap((activity) =>
                                        (activity.outputs || []).map((output) => (
                                            <div
                                                key={`${activity.id}-${output.id}`}
                                                style={{
                                                    width: "100%",
                                                    boxSizing: "border-box",
                                                    padding: "8px",
                                                    backgroundColor: "#ffffff",
                                                    border: "1px solid #e2e8f0",
                                                    borderRadius: "6px",
                                                    fontSize: "11px",
                                                    color: "#1e293b",
                                                    fontWeight: 500,
                                                    lineHeight: "1.3",
                                                    wordWrap: "break-word",
                                                    overflowWrap: "break-word",
                                                }}
                                            >
                                                {output.label}
                                            </div>
                                        ))
                                    )}
                                </div>
                            )}
                        </div>

                        <ArrowSeparator />

                        {/* OUTCOMES COLUMN */}
                        <div style={{ flex: "1 1 0", minWidth: "160px", maxWidth: "260px" }}>
                            <div style={{ fontSize: "11px", fontWeight: 600, color: "#475569", textTransform: "uppercase", marginBottom: "8px" }}>
                                Outcomes
                            </div>

                            <div style={{ display: "flex", flexDirection: "column", gap: "8px", width: "100%" }}>
                                {outcomes.map((outcome) => {
                                    const tierLabel = getTierLabel(outcome.tier);

                                    return (
                                        <div
                                            key={outcome.id}
                                            style={{
                                                width: "100%",
                                                boxSizing: "border-box",
                                                padding: "8px",
                                                backgroundColor: "#ffffff",
                                                border: "1px solid #e2e8f0",
                                                borderRadius: "6px",
                                                fontSize: "11px",
                                                fontWeight: 500,
                                                lineHeight: "1.3",
                                                wordWrap: "break-word",
                                                overflowWrap: "break-word",
                                            }}
                                        >
                                            {/* Outcome name */}
                                            <div style={{ fontWeight: 600, color: "#1e293b", marginBottom: "4px" }}>
                                                {outcome.label || "(Untitled)"}
                                            </div>

                                            {/* Tier badge */}
                                            <div style={{ display: "flex", gap: "6px" }}>
                                                <span
                                                    style={{
                                                        display: "inline-block",
                                                        padding: "3px 8px",
                                                        backgroundColor: "#fef3c7",
                                                        color: "#92400e",
                                                        fontSize: "10px",
                                                        fontWeight: 500,
                                                        borderRadius: "4px",
                                                    }}
                                                >
                                                    {tierLabel}
                                                </span>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    </div>

                    {/* ASSUMPTIONS ROW - Below entire diagram */}
                    <div style={{ marginTop: "24px", paddingTop: "16px", borderTop: "1px solid #e2e8f0" }}>
                        <div style={{ fontSize: "11px", fontWeight: 600, color: "#475569", textTransform: "uppercase", marginBottom: "12px" }}>
                            Underlying Assumptions
                        </div>
                        {activities.every((a) => (a.assumptions || []).length === 0) ? (
                            <div style={{ fontSize: "10px", color: "#cbd5e1", fontStyle: "italic", padding: "8px" }}>
                                Add assumptions to activities
                            </div>
                        ) : (
                            <ul style={{ margin: "0", paddingLeft: "20px", listStyle: "disc" }}>
                                {activities.flatMap((activity) =>
                                    (activity.assumptions || []).map((assumption) => (
                                        <li
                                            key={`${activity.id}-assumption-${assumption.id}`}
                                            style={{
                                                fontSize: "11px",
                                                color: "#1e293b",
                                                fontWeight: 500,
                                                lineHeight: "1.5",
                                                marginBottom: "4px",
                                                wordWrap: "break-word",
                                                overflowWrap: "break-word",
                                            }}
                                        >
                                            {assumption.label}
                                            <span style={{ color: "#9ca3af", marginLeft: "8px", marginRight: "8px" }}>|</span>
                                            <span style={{ color: "#9ca3af", fontWeight: 400 }}>
                                                {activity.label}
                                            </span>
                                        </li>
                                    ))
                                )}
                            </ul>
                        )}
                    </div>
                </>
            )}
        </div>
    );
};

// Wrapper component with title
export const TocDiagramWithTitle: React.FC<TocDiagramProps> = (props) => {
    const activities = props.bundle.activities || [];
    const outcomes = props.bundle.outcomes || [];

    if (activities.length === 0 && outcomes.length === 0) {
        return null;
    }

    return (
        <>
            <div style={{ fontSize: "12px", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.06em", color: "#6b7280", marginBottom: "12px", display: "flex", alignItems: "center", gap: "6px" }}>
                <Network size={16} />
                Theory of Change Overview
            </div>
            <TocDiagram {...props} />
        </>
    );
};

export default TocDiagram;
