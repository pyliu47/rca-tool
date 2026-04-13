// src/IndicatorPane.tsx
import React from "react";
import { Activity } from "lucide-react";
import { IndicatorPanel } from "./IndicatorPanel";

export const IndicatorPane: React.FC = () => {
    return (
        <div className="pane" style={{ flex: 1, minWidth: 0 }}>
            <div className="pane-header">
                <span className="pane-title">
                    <Activity size={16} />
                    Indicators
                </span>
            </div>
            <div className="pane-body" style={{ overflow: "auto", padding: 0 }}>
                <IndicatorPanel />
            </div>
        </div>
    );
};
