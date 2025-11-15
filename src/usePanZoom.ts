// src/usePanZoom.ts
import * as React from "react";

const MIN_SCALE = 0.3;
const MAX_SCALE = 2.5;
const SCALE_STEP = 0.1;

export function usePanZoom() {
    const [pan, setPan] = React.useState({ x: 0, y: 0 });
    const [isPanning, setIsPanning] = React.useState(false);
    const [scale, setScale] = React.useState(1);

    const startRef = React.useRef({
        mouseX: 0,
        mouseY: 0,
        panX: 0,
        panY: 0,
    });

    const onMouseDown = (
        e: React.MouseEvent<SVGSVGElement, MouseEvent>
    ) => {
        if (e.button !== 0) return; // left button only
        setIsPanning(true);
        startRef.current = {
            mouseX: e.clientX,
            mouseY: e.clientY,
            panX: pan.x,
            panY: pan.y,
        };
    };

    const onMouseMove = (
        e: React.MouseEvent<SVGSVGElement, MouseEvent>
    ) => {
        if (!isPanning) return;
        const dx = e.clientX - startRef.current.mouseX;
        const dy = e.clientY - startRef.current.mouseY;
        setPan({
            x: startRef.current.panX + dx,
            y: startRef.current.panY + dy,
        });
    };

    const stopPan = () => setIsPanning(false);

    const onWheel = (e: React.WheelEvent<SVGSVGElement>) => {
        // Enable smooth trackpad pinch + wheel zoom
        e.preventDefault();

        const svg = e.currentTarget as SVGElement;
        const bounds = svg.getBoundingClientRect();

        // Mouse position relative to SVG viewport
        const mouseX = e.clientX - bounds.left;
        const mouseY = e.clientY - bounds.top;

        const oldScale = scale;

        // Trackpads tend to send very small deltas – make that smooth
        let zoomIntensity = SCALE_STEP;
        if (Math.abs(e.deltaY) < 15) {
            zoomIntensity = SCALE_STEP * 0.2;
        }

        const direction = e.deltaY > 0 ? -1 : 1;
        const newScale = Math.min(
            MAX_SCALE,
            Math.max(MIN_SCALE, oldScale + direction * zoomIntensity)
        );

        if (newScale === oldScale) return;

        const scaleFactor = newScale / oldScale;

        // Adjust pan so that zoom centers around the cursor
        setPan((prev) => ({
            x: mouseX - (mouseX - prev.x) * scaleFactor,
            y: mouseY - (mouseY - prev.y) * scaleFactor,
        }));

        setScale(newScale);
    };

    const zoomIn = () =>
        setScale((prev) =>
            Math.min(MAX_SCALE, prev + SCALE_STEP)
        );

    const zoomOut = () =>
        setScale((prev) =>
            Math.max(MIN_SCALE, prev - SCALE_STEP)
        );

    const resetView = () => {
        setPan({ x: 0, y: 0 });
        setScale(1);
    };

    const svgHandlers = {
        onMouseDown,
        onMouseMove,
        onMouseUp: stopPan,
        onMouseLeave: stopPan,
        onWheel,
    };

    return {
        pan,
        scale,
        isPanning,
        svgHandlers,
        zoomIn,
        zoomOut,
        resetView,
    };
}