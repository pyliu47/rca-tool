// src/types.ts

export type PriorityLevel = "none" | "low" | "medium" | "high";

// PerspectiveRole: a stakeholder lens for the analysis panel
export interface PerspectiveRole {
    id: string;
    name: string;
    color: string;
}

// Persona: represents a stakeholder/perspective in the RCA
export interface Persona {
    id: string;
    name: string;           // e.g., "Community Health Worker"
    description?: string;   // Optional context
    color?: string;         // Hex color for visual distinction
}

// FishboneGroup: a named color grouping assigned to category nodes
export interface FishboneGroup {
    id: string;
    name: string;
    color: string;          // hex color
}

export interface RCANode {
    id: string;
    label: string;
    children: RCANode[];
    personaIds?: string[];  // Which personas this cause reflects
    groupId?: string;       // Which fishbone group this category belongs to
}

export interface Diagram {
    id: string;
    title: string;
    root: RCANode;
    personas?: Persona[];   // All personas for this RCA
    groups?: FishboneGroup[]; // Named color groups for fishbone categories
}

export interface CauseTemplate {
    id: string;
    label: string;
}

export interface NoteEntry {
    id: string;
    period: string;       // "2026-04"
    text: string;
    causeIds: string[];   // RCANode ids
    personaIds: string[]; // Persona ids
    createdAt: number;
}

export interface InterventionReview {
    id: string;
    bundleId: string;
    period: string;
    status: "on-track" | "at-risk" | "blocked" | "paused" | "none";
    noteProgress: string;   // What's progressing?
    noteBlocked: string;    // What's blocked or at risk?
    noteChanges: string;    // What needs to change?
}

export interface ActionItem {
    id: string;
    text: string;
    owner: string;        // Name string (from perspectiveRoles or free text)
    period: string;       // Period when created
    done: boolean;
}

export interface PriorityChange {
    id: string;
    nodeId: string;
    nodeLabel: string;
    period: string;
    from: PriorityLevel;
    to: PriorityLevel;
    timestamp: number;
}