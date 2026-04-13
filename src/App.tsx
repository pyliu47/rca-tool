// src/App.tsx
import React from "react";
import type { Diagram, RCANode, PriorityLevel, Persona, FishboneGroup, PerspectiveRole, NoteEntry, ActionItem, PriorityChange, InterventionReview } from "./types";
import {
  createNode,
  addChildNode,
  deleteNode,
  renameNode,
  findNode,
} from "./utils";
import settingsJson from "./settings.json";

import { FishboneView } from "./FishboneView";
import { RCATreeView } from "./RCATreeView";
import { NotesPane } from "./NotesPane";
import { SettingsPanel } from "./SettingsPanel";
import InterventionLayout from "./InterventionLayout";
import { ReviewTab } from "./ReviewTab";

import type { TocBundle } from "./tocTypes";

/* ---------------------------------------------------
   0. Color Palette for Personas (12 colors)
----------------------------------------------------*/

const PERSONA_COLORS = [
  "#fce7f3", "#dbeafe", "#dcfce7", "#fef3c7",
  "#e9d5ff", "#fed7aa", "#cffafe", "#f5d4d4",
  "#dbeafe", "#fce7f3", "#d1fae5", "#fef08a",
];

/* ---------------------------------------------------
   2. Fixed node IDs (so historical data can reference them)
----------------------------------------------------*/

const NODE_COLD_CHAIN  = "node-cold-chain";
const NODE_EQUIP       = "node-equip-failure";
const NODE_POWER       = "node-power-supply";
const NODE_STAFF       = "node-staff-capacity";
const NODE_MONITORING  = "node-monitoring";

/* ---------------------------------------------------
   2. Initial Diagram Setup
----------------------------------------------------*/

const createInitialDiagram = (): Diagram => ({
  id: "diag-1",
  title: "Immunization",
  personas: settingsJson.personas,
  groups: settingsJson.groups,
  root: {
    id: "root",
    label: "Vaccine Delivery",
    children: [
      // ── Intent ──────────────────────────────────────
      {
        ...createNode("Knowledge & Awareness"),
        groupId: "intent",
        children: [
          createNode("Awareness of vaccination schedules"),
          createNode("Knowledge of vaccine benefits"),
          createNode("Exposure to health information"),
        ],
      },
      {
        ...createNode("Acceptance"),
        groupId: "intent",
        children: [
          createNode("Confidence in vaccine safety"),
          createNode("Trust in health services"),
          createNode("Social norms around vaccination"),
        ],
      },
      // ── Access ──────────────────────────────────────
      {
        ...createNode("Access & Agency"),
        groupId: "access",
        children: [
          createNode("Distance to facility"),
          createNode("Financial barriers"),
          createNode("Caregiver decision-making autonomy"),
        ],
      },
      // ── Service ─────────────────────────────────────
      {
        ...createNode("Accommodation"),
        groupId: "service",
        children: [
          createNode("Facility opening hours"),
          createNode("Waiting time at clinic"),
          createNode("Staff attitude toward caregivers"),
        ],
      },
      {
        ...createNode("Quality"),
        groupId: "service",
        children: [
          createNode("Technical quality of vaccination"),
          createNode("Interpersonal quality of care"),
          createNode("Information given at service point"),
        ],
      },
      // ── Readiness ───────────────────────────────────
      {
        ...createNode("Workforce"),
        groupId: "readiness",
        children: [
          createNode("CHW availability and deployment"),
          createNode("Staff training and supervision"),
        ],
      },
      {
        ...createNode("Supply"),
        groupId: "readiness",
        children: [
          {
            id: NODE_COLD_CHAIN, label: "Cold chain functionality", personaIds: [],
            children: [
              {
                id: NODE_EQUIP, label: "Equipment failure", personaIds: [],
                children: [
                  createNode("Refrigerators not maintained"),
                  createNode("No preventive maintenance schedule"),
                  createNode("Spare parts unavailable locally"),
                ],
              },
              {
                id: NODE_POWER, label: "Unreliable power supply", personaIds: [],
                children: [
                  createNode("Frequent grid outages"),
                  createNode("No backup power system"),
                ],
              },
              {
                id: NODE_STAFF, label: "Staff capacity gaps", personaIds: [],
                children: [
                  createNode("Cold chain officer post vacant"),
                  createNode("Staff not trained on cold chain SOPs"),
                ],
              },
              {
                id: NODE_MONITORING, label: "Monitoring & oversight absent", personaIds: [],
                children: [
                  createNode("Temperature logs not kept"),
                  createNode("No supervisory cold chain visits"),
                ],
              },
            ],
          },
          createNode("Stock availability"),
        ],
      },
    ],
  },
});

/* ---------------------------------------------------
   3. Create Empty ToC Bundle
----------------------------------------------------*/

const createEmptyBundle = (id: string): TocBundle => ({
  id,
  name: "",
  description: "",
  causeIds: [],
  activities: [],
  outcomes: [],
  risks: "",
  gender: "none",
  genderNotes: "",
  actors: [],
  dataSources: [],
  evidence: [],
  priority: "none",
});

const createDefaultColdChainBundle = (id: string, coldChainCauseId: string): TocBundle => ({
  id,
  name: "Improve Cold Chain Management",
  description: "A comprehensive intervention to address cold chain stockouts through improved inventory management and equipment maintenance.",
  causeIds: coldChainCauseId ? [coldChainCauseId] : [],
  activities: [
    {
      id: "act-1",
      label: "Conduct cold chain audit and gap analysis",
      description: "Perform comprehensive audit to identify gaps in cold chain operations",
      actors: ["Supply Chain Manager", "Facility In-Charge"],
      inputIds: [],
      outputIds: [],
      assumptionIds: [],
      inputs: [
        { id: "in-1-1", label: "Audit tools and templates", notes: "" },
        { id: "in-1-2", label: "Staff time", notes: "" },
      ],
      outputs: [
        { id: "out-1-1", label: "Audit report with findings", notes: "" },
      ],
      assumptions: [
        { id: "as-1-1", label: "Staff availability to participate in audit" },
      ],
    },
    {
      id: "act-2",
      label: "Implement preventive maintenance schedule",
      description: "Establish and enforce regular maintenance schedule for equipment",
      actors: ["Equipment Technician", "Facility Staff"],
      inputIds: [],
      outputIds: [],
      assumptionIds: [],
      inputs: [
        { id: "in-2-1", label: "Equipment manuals", notes: "" },
        { id: "in-2-2", label: "Maintenance supplies", notes: "" },
      ],
      outputs: [
        { id: "out-2-1", label: "Maintenance schedule and log system", notes: "" },
      ],
      assumptions: [
        { id: "as-2-1", label: "Technicians will consistently follow the maintenance schedule" },
      ],
    },
    {
      id: "act-3",
      label: "Train staff on inventory management",
      description: "Conduct training sessions for facility staff",
      actors: ["Health Officer", "Facility Staff"],
      inputIds: [],
      outputIds: [],
      assumptionIds: [],
      inputs: [
        { id: "in-3-1", label: "Training curriculum", notes: "" },
      ],
      outputs: [
        { id: "out-3-1", label: "Staff trained", notes: "" },
      ],
      assumptions: [
        { id: "as-3-1", label: "Staff will apply training knowledge" },
      ],
    },
  ],
  outcomes: [
    {
      id: "out-1",
      label: "Improved vaccine availability",
      description: "",
      tier: 3,
      contributingActivityIds: ["act-1"],
      linkedIndicatorId: "rdy-3",
      indicators: [
        { id: "ind-1-1", label: "% of facilities with adequate stock", type: "quantitative", sourceIds: ["ds-0", "ds-1"] },
      ],
    },
    {
      id: "out-2",
      label: "Reduced product wastage",
      description: "",
      tier: 3,
      contributingActivityIds: ["act-2"],
      linkedIndicatorId: "rdy-2",
      indicators: [
        { id: "ind-2-1", label: "Vaccine waste reduction rate", type: "quantitative", sourceIds: ["ds-2"] },
      ],
    },
    {
      id: "out-3",
      label: "Staff confidence in cold chain management",
      description: "",
      tier: 2,
      contributingActivityIds: ["act-3"],
      indicators: [
        { id: "ind-3-1", label: "Staff confidence level", type: "qualitative", sourceIds: ["ds-3"] },
      ],
    },
    {
      id: "out-4",
      label: "Increased children fully vaccinated",
      description: "",
      tier: 1,
      contributingActivityIds: ["act-1", "act-2", "act-3"],
      linkedIndicatorId: "out-1",
      indicators: [
        { id: "ind-4-1", label: "N children fully vaccinated", type: "quantitative", sourceIds: ["ds-0"] },
        { id: "ind-4-2", label: "Immunization coverage (%)", type: "quantitative", sourceIds: ["ds-0"] },
      ],
    },
  ],
  risks: "Staff resistance to new systems; Supply chain disruptions; Budget constraints",
  gender: "none",
  genderNotes: "",
  actors: ["Supply Chain Manager", "Facility In-Charge", "Equipment Technician", "Facility Staff", "Health Officer"],
  dataSources: [
    "Facility inventory reports",
    "Monthly facility audits",
    "Facility records",
    "Staff survey responses",
  ],
  evidence: [],
  priority: "high",
  deploymentStart: "2024-09",
});

/* ---------------------------------------------------
   4. Fake historical seed data (Jan – Mar 2026)
----------------------------------------------------*/

const SEED_NOTES: NoteEntry[] = [
  { id: "note-01a", period: "2026-01", text: "CHW reports vaccines arriving warm at 2 of 5 outreach sites this month. Caregivers turned away at one site.", causeIds: [NODE_COLD_CHAIN], personaIds: ["p3"], createdAt: 1735689600000 },
  { id: "note-01b", period: "2026-01", text: "Facility in-charge: no temperature logs kept at Facility B since December. Fridge running ~6°C above target.", causeIds: [NODE_MONITORING, NODE_EQUIP], personaIds: ["p5"], createdAt: 1735776000000 },
  { id: "note-01c", period: "2026-01", text: "Supply chain audit found spare parts unavailable at district level — lead time 6–8 weeks for replacement compressor.", causeIds: [NODE_EQUIP], personaIds: ["p6"], createdAt: 1735862400000 },
  { id: "note-02a", period: "2026-02", text: "Grid outage Feb 8–9 (18 hrs). Fridge temps at Facility A exceeded 8°C. Affected vaccines quarantined pending assessment.", causeIds: [NODE_POWER], personaIds: ["p5"], createdAt: 1738368000000 },
  { id: "note-02b", period: "2026-02", text: "Cold chain officer training rescheduled to March — national trainer unavailable this month.", causeIds: [NODE_STAFF], personaIds: ["p6"], createdAt: 1738454400000 },
  { id: "note-02c", period: "2026-02", text: "Community leader reports caregivers frustrated by two cancelled vaccination sessions due to cold chain issues.", causeIds: [NODE_COLD_CHAIN], personaIds: ["p4"], createdAt: 1738540800000 },
  { id: "note-03a", period: "2026-03", text: "Backup generator installed and tested at Facilities A and B. No temperature excursions recorded in March.", causeIds: [NODE_POWER], personaIds: ["p5"], createdAt: 1740960000000 },
  { id: "note-03b", period: "2026-03", text: "Temperature logs now completed daily at all 3 facilities following supervision visit on Mar 5.", causeIds: [NODE_MONITORING], personaIds: ["p3"], createdAt: 1741046400000 },
  { id: "note-03c", period: "2026-03", text: "CHW reports vaccines arriving cold at 4 of 5 outreach sites — up from 3 in February.", causeIds: [NODE_COLD_CHAIN], personaIds: ["p3"], createdAt: 1741132800000 },
  { id: "note-03d", period: "2026-03", text: "Cold chain officer trained and post now fully staffed. Preventive maintenance schedule piloted at Facility A.", causeIds: [NODE_STAFF], personaIds: ["p6"], createdAt: 1741219200000 },
];

const SEED_PRIORITY_LOG: PriorityChange[] = [
  { id: "pc-01a", nodeId: NODE_COLD_CHAIN, nodeLabel: "Cold chain functionality",    period: "2026-01", from: "none",   to: "high",   timestamp: 1735689600000 },
  { id: "pc-01b", nodeId: NODE_EQUIP,      nodeLabel: "Equipment failure",            period: "2026-01", from: "none",   to: "high",   timestamp: 1735776000000 },
  { id: "pc-01c", nodeId: NODE_MONITORING, nodeLabel: "Monitoring & oversight absent", period: "2026-01", from: "none",   to: "medium", timestamp: 1735862400000 },
  { id: "pc-02a", nodeId: NODE_POWER,      nodeLabel: "Unreliable power supply",      period: "2026-02", from: "none",   to: "high",   timestamp: 1738368000000 },
  { id: "pc-02b", nodeId: NODE_STAFF,      nodeLabel: "Staff capacity gaps",          period: "2026-02", from: "none",   to: "medium", timestamp: 1738454400000 },
  { id: "pc-03a", nodeId: NODE_EQUIP,      nodeLabel: "Equipment failure",            period: "2026-03", from: "high",   to: "medium", timestamp: 1740960000000 },
  { id: "pc-03b", nodeId: NODE_MONITORING, nodeLabel: "Monitoring & oversight absent", period: "2026-03", from: "medium", to: "low",    timestamp: 1741046400000 },
];

const SEED_ACTION_ITEMS: ActionItem[] = [
  { id: "act-01a", text: "Schedule full cold chain equipment audit across all 3 facilities",         owner: "Supply Chain Manager",    period: "2026-01", done: true  },
  { id: "act-01b", text: "Identify and contract local spare parts supplier for cold chain equipment", owner: "Supply Chain Manager",    period: "2026-01", done: false },
  { id: "act-02a", text: "Expedite backup generator procurement — escalate to budget committee",      owner: "Health Facility Manager", period: "2026-02", done: true  },
  { id: "act-02b", text: "Fill vacant cold chain officer post and initiate onboarding",               owner: "Health Facility Manager", period: "2026-02", done: true  },
  { id: "act-03a", text: "Complete preventive maintenance schedule rollout to Facilities B and C",    owner: "Supply Chain Manager",    period: "2026-03", done: false },
  { id: "act-03b", text: "Review temperature log compliance at monthly supervision visit",            owner: "Community Health Worker", period: "2026-03", done: false },
];

const SEED_INTERVENTION_REVIEWS: InterventionReview[] = [
  {
    id: "ir-01", bundleId: "bundle-cold-chain", period: "2026-01", status: "at-risk",
    noteProgress:  "Equipment audit completed across all 3 facilities. Gap analysis report drafted and shared with district office.",
    noteBlocked:   "3 fridges showing persistent temp deviations. Spare parts not available locally — 6–8 week lead time for replacement compressors. Temperature log system not yet established.",
    noteChanges:   "Need to expedite spare parts sourcing. Explore temporary cold boxes as interim backup. Start temperature log rollout in Feb regardless of equipment status.",
  },
  {
    id: "ir-02", bundleId: "bundle-cold-chain", period: "2026-02", status: "blocked",
    noteProgress:  "Cold chain officer candidate identified and onboarding initiated. Budget justification for generator submitted to committee.",
    noteBlocked:   "Generator procurement blocked — budget committee sign-off pushed to Mar 1. Two grid outages caused temp breaches at Facility A. Vaccine wastage assessment ongoing. Officer training rescheduled to March.",
    noteChanges:   "Escalate to District Health Officer to unblock budget. Explore generator rental as interim solution. Prioritise Facility A cold box deployment before next outreach session.",
  },
  {
    id: "ir-03", bundleId: "bundle-cold-chain", period: "2026-03", status: "on-track",
    noteProgress:  "Generator installed and tested at Facilities A and B. Cold chain officer trained and post fully staffed. Preventive maintenance schedule piloted at Facility A. Temperature log compliance restored at all 3 facilities.",
    noteBlocked:   "Maintenance schedule rollout to Facility C still pending — site visit delayed. Local spare parts supplier contract not yet finalised.",
    noteChanges:   "Complete Facility C rollout by mid-April. Finalise spare parts contract. Monitor temperature log compliance at monthly supervision visit.",
  },
];

const SEED_PRIORITY_BY_NODE: Record<string, PriorityLevel> = {
  [NODE_COLD_CHAIN]:  "high",
  [NODE_EQUIP]:       "medium",
  [NODE_POWER]:       "high",
  [NODE_STAFF]:       "medium",
  [NODE_MONITORING]:  "low",
};

/* ---------------------------------------------------
   5. App Component
----------------------------------------------------*/

const App: React.FC = () => {
  // Active tab state
  const [activeTab, setActiveTab] = React.useState<"rca" | "toc" | "review">("rca");

  // Settings
  const [settingsOpen, setSettingsOpen] = React.useState(false);
  const [rcaExpanded, setRcaExpanded] = React.useState(false);
  const [perspectiveRoles, setPerspectiveRoles] = React.useState<PerspectiveRole[]>(settingsJson.perspectiveRoles);
  const [indicatorGroupOverrides, setIndicatorGroupOverrides] = React.useState<Record<string, string>>({});

  const [diagram, setDiagram] = React.useState<Diagram>(createInitialDiagram);

  // node selection (fishbone or RCA tree)
  const [selectedNodeId, setSelectedNodeId] = React.useState<string | null>(
    null
  );

  // which category controls the RCA tree
  const [focusNodeId, setFocusNodeId] = React.useState<string | null>(null);

  // Shared note log (replaces per-node notesByNode)
  const [notes, setNotes] = React.useState<NoteEntry[]>(SEED_NOTES);

  // Active review period (shared across Notes pane + indicator view)
  const [reviewPeriod, setReviewPeriod] = React.useState("2026-04");

  // Priority per nodeId
  const [priorityByNode, setPriorityByNode] = React.useState<Record<string, PriorityLevel>>(SEED_PRIORITY_BY_NODE);

  // Priority change log (for Review tab "What Changed")
  const [priorityLog, setPriorityLog] = React.useState<PriorityChange[]>(SEED_PRIORITY_LOG);

  // Action items (decisions from review meetings)
  const [actionItems, setActionItems] = React.useState<ActionItem[]>(SEED_ACTION_ITEMS);

  // Intervention reviews (per-bundle per-period status + notes)
  const [interventionReviews, setInterventionReviews] = React.useState<InterventionReview[]>(SEED_INTERVENTION_REVIEWS);

  // ToC bundles (intervention design)
  // Initialize with default supply chain intervention
  const defaultColdChainId = "bundle-cold-chain";

  const [tocBundles, setTocBundles] = React.useState<Record<string, TocBundle>>(() => {
    return {
      [defaultColdChainId]: createDefaultColdChainBundle(defaultColdChainId, NODE_COLD_CHAIN),
    };
  });
  const [activeBundleId, setActiveBundleId] = React.useState<string | null>(
    defaultColdChainId
  );
  // Keep an explicit order for the toc bundles so we can reorder them in the UI
  const [tocOrder, setTocOrder] = React.useState<string[]>([defaultColdChainId]);

  /* ---------------------------------------------------
     RCA Helpers
  ----------------------------------------------------*/

  const isCategory = (id: string) => {
    return diagram.root.children.some((child) => child.id === id);
  };

  const isDirectCause = (id: string) => {
    // Check if node is a direct child of any category (first-level cause, not sub-cause)
    return diagram.root.children.some((category) =>
      category.children.some((cause) => cause.id === id)
    );
  };

  const handleSelectNode = (id: string) => {
    setSelectedNodeId(id);
    if (isCategory(id)) {
      setFocusNodeId(id);
    } else if (isDirectCause(id)) {
      // Most proximal causes (direct children of category) become tree root
      setFocusNodeId(id);
    }
    // Sub-causes and deeper: don't change focusNodeId
  };

  const handleSelectNodeInRCATree = (id: string) => {
    setSelectedNodeId(id);
    // Don't change focusNodeId - RCA tree selection is independent
  };

  const updateRoot = (fn: (root: RCANode) => RCANode) => {
    setDiagram((prev) => ({ ...prev, root: fn(prev.root) }));
  };

  /* ---------------------------------------------------
     Diagram Modification (RCA)
  ----------------------------------------------------*/

  const addCategory = () => {
    updateRoot((root) => ({
      ...root,
      children: [...root.children, createNode("New category")],
    }));
  };

  const addCause = (categoryId: string) => {
    updateRoot((root) => addChildNode(root, categoryId, "New cause"));
  };

  const addWhy = (nodeId: string) => {
    updateRoot((root) => addChildNode(root, nodeId, "Why?"));
  };

  const deleteNodeById = (nodeId: string) => {
    updateRoot((root) => deleteNode(root, nodeId));

    if (selectedNodeId === nodeId) setSelectedNodeId(null);
    if (focusNodeId === nodeId) setFocusNodeId(null);

    // Remove priority for deleted node
    setPriorityByNode((prev) => {
      const copy = { ...prev };
      delete copy[nodeId];
      return copy;
    });
  };

  const changeLabel = (id: string, label: string) => {
    updateRoot((root) => renameNode(root, id, label || "Untitled"));
  };

  const reorderCategories = (fromId: string, toId: string) => {
    updateRoot((root) => {
      const fromIdx = root.children.findIndex((cat) => cat.id === fromId);
      const toIdx = root.children.findIndex((cat) => cat.id === toId);
      if (fromIdx === -1 || toIdx === -1) return root;
      const newChildren = [...root.children];
      [newChildren[fromIdx], newChildren[toIdx]] = [newChildren[toIdx], newChildren[fromIdx]];
      return { ...root, children: newChildren };
    });
  };

  const reorderCauses = (categoryId: string, fromId: string, toId: string) => {
    updateRoot((root) => {
      const category = root.children.find((cat) => cat.id === categoryId);
      if (!category) return root;
      const fromIdx = category.children.findIndex((cause) => cause.id === fromId);
      const toIdx = category.children.findIndex((cause) => cause.id === toId);
      if (fromIdx === -1 || toIdx === -1) return root;
      const newCauses = [...category.children];
      [newCauses[fromIdx], newCauses[toIdx]] = [newCauses[toIdx], newCauses[fromIdx]];
      const newChildren = root.children.map((cat) =>
        cat.id === categoryId ? { ...cat, children: newCauses } : cat
      );
      return { ...root, children: newChildren };
    });
  };

  /* ---------------------------------------------------
     Fishbone Groups
  ----------------------------------------------------*/

  const updateGroups = (groups: FishboneGroup[]) => {
    setDiagram((prev) => ({ ...prev, groups }));
  };

  const updateCategoryGroup = (categoryId: string, groupId: string | null) => {
    const patch = (node: RCANode): RCANode => {
      if (node.id === categoryId) return { ...node, groupId: groupId ?? undefined };
      return { ...node, children: node.children.map(patch) };
    };
    setDiagram((prev) => ({ ...prev, root: patch(prev.root) }));
  };

  const handleAddPersona = (name: string): Persona => {
    const colorIndex = (diagram.personas?.length ?? 0) % PERSONA_COLORS.length;
    const newPersona: Persona = { id: `p-${Date.now()}`, name, color: PERSONA_COLORS[colorIndex] };
    setDiagram(prev => ({ ...prev, personas: [...(prev.personas ?? []), newPersona] }));
    return newPersona;
  };

  const logPriorityChange = (nodeId: string, from: PriorityLevel, to: PriorityLevel) => {
    if (from === to) return;
    const nodeLabel = findNode(diagram.root, nodeId)?.label ?? "Unknown";
    setPriorityLog(prev => [...prev, {
      id: `pc-${Date.now()}`,
      nodeId, nodeLabel,
      period: reviewPeriod,
      from, to,
      timestamp: Date.now(),
    }]);
  };

  const handleChangePriority = (level: PriorityLevel) => {
    if (!selectedNodeId) return;
    logPriorityChange(selectedNodeId, priorityByNode[selectedNodeId] ?? "none", level);
    setPriorityByNode((prev) => ({ ...prev, [selectedNodeId]: level }));
  };

  const handleChangePriorityForNode = (nodeId: string, level: PriorityLevel) => {
    logPriorityChange(nodeId, priorityByNode[nodeId] ?? "none", level);
    setPriorityByNode((prev) => ({ ...prev, [nodeId]: level }));
  };

  const currentPriority: PriorityLevel =
    selectedNodeId && priorityByNode[selectedNodeId]
      ? priorityByNode[selectedNodeId]
      : "none";

  /* ---------------------------------------------------
     ToC Bundles (Intervention Design)
  ----------------------------------------------------*/

  const createNewBundle = () => {
    const id = "toc_" + Math.random().toString(36).slice(2, 9);
    const bundle = createEmptyBundle(id);
    setTocBundles((prev) => ({ ...prev, [id]: bundle }));
    setActiveBundleId(id);
    setTocOrder((prev) => [...prev, id]);
  };

  const updateBundle = (id: string, fn: (b: TocBundle) => TocBundle) => {
    setTocBundles((prev) => ({ ...prev, [id]: fn(prev[id]) }));
  };

  const reorderTocBundles = (fromIndex: number, toIndex: number) => {
    setTocOrder((prev) => {
      const next = [...prev];
      const [moved] = next.splice(fromIndex, 1);
      next.splice(toIndex, 0, moved);
      return next;
    });
  };

  /* ---------------------------------------------------
     JSON Import Logic
  ----------------------------------------------------*/

  const handleImportJSON = (file: File) => {
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const json = JSON.parse(event.target?.result as string);

        if (!json.diagram || !json.diagram.root) {
          alert("Invalid JSON: missing diagram.root");
          return;
        }

        setDiagram(json.diagram);
        setNotes(json.notes || []);
        setPriorityByNode(json.priorityByNode || {});
        setTocBundles(json.tocBundles || {});
        setActiveBundleId(json.activeBundleId || null);
        // initialize toc order from imported bundles (preserve order if present)
        setTocOrder(json.tocOrder || Object.keys(json.tocBundles || {}));
        setSelectedNodeId(null);
        setFocusNodeId(null);
      } catch (err) {
        alert("Failed to import JSON: " + err);
      }
    };
    reader.readAsText(file);
  };

  const handleExportJSON = () => {
    const blob = new Blob(
      [
        JSON.stringify(
          {
            diagram,
            notes,
            priorityByNode,
            tocBundles,
            activeBundleId,
          },
          null,
          2
        ),
      ],
      { type: "application/json" }
    );
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${diagram.title}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  /* ---------------------------------------------------
     Rendering
  ----------------------------------------------------*/

  return (
    <div className="app-root">
      {/* HEADER */}
      <header className="app-header">
        <input
          className="title-input"
          value={diagram.title}
          onChange={(e) =>
            setDiagram((prev) => ({ ...prev, title: e.target.value }))
          }
        />

        {/* Hidden input for JSON import */}
        <input
          type="file"
          accept="application/json"
          id="import-json-input"
          style={{ display: "none" }}
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) handleImportJSON(file);
          }}
        />

        <button
          className="secondary-btn"
          onClick={() =>
            document.getElementById("import-json-input")?.click()
          }
        >
          Import JSON
        </button>

        <button className="secondary-btn" onClick={handleExportJSON}>
          Export JSON
        </button>

        <button
          className="secondary-btn"
          onClick={() => setSettingsOpen(true)}
          title="Settings"
          style={{ marginLeft: "auto" }}
        >
          ⚙ Settings
        </button>
      </header>

      {settingsOpen && (
        <SettingsPanel
          groups={diagram.groups || []}
          onUpdateGroups={updateGroups}
          perspectiveRoles={perspectiveRoles}
          onUpdatePerspectiveRoles={setPerspectiveRoles}
          indicatorGroupOverrides={indicatorGroupOverrides}
          onUpdateIndicatorOverride={(indId, groupId) =>
            setIndicatorGroupOverrides(prev => ({ ...prev, [indId]: groupId }))
          }
          onClose={() => setSettingsOpen(false)}
        />
      )}

      {/* TAB STRIP */}
      <div className="tab-strip">
        <span
          className={activeTab === "rca" ? "tab active" : "tab"}
          onClick={() => setActiveTab("rca")}
        >
          Situational Analysis
        </span>
        <span
          className={activeTab === "toc" ? "tab active" : "tab"}
          onClick={() => setActiveTab("toc")}
        >
          Intervention Design
        </span>
        <span
          className={activeTab === "review" ? "tab active" : "tab"}
          onClick={() => setActiveTab("review")}
        >
          Progress Review
        </span>
      </div>

      {/* MAIN LAYOUT */}
      {activeTab === "rca" ? (
        <>
          <main className="app-main">
            {/* Column 1: Journey Map */}
            <FishboneView
              root={diagram.root}
              selectedNodeId={selectedNodeId}
              onSelect={handleSelectNode}
              onAddCategory={addCategory}
              onAddCause={addCause}
              onLabelChange={changeLabel}
              onDelete={deleteNodeById}
              priorityByNode={priorityByNode}
              onReorderCategories={reorderCategories}
              onReorderCauses={reorderCauses}
              personas={diagram.personas || []}
              groups={diagram.groups || []}
              onUpdateGroups={updateGroups}
              onUpdateCategoryGroup={updateCategoryGroup}
            />

            {/* Column 2: RCA Tree */}
            <RCATreeView
              root={diagram.root}
              focusNodeId={focusNodeId}
              selectedNodeId={selectedNodeId}
              onSelect={handleSelectNodeInRCATree}
              onAddChild={addWhy}
              onDelete={deleteNodeById}
              onLabelChange={changeLabel}
              priorityByNode={priorityByNode}
              personas={diagram.personas || []}
              onUpdateNodePersonas={(nodeId, personaIds) => {
                const updateNodePersonas = (node: RCANode): RCANode => {
                  if (node.id === nodeId) {
                    return { ...node, personaIds };
                  }
                  return {
                    ...node,
                    children: node.children.map(updateNodePersonas),
                  };
                };
                setDiagram((prev) => ({
                  ...prev,
                  root: updateNodePersonas(prev.root),
                }));
              }}
              onUpdatePersonas={(personas) => {
                setDiagram((prev) => ({ ...prev, personas }));
              }}
              personaColors={PERSONA_COLORS}
              onExpand={() => setRcaExpanded(true)}
            />

            {/* Column 3: Indicators + Notes Log */}
            <NotesPane
              root={diagram.root}
              selectedNodeId={selectedNodeId}
              notes={notes}
              onUpdateNotes={setNotes}
              reviewPeriod={reviewPeriod}
              onChangeReviewPeriod={setReviewPeriod}
              priority={currentPriority}
              onChangePriority={handleChangePriority}
              personas={diagram.personas || []}
              onAddPersona={handleAddPersona}
              groups={diagram.groups || []}
              perspectiveRoles={perspectiveRoles}
              indicatorGroupOverrides={indicatorGroupOverrides}
              tocBundles={tocBundles}
              onUpdatePersonas={(personas) => {
                setDiagram((prev) => ({
                  ...prev,
                  personas,
                }));
              }}
              onUpdateNodePersonas={(nodeId, personaIds) => {
                const updateNodePersonas = (node: RCANode): RCANode => {
                  if (node.id === nodeId) {
                    return { ...node, personaIds };
                  }
                  return {
                    ...node,
                    children: node.children.map(updateNodePersonas),
                  };
                };
                setDiagram((prev) => ({
                  ...prev,
                  root: updateNodePersonas(prev.root),
                }));
              }}
              personaColors={PERSONA_COLORS}
            />
          </main>

          {/* Expanded RCA Tree modal */}
          {rcaExpanded && (
            <div
              style={{
                position: "fixed", inset: 0, zIndex: 400,
                background: "rgba(15,23,42,0.35)",
                display: "flex", alignItems: "center", justifyContent: "center",
              }}
              onClick={e => { if (e.target === e.currentTarget) setRcaExpanded(false); }}
            >
              <div style={{
                width: "90vw", height: "90vh",
                background: "white", borderRadius: 14,
                boxShadow: "0 20px 60px rgba(0,0,0,0.18)",
                display: "flex", flexDirection: "column", overflow: "hidden",
              }}>
                <RCATreeView
                  root={diagram.root}
                  focusNodeId={focusNodeId}
                  selectedNodeId={selectedNodeId}
                  onSelect={handleSelectNodeInRCATree}
                  onAddChild={addWhy}
                  onDelete={deleteNodeById}
                  onLabelChange={changeLabel}
                  priorityByNode={priorityByNode}
                  personas={diagram.personas || []}
                  onUpdateNodePersonas={(nodeId, personaIds) => {
                    const patch = (node: RCANode): RCANode =>
                      node.id === nodeId ? { ...node, personaIds } : { ...node, children: node.children.map(patch) };
                    setDiagram(prev => ({ ...prev, root: patch(prev.root) }));
                  }}
                  onUpdatePersonas={personas => setDiagram(prev => ({ ...prev, personas }))}
                  personaColors={PERSONA_COLORS}
                  onClose={() => setRcaExpanded(false)}
                />
              </div>
            </div>
          )}

        </>
      ) : activeTab === "toc" ? (
        <InterventionLayout
          root={diagram.root}
          tocBundles={tocBundles}
          tocOrder={tocOrder}
          reorderTocBundles={reorderTocBundles}
          activeBundleId={activeBundleId}
          setActiveBundleId={setActiveBundleId}
          createNewBundle={createNewBundle}
          updateBundle={updateBundle}
          onSelectFocalCause={(causeId) => {
            setActiveTab("rca");
            setSelectedNodeId(causeId);
            setFocusNodeId(causeId);
          }}
        />
      ) : (
        <ReviewTab
          root={diagram.root}
          notes={notes}
          onUpdateNotes={setNotes}
          reviewPeriod={reviewPeriod}
          onChangeReviewPeriod={setReviewPeriod}
          priorityByNode={priorityByNode}
          onChangePriorityForNode={handleChangePriorityForNode}
          priorityLog={priorityLog}
          actionItems={actionItems}
          onUpdateActionItems={setActionItems}
          interventionReviews={interventionReviews}
          onUpdateInterventionReviews={setInterventionReviews}
          tocBundles={tocBundles}
          tocOrder={tocOrder}
          groups={diagram.groups || []}
          indicatorGroupOverrides={indicatorGroupOverrides}
          perspectiveRoles={perspectiveRoles}
          personas={diagram.personas || []}
          onAddPersona={handleAddPersona}
          updateBundle={updateBundle}
          onGoToSA={(nodeId) => {
            setActiveTab("rca");
            if (nodeId) handleSelectNode(nodeId);
          }}
        />
      )}
    </div>
  );
};

export default App;