// src/types.ts

export type PriorityLevel = "none" | "low" | "medium" | "high";

// Persona: represents a stakeholder/perspective in the RCA
export interface Persona {
    id: string;
    name: string;           // e.g., "Community Health Worker"
    description?: string;   // Optional context
    color?: string;         // Hex color for visual distinction
}

export interface RCANode {
    id: string;
    label: string;
    children: RCANode[];
    personaIds?: string[];  // Which personas this cause reflects
}

export interface Diagram {
    id: string;
    title: string;
    root: RCANode;
    personas?: Persona[];   // All personas for this RCA
}

export interface CauseTemplate {
    id: string;
    label: string;
}