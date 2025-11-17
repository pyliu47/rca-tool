// src/SortablePill.tsx
import React from "react";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

interface SortablePillProps {
    id: string;
    children: React.ReactNode;
}

export const SortablePill: React.FC<SortablePillProps> = ({ id, children }) => {
    const { attributes, listeners, setNodeRef, transform, isDragging } =
        useSortable({ id });

    // Disable the default animated transition so items jump directly into place
    // after a drag instead of animating between positions. We still apply the
    // transform while dragging to move the dragged node.
    const style: React.CSSProperties = {
        transform: transform ? CSS.Transform.toString(transform) : undefined,
        transition: "none",
    };

    // Wrap listeners so that interactions with inputs/textareas/contenteditable
    // elements inside the pill won't start a drag (prevents interfering with
    // text selection and input focus). We check the event target and skip
    // invoking the original listener when it originated from an editable field.
    const filteredListeners: Record<string, any> = {};
    if (listeners) {
        Object.entries(listeners).forEach(([key, handler]) => {
            filteredListeners[key] = (e: any) => {
                try {
                    const target = e && (e.target || e.nativeEvent?.target);
                    const el = target && (target.closest ? target : (target instanceof Element ? target : null));
                    if (el) {
                        // If the event originated inside an input/textarea, an
                        // element marked contenteditable, or inside a card title
                        // (we want clicks on the title to open the editor), ignore
                        // the drag listener.
                        if (
                            (el as Element).closest &&
                            (el as Element).closest('input, textarea, [contenteditable="true"], .card-title')
                        ) {
                            return;
                        }
                    }
                } catch (err) {
                    // ignore and fall through to call handler
                }
                return handler && handler(e);
            };
        });
    }

    const className = isDragging ? "pill-dragging" : undefined;

    return (
        <div
            ref={setNodeRef}
            style={style}
            className={className}
            {...attributes}
            {...filteredListeners}
        >
            {children}
        </div>
    );
};