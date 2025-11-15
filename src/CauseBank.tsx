// src/CauseBank.tsx

import React from "react";
import type { CauseTemplate } from "./types";

interface Props {
    templates: CauseTemplate[];
    onInsertUnderSelected: (templateId: string) => void;
}

export const CauseBank: React.FC<Props> = ({
    templates,
    onInsertUnderSelected,
}) => {
    const [query, setQuery] = React.useState("");

    const filtered = templates.filter((t) =>
        t.label.toLowerCase().includes(query.toLowerCase())
    );

    return (
        <div className="bank">
            <div className="bank-header">
                <span className="pane-title">Cause Bank</span>
                <input
                    className="bank-search"
                    placeholder="Search…"
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                />
            </div>
            <div className="bank-list">
                {filtered.map((t) => (
                    <button
                        key={t.id}
                        className="bank-item"
                        onClick={() => onInsertUnderSelected(t.id)}
                    >
                        {t.label}
                    </button>
                ))}
                {filtered.length === 0 && (
                    <div className="bank-empty">No matches</div>
                )}
            </div>
        </div>
    );
};