// src/InterventionLayout.tsx
import React from "react";
import { CausesPane } from "./Intervention_CausesPane.tsx";
import { ToCBuilderPane, type FocalCauseInfo } from "./Intervention_TocBuilderPane.tsx";
import type { RCANode } from "./types";
import type { TocBundle } from "./tocTypes.tsx";

interface Props {
    root: RCANode;
    tocBundles: Record<string, TocBundle>;
    tocOrder: string[];
    reorderTocBundles: (fromIndex: number, toIndex: number) => void;
    activeBundleId: string | null;
    setActiveBundleId: (id: string | null) => void;
    createNewBundle: () => void;
    updateBundle: (id: string, fn: (b: TocBundle) => TocBundle) => void;
}

const InterventionLayout: React.FC<Props> = ({
    root,
    tocBundles,
    tocOrder,
    reorderTocBundles,
    activeBundleId,
    setActiveBundleId,
    createNewBundle,
    updateBundle,
}) => {
    const bundle = activeBundleId ? tocBundles[activeBundleId] : null;

    // Build focalCauses from bundle.causeIds
    const focalCauses: FocalCauseInfo[] = React.useMemo(() => {
        if (!bundle) return [];

        const causes: FocalCauseInfo[] = [];

        bundle.causeIds.forEach((causeId) => {
            // Find the cause in the RCA tree
            for (const category of root.children) {
                const cause = category.children.find((c) => c.id === causeId);
                if (cause) {
                    causes.push({
                        id: cause.id,
                        categoryLabel: category.label,
                        causeLabel: cause.label,
                        underlyingCauses: cause.children?.map((c) => c.label) || [],
                    });
                    return; // Move to next causeId
                }
            }
        });

        return causes;
    }, [bundle, root]);

    return (
        <div className="intervention-main">
            {/* LEFT SIDEBAR */}
            <div className="intervention-sidebar">
                <CausesPane
                    root={root}
                    tocBundles={tocBundles}
                    tocOrder={tocOrder}
                    reorderTocBundles={reorderTocBundles}
                    activeBundleId={activeBundleId}
                    setActiveBundleId={setActiveBundleId}
                    createNewBundle={createNewBundle}
                    updateBundle={updateBundle}
                />
            </div>

            {/* RIGHT WORKSPACE */}
            <div className="intervention-workspace">
                {bundle ? (
                    <ToCBuilderPane
                        bundle={bundle}
                        focalCauses={focalCauses}
                        onUpdateBundle={(updatedBundle) => updateBundle(bundle.id, () => updatedBundle)}
                    />
                ) : (
                    <div className="no-bundle-selected">
                        <h2>Create or select an intervention to begin</h2>
                    </div>
                )}
            </div>
        </div>
    );
};

export default InterventionLayout;