// src/indicatorData.ts — indicator metadata and SPC data.
// Indicator definitions live in indicators.json — edit that file to add/change indicators.

import indicatorDefsJson from "./indicators.json";

export type IndicatorCategory = "intent" | "access" | "readiness" | "service" | "outcome";

export interface BreakdownGroup {
    id: string;
    name: string;
    values: number[]; // one value per month (same window as Indicator.values)
}

export interface Breakdown {
    dimension: string; // e.g. "facility"
    groups: BreakdownGroup[];
}

export interface Indicator {
    id: string;
    name: string;
    category: IndicatorCategory;
    unit: string;
    direction: "up" | "down"; // "up" = higher is better
    periodLabels: string[];    // one label per data point
    values: number[];
    breakdown: Breakdown;
}

// ---------------------------------------------------------------
// Mock breakdown — 6 facilities with consistent personalities.
// ---------------------------------------------------------------

const _FAC = [
    { id: "f1", name: "Northgate CHC",    off:  5, vol: 0.7, crisisBonus:  8 },
    { id: "f2", name: "Southview HC",     off:  1, vol: 1.0, crisisBonus:  0 },
    { id: "f3", name: "Eastfield Clinic", off: -2, vol: 1.2, crisisBonus: -3 },
    { id: "f4", name: "Westbank HC",      off: -3, vol: 0.9, crisisBonus: -5 },
    { id: "f5", name: "Central HC",       off: -7, vol: 1.6, crisisBonus: -9 },
    { id: "f6", name: "Hilltop Post",     off:  3, vol: 0.8, crisisBonus:  4 },
];

// Deterministic per-facility, per-month noise (rows=facility, cols=month)
const _MN: number[][] = [
    [-0.7,  0.5,  0.9, -0.5,  0.3, -0.4,  0.8, -0.5,  0.2, -0.3,  0.7, -1.0],
    [ 0.4, -0.8,  0.2,  0.7, -0.6,  0.5, -0.3,  0.6, -0.5,  0.4, -0.7,  0.1],
    [-0.5,  0.3, -0.9,  0.4,  0.7, -0.3,  0.6, -0.8,  0.3, -0.5,  0.5, -0.3],
    [ 0.8, -0.3,  0.3, -0.7,  0.4,  0.4, -0.7,  0.3,  0.9, -0.4, -0.8,  0.4],
    [-0.3,  0.9, -0.5,  0.2, -0.5,  0.7, -0.9,  0.2,  0.6, -0.7,  0.3, -0.5],
    [ 0.6, -0.2,  0.7, -0.3,  0.8, -0.6,  0.4, -0.7,  0.8, -0.3,  0.2,  0.6],
];

function mockBreakdown(
    values: number[],
    baseSigma: number,
    crisisMonth?: number,
): Breakdown {
    return {
        dimension: "facility",
        groups: _FAC.map((f, fi) => ({
            id: f.id,
            name: f.name,
            values: values.map((v, mi) => {
                const isCrisis = crisisMonth !== undefined && mi === crisisMonth;
                const extra = isCrisis ? f.crisisBonus : 0;
                const sigma = baseSigma * f.vol * (isCrisis ? 1.4 : 1.0);
                const noise = _MN[fi][mi] * sigma * 0.35;
                return Math.max(0, Math.round((v + f.off + extra + noise) * 10) / 10);
            }),
        })),
    };
}

const _MO = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];

function ind(
    id: string,
    name: string,
    category: IndicatorCategory,
    unit: string,
    direction: "up" | "down",
    values: number[],
    baseSigma: number,
    crisisMonth?: number,
    year = 2025,
): Indicator {
    const periodLabels = values.map((_, i) => `${_MO[i % 12]} ${year}`);
    return { id, name, category, unit, direction, periodLabels, values, breakdown: mockBreakdown(values, baseSigma, crisisMonth) };
}

// ---------------------------------------------------------------
// Load indicators from JSON. Edit indicators.json to add/modify.
// ---------------------------------------------------------------

interface IndicatorDef {
    id: string;
    name: string;
    category: IndicatorCategory;
    unit: string;
    direction: "up" | "down";
    values: number[];
    baseSigma: number;
    crisisMonth?: number;
    year?: number;
}

export const INDICATORS: Indicator[] = (indicatorDefsJson.indicators as IndicatorDef[]).map(def =>
    ind(def.id, def.name, def.category, def.unit, def.direction, def.values, def.baseSigma, def.crisisMonth, def.year)
);

export const CAT_META: Record<IndicatorCategory, { label: string; color: string; bg: string }> = {
    intent:    { label: "Intent",    color: "#7c3aed", bg: "#f5f3ff" },
    access:    { label: "Access",    color: "#0369a1", bg: "#f0f9ff" },
    readiness: { label: "Readiness", color: "#047857", bg: "#f0fdf4" },
    service:   { label: "Service",   color: "#b45309", bg: "#fffbeb" },
    outcome:   { label: "Vaccination", color: "#0f766e", bg: "#f0fdfa" },
};
