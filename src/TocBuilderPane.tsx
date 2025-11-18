// src/TocBuilderPane.tsx
import React from "react";
import type { RCANode } from "./types";
import { BookOpen } from "lucide-react";

/* Local copies of the ToC types (structural match with App.tsx) */

type GenderFocusOption =
    | "women"
    | "men"
    | "adolescents"
    | "caregivers"
    | "chws"
    | "marginalized";

interface TocBundle {
    id: string;
    causeIds: string[];
    name: string;
    description: string;
    inputs: string[];
    activities: string[];
    outputs: string[];
    outcomesShort: string[];
    outcomesIntermediate: string[];
    outcomesLong: string[];
    assumptions: {
        inputs: string;
        activities: string;
        outputs: string;
        outcomes: string;
    };
    risks: string;
    genderFocus: GenderFocusOption[];
    genderNotes: string;
    actors: string[];
    evidence: string[];
}

interface TocBuilderPaneProps {
    root: RCANode;
    selectedCauseIds: string[];
    bundle: TocBundle | null;
    onChangeBundle: (bundle: TocBundle) => void;
}

const GENDER_OPTIONS: { id: GenderFocusOption; label: string }[] = [
    { id: "women", label: "Women" },
    { id: "men", label: "Men" },
    { id: "adolescents", label: "Adolescents" },
    { id: "caregivers", label: "Caregivers" },
    { id: "chws", label: "CHWs" },
    { id: "marginalized", label: "Marginalized groups" },
];

export const TocBuilderPane: React.FC<TocBuilderPaneProps> = ({
    root,
    selectedCauseIds,
    bundle,
    onChangeBundle,
}) => {
    // Helper: find cause label for a given id
    const findCauseLabel = (id: string): string | null => {
        for (const cat of root.children) {
            for (const cause of cat.children) {
                if (cause.id === id) return cause.label;
            }
        }
        return null;
    };

    const selectedCauseLabels = selectedCauseIds
        .map((id) => ({ id, label: findCauseLabel(id) }))
        .filter((x) => !!x.label) as { id: string; label: string }[];

    if (selectedCauseIds.length === 0) {
        return (
            <div className="pane" style={{ flex: 4, minWidth: 0 }}>
                <div className="pane-header">
                    <span className="pane-title">
                        <BookOpen size={16} />
                        Intervention Design
                    </span>
                </div>
                <div className="pane-body">
                    <div
                        style={{
                            width: "100%",
                            height: "100%",
                            borderRadius: 8,
                            border: "1px dashed #cbd5e1",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            fontSize: 14,
                            color: "#64748b",
                            textAlign: "center",
                            padding: 16,
                        }}
                    >
                        Select one or more causes on the left to start building a Theory of
                        Change and intervention design.
                    </div>
                </div>
            </div>
        );
    }

    if (!bundle) {
        // Should be rare; selection changed but bundle not yet created.
        return (
            <div className="pane" style={{ flex: 4, minWidth: 0 }}>
                <div className="pane-header">
                    <span className="pane-title">
                        <BookOpen size={16} />
                        Intervention Design
                    </span>
                </div>
                <div className="pane-body">
                    <div style={{ padding: 12, fontSize: 14, color: "#64748b" }}>
                        Initializing bundle for selected causes…
                    </div>
                </div>
            </div>
        );
    }

    const updateField = <K extends keyof TocBundle>(
        field: K,
        value: TocBundle[K]
    ) => {
        onChangeBundle({ ...bundle, [field]: value });
    };

    const updateAssumption = (
        key: keyof TocBundle["assumptions"],
        value: string
    ) => {
        onChangeBundle({
            ...bundle,
            assumptions: { ...bundle.assumptions, [key]: value },
        });
    };

    const updateStringListItem = (
        field:
            | "inputs"
            | "activities"
            | "outputs"
            | "outcomesShort"
            | "outcomesIntermediate"
            | "outcomesLong"
            | "actors"
            | "evidence",
        index: number,
        value: string
    ) => {
        const list = [...(bundle[field] as string[])];
        list[index] = value;
        updateField(field as any, list as any);
    };

    const addStringListItem = (
        field:
            | "inputs"
            | "activities"
            | "outputs"
            | "outcomesShort"
            | "outcomesIntermediate"
            | "outcomesLong"
            | "actors"
            | "evidence"
    ) => {
        const list = [...(bundle[field] as string[])];
        list.push("");
        updateField(field as any, list as any);
    };

    const removeStringListItem = (
        field:
            | "inputs"
            | "activities"
            | "outputs"
            | "outcomesShort"
            | "outcomesIntermediate"
            | "outcomesLong"
            | "actors"
            | "evidence",
        index: number
    ) => {
        const list = [...(bundle[field] as string[])];
        list.splice(index, 1);
        updateField(field as any, list as any);
    };

    const toggleGenderFocus = (opt: GenderFocusOption) => {
        const current = bundle.genderFocus;
        const next = current.includes(opt)
            ? current.filter((x) => x !== opt)
            : [...current, opt];
        updateField("genderFocus", next);
    };

    const renderStringList = (
        label: string,
        field:
            | "inputs"
            | "activities"
            | "outputs"
            | "outcomesShort"
            | "outcomesIntermediate"
            | "outcomesLong",
        placeholder: string
    ) => {
        const list = bundle[field];

        return (
            <div style={{ flex: 1, minWidth: 0 }}>
                <div
                    style={{
                        fontSize: 12,
                        fontWeight: 600,
                        color: "#475569",
                        marginBottom: 4,
                    }}
                >
                    {label}
                </div>
                <div
                    style={{
                        borderRadius: 8,
                        border: "1px solid #e2e8f0",
                        padding: 6,
                        background: "#f9fafb",
                    }}
                >
                    {list.length === 0 && (
                        <div
                            style={{
                                fontSize: 12,
                                color: "#9ca3af",
                                marginBottom: 4,
                            }}
                        >
                            No items yet.
                        </div>
                    )}
                    {list.map((item, idx) => (
                        <div
                            key={idx}
                            style={{
                                display: "flex",
                                alignItems: "center",
                                gap: 4,
                                marginBottom: 4,
                            }}
                        >
                            <span style={{ fontSize: 12, color: "#94a3b8" }}>•</span>
                            <input
                                value={item}
                                onChange={(e) =>
                                    updateStringListItem(field, idx, e.target.value)
                                }
                                placeholder={placeholder}
                                style={{
                                    flex: 1,
                                    fontSize: 12,
                                    borderRadius: 6,
                                    border: "1px solid #cbd5e1",
                                    padding: "3px 6px",
                                }}
                            />
                            <button
                                type="button"
                                onClick={() => removeStringListItem(field, idx)}
                                className="small-btn"
                            >
                                ✕
                            </button>
                        </div>
                    ))}
                    <button
                        type="button"
                        className="small-btn"
                        onClick={() => addStringListItem(field)}
                    >
                        + Add
                    </button>
                </div>
            </div>
        );
    };

    return (
        <div className="pane" style={{ flex: 4, minWidth: 0 }}>
            <div className="pane-header">
                <span className="pane-title">
                    <BookOpen size={16} />
                    Intervention Design
                </span>
            </div>
            <div className="pane-body" style={{ padding: 8, overflowY: "auto" }}>
                {/* Bundle name + description */}
                <div style={{ marginBottom: 12 }}>
                    <div style={{ marginBottom: 6 }}>
                        <label
                            style={{ fontSize: 12, fontWeight: 600, color: "#475569" }}
                        >
                            Bundle name
                        </label>
                        <input
                            value={bundle.name}
                            onChange={(e) => updateField("name", e.target.value)}
                            placeholder="e.g., Improving CHW availability and reliability"
                            style={{
                                width: "100%",
                                fontSize: 13,
                                borderRadius: 8,
                                border: "1px solid #cbd5e1",
                                padding: "6px 8px",
                                marginTop: 2,
                            }}
                        />
                    </div>
                    <div>
                        <label
                            style={{ fontSize: 12, fontWeight: 600, color: "#475569" }}
                        >
                            Description
                        </label>
                        <textarea
                            value={bundle.description}
                            onChange={(e) => updateField("description", e.target.value)}
                            placeholder="Briefly describe the focus of this intervention and ToC bundle..."
                            style={{
                                width: "100%",
                                fontSize: 13,
                                borderRadius: 8,
                                border: "1px solid #cbd5e1",
                                padding: "6px 8px",
                                marginTop: 2,
                                resize: "vertical",
                                minHeight: 50,
                            }}
                        />
                    </div>
                </div>

                {/* Focal causes */}
                <div style={{ marginBottom: 12 }}>
                    <div
                        style={{
                            fontSize: 12,
                            fontWeight: 600,
                            color: "#475569",
                            marginBottom: 4,
                        }}
                    >
                        Focal causes
                    </div>
                    <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                        {selectedCauseLabels.map((c) => (
                            <span
                                key={c.id}
                                style={{
                                    borderRadius: 999,
                                    border: "1px solid #cbd5e1",
                                    padding: "2px 8px",
                                    fontSize: 11,
                                    background: "#eef2ff",
                                }}
                            >
                                {c.label}
                            </span>
                        ))}
                    </div>
                </div>

                {/* Logic chain */}
                <div
                    style={{
                        borderRadius: 10,
                        border: "1px solid #e2e8f0",
                        padding: 10,
                        background: "#f8fafc",
                        marginBottom: 12,
                    }}
                >
                    <div
                        style={{
                            fontSize: 11,
                            fontWeight: 600,
                            color: "#64748b",
                            marginBottom: 8,
                            textTransform: "uppercase",
                            letterSpacing: "0.06em",
                        }}
                    >
                        Logic chain
                    </div>
                    <div
                        style={{
                            display: "flex",
                            gap: 8,
                            flexWrap: "wrap",
                        }}
                    >
                        {renderStringList(
                            "Inputs",
                            "inputs",
                            "e.g., funding, staff time, training materials"
                        )}
                        {renderStringList(
                            "Activities",
                            "activities",
                            "e.g., CHW training, microplanning, supervision"
                        )}
                        {renderStringList(
                            "Outputs",
                            "outputs",
                            "e.g., X CHWs trained, microplans completed"
                        )}
                    </div>

                    {/* Outcomes: short / intermediate / long-term */}
                    <div style={{ marginTop: 10 }}>
                        <div
                            style={{
                                fontSize: 12,
                                fontWeight: 600,
                                color: "#475569",
                                marginBottom: 4,
                            }}
                        >
                            Outcomes
                        </div>
                        <div
                            style={{
                                display: "flex",
                                gap: 8,
                                flexWrap: "wrap",
                            }}
                        >
                            {renderStringList(
                                "Short-term",
                                "outcomesShort",
                                "e.g., improved CHW knowledge, better scheduling"
                            )}
                            {renderStringList(
                                "Intermediate",
                                "outcomesIntermediate",
                                "e.g., more consistent service availability"
                            )}
                            {renderStringList(
                                "Long-term",
                                "outcomesLong",
                                "e.g., increased timely immunization coverage"
                            )}
                        </div>
                    </div>
                </div>

                {/* Assumptions */}
                <div
                    style={{
                        borderRadius: 10,
                        border: "1px solid #e2e8f0",
                        padding: 10,
                        background: "#f9fafb",
                        marginBottom: 12,
                    }}
                >
                    <div
                        style={{
                            fontSize: 11,
                            fontWeight: 600,
                            color: "#64748b",
                            marginBottom: 6,
                            textTransform: "uppercase",
                            letterSpacing: "0.06em",
                        }}
                    >
                        Assumptions
                    </div>

                    {(
                        [
                            ["Inputs", "inputs"],
                            ["Activities", "activities"],
                            ["Outputs", "outputs"],
                            ["Outcomes", "outcomes"],
                        ] as const
                    ).map(([label, key]) => (
                        <div key={key} style={{ marginBottom: 6 }}>
                            <div
                                style={{
                                    fontSize: 12,
                                    fontWeight: 600,
                                    color: "#475569",
                                    marginBottom: 2,
                                }}
                            >
                                {label}
                            </div>
                            <textarea
                                value={bundle.assumptions[key]}
                                onChange={(e) => updateAssumption(key, e.target.value)}
                                placeholder={`Assumptions about ${label.toLowerCase()}...`}
                                style={{
                                    width: "100%",
                                    fontSize: 12,
                                    borderRadius: 8,
                                    border: "1px solid #cbd5e1",
                                    padding: "4px 6px",
                                    resize: "vertical",
                                    minHeight: 40,
                                }}
                            />
                        </div>
                    ))}
                </div>

                {/* Risks & External factors */}
                <div
                    style={{
                        borderRadius: 10,
                        border: "1px solid #e2e8f0",
                        padding: 10,
                        background: "#fff",
                        marginBottom: 12,
                    }}
                >
                    <div
                        style={{
                            fontSize: 11,
                            fontWeight: 600,
                            color: "#64748b",
                            marginBottom: 4,
                            textTransform: "uppercase",
                            letterSpacing: "0.06em",
                        }}
                    >
                        Risks & external factors
                    </div>
                    <textarea
                        value={bundle.risks}
                        onChange={(e) => updateField("risks", e.target.value)}
                        placeholder="e.g., election cycle, security issues, funding volatility, epidemics..."
                        style={{
                            width: "100%",
                            fontSize: 12,
                            borderRadius: 8,
                            border: "1px solid #cbd5e1",
                            padding: "4px 6px",
                            resize: "vertical",
                            minHeight: 40,
                        }}
                    />
                </div>

                {/* Gender & equity */}
                <div
                    style={{
                        borderRadius: 10,
                        border: "1px solid #e2e8f0",
                        padding: 10,
                        background: "#f9fafb",
                        marginBottom: 12,
                    }}
                >
                    <div
                        style={{
                            fontSize: 11,
                            fontWeight: 600,
                            color: "#64748b",
                            marginBottom: 6,
                            textTransform: "uppercase",
                            letterSpacing: "0.06em",
                        }}
                    >
                        Gender & equity considerations
                    </div>

                    <div
                        style={{
                            fontSize: 12,
                            fontWeight: 600,
                            color: "#475569",
                            marginBottom: 4,
                        }}
                    >
                        Population focus
                    </div>
                    <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                        {GENDER_OPTIONS.map((opt) => (
                            <label
                                key={opt.id}
                                style={{
                                    display: "flex",
                                    alignItems: "center",
                                    gap: 4,
                                    fontSize: 12,
                                    cursor: "pointer",
                                }}
                            >
                                <input
                                    type="checkbox"
                                    checked={bundle.genderFocus.includes(opt.id)}
                                    onChange={() => toggleGenderFocus(opt.id)}
                                />
                                {opt.label}
                            </label>
                        ))}
                    </div>

                    <div style={{ marginTop: 6 }}>
                        <div
                            style={{
                                fontSize: 12,
                                fontWeight: 600,
                                color: "#475569",
                                marginBottom: 2,
                            }}
                        >
                            Notes
                        </div>
                        <textarea
                            value={bundle.genderNotes}
                            onChange={(e) => updateField("genderNotes", e.target.value)}
                            placeholder="How does this design address gender and equity (e.g., timing, access, safety, norms)?"
                            style={{
                                width: "100%",
                                fontSize: 12,
                                borderRadius: 8,
                                border: "1px solid #cbd5e1",
                                padding: "4px 6px",
                                resize: "vertical",
                                minHeight: 40,
                            }}
                        />
                    </div>
                </div>

                {/* Responsible actors */}
                <div
                    style={{
                        borderRadius: 10,
                        border: "1px solid #e2e8f0",
                        padding: 10,
                        background: "#fff",
                        marginBottom: 12,
                    }}
                >
                    <div
                        style={{
                            fontSize: 11,
                            fontWeight: 600,
                            color: "#64748b",
                            marginBottom: 4,
                            textTransform: "uppercase",
                            letterSpacing: "0.06em",
                        }}
                    >
                        Responsible actors
                    </div>
                    <div
                        style={{
                            borderRadius: 8,
                            border: "1px solid #e2e8f0",
                            padding: 6,
                            background: "#f9fafb",
                        }}
                    >
                        {bundle.actors.length === 0 && (
                            <div
                                style={{
                                    fontSize: 12,
                                    color: "#9ca3af",
                                    marginBottom: 4,
                                }}
                            >
                                No actors listed yet.
                            </div>
                        )}
                        {bundle.actors.map((a, idx) => (
                            <div
                                key={idx}
                                style={{
                                    display: "flex",
                                    alignItems: "center",
                                    gap: 4,
                                    marginBottom: 4,
                                }}
                            >
                                <input
                                    value={a}
                                    onChange={(e) =>
                                        updateStringListItem("actors", idx, e.target.value)
                                    }
                                    placeholder="e.g., District EPI team, CHW supervisors, NGO X"
                                    style={{
                                        flex: 1,
                                        fontSize: 12,
                                        borderRadius: 6,
                                        border: "1px solid #cbd5e1",
                                        padding: "3px 6px",
                                    }}
                                />
                                <button
                                    type="button"
                                    className="small-btn"
                                    onClick={() => removeStringListItem("actors", idx)}
                                >
                                    ✕
                                </button>
                            </div>
                        ))}
                        <button
                            type="button"
                            className="small-btn"
                            onClick={() => addStringListItem("actors")}
                        >
                            + Add actor
                        </button>
                    </div>
                </div>

                {/* Evidence & justification */}
                <div
                    style={{
                        borderRadius: 10,
                        border: "1px solid #e2e8f0",
                        padding: 10,
                        background: "#f9fafb",
                        marginBottom: 4,
                    }}
                >
                    <div
                        style={{
                            fontSize: 11,
                            fontWeight: 600,
                            color: "#64748b",
                            marginBottom: 4,
                            textTransform: "uppercase",
                            letterSpacing: "0.06em",
                        }}
                    >
                        Evidence & justification
                    </div>
                    <div
                        style={{
                            borderRadius: 8,
                            border: "1px solid #e2e8f0",
                            padding: 6,
                            background: "#fff",
                        }}
                    >
                        {bundle.evidence.length === 0 && (
                            <div
                                style={{
                                    fontSize: 12,
                                    color: "#9ca3af",
                                    marginBottom: 4,
                                }}
                            >
                                No evidence added yet.
                            </div>
                        )}
                        {bundle.evidence.map((ev, idx) => (
                            <div
                                key={idx}
                                style={{
                                    display: "flex",
                                    alignItems: "center",
                                    gap: 4,
                                    marginBottom: 4,
                                }}
                            >
                                <input
                                    value={ev}
                                    onChange={(e) =>
                                        updateStringListItem("evidence", idx, e.target.value)
                                    }
                                    placeholder="e.g., Study name, local data insight, or brief justification"
                                    style={{
                                        flex: 1,
                                        fontSize: 12,
                                        borderRadius: 6,
                                        border: "1px solid #cbd5e1",
                                        padding: "3px 6px",
                                    }}
                                />
                                <button
                                    type="button"
                                    className="small-btn"
                                    onClick={() => removeStringListItem("evidence", idx)}
                                >
                                    ✕
                                </button>
                            </div>
                        ))}
                        <button
                            type="button"
                            className="small-btn"
                            onClick={() => addStringListItem("evidence")}
                        >
                            + Add evidence
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};