import React from "react";

interface CardProps {
    title: string;
    editableTitle?: boolean;
    placeholder?: string;
    onTitleChange?: (newTitle: string) => void;
    headerRight?: React.ReactNode;
    className?: string;
    children?: React.ReactNode;
}

const Card: React.FC<CardProps> = ({
    title,
    editableTitle,
    placeholder,
    onTitleChange,
    headerRight,
    className,
    children,
}) => {
    const [editing, setEditing] = React.useState(false);
    const [draft, setDraft] = React.useState(title || "");
    const rootRef = React.useRef<HTMLDivElement | null>(null);
    const inputRef = React.useRef<HTMLInputElement | null>(null);

    React.useEffect(() => {
        setDraft(title || "");
    }, [title]);

    React.useEffect(() => {
        const handleMouseDown = (e: MouseEvent) => {
            if (!editing) return;
            const target = e.target as Node;
            if (rootRef.current && rootRef.current.contains(target)) {
                return; // click inside - ignore
            }
            // click outside - commit and close
            commit();
        };
        document.addEventListener("mousedown", handleMouseDown);
        return () => document.removeEventListener("mousedown", handleMouseDown);
    }, [editing, draft]);

    const startEdit = () => {
        if (!editableTitle) return;
        setEditing(true);
        requestAnimationFrame(() => inputRef.current?.focus());
    };

    const commit = () => {
        if (editing) {
            setEditing(false);
            if (onTitleChange) onTitleChange(draft.trim());
        }
    };

    const cancel = () => {
        setEditing(false);
        setDraft(title || "");
    };

    return (
        <div ref={rootRef} className={`card ${className || ""}`}>
            <div className="card-header">
                <div className={`card-title${!editing && !title ? " placeholder" : ""}`} onClick={startEdit}>
                    {editing ? (
                        <input
                            ref={inputRef}
                            value={draft}
                            onChange={(e) => setDraft(e.target.value)}
                            onKeyDown={(e) => {
                                if (e.key === "Enter") {
                                    e.preventDefault();
                                    commit();
                                } else if (e.key === "Escape") {
                                    e.preventDefault();
                                    cancel();
                                }
                            }}
                        />
                    ) : (
                        <span>{title || placeholder || ""}</span>
                    )}
                </div>
                <div className="card-header-right">{headerRight}</div>
            </div>
            <div className="card-body">{children}</div>
        </div>
    );
};

export default Card;

