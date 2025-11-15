import type { RCANode } from "./types";

export function createNode(label: string): RCANode {
    return {
        id: `node-${Math.random().toString(36).slice(2)}-${Date.now()}`,
        label,
        children: [],
    };
}

export function updateNode(
    root: RCANode,
    nodeId: string,
    updater: (node: RCANode) => RCANode
): RCANode {
    if (root.id === nodeId) return updater(root);

    return {
        ...root,
        children: root.children.map((child) =>
            updateNode(child, nodeId, updater)
        ),
    };
}

export function addChildNode(
    root: RCANode,
    parentId: string,
    label: string
): RCANode {
    return updateNode(root, parentId, (node) => ({
        ...node,
        children: [...node.children, createNode(label)],
    }));
}

export function deleteNode(root: RCANode, nodeId: string): RCANode {
    if (root.id === nodeId) return root;

    return {
        ...root,
        children: root.children
            .filter((c) => c.id !== nodeId)
            .map((c) => deleteNode(c, nodeId)),
    };
}

export function renameNode(
    root: RCANode,
    nodeId: string,
    label: string
): RCANode {
    return updateNode(root, nodeId, (node) => ({
        ...node,
        label,
    }));
}

export function findNode(
    root: RCANode,
    nodeId: string
): RCANode | null {
    if (root.id === nodeId) return root;
    for (const child of root.children) {
        const f = findNode(child, nodeId);
        if (f) return f;
    }
    return null;
}