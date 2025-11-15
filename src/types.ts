// src/types.ts

export type PriorityLevel = "none" | "low" | "medium" | "high";

export interface RCANode {
    id: string;
    label: string;
    children: RCANode[];
}

export interface Diagram {
    id: string;
    title: string;
    root: RCANode;
}

export interface CauseTemplate {
    id: string;
    label: string;
}