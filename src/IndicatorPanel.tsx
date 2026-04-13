// src/IndicatorPanel.tsx
import React from "react";
import { INDICATORS, CAT_META, type Indicator, type IndicatorCategory } from "./indicatorData";
import type { TocBundle } from "./tocTypes";
import type { FishboneGroup } from "./types";

/* -------------------------------------------------------
   Props
------------------------------------------------------- */

interface Props {
    tocBundles?: Record<string, TocBundle>;
    groups?: FishboneGroup[];
    onSelectIndicator: (id: string) => void;
    selectedIndicatorId?: string | null;
}

/* -------------------------------------------------------
   Deployment info derived from tocBundles
------------------------------------------------------- */

interface Deployment {
    bundleName: string;
    monthIndex: number; // 0–11
}

function computeDeployments(tocBundles?: Record<string, TocBundle>): Record<string, Deployment[]> {
    const map: Record<string, Deployment[]> = {};
    if (!tocBundles) return map;

    Object.values(tocBundles).forEach(bundle => {
        if (!bundle.deploymentStart) return;
        const parts = bundle.deploymentStart.split("-");
        if (parts.length < 2) return;
        const monthIndex = parseInt(parts[1], 10) - 1;
        if (isNaN(monthIndex)) return;

        (bundle.outcomes || []).forEach(outcome => {
            if (!outcome.linkedIndicatorId) return;
            const id = outcome.linkedIndicatorId;
            if (!map[id]) map[id] = [];
            map[id].push({
                bundleName: bundle.name || "Unnamed intervention",
                monthIndex,
            });
        });
    });

    return map;
}

/* -------------------------------------------------------
   SPC helpers
------------------------------------------------------- */

const MONTHS = ["J", "F", "M", "A", "M", "J", "J", "A", "S", "O", "N", "D"];

function computeSPC(values: number[]) {
    const n = values.length;
    const mean = values.reduce((a, b) => a + b, 0) / n;
    const variance = values.reduce((acc, v) => acc + (v - mean) ** 2, 0) / n;
    const sigma = Math.sqrt(variance);
    const ucl = mean + 3 * sigma;
    const lcl = Math.max(0, mean - 3 * sigma);
    return { mean, ucl, lcl };
}

function trendArrow(values: number[], direction: "up" | "down"): { arrow: string; color: string } {
    const last = values[values.length - 1];
    const prev = values[values.length - 2];
    const delta = last - prev;
    const improving = direction === "up" ? delta > 0 : delta < 0;
    if (Math.abs(delta) < 0.5) return { arrow: "→", color: "#94a3b8" };
    return improving
        ? { arrow: "↑", color: "#16a34a" }
        : { arrow: "↓", color: "#dc2626" };
}

/* -------------------------------------------------------
   Mini SPC Sparkline
------------------------------------------------------- */

const CHART_W = 108;
const CHART_H = 30;
const PAD_X = 2;
const PAD_Y = 3;

interface MiniSPCProps {
    values: number[];
    direction: "up" | "down";
    deployments?: Deployment[];
}

const MiniSPC: React.FC<MiniSPCProps> = ({ values, deployments = [] }) => {
    const { mean, ucl, lcl } = computeSPC(values);

    const allValues = [...values, ucl, lcl, mean];
    const minV = Math.min(...allValues);
    const maxV = Math.max(...allValues);
    const range = maxV - minV || 1;

    const toX = (i: number) => PAD_X + (i / (values.length - 1)) * (CHART_W - PAD_X * 2);
    const toY = (v: number) => PAD_Y + (1 - (v - minV) / range) * (CHART_H - PAD_Y * 2);

    const points = values.map((v, i) => `${toX(i)},${toY(v)}`).join(" ");
    const yclUCL = toY(ucl);
    const yclLCL = toY(lcl);
    const yMean  = toY(mean);

    return (
        <svg width={CHART_W} height={CHART_H} style={{ display: "block", flexShrink: 0 }}>
            {/* Control band fill */}
            <rect
                x={PAD_X} y={yclUCL}
                width={CHART_W - PAD_X * 2}
                height={Math.max(0, yclLCL - yclUCL)}
                fill="#f0fdf4" opacity={0.7}
            />
            {/* UCL / LCL */}
            <line x1={PAD_X} y1={yclUCL} x2={CHART_W - PAD_X} y2={yclUCL}
                stroke="#fca5a5" strokeWidth={0.8} strokeDasharray="2,2" />
            <line x1={PAD_X} y1={yclLCL} x2={CHART_W - PAD_X} y2={yclLCL}
                stroke="#fca5a5" strokeWidth={0.8} strokeDasharray="2,2" />
            {/* Mean */}
            <line x1={PAD_X} y1={yMean} x2={CHART_W - PAD_X} y2={yMean}
                stroke="#94a3b8" strokeWidth={0.8} strokeDasharray="3,2" />

            {/* Deployment markers — vertical line + triangle at top */}
            {deployments.map((d, i) => {
                const x = toX(d.monthIndex);
                return (
                    <g key={i}>
                        <line
                            x1={x} y1={PAD_Y} x2={x} y2={CHART_H - PAD_Y}
                            stroke="#f59e0b" strokeWidth={1.2} strokeDasharray="2,2"
                        />
                        {/* small downward triangle at top */}
                        <polygon
                            points={`${x - 3},${PAD_Y} ${x + 3},${PAD_Y} ${x},${PAD_Y + 5}`}
                            fill="#f59e0b"
                        >
                            <title>{`Intervention started: ${d.bundleName}`}</title>
                        </polygon>
                    </g>
                );
            })}

            {/* Data line */}
            <polyline
                points={points}
                fill="none" stroke="#3b82f6" strokeWidth={1.2} strokeLinejoin="round"
            />
            {/* Data points */}
            {values.map((v, i) => {
                const ooc = v > ucl || v < lcl;
                return (
                    <circle
                        key={i}
                        cx={toX(i)} cy={toY(v)} r={ooc ? 2.5 : 1.5}
                        fill={ooc ? "#ef4444" : "#3b82f6"}
                        stroke={ooc ? "#b91c1c" : "none"}
                        strokeWidth={0.5}
                    >
                        <title>{`${MONTHS[i]}: ${v}`}</title>
                    </circle>
                );
            })}
        </svg>
    );
};

/* -------------------------------------------------------
   Indicator row
------------------------------------------------------- */

interface IndicatorRowProps {
    ind: Indicator;
    deployments: Deployment[];
    onClick: () => void;
    selected?: boolean;
}

const IndicatorRow: React.FC<IndicatorRowProps> = ({ ind, deployments, onClick, selected }) => {
    const lastVal = ind.values[ind.values.length - 1];
    const { arrow, color } = trendArrow(ind.values, ind.direction);
    const { ucl, lcl } = computeSPC(ind.values);
    const oocCount = ind.values.filter(v => v > ucl || v < lcl).length;
    const hasDeployment = deployments.length > 0;

    const borderColor = selected
        ? "#3b82f6"
        : oocCount > 0
        ? "#fecaca"
        : hasDeployment
        ? "#fde68a"
        : "#e2e8f0";

    return (
        <div
            onClick={onClick}
            style={{
                display: "flex",
                alignItems: "center",
                gap: 6,
                padding: "4px 6px",
                borderRadius: 6,
                background: selected ? "#eff6ff" : oocCount > 0 ? "#fff7f7" : "#fafafa",
                border: `1px solid ${borderColor}`,
                cursor: "pointer",
            }}
        >
            {/* Name + badges */}
            <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{
                    fontSize: 10,
                    color: "#1e293b",
                    fontWeight: 500,
                    whiteSpace: "nowrap",
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                }}>
                    {ind.name}
                </div>
                {oocCount > 0 && (
                    <div style={{ fontSize: 9, color: "#dc2626", fontWeight: 600, lineHeight: 1.3 }}>
                        {oocCount} OOC {oocCount === 1 ? "point" : "points"}
                    </div>
                )}
                {hasDeployment && (
                    <div style={{
                        fontSize: 9, color: "#92400e", lineHeight: 1.3,
                        whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis",
                    }}>
                        ▼ {deployments.map(d => d.bundleName).join(", ")}
                    </div>
                )}
            </div>

            {/* Sparkline */}
            <MiniSPC values={ind.values} direction={ind.direction} deployments={deployments} />

            {/* Last value + trend */}
            <div style={{ textAlign: "right", minWidth: 40 }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: "#0f172a" }}>
                    {ind.unit === "n"
                        ? lastVal.toLocaleString()
                        : ind.unit === "min"
                        ? <>{lastVal}<span style={{ fontSize: 9, color: "#64748b", marginLeft: 1 }}>m</span></>
                        : `${lastVal}%`}
                </div>
                <div style={{ fontSize: 12, color, fontWeight: 700, lineHeight: 1 }}>{arrow}</div>
            </div>

        </div>
    );
};

/* -------------------------------------------------------
   Main panel
------------------------------------------------------- */

export const IndicatorPanel: React.FC<Props> = ({ tocBundles, groups = [], onSelectIndicator, selectedIndicatorId }) => {
    const [activeCategory, setActiveCategory] = React.useState<IndicatorCategory>("intent");

    const deploymentMap = React.useMemo(() => computeDeployments(tocBundles), [tocBundles]);

    // Resolve color/label for a category: use matching group if present, else fall back to CAT_META
    const resolveTab = (cat: IndicatorCategory) => {
        const g = groups.find(g => g.id === cat);
        return {
            label: g?.name ?? CAT_META[cat].label,
            color: g?.color ?? CAT_META[cat].color,
            bg: g ? `${g.color}18` : CAT_META[cat].bg,
        };
    };

    const filtered = INDICATORS.filter(ind => ind.category === activeCategory);
    const cats: IndicatorCategory[] = ["intent", "access", "readiness", "service", "outcome"];

    const oocByCategory = (cat: IndicatorCategory) =>
        INDICATORS
            .filter(ind => ind.category === cat)
            .reduce((acc, ind) => {
                const { ucl, lcl } = computeSPC(ind.values);
                return acc + ind.values.filter(v => v > ucl || v < lcl).length;
            }, 0);

    const interventionsByCategory = (cat: IndicatorCategory) =>
        INDICATORS
            .filter(ind => ind.category === cat)
            .some(ind => (deploymentMap[ind.id] || []).length > 0);

    return (
        <div style={{ padding: "8px" }}>
            {/* Category tabs */}
            <div style={{ display: "flex", gap: 4, marginBottom: 8 }}>
                {cats.map(cat => {
                    const tab = resolveTab(cat);
                    const ooc = oocByCategory(cat);
                    const hasIntervention = interventionsByCategory(cat);
                    const active = activeCategory === cat;
                    return (
                        <button
                            key={cat}
                            onClick={() => setActiveCategory(cat)}
                            style={{
                                flex: 1, fontSize: 10,
                                fontWeight: active ? 600 : 400,
                                padding: "4px 4px", borderRadius: 5,
                                border: `1px solid ${active ? tab.color : "transparent"}`,
                                background: active ? tab.bg : "transparent",
                                color: active ? tab.color : "#94a3b8",
                                cursor: "pointer", position: "relative",
                            }}
                        >
                            {tab.label}
                            {ooc > 0 && (
                                <span style={{
                                    position: "absolute", top: -4, right: hasIntervention ? 10 : -4,
                                    background: "#ef4444", color: "#fff",
                                    borderRadius: "999px", width: 12, height: 12,
                                    fontSize: 8, display: "flex", alignItems: "center",
                                    justifyContent: "center", fontWeight: 700, lineHeight: 1,
                                }}>{ooc}</span>
                            )}
                            {hasIntervention && (
                                <span style={{
                                    position: "absolute", top: -4, right: -4,
                                    background: "#f59e0b", color: "#fff",
                                    borderRadius: "999px", width: 12, height: 12,
                                    fontSize: 9, display: "flex", alignItems: "center",
                                    justifyContent: "center", lineHeight: 1,
                                }}>▼</span>
                            )}
                        </button>
                    );
                })}
            </div>

            {/* Rows */}
            <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                {filtered.map(ind => (
                    <IndicatorRow
                        key={ind.id}
                        ind={ind}
                        deployments={deploymentMap[ind.id] || []}
                        onClick={() => onSelectIndicator(ind.id)}
                        selected={selectedIndicatorId === ind.id}
                    />
                ))}
            </div>

            {/* Legend */}
            <div style={{
                display: "flex", gap: 10, marginTop: 8,
                paddingTop: 6, borderTop: "1px solid #f1f5f9", flexWrap: "wrap",
            }}>
                {[
                    { color: "#fca5a5", dash: true,  label: "UCL/LCL" },
                    { color: "#94a3b8", dash: true,  label: "Mean" },
                    { color: "#3b82f6", dash: false, label: "Data" },
                    { color: "#ef4444", dash: false, label: "OOC" },
                    { color: "#f59e0b", dash: true,  label: "Deployed" },
                ].map(item => (
                    <div key={item.label} style={{ display: "flex", alignItems: "center", gap: 3 }}>
                        <svg width={16} height={8}>
                            {item.label === "OOC"
                                ? <circle cx={8} cy={4} r={3} fill={item.color} />
                                : <line x1={0} y1={4} x2={16} y2={4}
                                    stroke={item.color}
                                    strokeWidth={item.dash ? 1.2 : 1.5}
                                    strokeDasharray={item.dash ? "3,2" : undefined} />
                            }
                        </svg>
                        <span style={{ fontSize: 9, color: "#94a3b8" }}>{item.label}</span>
                    </div>
                ))}
            </div>
        </div>
    );
};
