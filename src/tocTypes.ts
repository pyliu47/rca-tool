// src/tocTypes.ts

// Priority level (RCA + bundle)
export type PriorityLevel = "none" | "low" | "medium" | "high";

// Optional gender focus tag
export type GenderFocusOption =
    | "none"
    | "women"
    | "men"
    | "adolescents"
    | "caregivers"
    | "people_with_disabilities"
    | "other";

// Input item — used within activities
export interface InputItem {
    id: string;
    label: string;
    notes?: string;
}

// Output item — used within activities
export interface OutputItem {
    id: string;
    label: string;
    notes?: string;
}

// Assumption item — used within activities
export interface AssumptionItem {
    id: string;
    label: string;
    notes?: string;
}

// Indicator item — used within outcomes
export interface IndicatorItem {
    id: string;
    label: string;
    type: "quantitative" | "qualitative";
    sourceIds: string[]; // references to data sources within the bundle
    notes?: string;
}

// Activity item — contains inputs, outputs, and assumptions
export interface ActivityItem {
    id: string;
    label: string;
    description?: string;
    actors: string[]; // multiple actors per activity
    inputIds: string[]; // references to inputs within this activity
    outputIds: string[]; // references to outputs within this activity
    assumptionIds: string[]; // references to assumptions within this activity
    inputs?: InputItem[]; // nested inputs for this activity
    outputs?: OutputItem[]; // nested outputs for this activity
    assumptions?: AssumptionItem[]; // nested assumptions for this activity
    contributingOutcomeIds?: string[]; // outcomes this activity contributes to
}

// Outcome item — can be influenced by multiple activities
export interface OutcomeItem {
    id: string;
    label: string;
    description?: string;
    tier?: number; // optional tier level for grouping
    contributingActivityIds: string[]; // activities that contribute to this outcome
    indicators?: IndicatorItem[]; // nested indicators for this outcome
}

// Theory of Change / Intervention bundle
export interface TocBundle {
    id: string;

    // Basic metadata
    name: string;
    description: string;

    // Which RCA causes are in this bundle
    causeIds: string[];

    // Main logic chain: Activities and Outcomes
    // (Inputs, outputs, and assumptions are now nested within activities)
    activities: ActivityItem[];
    outcomes: OutcomeItem[];

    // Risks & external factors
    risks: string;

    // Gender & equity considerations
    gender: GenderFocusOption;
    genderNotes: string;

    // Responsible actors (for the overall intervention)
    actors: string[];

    // Data sources for measurement (referenced by indicators)
    dataSources: string[];

    // Supporting evidence
    evidence: string[];

    // Bundle-level priority
    priority: PriorityLevel;
}