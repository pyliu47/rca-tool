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

// Activity item — now supports multiple actors as chips
export interface ActivityItem {
    id: string;
    label: string;
    actors: string[]; // multiple actors per activity
}

// Theory of Change / Intervention bundle
export interface TocBundle {
    id: string;

    // Basic metadata
    name: string;
    description: string;

    // Which RCA causes are in this bundle
    causeIds: string[];

    // Logic chain
    inputs: string[];
    activities: ActivityItem[];
    outputs: string[];
    outcomes: string[];

    // Assumptions as pill lists (per column)
    assumptions: {
        inputs: string[];
        activities: string[];
        outputs: string[];
        outcomes: string[];
    };

    // Risks & external factors
    risks: string;

    // Gender & equity considerations
    gender: GenderFocusOption;
    genderNotes: string;

    // Responsible actors (for the overall intervention)
    actors: string[];

    // Supporting evidence
    evidence: string[];

    // Bundle-level priority
    priority: PriorityLevel;
}