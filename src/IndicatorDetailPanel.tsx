// src/IndicatorDetailPanel.tsx
import React from "react";
import { INDICATORS, CAT_META, type IndicatorCategory } from "./indicatorData";
import type { TocBundle } from "./tocTypes";
import type { Persona, NoteEntry, RCANode } from "./types";
import { NoteLog } from "./NoteLog";

/* -------------------------------------------------------
   SPC helpers (individuals chart)
------------------------------------------------------- */

function computeSPC(values: number[]) {
    const n = values.length;
    const mean = values.reduce((a, b) => a + b, 0) / n;
    const variance = values.reduce((acc, v) => acc + (v - mean) ** 2, 0) / n;
    const sigma = Math.sqrt(variance);
    const ucl = mean + 3 * sigma;
    const lcl = Math.max(0, mean - 3 * sigma);
    return { mean, ucl, lcl };
}

/* -------------------------------------------------------
   SPC diagnostic rules
------------------------------------------------------- */

interface SPCDiagnostics {
    oocPoints: Array<{ monthIndex: number; side: "above" | "below" }>;
    runsFlag: boolean;
    trendFlag: boolean;
    shiftFlag: boolean;
}

function runDiagnostics(
    values: number[],
    mean: number,
    ucl: number,
    lcl: number,
    deploymentMonthIndex?: number,
): SPCDiagnostics {
    const oocPoints = values
        .map((v, i) => {
            if (v > ucl) return { monthIndex: i, side: "above" as const };
            if (v < lcl) return { monthIndex: i, side: "below" as const };
            return null;
        })
        .filter((x): x is { monthIndex: number; side: "above" | "below" } => x !== null);

    let runsFlag = false;
    let runLen = 1;
    for (let i = 1; i < values.length; i++) {
        const sameAbove = values[i] > mean && values[i - 1] > mean;
        const sameBelow = values[i] < mean && values[i - 1] < mean;
        if (sameAbove || sameBelow) { runLen++; if (runLen >= 8) { runsFlag = true; break; } }
        else runLen = 1;
    }

    let trendFlag = false;
    let trendLen = 1;
    for (let i = 1; i < values.length; i++) {
        const dir = Math.sign(values[i] - values[i - 1]);
        const prevDir = i >= 2 ? Math.sign(values[i - 1] - values[i - 2]) : 0;
        if (i >= 2 && dir !== 0 && dir === prevDir) { trendLen++; if (trendLen >= 6) { trendFlag = true; break; } }
        else trendLen = 2;
    }

    let shiftFlag = false;
    if (deploymentMonthIndex !== undefined) {
        const after = values.slice(deploymentMonthIndex);
        if (after.length >= 8 && (after.every(v => v > mean) || after.every(v => v < mean)))
            shiftFlag = true;
    }

    return { oocPoints, runsFlag, trendFlag, shiftFlag };
}

/* -------------------------------------------------------
   Shared chart dimensions
------------------------------------------------------- */

const CHART_W = 452;
const PAD_L   = 36;
const PAD_R   = 44;

/* -------------------------------------------------------
   Helpers
------------------------------------------------------- */

// Used only for formatDeploymentDate (calendar date string → readable label)
const MONTHS_LONG = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];

// Returns a 3-char tick label: "Jan 2025" → "Jan"  "Q1 2024" → "Q1"
function shortPeriodLabel(label: string): string {
    const first = label.split(" ")[0];
    return first.length <= 3 ? first : first.slice(0, 3);
}

// Returns the year part of a period label, or null if not present
function periodYear(label: string): string | null {
    const parts = label.split(" ");
    return parts.length > 1 ? parts[1].slice(2) : null; // "2024" → "24"
}

/* -------------------------------------------------------
   Unified Annotation type
   event  = dashed vertical line + italic label
   period = shaded band + dashed boundary lines + label
------------------------------------------------------- */

export interface Annotation {
    id: string;
    label: string;
    type: "event" | "period";
    startIndex: number;
    endIndex?: number; // period only; undefined = open to end of chart
}

/* -------------------------------------------------------
   Render annotation helpers (shared across chart types)
------------------------------------------------------- */

function renderAnnotations(
    annotations: Annotation[],
    toX: (i: number) => number,
    rightEdgeX: number,
    topY: number,
    bottomY: number,
) {
    return annotations.map(ann => {
        const x1 = toX(ann.startIndex);
        if (ann.type === "period") {
            const x2 = ann.endIndex !== undefined ? toX(ann.endIndex) : rightEdgeX;
            return (
                <g key={ann.id} pointerEvents="none">
                    <rect x={x1} y={topY} width={Math.max(0, x2 - x1)} height={bottomY - topY}
                        fill="#6366f112" />
                    <line x1={x1} y1={topY} x2={x1} y2={bottomY}
                        stroke="#6366f1" strokeWidth={1} strokeDasharray="4,3" opacity={0.6} />
                    {ann.endIndex !== undefined && (
                        <line x1={x2} y1={topY} x2={x2} y2={bottomY}
                            stroke="#6366f1" strokeWidth={1} strokeDasharray="4,3" opacity={0.6} />
                    )}
                    <text x={x1 + 3} y={topY + 9} fontSize={7.5} fill="#4f46e5" fontStyle="italic">
                        {ann.label}
                    </text>
                </g>
            );
        } else {
            return (
                <g key={ann.id} pointerEvents="none">
                    <line x1={x1} y1={topY} x2={x1} y2={bottomY}
                        stroke="#475569" strokeWidth={1} strokeDasharray="5,3" />
                    <text x={x1 + 3} y={topY + 9} fontSize={7.5} fill="#475569" fontStyle="italic">
                        {ann.label}
                    </text>
                </g>
            );
        }
    });
}

/* -------------------------------------------------------
   Individuals (full SPC) chart
------------------------------------------------------- */

const IND_H  = 140;
const IND_PT = 16;
const IND_PB = 24;

interface FullSPCChartProps {
    values: number[];
    direction: "up" | "down";
    periodLabels: string[];
    deploymentMonthIndex?: number;
    deploymentEndMonthIndex?: number;
    deploymentLabel?: string;
    annotations?: Annotation[];
    onMonthClick?: (monthIndex: number) => void;
}

const FullSPCChart: React.FC<FullSPCChartProps> = ({
    values, periodLabels, deploymentMonthIndex, deploymentEndMonthIndex, deploymentLabel, annotations = [], onMonthClick,
}) => {
    const [hoverMI, setHoverMI] = React.useState<number | null>(null);
    const { mean, ucl, lcl } = computeSPC(values);
    const nMonths = values.length;

    const allRef = [...values, ucl, lcl, mean];
    const minV = Math.min(...allRef), maxV = Math.max(...allRef);
    const rng = maxV - minV || 1;
    const visMin = minV - rng * 0.08, visMax = maxV + rng * 0.08;
    const visR = visMax - visMin || 1;

    const toX = (i: number) => PAD_L + (i / (nMonths - 1)) * (CHART_W - PAD_L - PAD_R);
    const toY = (v: number) => IND_PT + (1 - (v - visMin) / visR) * (IND_H - IND_PT - IND_PB);

    const pts   = values.map((v, i) => `${toX(i)},${toY(v)}`).join(" ");
    const yUCL  = toY(ucl), yLCL = toY(lcl), yMean = toY(mean);
    const afterX  = deploymentMonthIndex !== undefined ? toX(deploymentMonthIndex) : null;
    const shadeEndX = afterX !== null
        ? (deploymentEndMonthIndex !== undefined ? toX(deploymentEndMonthIndex) : CHART_W - PAD_R)
        : 0;
    const shadeW  = afterX !== null ? Math.max(0, shadeEndX - afterX) : 0;
    const innerW  = CHART_W - PAD_L - PAD_R;

    const handleMouseMove = (e: React.MouseEvent<SVGSVGElement>) => {
        const rect = e.currentTarget.getBoundingClientRect();
        const relX = e.clientX - rect.left - PAD_L;
        const mi = Math.round((relX / innerW) * (nMonths - 1));
        setHoverMI(Math.max(0, Math.min(nMonths - 1, mi)));
    };

    return (
        <svg width={CHART_W} height={IND_H}
            style={{ display: "block", overflow: "visible", cursor: "crosshair" }}
            onMouseMove={handleMouseMove}
            onMouseLeave={() => setHoverMI(null)}
            onClick={() => { if (hoverMI !== null && onMonthClick) onMonthClick(hoverMI); }}
        >
            {/* Period bands & event lines (behind everything) */}
            {renderAnnotations(annotations, toX, CHART_W - PAD_R, IND_PT, IND_H - IND_PB)}

            {/* Deployment shade */}
            {afterX !== null && shadeW > 0 && (
                <rect x={afterX} y={IND_PT} width={shadeW} height={IND_H - IND_PT - IND_PB}
                    fill="#f59e0b" opacity={0.06} />
            )}

            {/* Y-axis labels: "UCL 72" style */}
            {([
                { val: ucl,  lbl: "UCL", color: "#ef4444" },
                { val: mean, lbl: "CL",  color: "#94a3b8" },
                { val: lcl,  lbl: "LCL", color: "#ef4444" },
            ] as const).map(({ val, lbl, color }, i) => (
                <text key={i} x={PAD_L - 4} y={toY(val) + 3.5} textAnchor="end" fontSize={7.5}>
                    <tspan fill={color}>{lbl}</tspan>
                    <tspan fill="#94a3b8"> {Math.round(val)}</tspan>
                </text>
            ))}

            {/* UCL / LCL / Mean lines */}
            <line x1={PAD_L} y1={yUCL}  x2={CHART_W - PAD_R} y2={yUCL}  stroke="#ef4444" strokeWidth={1} strokeDasharray="4,3" />
            <line x1={PAD_L} y1={yLCL}  x2={CHART_W - PAD_R} y2={yLCL}  stroke="#ef4444" strokeWidth={1} strokeDasharray="4,3" />
            <line x1={PAD_L} y1={yMean} x2={CHART_W - PAD_R} y2={yMean} stroke="#94a3b8" strokeWidth={1} strokeDasharray="4,3" />

            {/* Deployment marker */}
            {deploymentMonthIndex !== undefined && (
                <g>
                    <line x1={toX(deploymentMonthIndex)} y1={IND_PT}
                        x2={toX(deploymentMonthIndex)} y2={IND_H - IND_PB}
                        stroke="#f59e0b" strokeWidth={1.5} strokeDasharray="4,3" />
                    <polygon
                        points={`${toX(deploymentMonthIndex) - 5},${IND_PT - 2} ${toX(deploymentMonthIndex) + 5},${IND_PT - 2} ${toX(deploymentMonthIndex)},${IND_PT + 6}`}
                        fill="#f59e0b" />
                    {deploymentLabel && (
                        <text x={toX(deploymentMonthIndex)} y={IND_PT - 5}
                            textAnchor="middle" fontSize={7.5} fill="#92400e" fontWeight={600}>
                            {deploymentLabel}
                        </text>
                    )}
                </g>
            )}

            {/* Data line */}
            <polyline points={pts} fill="none" stroke="#3b82f6" strokeWidth={1.5} strokeLinejoin="round" />

            {/* Data points */}
            {values.map((v, i) => {
                const ooc = v > ucl || v < lcl;
                return (
                    <circle key={i} cx={toX(i)} cy={toY(v)} r={ooc ? 4 : 2.5}
                        fill={ooc ? "#ef4444" : "#3b82f6"} stroke={ooc ? "#b91c1c" : "#2563eb"} strokeWidth={0.6}>
                        <title>{`${periodLabels[i]}: ${v}`}</title>
                    </circle>
                );
            })}

            {/* X-axis ticks */}
            {periodLabels.map((lbl, i) => {
                const yr = periodYear(lbl);
                const isJan = shortPeriodLabel(lbl) === "Jan";
                return (
                    <g key={i}>
                        <text x={toX(i)} y={IND_H - IND_PB + 10} textAnchor="middle" fontSize={7.5} fill="#94a3b8">
                            {shortPeriodLabel(lbl)}
                        </text>
                        {isJan && yr && (
                            <text x={toX(i)} y={IND_H - IND_PB + 19} textAnchor="middle" fontSize={6.5} fill="#cbd5e1">
                                {yr}
                            </text>
                        )}
                    </g>
                );
            })}
            <line x1={PAD_L} y1={IND_H - IND_PB} x2={CHART_W - PAD_R} y2={IND_H - IND_PB}
                stroke="#e2e8f0" strokeWidth={0.8} />

            {/* Hover: vertical crosshair + value tooltip */}
            {hoverMI !== null && (
                <g pointerEvents="none">
                    <line x1={toX(hoverMI)} y1={IND_PT} x2={toX(hoverMI)} y2={IND_H - IND_PB}
                        stroke="#6366f1" strokeWidth={1} strokeDasharray="3,3" opacity={0.7} />
                    <text x={toX(hoverMI)} y={IND_PT - 2}
                        textAnchor="middle" fontSize={7.5} fill="#6366f1" fontWeight={600}>
                        {periodLabels[hoverMI]}
                    </text>
                    <rect x={toX(hoverMI) - 15} y={toY(values[hoverMI]) - 17} width={30} height={13}
                        rx={3} fill="#1e293b" opacity={0.85} />
                    <text x={toX(hoverMI)} y={toY(values[hoverMI]) - 7}
                        textAnchor="middle" fontSize={8} fill="white" fontWeight={700}>
                        {values[hoverMI]}
                    </text>
                </g>
            )}
        </svg>
    );
};

/* -------------------------------------------------------
   X̄ & S chart — correct formulation
   Time on X-axis; subgroup = all groups per month.
   S chart shows how much groups diverge from each other
   at each time point (spikes when some are hit harder).
------------------------------------------------------- */

// Standard SPC constants by subgroup size n
const SPC_CONSTS: Record<number, { A3: number; B3: number; B4: number }> = {
    2:  { A3: 2.659, B3: 0,     B4: 3.267 },
    3:  { A3: 1.954, B3: 0,     B4: 2.568 },
    4:  { A3: 1.628, B3: 0,     B4: 2.266 },
    5:  { A3: 1.427, B3: 0,     B4: 2.089 },
    6:  { A3: 1.287, B3: 0.030, B4: 1.970 },
    7:  { A3: 1.182, B3: 0.118, B4: 1.882 },
    8:  { A3: 1.099, B3: 0.185, B4: 1.815 },
    9:  { A3: 1.032, B3: 0.239, B4: 1.761 },
    10: { A3: 0.975, B3: 0.284, B4: 1.716 },
    11: { A3: 0.927, B3: 0.321, B4: 1.679 },
    12: { A3: 0.886, B3: 0.354, B4: 1.646 },
    15: { A3: 0.789, B3: 0.428, B4: 1.572 },
    20: { A3: 0.680, B3: 0.510, B4: 1.490 },
    25: { A3: 0.606, B3: 0.565, B4: 1.435 },
};

function getSPCConsts(n: number) {
    if (SPC_CONSTS[n]) return SPC_CONSTS[n];
    const keys = Object.keys(SPC_CONSTS).map(Number).sort((a, b) => a - b);
    const nearest = keys.reduce((prev, curr) =>
        Math.abs(curr - n) < Math.abs(prev - n) ? curr : prev);
    return SPC_CONSTS[nearest];
}

function groupStdDev(vals: number[]): number {
    const n = vals.length;
    if (n < 2) return 0;
    const m = vals.reduce((a, b) => a + b, 0) / n;
    return Math.sqrt(vals.reduce((acc, v) => acc + (v - m) ** 2, 0) / (n - 1));
}

// Per-subgroup line colours (one per facility/district/etc.)
const GROUP_COLORS = ["#f472b6", "#0ea5e9", "#10b981", "#eab308", "#a855f7", "#f97316"];

// X-bar panel
const TXB_H  = 116;
const TXB_PT = 14;
const TXB_PB = 8;
// S panel (includes 24px for month-label row)
const TS_SVG_H = 108;
const TS_PT    = 8;
const TS_PB    = 32;

interface XbarSChartProps {
    groups: Array<{ id: string; name: string; values: number[] }>;
    dimension: string;
    periodLabels: string[];
    deploymentMonthIndex?: number;
    deploymentEndMonthIndex?: number;
    deploymentLabel?: string;
    annotations?: Annotation[];
    onMonthClick?: (monthIndex: number) => void;
}

const XbarSChart: React.FC<XbarSChartProps> = ({
    groups, dimension, periodLabels, deploymentMonthIndex, deploymentEndMonthIndex, deploymentLabel,
    annotations = [], onMonthClick,
}) => {
    const [hoverMI, setHoverMI] = React.useState<number | null>(null);
    const nMonths = groups[0]?.values.length ?? 12;
    const nGroups = groups.length;

    // Subgroup at each month = all group values for that month
    const monthlySG = Array.from({ length: nMonths }, (_, mi) =>
        groups.map(g => g.values[mi])
    );
    const xbars   = monthlySG.map(sg => sg.reduce((a, b) => a + b, 0) / sg.length);
    const stdDevs = monthlySG.map(sg => groupStdDev(sg));
    const grandMean = xbars.reduce((a, b) => a + b, 0) / nMonths;
    const sMean     = stdDevs.reduce((a, b) => a + b, 0) / nMonths;

    // Control limits — n = number of groups (subgroup size)
    const consts = getSPCConsts(nGroups);
    const uclX = grandMean + consts.A3 * sMean;
    const lclX = Math.max(0, grandMean - consts.A3 * sMean);
    const uclS = consts.B4 * sMean;
    const lclS = consts.B3 * sMean;

    const toX = (i: number) => PAD_L + (i / (nMonths - 1)) * (CHART_W - PAD_L - PAD_R);

    // X-bar Y — range covers xbars and control limits
    const xAllRef = [...xbars, uclX, lclX, grandMean];
    const xMin = Math.min(...xAllRef), xMax = Math.max(...xAllRef);
    const xR = xMax - xMin || 1;
    const xVisMin = xMin - xR * 0.04, xVisMax = xMax + xR * 0.04;
    const xVisR = xVisMax - xVisMin || 1;
    const toXY = (v: number) => TXB_PT + (1 - (v - xVisMin) / xVisR) * (TXB_H - TXB_PT - TXB_PB);

    // S Y — anchored at 0
    const sMax = Math.max(...stdDevs, uclS);
    const sVisR = sMax * 1.14 || 1;
    const toSY = (v: number) => TS_PT + (1 - v / sVisR) * (TS_SVG_H - TS_PT - TS_PB);

    const xbarPts = xbars.map((v, i) => `${toX(i)},${toXY(v)}`).join(" ");
    const sPts    = stdDevs.map((v, i) => `${toX(i)},${toSY(v)}`).join(" ");
    const yXucl = toXY(uclX), yXlcl = toXY(lclX), yXmean = toXY(grandMean);
    const ySucl = toSY(uclS), ySsmean = toSY(sMean);
    const depX     = deploymentMonthIndex !== undefined ? toX(deploymentMonthIndex) : null;
    const depEndX  = depX !== null
        ? (deploymentEndMonthIndex !== undefined ? toX(deploymentEndMonthIndex) : CHART_W - PAD_R)
        : 0;
    const shadeW   = depX !== null ? Math.max(0, depEndX - depX) : 0;
    const innerW   = CHART_W - PAD_L - PAD_R;

    const handleMouseMove = (e: React.MouseEvent<SVGSVGElement>) => {
        const rect = e.currentTarget.getBoundingClientRect();
        const relX = e.clientX - rect.left - PAD_L;
        const mi = Math.round((relX / innerW) * (nMonths - 1));
        setHoverMI(Math.max(0, Math.min(nMonths - 1, mi)));
    };

    return (
        <div>
            {/* ── X-bar panel ── */}
            <div style={{ fontSize: 9, color: "#64748b", fontWeight: 600, marginBottom: 2, paddingLeft: PAD_L }}>
                X̄ chart — grand mean + individual {dimension}s
            </div>
            <svg width={CHART_W} height={TXB_H}
                style={{ display: "block", overflow: "visible", cursor: "crosshair" }}
                onMouseMove={handleMouseMove}
                onMouseLeave={() => setHoverMI(null)}
                onClick={() => { if (hoverMI !== null && onMonthClick) onMonthClick(hoverMI); }}
            >
                {/* Annotation bands & lines */}
                {renderAnnotations(annotations, toX, CHART_W - PAD_R, TXB_PT, TXB_H - TXB_PB)}

                {/* Deployment shade */}
                {depX !== null && shadeW > 0 && (
                    <rect x={depX} y={TXB_PT} width={shadeW} height={TXB_H - TXB_PT - TXB_PB}
                        fill="#f59e0b" opacity={0.07} />
                )}

                {/* Y-axis labels: "UCL 72" style */}
                {([
                    { val: uclX,      lbl: "UCL", color: "#ef4444" },
                    { val: grandMean, lbl: "CL",  color: "#94a3b8" },
                    { val: lclX,      lbl: "LCL", color: "#ef4444" },
                ] as const).map(({ val, lbl, color }, i) => (
                    <text key={i} x={PAD_L - 4} y={toXY(val) + 3.5} textAnchor="end" fontSize={7.5}>
                        <tspan fill={color}>{lbl}</tspan>
                        <tspan fill="#94a3b8"> {Math.round(val)}</tspan>
                    </text>
                ))}

                {/* Control limits */}
                <line x1={PAD_L} y1={yXucl}  x2={CHART_W - PAD_R} y2={yXucl}
                    stroke="#ef4444" strokeWidth={1} strokeDasharray="4,3" />
                <line x1={PAD_L} y1={yXlcl}  x2={CHART_W - PAD_R} y2={yXlcl}
                    stroke="#ef4444" strokeWidth={1} strokeDasharray="4,3" />
                <line x1={PAD_L} y1={yXmean} x2={CHART_W - PAD_R} y2={yXmean}
                    stroke="#94a3b8" strokeWidth={1} strokeDasharray="4,3" />

                {/* Deployment marker */}
                {deploymentMonthIndex !== undefined && (
                    <g>
                        <line x1={toX(deploymentMonthIndex)} y1={TXB_PT}
                            x2={toX(deploymentMonthIndex)} y2={TXB_H - TXB_PB}
                            stroke="#f59e0b" strokeWidth={1.5} strokeDasharray="4,3" />
                        <polygon
                            points={`${toX(deploymentMonthIndex) - 4},${TXB_PT - 1} ${toX(deploymentMonthIndex) + 4},${TXB_PT - 1} ${toX(deploymentMonthIndex)},${TXB_PT + 5}`}
                            fill="#f59e0b" />
                        {deploymentLabel && (
                            <text x={toX(deploymentMonthIndex)} y={TXB_PT - 4}
                                textAnchor="middle" fontSize={7} fill="#92400e" fontWeight={600}>
                                {deploymentLabel}
                            </text>
                        )}
                    </g>
                )}

                {/* Grand mean line + points */}
                <polyline points={xbarPts} fill="none" stroke="#3b82f6" strokeWidth={1.5} strokeLinejoin="round" />
                {xbars.map((v, i) => {
                    const ooc = v > uclX || v < lclX;
                    return (
                        <circle key={i} cx={toX(i)} cy={toXY(v)} r={ooc ? 4 : 2.5}
                            fill={ooc ? "#ef4444" : "#3b82f6"} stroke={ooc ? "#b91c1c" : "#2563eb"} strokeWidth={0.6}>
                            <title>{`${periodLabels[i]}: x̄ = ${v.toFixed(1)}`}</title>
                        </circle>
                    );
                })}
                <line x1={PAD_L} y1={TXB_H - TXB_PB} x2={CHART_W - PAD_R} y2={TXB_H - TXB_PB}
                    stroke="#e2e8f0" strokeWidth={0.8} />

                {/* Hover: vertical crosshair + value bubble */}
                {hoverMI !== null && (
                    <g pointerEvents="none">
                        <line x1={toX(hoverMI)} y1={TXB_PT} x2={toX(hoverMI)} y2={TXB_H - TXB_PB}
                            stroke="#6366f1" strokeWidth={1} strokeDasharray="3,3" opacity={0.7} />
                        <text x={toX(hoverMI)} y={TXB_PT - 2}
                            textAnchor="middle" fontSize={7.5} fill="#6366f1" fontWeight={600}>
                            {periodLabels[hoverMI]}
                        </text>
                        <rect x={toX(hoverMI) - 18} y={toXY(xbars[hoverMI]) - 17} width={36} height={13}
                            rx={3} fill="#1e293b" opacity={0.85} />
                        <text x={toX(hoverMI)} y={toXY(xbars[hoverMI]) - 7}
                            textAnchor="middle" fontSize={8} fill="white" fontWeight={700}>
                            {xbars[hoverMI].toFixed(1)}
                        </text>
                    </g>
                )}
            </svg>

            {/* ── S panel ── */}
            <div style={{ fontSize: 9, color: "#64748b", fontWeight: 600, marginBottom: 2, marginTop: 6, paddingLeft: PAD_L }}>
                S chart — cross-{dimension} spread per month
            </div>
            <svg width={CHART_W} height={TS_SVG_H}
                style={{ display: "block", overflow: "visible", cursor: "crosshair" }}
                onMouseMove={handleMouseMove}
                onMouseLeave={() => setHoverMI(null)}
                onClick={() => { if (hoverMI !== null && onMonthClick) onMonthClick(hoverMI); }}
            >
                {/* Annotation bands & lines */}
                {renderAnnotations(annotations, toX, CHART_W - PAD_R, TS_PT, TS_SVG_H - TS_PB)}

                {/* Deployment shade */}
                {depX !== null && shadeW > 0 && (
                    <rect x={depX} y={TS_PT} width={shadeW} height={TS_SVG_H - TS_PT - TS_PB}
                        fill="#f59e0b" opacity={0.07} />
                )}

                {/* Y-axis labels */}
                {([
                    { val: uclS,  lbl: "UCL", color: "#ef4444" },
                    { val: sMean, lbl: "CL",  color: "#94a3b8" },
                ] as const).map(({ val, lbl, color }, i) => (
                    <text key={i} x={PAD_L - 4} y={toSY(val) + 3.5} textAnchor="end" fontSize={7.5}>
                        <tspan fill={color}>{lbl}</tspan>
                        <tspan fill="#94a3b8"> {val.toFixed(1)}</tspan>
                    </text>
                ))}

                {/* Control limits */}
                <line x1={PAD_L} y1={ySucl}   x2={CHART_W - PAD_R} y2={ySucl}
                    stroke="#ef4444" strokeWidth={1} strokeDasharray="4,3" />
                <line x1={PAD_L} y1={ySsmean} x2={CHART_W - PAD_R} y2={ySsmean}
                    stroke="#94a3b8" strokeWidth={1} strokeDasharray="4,3" />

                {/* Deployment marker */}
                {deploymentMonthIndex !== undefined && (
                    <line x1={toX(deploymentMonthIndex)} y1={TS_PT}
                        x2={toX(deploymentMonthIndex)} y2={TS_SVG_H - TS_PB}
                        stroke="#f59e0b" strokeWidth={1.5} strokeDasharray="4,3" />
                )}

                {/* S line + points */}
                <polyline points={sPts} fill="none" stroke="#8b5cf6" strokeWidth={1.5} strokeLinejoin="round" />
                {stdDevs.map((v, i) => {
                    const ooc = v > uclS || (lclS > 0 && v < lclS);
                    return (
                        <circle key={i} cx={toX(i)} cy={toSY(v)} r={ooc ? 4 : 2.5}
                            fill={ooc ? "#ef4444" : "#8b5cf6"} stroke={ooc ? "#b91c1c" : "#7c3aed"} strokeWidth={0.6}>
                            <title>{`${periodLabels[i]}: S = ${v.toFixed(2)}`}</title>
                        </circle>
                    );
                })}

                {/* X-axis ticks */}
                {periodLabels.map((lbl, i) => {
                    const yr = periodYear(lbl);
                    const isJan = shortPeriodLabel(lbl) === "Jan";
                    return (
                        <g key={i}>
                            <text x={toX(i)} y={TS_SVG_H - TS_PB + 10} textAnchor="middle" fontSize={7.5} fill="#94a3b8">
                                {shortPeriodLabel(lbl)}
                            </text>
                            {isJan && yr && (
                                <text x={toX(i)} y={TS_SVG_H - TS_PB + 19} textAnchor="middle" fontSize={6.5} fill="#cbd5e1">
                                    {yr}
                                </text>
                            )}
                        </g>
                    );
                })}
                <line x1={PAD_L} y1={TS_SVG_H - TS_PB} x2={CHART_W - PAD_R} y2={TS_SVG_H - TS_PB}
                    stroke="#e2e8f0" strokeWidth={0.8} />

                {/* Hover: vertical crosshair + value bubble (S panel) */}
                {hoverMI !== null && (
                    <g pointerEvents="none">
                        <line x1={toX(hoverMI)} y1={TS_PT} x2={toX(hoverMI)} y2={TS_SVG_H - TS_PB}
                            stroke="#6366f1" strokeWidth={1} strokeDasharray="3,3" opacity={0.7} />
                        <rect x={toX(hoverMI) - 18} y={toSY(stdDevs[hoverMI]) - 17} width={36} height={13}
                            rx={3} fill="#1e293b" opacity={0.85} />
                        <text x={toX(hoverMI)} y={toSY(stdDevs[hoverMI]) - 7}
                            textAnchor="middle" fontSize={8} fill="white" fontWeight={700}>
                            {stdDevs[hoverMI].toFixed(2)}
                        </text>
                    </g>
                )}
            </svg>
        </div>
    );
};

/* -------------------------------------------------------
   Groups chart — small multiples, one panel per subgroup
------------------------------------------------------- */

const MINI_W  = 210; // SVG width inside each cell
const MINI_H  = 44;  // SVG height
const MINI_PT = 3, MINI_PB = 3, MINI_PL = 2, MINI_PR = 2;

interface GroupsChartProps {
    groups: Array<{ id: string; name: string; values: number[] }>;
}

const GroupsChart: React.FC<GroupsChartProps> = ({ groups }) => {
    // Shared Y scale across all groups so trends are visually comparable
    const allVals = groups.flatMap(g => g.values);
    const minV = Math.min(...allVals), maxV = Math.max(...allVals);
    const vRange = maxV - minV || 1;
    const visMin = minV - vRange * 0.1, visMax = maxV + vRange * 0.1;
    const visR = visMax - visMin;

    // Grand mean reference line (same Y for all cells)
    const grandMean = allVals.reduce((a, b) => a + b, 0) / allVals.length;

    const nM = groups[0]?.values.length ?? 12;
    const toX = (i: number) => MINI_PL + (i / (nM - 1)) * (MINI_W - MINI_PL - MINI_PR);
    const toY = (v: number) => MINI_PT + (1 - (v - visMin) / visR) * (MINI_H - MINI_PT - MINI_PB);
    const yRef = toY(grandMean);

    return (
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 5 }}>
            {groups.map((g, fi) => {
                const color = GROUP_COLORS[fi % GROUP_COLORS.length];
                const { ucl, lcl } = computeSPC(g.values);
                const pts = g.values.map((v, i) => `${toX(i)},${toY(v)}`).join(" ");
                const lastVal = g.values[g.values.length - 1];
                return (
                    <div key={g.id} style={{
                        background: "#f9fafb",
                        border: `1px solid ${color}35`,
                        borderLeft: `3px solid ${color}`,
                        borderRadius: "0 6px 6px 0",
                        padding: "5px 6px 4px",
                        minWidth: 0,
                    }}>
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 2 }}>
                            <span style={{
                                fontSize: 9, fontWeight: 600, color: "#475569",
                                whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", maxWidth: "72%",
                            }}>{g.name}</span>
                            <span style={{ fontSize: 10, fontWeight: 700, color, flexShrink: 0 }}>{lastVal}</span>
                        </div>
                        <svg width={MINI_W} height={MINI_H} style={{ display: "block" }}>
                            {/* Grand mean reference */}
                            <line x1={MINI_PL} y1={yRef} x2={MINI_W - MINI_PR} y2={yRef}
                                stroke="#e2e8f0" strokeWidth={0.8} />
                            {/* Trend line */}
                            <polyline points={pts} fill="none"
                                stroke={color} strokeWidth={1.3} strokeOpacity={0.9} strokeLinejoin="round" />
                            {/* Points — OOC in red */}
                            {g.values.map((v, i) => {
                                const ooc = v > ucl || v < lcl;
                                return (
                                    <circle key={i} cx={toX(i)} cy={toY(v)} r={ooc ? 2.5 : 1.5}
                                        fill={ooc ? "#ef4444" : color} opacity={ooc ? 1 : 0.8}>
                                        <title>{`${MONTHS_LONG[i]}: ${v}`}</title>
                                    </circle>
                                );
                            })}
                        </svg>
                    </div>
                );
            })}
        </div>
    );
};

/* -------------------------------------------------------
   SPC Diagnostics Card
------------------------------------------------------- */

const DiagnosticCard: React.FC<{ diagnostics: SPCDiagnostics; periodLabels: string[]; deploymentMonthIndex?: number }> = ({
    diagnostics, periodLabels, deploymentMonthIndex,
}) => {
    const { oocPoints, runsFlag, trendFlag, shiftFlag } = diagnostics;
    const issues: React.ReactNode[] = [];

    oocPoints.forEach(pt => {
        issues.push(
            <div key={`ooc-${pt.monthIndex}`} style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 3 }}>
                <span style={{ width: 8, height: 8, borderRadius: "50%", background: "#ef4444", flexShrink: 0, display: "inline-block" }} />
                <span style={{ fontSize: 11, color: "#1e293b" }}>
                    {periodLabels[pt.monthIndex]} — {pt.side === "above" ? "above UCL" : "below LCL"}
                </span>
            </div>
        );
    });

    if (runsFlag) issues.push(
        <div key="runs" style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 3 }}>
            <span style={{ width: 8, height: 8, borderRadius: 2, background: "#f59e0b", flexShrink: 0, display: "inline-block" }} />
            <span style={{ fontSize: 11, color: "#1e293b" }}>Run of 8+ consecutive points on same side of mean</span>
        </div>
    );

    if (trendFlag) issues.push(
        <div key="trend" style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 3 }}>
            <span style={{ width: 8, height: 8, borderRadius: 2, background: "#f59e0b", flexShrink: 0, display: "inline-block" }} />
            <span style={{ fontSize: 11, color: "#1e293b" }}>Trend: 6+ consecutively increasing or decreasing points</span>
        </div>
    );

    if (shiftFlag && deploymentMonthIndex !== undefined) issues.push(
        <div key="shift" style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 3 }}>
            <span style={{ width: 8, height: 8, borderRadius: 2, background: "#f59e0b", flexShrink: 0, display: "inline-block" }} />
            <span style={{ fontSize: 11, color: "#1e293b" }}>Shift: 8+ points on one side of mean after deployment</span>
        </div>
    );

    return (
        <div style={{
            background: issues.length === 0 ? "#f0fdf4" : "#fff7ed",
            border: `1px solid ${issues.length === 0 ? "#bbf7d0" : "#fed7aa"}`,
            borderRadius: 8, padding: "10px 12px",
        }}>
            <div style={{ fontSize: 11, fontWeight: 600, color: "#475569", marginBottom: issues.length === 0 ? 0 : 8 }}>
                SPC Diagnostics
            </div>
            {issues.length === 0
                ? <div style={{ fontSize: 12, color: "#16a34a", fontWeight: 500 }}>Process in control ✓</div>
                : issues}
        </div>
    );
};

/* -------------------------------------------------------
   Deployment banner helper
------------------------------------------------------- */

function formatDeploymentPeriod(start: string, end?: string): string {
    const fmt = (s: string) => {
        const parts = s.split("-");
        if (parts.length < 2) return s;
        const m = parseInt(parts[1], 10) - 1;
        if (isNaN(m) || m < 0 || m > 11) return s;
        return `${MONTHS_LONG[m]} ${parts[0]}`;
    };
    return end ? `${fmt(start)} – ${fmt(end)}` : fmt(start);
}

/* -------------------------------------------------------
   Annotations section — form + list below SPC diagnostics
------------------------------------------------------- */

interface AnnotationsSectionProps {
    annotations: Annotation[];
    periodLabels: string[];
    onAdd: (ann: Omit<Annotation, "id">) => void;
    onDelete: (id: string) => void;
    pendingStartIndex?: number | null; // set by chart click to pre-fill + open form
    noHeader?: boolean; // suppress the built-in "Annotations" header + top border
}

const AnnotationsSection: React.FC<AnnotationsSectionProps> = ({
    annotations, periodLabels, onAdd, onDelete, pendingStartIndex, noHeader,
}) => {
    const [adding, setAdding] = React.useState(false);
    const [annType, setAnnType] = React.useState<"event" | "period">("event");
    const [label, setLabel] = React.useState("");
    const [startIndex, setStartIndex] = React.useState(0);
    const [endIndex, setEndIndex] = React.useState<number | "open">("open");

    // When the chart is clicked, open the form pre-filled with that month
    React.useEffect(() => {
        if (pendingStartIndex != null) {
            setAdding(true);
            setStartIndex(pendingStartIndex);
            setLabel("");
            setEndIndex("open");
        }
    }, [pendingStartIndex]);

    const handleAdd = () => {
        if (!label.trim()) return;
        onAdd({
            label: label.trim(),
            type: annType,
            startIndex,
            endIndex: annType === "period" && endIndex !== "open" ? endIndex : undefined,
        });
        setLabel("");
        setStartIndex(0);
        setEndIndex("open");
        setAdding(false);
    };

    const btnBase: React.CSSProperties = {
        fontSize: 10, padding: "3px 8px", borderRadius: 5, cursor: "pointer",
        border: "1px solid #e2e8f0", background: "#f9fafb", color: "#475569",
    };
    const btnActive: React.CSSProperties = {
        ...btnBase, border: "1px solid #6366f1", background: "#eef2ff", color: "#4f46e5", fontWeight: 600,
    };

    return (
        <div style={noHeader ? {} : { marginTop: 10, paddingTop: 10, borderTop: "1px solid #f1f5f9" }}>
            {/* Header row */}
            {!noHeader && (
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 6 }}>
                <span style={{ fontSize: 11, fontWeight: 600, color: "#475569" }}>Annotations</span>
                <button
                    onClick={() => setAdding(a => !a)}
                    style={{ ...btnBase, background: adding ? "#f0fdf4" : "#f9fafb", color: adding ? "#16a34a" : "#475569" }}
                >
                    {adding ? "— Cancel" : "+ Add"}
                </button>
            </div>
            )}

            {/* Add form */}
            {adding && (
                <div style={{
                    background: "#f8fafc", border: "1px solid #e2e8f0",
                    borderRadius: 8, padding: "10px 12px", marginBottom: 8,
                }}>
                    {/* Type toggle */}
                    <div style={{ display: "flex", gap: 4, marginBottom: 8 }}>
                        <button onClick={() => setAnnType("event")}
                            style={annType === "event" ? btnActive : btnBase}>
                            — Event
                        </button>
                        <button onClick={() => setAnnType("period")}
                            style={annType === "period" ? { ...btnActive, background: "#f5f3ff", color: "#7c3aed", border: "1px solid #a78bfa" } : btnBase}>
                            ▒ Period
                        </button>
                    </div>

                    {/* Label */}
                    <input
                        autoFocus
                        value={label}
                        onChange={e => setLabel(e.target.value)}
                        placeholder={annType === "event" ? "e.g. Campaign launch" : "e.g. Rainy season"}
                        onKeyDown={e => { if (e.key === "Enter") handleAdd(); if (e.key === "Escape") setAdding(false); }}
                        style={{
                            width: "100%", fontSize: 11, padding: "5px 7px",
                            border: "1px solid #d1d5db", borderRadius: 5, color: "#1e293b",
                            background: "#fff", boxSizing: "border-box", marginBottom: 6,
                        }}
                    />

                    {/* Period / start */}
                    <div style={{ display: "flex", gap: 6, alignItems: "center", marginBottom: 8 }}>
                        <div style={{ flex: 1 }}>
                            <div style={{ fontSize: 9, color: "#64748b", marginBottom: 2 }}>
                                {annType === "event" ? "Period" : "From"}
                            </div>
                            <select
                                value={startIndex}
                                onChange={e => setStartIndex(Number(e.target.value))}
                                style={{ width: "100%", fontSize: 11, padding: "4px 5px", border: "1px solid #d1d5db", borderRadius: 5, color: "#1e293b", background: "#fff" }}
                            >
                                {periodLabels.map((lbl, i) => <option key={i} value={i}>{lbl}</option>)}
                            </select>
                        </div>
                        {annType === "period" && (
                            <div style={{ flex: 1 }}>
                                <div style={{ fontSize: 9, color: "#64748b", marginBottom: 2 }}>To (optional)</div>
                                <select
                                    value={endIndex === "open" ? "" : endIndex}
                                    onChange={e => setEndIndex(e.target.value === "" ? "open" : Number(e.target.value))}
                                    style={{ width: "100%", fontSize: 11, padding: "4px 5px", border: "1px solid #d1d5db", borderRadius: 5, color: "#1e293b", background: "#fff" }}
                                >
                                    <option value="">Open (no end)</option>
                                    {periodLabels.map((lbl, i) => <option key={i} value={i}>{lbl}</option>)}
                                </select>
                            </div>
                        )}
                    </div>

                    {/* Save button */}
                    <button
                        onClick={handleAdd}
                        disabled={!label.trim()}
                        style={{
                            fontSize: 10, fontWeight: 600, padding: "4px 12px", borderRadius: 5,
                            border: "none", cursor: label.trim() ? "pointer" : "not-allowed",
                            background: label.trim() ? "#475569" : "#e2e8f0",
                            color: label.trim() ? "#fff" : "#94a3b8",
                        }}
                    >
                        Add annotation
                    </button>
                </div>
            )}

            {/* List */}
            {annotations.length === 0 && !adding && (
                <div style={{ fontSize: 11, color: "#94a3b8" }}>None — click Add to annotate the chart.</div>
            )}
            {annotations.map(ann => (
                <div key={ann.id} style={{
                    display: "flex", alignItems: "flex-start", gap: 7,
                    background: ann.type === "event" ? "#f8fafc" : "#f5f3ff",
                    border: `1px solid ${ann.type === "event" ? "#e2e8f0" : "#ddd6fe"}`,
                    borderRadius: 6, padding: "6px 8px", marginBottom: 4,
                }}>
                    {/* Type icon */}
                    <span style={{
                        fontSize: 11, flexShrink: 0, marginTop: 1,
                        color: ann.type === "event" ? "#475569" : "#7c3aed",
                    }}>
                        {ann.type === "event" ? "—" : "▒"}
                    </span>
                    <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: 11, fontWeight: 600, color: "#1e293b", marginBottom: 1 }}>
                            {ann.label}
                        </div>
                        <div style={{ fontSize: 9, color: "#64748b" }}>
                            {ann.type === "event"
                                ? periodLabels[ann.startIndex]
                                : `${periodLabels[ann.startIndex]} → ${ann.endIndex !== undefined ? periodLabels[ann.endIndex] : "open"}`
                            }
                        </div>
                    </div>
                    <button
                        onClick={() => onDelete(ann.id)}
                        style={{ background: "none", border: "none", cursor: "pointer", color: "#cbd5e1", fontSize: 14, lineHeight: 1, padding: "0 0 0 2px", flexShrink: 0 }}
                    >×</button>
                </div>
            ))}
        </div>
    );
};

/* -------------------------------------------------------
   Multi-Indicator View — correlation analysis overlay
------------------------------------------------------- */

// Compact SPC trend chart for the multi-indicator view
const MV_PAD_L = 38;
const MV_PAD_R = 10;
const MV_H     = 110;
const MV_PT    = 14;
const MV_PB    = 24;

interface MiniTrendChartProps {
    values: number[];
    periodLabels: string[];
    color: string;
    deploymentMonthIndex?: number;
    width: number;
    annotations?: Annotation[];
    hoverMI?: number | null;
    onHoverChange?: (mi: number | null) => void;
    onMonthClick?: (mi: number) => void;
}

const MiniTrendChart: React.FC<MiniTrendChartProps> = ({
    values, periodLabels, color, deploymentMonthIndex, width, annotations = [],
    hoverMI: externalHoverMI, onHoverChange, onMonthClick,
}) => {
    const [localHoverMI, setLocalHoverMI] = React.useState<number | null>(null);
    const hoverMI = externalHoverMI !== undefined ? externalHoverMI : localHoverMI;
    const { mean, ucl, lcl } = computeSPC(values);
    const n = values.length;
    const allRef = [...values, ucl, lcl, mean];
    const minV = Math.min(...allRef), maxV = Math.max(...allRef);
    const rng = maxV - minV || 1;
    const visMin = minV - rng * 0.1, visMax = maxV + rng * 0.1;
    const visR = visMax - visMin || 1;

    const innerW = width - MV_PAD_L - MV_PAD_R;
    const toX = (i: number) => MV_PAD_L + (i / (n - 1)) * innerW;
    const toY = (v: number) => MV_PT + (1 - (v - visMin) / visR) * (MV_H - MV_PT - MV_PB);

    const pts = values.map((v, i) => `${toX(i)},${toY(v)}`).join(" ");
    const yUCL = toY(ucl), yLCL = toY(lcl), yMean = toY(mean);

    const handleMouseMove = (e: React.MouseEvent<SVGSVGElement>) => {
        const rect = e.currentTarget.getBoundingClientRect();
        const relX = e.clientX - rect.left - MV_PAD_L;
        const mi = Math.max(0, Math.min(n - 1, Math.round((relX / innerW) * (n - 1))));
        if (onHoverChange) onHoverChange(mi); else setLocalHoverMI(mi);
    };

    const handleMouseLeave = () => {
        if (onHoverChange) onHoverChange(null); else setLocalHoverMI(null);
    };

    const handleClick = (e: React.MouseEvent<SVGSVGElement>) => {
        if (!onMonthClick) return;
        const rect = e.currentTarget.getBoundingClientRect();
        const relX = e.clientX - rect.left - MV_PAD_L;
        const mi = Math.max(0, Math.min(n - 1, Math.round((relX / innerW) * (n - 1))));
        onMonthClick(mi);
    };

    return (
        <svg width={width} height={MV_H}
            style={{ display: "block", overflow: "visible", cursor: onMonthClick ? "pointer" : "crosshair" }}
            onMouseMove={handleMouseMove}
            onMouseLeave={handleMouseLeave}
            onClick={handleClick}
        >
            {/* Annotation bands & event lines */}
            {renderAnnotations(annotations, toX, width - MV_PAD_R, MV_PT, MV_H - MV_PB)}

            {/* Control band */}
            <rect x={MV_PAD_L} y={yUCL} width={innerW} height={Math.max(0, yLCL - yUCL)}
                fill={`${color}08`} />

            {/* UCL / LCL / Mean lines */}
            <line x1={MV_PAD_L} y1={yUCL}  x2={width - MV_PAD_R} y2={yUCL}  stroke="#ef4444" strokeWidth={0.7} strokeDasharray="3,2" opacity={0.6} />
            <line x1={MV_PAD_L} y1={yLCL}  x2={width - MV_PAD_R} y2={yLCL}  stroke="#ef4444" strokeWidth={0.7} strokeDasharray="3,2" opacity={0.6} />
            <line x1={MV_PAD_L} y1={yMean} x2={width - MV_PAD_R} y2={yMean} stroke="#94a3b8" strokeWidth={0.7} strokeDasharray="3,2" />

            {/* Left axis labels: "UCL 72" style */}
            {([
                { val: ucl,  lbl: "UCL", clr: "#ef4444" },
                { val: mean, lbl: "CL",  clr: "#94a3b8" },
                { val: lcl,  lbl: "LCL", clr: "#ef4444" },
            ] as const).map(({ val, lbl, clr }, i) => (
                <text key={i} x={MV_PAD_L - 3} y={toY(val) + 3} textAnchor="end" fontSize={7}>
                    <tspan fill={clr}>{lbl}</tspan>
                    <tspan fill="#94a3b8"> {Math.round(val)}</tspan>
                </text>
            ))}

            {/* Deployment marker */}
            {deploymentMonthIndex !== undefined && (
                <line x1={toX(deploymentMonthIndex)} y1={MV_PT} x2={toX(deploymentMonthIndex)} y2={MV_H - MV_PB}
                    stroke="#f59e0b" strokeWidth={1} strokeDasharray="3,2" />
            )}

            {/* X-axis baseline */}
            <line x1={MV_PAD_L} y1={MV_H - MV_PB} x2={width - MV_PAD_R} y2={MV_H - MV_PB}
                stroke="#e2e8f0" strokeWidth={0.6} />

            {/* X-axis ticks */}
            {periodLabels.map((lbl, i) => {
                const yr = periodYear(lbl);
                const isJan = shortPeriodLabel(lbl) === "Jan";
                return (
                    <g key={i}>
                        <text x={toX(i)} y={MV_H - MV_PB + 9} textAnchor="middle" fontSize={7} fill="#94a3b8">
                            {shortPeriodLabel(lbl)}
                        </text>
                        {isJan && yr && (
                            <text x={toX(i)} y={MV_H - MV_PB + 17} textAnchor="middle" fontSize={6} fill="#cbd5e1">
                                {yr}
                            </text>
                        )}
                    </g>
                );
            })}

            {/* Data line */}
            <polyline points={pts} fill="none" stroke={color} strokeWidth={1.4} strokeLinejoin="round" />

            {/* Data points */}
            {values.map((v, i) => {
                const ooc = v > ucl || v < lcl;
                return (
                    <circle key={i} cx={toX(i)} cy={toY(v)} r={ooc ? 3 : 1.8}
                        fill={ooc ? "#ef4444" : color}
                        stroke={ooc ? "#b91c1c" : "none"}
                        strokeWidth={0.5}
                        opacity={ooc ? 1 : 0.7}>
                        <title>{`${periodLabels[i]}: ${v}`}</title>
                    </circle>
                );
            })}

            {/* Hover: vertical crosshair + value bubble */}
            {hoverMI !== null && (
                <g pointerEvents="none">
                    <line x1={toX(hoverMI)} y1={MV_PT} x2={toX(hoverMI)} y2={MV_H - MV_PB}
                        stroke="#6366f1" strokeWidth={1} strokeDasharray="3,3" opacity={0.7} />
                    <text x={toX(hoverMI)} y={MV_PT - 2}
                        textAnchor="middle" fontSize={7} fill="#6366f1" fontWeight={600}>
                        {periodLabels[hoverMI]}
                    </text>
                    <rect x={toX(hoverMI) - 15} y={toY(values[hoverMI]) - 16} width={30} height={12}
                        rx={3} fill="#1e293b" opacity={0.85} />
                    <text x={toX(hoverMI)} y={toY(values[hoverMI]) - 7}
                        textAnchor="middle" fontSize={7.5} fill="white" fontWeight={700}>
                        {values[hoverMI]}
                    </text>
                </g>
            )}
        </svg>
    );
};


// Distinct chart colors for selected indicators (cycle through)
const MV_CHART_COLORS = [
    "#3b82f6", "#10b981", "#f59e0b", "#ef4444",
    "#8b5cf6", "#06b6d4", "#f97316", "#84cc16",
];

const SETS_STORAGE_KEY = "rca-indicator-sets-v1";

interface IndicatorSet { name: string; ids: string[] }

interface MultiIndicatorViewProps {
    onClose: () => void;
    tocBundles?: Record<string, TocBundle>;
    initialIndicatorId?: string | null;
    annotationMap?: Record<string, Annotation[]>;
    onAddAnnotation?: (indicatorId: string, ann: Omit<Annotation, "id">) => void;
    onDeleteAnnotation?: (indicatorId: string, annId: string) => void;
    groups?: Array<{ id: string; name: string; color: string }>;
    perspectiveRoles?: Array<{ id: string; name: string; color: string }>;
    indicatorGroupOverrides?: Record<string, string>;
    personas?: Persona[];
    notes?: NoteEntry[];
    onUpdateNotes?: (notes: NoteEntry[]) => void;
    reviewPeriod?: string;
    onChangeReviewPeriod?: (period: string) => void;
    root?: RCANode;
    onAddPersona?: (name: string) => Persona;
}

export const MultiIndicatorView: React.FC<MultiIndicatorViewProps> = ({
    onClose, tocBundles, initialIndicatorId, annotationMap = {},
    onAddAnnotation, onDeleteAnnotation,
    groups = [], perspectiveRoles, personas = [],
    notes = [], onUpdateNotes, reviewPeriod: reviewPeriodProp, onChangeReviewPeriod,
    root, onAddPersona,
}) => {
    const [selectedIds, setSelectedIds] = React.useState<string[]>(
        initialIndicatorId ? [initialIndicatorId] : []
    );
    const [sharedHoverMI, setSharedHoverMI] = React.useState<number | null>(null);
    // pendingClick: indicatorId → month index clicked on chart (to pre-fill annotation form)
    const [pendingClick, setPendingClick] = React.useState<Record<string, number | null>>({});
    // annOpenMap: which indicator annotation panels are open
    const [annOpenMap, setAnnOpenMap] = React.useState<Record<string, boolean>>({});

    // Fallback review period if not provided via props
    const [localPeriod, setLocalPeriod] = React.useState(() => {
        const now = new Date();
        return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
    });
    const reviewPeriod = reviewPeriodProp ?? localPeriod;
    const handleChangePeriod = onChangeReviewPeriod ?? setLocalPeriod;

    // Saved indicator sets (persisted to localStorage)
    const [savedSets, setSavedSets] = React.useState<IndicatorSet[]>(() => {
        try { return JSON.parse(localStorage.getItem(SETS_STORAGE_KEY) ?? "[]"); }
        catch { return []; }
    });
    const [savingSet, setSavingSet] = React.useState(false);
    const [newSetName, setNewSetName] = React.useState("");

    // Resolve color/label for a category using live groups, falling back to CAT_META
    const resolveGroup = (cat: IndicatorCategory) => {
        const g = groups.find(g => g.id === cat);
        return {
            label: g?.name ?? CAT_META[cat].label,
            color: g?.color ?? CAT_META[cat].color,
            bg: g ? `${g.color}18` : CAT_META[cat].bg,
        };
    };

    const toggleId = (id: string) =>
        setSelectedIds(prev =>
            prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
        );

    // Deployment lookup
    const deploymentMap = React.useMemo(() => {
        const map: Record<string, number> = {};
        if (!tocBundles) return map;
        Object.values(tocBundles).forEach(bundle => {
            if (!bundle.deploymentStart) return;
            const parts = bundle.deploymentStart.split("-");
            if (parts.length < 2) return;
            const mi = parseInt(parts[1], 10) - 1;
            if (isNaN(mi)) return;
            (bundle.outcomes || []).forEach(o => {
                if (o.linkedIndicatorId) map[o.linkedIndicatorId] = mi;
            });
        });
        return map;
    }, [tocBundles]);

    const CATS: IndicatorCategory[] = ["intent", "access", "readiness", "service", "outcome"];

    return (
        <div style={{
            position: "fixed", inset: 0, zIndex: 300,
            background: "#fff", display: "flex", flexDirection: "column",
        }}>
            {/* Header */}
            <div style={{
                flexShrink: 0, padding: "12px 20px",
                borderBottom: "1px solid #e2e8f0",
                display: "flex", alignItems: "center", gap: 12,
            }}>
                <div style={{ fontSize: 14, fontWeight: 700, color: "#1e293b", flex: 1 }}>
                    Multi-Indicator View
                </div>
                <div style={{ fontSize: 11, color: "#94a3b8" }}>
                    Select indicators to compare trends
                </div>
                <button
                    onClick={onClose}
                    style={{
                        width: 28, height: 28, border: "1px solid #e2e8f0",
                        borderRadius: 6, background: "#f8fafc", cursor: "pointer",
                        display: "flex", alignItems: "center", justifyContent: "center",
                        fontSize: 14, color: "#475569", fontWeight: 700,
                    }}
                >×</button>
            </div>

            {/* Body: selector + charts */}
            <div style={{ flex: 1, display: "flex", minHeight: 0, overflow: "hidden" }}>
                {/* Left: indicator selector */}
                <div style={{
                    width: 200, flexShrink: 0,
                    borderRight: "1px solid #e2e8f0",
                    overflowY: "auto", padding: "10px 8px",
                }}>
                    {/* Select / clear all */}
                    <div style={{ display: "flex", gap: 4, marginBottom: 8 }}>
                        <button
                            onClick={() => setSelectedIds(INDICATORS.map(i => i.id))}
                            style={{
                                flex: 1, fontSize: 10, padding: "4px 6px",
                                borderRadius: 5, border: "1px solid #e2e8f0", background: "#f8fafc",
                                color: "#475569", cursor: "pointer", fontWeight: 600,
                            }}
                        >Select all</button>
                        <button
                            onClick={() => setSelectedIds([])}
                            style={{
                                flex: 1, fontSize: 10, padding: "4px 6px",
                                borderRadius: 5, border: "1px solid #e2e8f0", background: "#f8fafc",
                                color: "#94a3b8", cursor: "pointer", fontWeight: 600,
                            }}
                        >Clear</button>
                    </div>

                    {/* Saved sets */}
                    <div style={{ marginBottom: 10, paddingBottom: 10, borderBottom: "1px solid #f1f5f9" }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 4, marginBottom: 4 }}>
                            <span style={{ fontSize: 9, fontWeight: 700, color: "#94a3b8", textTransform: "uppercase", letterSpacing: "0.06em", flex: 1 }}>Saved sets</span>
                            {savingSet ? (
                                <input
                                    autoFocus
                                    value={newSetName}
                                    onChange={e => setNewSetName(e.target.value)}
                                    onKeyDown={e => {
                                        if (e.key === "Enter" && newSetName.trim()) {
                                            const next = [...savedSets, { name: newSetName.trim(), ids: [...selectedIds] }];
                                            setSavedSets(next);
                                            localStorage.setItem(SETS_STORAGE_KEY, JSON.stringify(next));
                                            setNewSetName("");
                                            setSavingSet(false);
                                        }
                                        if (e.key === "Escape") { setSavingSet(false); setNewSetName(""); }
                                    }}
                                    onBlur={() => { setSavingSet(false); setNewSetName(""); }}
                                    placeholder="Set name…"
                                    style={{
                                        fontSize: 10, border: "1px solid #cbd5e1", borderRadius: 4,
                                        padding: "2px 6px", outline: "none", flex: 1,
                                        fontFamily: "inherit",
                                    }}
                                />
                            ) : (
                                <button
                                    onClick={() => setSavingSet(true)}
                                    disabled={selectedIds.length === 0}
                                    title={selectedIds.length === 0 ? "Select indicators first" : "Save current selection as a set"}
                                    style={{
                                        fontSize: 9, padding: "1px 7px", borderRadius: 4,
                                        border: "1px solid #e2e8f0", background: "#f8fafc",
                                        color: "#475569", cursor: selectedIds.length === 0 ? "not-allowed" : "pointer",
                                        fontWeight: 600, opacity: selectedIds.length === 0 ? 0.45 : 1,
                                    }}
                                >Save set</button>
                            )}
                        </div>
                        {savedSets.length === 0 ? (
                            <div style={{ fontSize: 9, color: "#cbd5e1", fontStyle: "italic" }}>No saved sets yet</div>
                        ) : (
                            <div style={{ display: "flex", flexDirection: "column", gap: 3 }}>
                                {savedSets.map((set, i) => (
                                    <div key={i} style={{ display: "flex", alignItems: "center", gap: 4 }}>
                                        <button
                                            onClick={() => setSelectedIds(set.ids)}
                                            style={{
                                                flex: 1, textAlign: "left", background: "none", border: "none",
                                                cursor: "pointer", fontSize: 10, color: "#334155",
                                                fontWeight: 600, padding: "2px 0", overflow: "hidden",
                                                textOverflow: "ellipsis", whiteSpace: "nowrap",
                                            }}
                                        >{set.name}</button>
                                        <span style={{ fontSize: 9, color: "#94a3b8" }}>{set.ids.length}</span>
                                        <button
                                            onClick={() => {
                                                const next = savedSets.filter((_, j) => j !== i);
                                                setSavedSets(next);
                                                localStorage.setItem(SETS_STORAGE_KEY, JSON.stringify(next));
                                            }}
                                            style={{ background: "none", border: "none", cursor: "pointer", color: "#cbd5e1", fontSize: 13, lineHeight: 1, padding: 0 }}
                                        >×</button>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                    {CATS.map(cat => {
                        const tab = resolveGroup(cat);
                        const catInds = INDICATORS.filter(ind => ind.category === cat);
                        const allCatSelected = catInds.every(i => selectedIds.includes(i.id));
                        return (
                            <div key={cat} style={{ marginBottom: 10 }}>
                                <div style={{
                                    display: "flex", alignItems: "center", gap: 4,
                                    marginBottom: 3, paddingLeft: 2,
                                }}>
                                    <span style={{
                                        fontSize: 9, fontWeight: 700, color: tab.color,
                                        textTransform: "uppercase", letterSpacing: "0.06em",
                                        flex: 1,
                                    }}>{tab.label}</span>
                                    <button
                                        onClick={() => {
                                            const catIds = catInds.map(i => i.id);
                                            if (allCatSelected) {
                                                setSelectedIds(prev => prev.filter(id => !catIds.includes(id)));
                                            } else {
                                                setSelectedIds(prev => [...new Set([...prev, ...catIds])]);
                                            }
                                        }}
                                        style={{
                                            fontSize: 8, padding: "1px 6px", borderRadius: 4,
                                            border: `1px solid ${tab.color}40`,
                                            background: allCatSelected ? tab.color : `${tab.color}18`,
                                            color: allCatSelected ? "white" : tab.color,
                                            cursor: "pointer", fontWeight: 600, flexShrink: 0,
                                        }}
                                    >{allCatSelected ? "Deselect" : "All"}</button>
                                </div>
                                {catInds.map(ind => {
                                    const { ucl, lcl } = computeSPC(ind.values);
                                    const ooc = ind.values.some(v => v > ucl || v < lcl);
                                    const checked = selectedIds.includes(ind.id);
                                    return (
                                        <label key={ind.id} style={{
                                            display: "flex", alignItems: "center", gap: 6,
                                            padding: "3px 6px", borderRadius: 5, cursor: "pointer",
                                            background: checked ? tab.bg : "transparent",
                                            border: `1px solid ${checked ? tab.color + "40" : "transparent"}`,
                                            marginBottom: 2,
                                        }}>
                                            <input
                                                type="checkbox"
                                                checked={checked}
                                                onChange={() => toggleId(ind.id)}
                                                style={{ flexShrink: 0, accentColor: tab.color }}
                                            />
                                            <span style={{
                                                fontSize: 10, color: "#1e293b", lineHeight: 1.3,
                                                flex: 1,
                                            }}>{ind.name}</span>
                                            {ooc && (
                                                <span style={{
                                                    width: 6, height: 6, borderRadius: "50%",
                                                    background: "#ef4444", flexShrink: 0,
                                                }} />
                                            )}
                                        </label>
                                    );
                                })}
                            </div>
                        );
                    })}
                </div>

                {/* Centre: stacked charts */}
                <div style={{ flex: 1, overflowY: "auto", padding: "12px 16px", minWidth: 0 }}>
                    {selectedIds.length === 0 ? (
                        <div style={{
                            height: "100%", display: "flex", alignItems: "center", justifyContent: "center",
                            color: "#94a3b8", fontSize: 13, flexDirection: "column", gap: 8,
                        }}>
                            <div style={{ fontSize: 24 }}>☰</div>
                            <div>Select indicators on the left to compare their trends</div>
                        </div>
                    ) : (
                        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                            {selectedIds.map((id, colorIdx) => {
                                const ind = INDICATORS.find(i => i.id === id);
                                if (!ind) return null;
                                const color = MV_CHART_COLORS[colorIdx % MV_CHART_COLORS.length];
                                const tab = resolveGroup(ind.category);
                                const lastVal = ind.values[ind.values.length - 1];
                                const prev = ind.values[ind.values.length - 2];
                                const delta = lastVal - prev;
                                const improving = ind.direction === "up" ? delta > 0 : delta < 0;
                                const arrow = Math.abs(delta) < 0.5 ? "→" : delta > 0 ? "↑" : "↓";
                                const arrowColor = Math.abs(delta) < 0.5 ? "#94a3b8" : improving ? "#16a34a" : "#dc2626";

                                const annOpen = annOpenMap[id] ?? false;
                                const annCount = (annotationMap[id] ?? []).length;
                                return (
                                    <div key={id} style={{
                                        border: "1px solid #e2e8f0", borderRadius: 7,
                                        borderLeft: `3px solid ${color}`,
                                        display: "flex", overflow: "hidden",
                                    }}>
                                        {/* Chart column */}
                                        <div style={{ flex: 1, minWidth: 0, padding: "7px 10px 6px" }}>
                                            <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 4, flexWrap: "wrap" }}>
                                                <span style={{ fontSize: 12, fontWeight: 600, color: "#1e293b" }}>{ind.name}</span>
                                                <span style={{
                                                    fontSize: 8, fontWeight: 600,
                                                    color: tab.color, background: tab.bg,
                                                    border: `1px solid ${tab.color}30`,
                                                    borderRadius: 999, padding: "1px 5px", flexShrink: 0,
                                                }}>{tab.label}</span>
                                                <span style={{ fontSize: 13, fontWeight: 700, color: "#0f172a", marginLeft: 2 }}>
                                                    {lastVal}{ind.unit !== "min" && "%"}
                                                    {ind.unit === "min" && <span style={{ fontSize: 10, color: "#64748b", marginLeft: 2 }}>min</span>}
                                                </span>
                                                <span style={{ fontSize: 13, color: arrowColor, fontWeight: 700 }}>{arrow}</span>
                                            </div>
                                            <MiniTrendChart
                                                values={ind.values}
                                                periodLabels={ind.periodLabels}
                                                color={color}
                                                deploymentMonthIndex={deploymentMap[id]}
                                                width={annOpen ? 300 : 430}
                                                annotations={annotationMap[id] ?? []}
                                                hoverMI={sharedHoverMI}
                                                onHoverChange={setSharedHoverMI}
                                                onMonthClick={onAddAnnotation ? mi => {
                                                    setPendingClick(prev => ({ ...prev, [id]: mi }));
                                                    setAnnOpenMap(prev => ({ ...prev, [id]: true }));
                                                } : undefined}
                                            />
                                        </div>

                                        {/* Annotation strip / panel */}
                                        {onAddAnnotation && (annOpen ? (
                                            <div style={{
                                                width: 210, flexShrink: 0,
                                                borderLeft: "1px solid #e2e8f0",
                                                display: "flex", flexDirection: "column", overflow: "hidden",
                                            }}>
                                                {/* Panel header */}
                                                <div style={{
                                                    display: "flex", alignItems: "center",
                                                    padding: "6px 8px", borderBottom: "1px solid #f1f5f9",
                                                    flexShrink: 0,
                                                }}>
                                                    <span style={{ fontSize: 10, fontWeight: 600, color: "#475569", flex: 1 }}>Annotations</span>
                                                    <button
                                                        onClick={() => setAnnOpenMap(prev => ({ ...prev, [id]: false }))}
                                                        style={{ background: "none", border: "none", cursor: "pointer", color: "#cbd5e1", fontSize: 14, lineHeight: 1, padding: "0 2px" }}
                                                    >×</button>
                                                </div>
                                                {/* Scrollable body */}
                                                <div style={{ flex: 1, overflowY: "auto", padding: "6px 8px" }}>
                                                    <AnnotationsSection
                                                        annotations={annotationMap[id] ?? []}
                                                        periodLabels={ind.periodLabels}
                                                        onAdd={ann => onAddAnnotation(id, ann)}
                                                        onDelete={annId => onDeleteAnnotation?.(id, annId)}
                                                        pendingStartIndex={pendingClick[id] ?? null}
                                                        noHeader
                                                    />
                                                </div>
                                            </div>
                                        ) : (
                                            /* Collapsed strip */
                                            <button
                                                onClick={() => setAnnOpenMap(prev => ({ ...prev, [id]: true }))}
                                                title="Annotations"
                                                style={{
                                                    width: 28, flexShrink: 0, padding: 0,
                                                    background: "transparent", border: "none",
                                                    borderLeft: "1px solid #f1f5f9", cursor: "pointer",
                                                    display: "flex", flexDirection: "column",
                                                    alignItems: "center", justifyContent: "center", gap: 3,
                                                }}
                                            >
                                                <span style={{ fontSize: 12, color: annCount > 0 ? color : "#cbd5e1" }}>✎</span>
                                                {annCount > 0 && (
                                                    <span style={{
                                                        fontSize: 8, fontWeight: 700, lineHeight: 1.3,
                                                        padding: "0 3px", borderRadius: 999,
                                                        background: color, color: "white",
                                                        minWidth: 12, textAlign: "center",
                                                    }}>{annCount}</span>
                                                )}
                                            </button>
                                        ))}
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>

                {/* Right: unified note log */}
                <div style={{
                    width: 380, flexShrink: 0,
                    borderLeft: "1px solid #e2e8f0",
                    display: "flex", flexDirection: "column",
                    overflow: "hidden",
                }}>
                    {root ? (
                        <NoteLog
                            notes={notes}
                            onUpdate={onUpdateNotes ?? (() => {})}
                            reviewPeriod={reviewPeriod}
                            onChangeReviewPeriod={handleChangePeriod}
                            root={root}
                            personas={personas}
                            onAddPersona={onAddPersona}
                            perspectiveRoles={perspectiveRoles}
                        />
                    ) : (
                        <div style={{ padding: 16, color: "#94a3b8", fontSize: 12, fontStyle: "italic" }}>
                            Log not available.
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

/* -------------------------------------------------------
   Props
------------------------------------------------------- */

interface Props {
    indicatorId: string | null;
    tocBundles?: Record<string, TocBundle>;
    onClose: () => void;
    annotations: Annotation[];
    onAddAnnotation: (ann: Omit<Annotation, "id">) => void;
    onDeleteAnnotation: (annId: string) => void;
    onExpand: () => void;
}

/* -------------------------------------------------------
   Main panel
------------------------------------------------------- */

export const IndicatorDetailPanel: React.FC<Props> = ({
    indicatorId, tocBundles, onClose,
    annotations, onAddAnnotation, onDeleteAnnotation, onExpand,
}) => {
    const isOpen = indicatorId !== null;
    const indicator = indicatorId ? INDICATORS.find(ind => ind.id === indicatorId) ?? null : null;

    const [chartView, setChartView] = React.useState<"individuals" | "xbars" | "groups">("individuals");
    const [pendingStartIndex, setPendingStartIndex] = React.useState<number | null>(null);

    // Reset pending click when switching indicators
    React.useEffect(() => { setPendingStartIndex(null); }, [indicatorId]);

    // Linked bundle
    const linkedBundle = React.useMemo<TocBundle | null>(() => {
        if (!tocBundles || !indicatorId) return null;
        for (const bundle of Object.values(tocBundles)) {
            if (!bundle.deploymentStart) continue;
            if ((bundle.outcomes || []).some(o => o.linkedIndicatorId === indicatorId)) return bundle;
        }
        return null;
    }, [tocBundles, indicatorId]);

    const deploymentMonthIndex = React.useMemo<number | undefined>(() => {
        if (!linkedBundle?.deploymentStart) return undefined;
        const parts = linkedBundle.deploymentStart.split("-");
        if (parts.length < 2) return undefined;
        const m = parseInt(parts[1], 10) - 1;
        return isNaN(m) ? undefined : m;
    }, [linkedBundle]);

    const deploymentEndMonthIndex = React.useMemo<number | undefined>(() => {
        if (!linkedBundle?.deploymentEnd) return undefined;
        const parts = linkedBundle.deploymentEnd.split("-");
        if (parts.length < 2) return undefined;
        const m = parseInt(parts[1], 10) - 1;
        return isNaN(m) ? undefined : m;
    }, [linkedBundle]);

    const deploymentLabel = linkedBundle?.deploymentStart
        ? formatDeploymentPeriod(linkedBundle.deploymentStart, linkedBundle.deploymentEnd)
        : undefined;

    const spc = indicator ? computeSPC(indicator.values) : null;
    const diagnostics = React.useMemo<SPCDiagnostics | null>(() => {
        if (!indicator || !spc) return null;
        return runDiagnostics(indicator.values, spc.mean, spc.ucl, spc.lcl, deploymentMonthIndex);
    }, [indicator, spc, deploymentMonthIndex]);

    const meta = indicator ? CAT_META[indicator.category] : null;

    return (
        <>
            {/* Detail panel */}
            <div style={{
                position: "fixed", top: 0, right: 0,
                width: 500, height: "100vh",
                background: "#ffffff",
                boxShadow: "-4px 0 24px rgba(15,23,42,0.12)",
                zIndex: 200,
                display: "flex", flexDirection: "column",
                transform: isOpen ? "translateX(0)" : "translateX(100%)",
                transition: "transform 260ms cubic-bezier(0.4,0,0.2,1)",
            }}>
                {indicator && meta ? (
                    <>
                        {/* Header */}
                        <div style={{
                            flexShrink: 0, padding: "14px 16px",
                            borderBottom: "1px solid #e2e8f0",
                            display: "flex", alignItems: "center", gap: 10,
                        }}>
                            <div style={{ flex: 1, minWidth: 0 }}>
                                <div style={{ fontSize: 14, fontWeight: 700, color: "#1e293b", marginBottom: 4, lineHeight: 1.3 }}>
                                    {indicator.name}
                                </div>
                                <span style={{
                                    display: "inline-block", fontSize: 10, fontWeight: 600,
                                    color: meta.color, background: meta.bg,
                                    border: `1px solid ${meta.color}30`, borderRadius: 999, padding: "1px 8px",
                                }}>
                                    {meta.label}
                                </span>
                            </div>

                            {/* Expand button */}
                            <button
                                onClick={onExpand}
                                title="Open multi-indicator view"
                                style={{
                                    flexShrink: 0, width: 28, height: 28, border: "1px solid #e2e8f0",
                                    borderRadius: 6, background: "#f8fafc", cursor: "pointer",
                                    display: "flex", alignItems: "center", justifyContent: "center",
                                    fontSize: 13, color: "#475569",
                                }}
                            >
                                ⛶
                            </button>

                            {/* Close button */}
                            <button
                                onClick={onClose}
                                aria-label="Close panel"
                                style={{
                                    flexShrink: 0, width: 28, height: 28, border: "1px solid #e2e8f0",
                                    borderRadius: 6, background: "#f8fafc", cursor: "pointer",
                                    display: "flex", alignItems: "center", justifyContent: "center",
                                    fontSize: 14, color: "#475569", fontWeight: 700, lineHeight: 1,
                                }}
                            >
                                ×
                            </button>
                        </div>

                        {/* Body */}
                        <div style={{ flex: 1, minHeight: 0, overflowY: "auto", padding: "16px 16px 24px" }}>

                            {/* Chart + view toggle */}
                            <div style={{ marginBottom: 16 }}>
                                <div style={{ display: "flex", alignItems: "center", marginBottom: 8, gap: 8 }}>
                                    <div style={{ fontSize: 11, fontWeight: 600, color: "#475569", flex: 1 }}>
                                        {{
                                            individuals: `Individuals — ${indicator.unit}`,
                                            xbars: `X̄ & S (n=${indicator.breakdown.groups.length} ${indicator.breakdown.dimension}s) — ${indicator.unit}`,
                                            groups: `By ${indicator.breakdown.dimension} — ${indicator.unit}`,
                                        }[chartView]}
                                    </div>
                                    <div style={{ display: "flex", gap: 2 }}>
                                        {([
                                            ["individuals", "Indiv."],
                                            ["xbars",       "X̄ & S"],
                                            ["groups",      "Groups"],
                                        ] as const).map(([v, label]) => (
                                            <button key={v} onClick={() => setChartView(v)}
                                                style={{
                                                    fontSize: 10, padding: "3px 7px", borderRadius: 5,
                                                    border: `1px solid ${chartView === v ? "#3b82f6" : "#e2e8f0"}`,
                                                    background: chartView === v ? "#eff6ff" : "#f9fafb",
                                                    color: chartView === v ? "#1d4ed8" : "#64748b",
                                                    fontWeight: chartView === v ? 600 : 400, cursor: "pointer",
                                                }}>
                                                {label}
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                <div style={{ overflowX: "auto" }}>
                                    {chartView === "individuals" ? (
                                        <FullSPCChart
                                            values={indicator.values}
                                            direction={indicator.direction}
                                            periodLabels={indicator.periodLabels}
                                            deploymentMonthIndex={deploymentMonthIndex}
                                            deploymentEndMonthIndex={deploymentEndMonthIndex}
                                            deploymentLabel={deploymentLabel}
                                            annotations={annotations}
                                            onMonthClick={mi => setPendingStartIndex(mi)}
                                        />
                                    ) : chartView === "xbars" ? (
                                        <XbarSChart
                                            groups={indicator.breakdown.groups}
                                            dimension={indicator.breakdown.dimension}
                                            periodLabels={indicator.periodLabels}
                                            deploymentMonthIndex={deploymentMonthIndex}
                                            deploymentEndMonthIndex={deploymentEndMonthIndex}
                                            deploymentLabel={deploymentLabel}
                                            annotations={annotations}
                                            onMonthClick={mi => setPendingStartIndex(mi)}
                                        />
                                    ) : (
                                        <GroupsChart groups={indicator.breakdown.groups} />
                                    )}
                                </div>
                            </div>

                            {/* SPC Diagnostics */}
                            {chartView !== "groups" && diagnostics && (
                                <div style={{ marginBottom: 12 }}>
                                    <DiagnosticCard
                                        diagnostics={diagnostics}
                                        periodLabels={indicator.periodLabels}
                                        deploymentMonthIndex={deploymentMonthIndex}
                                    />
                                </div>
                            )}

                            {/* Annotations */}
                            {chartView !== "groups" && (
                                <AnnotationsSection
                                    annotations={annotations}
                                    periodLabels={indicator.periodLabels}
                                    onAdd={onAddAnnotation}
                                    onDelete={onDeleteAnnotation}
                                    pendingStartIndex={pendingStartIndex}
                                />
                            )}

                            {/* Linked intervention */}
                            {linkedBundle && (
                                <div style={{ marginTop: 16 }}>
                                    <div style={{ fontSize: 11, fontWeight: 600, color: "#475569", marginBottom: 8 }}>
                                        Linked Intervention
                                    </div>
                                    <div style={{
                                        background: "#fffbeb", border: "1px solid #fde68a",
                                        borderRadius: 8, padding: "10px 12px",
                                        display: "flex", alignItems: "center", gap: 10,
                                    }}>
                                        <div style={{ flex: 1, minWidth: 0 }}>
                                            <div style={{ fontSize: 12, fontWeight: 600, color: "#1e293b", marginBottom: 2 }}>
                                                {linkedBundle.name || "Unnamed intervention"}
                                            </div>
                                            {linkedBundle.deploymentStart && (
                                                <div style={{ fontSize: 11, color: "#92400e" }}>
                                                    {formatDeploymentPeriod(linkedBundle.deploymentStart, linkedBundle.deploymentEnd)}
                                                </div>
                                            )}
                                        </div>
                                        <span style={{
                                            fontSize: 10, fontWeight: 600,
                                            background: "#f59e0b", color: "#fff",
                                            borderRadius: 999, padding: "2px 8px", flexShrink: 0,
                                        }}>
                                            ▼ deployed
                                        </span>
                                    </div>
                                </div>
                            )}

                        </div>
                    </>
                ) : (
                    <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", color: "#94a3b8", fontSize: 13 }}>
                        No indicator selected
                    </div>
                )}
            </div>
        </>
    );
};
