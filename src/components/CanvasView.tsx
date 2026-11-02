import React, { useRef, useEffect, useState, useCallback } from 'react';
import {
  CanvasItem,
  Point,
  ShapeItem,
  ShapeType,
  StrokeItem,
  TextItem,
  ToolType,
  Viewport
} from '../types/canvas';
import {
  getItemBounds,
  getMultiItemBounds,
  isPointInItem,
  screenToWorld,
  splitStrokeByEraser,
  worldToScreen
} from '../utils/geometry';
import { drawSmoothStroke } from '../utils/smoothing';

interface CanvasViewProps {
  items: CanvasItem[];
  onItemsChange: (newItems: CanvasItem[], recordHistory?: boolean) => void;
  viewport: Viewport;
  onViewportChange: (viewport: Viewport) => void;
  activeTool: ToolType;
  onToolChange: (tool: ToolType) => void;
  selectedShapeType: ShapeType;
  selectedIds: string[];
  onSelectIds: (ids: string[]) => void;
  penColor: string;
  penWidth: number;
  eraserSize: number;
  backgroundColor: string;
  gridStyle: 'none' | 'dots' | 'grid';
  isDarkMode: boolean;
  onEditingTextChange?: (isEditing: boolean) => void;
}

type InteractionMode =
  | 'none'
  | 'drawing'
  | 'erasing'
  | 'panning'
  | 'moving'
  | 'resizing'
  | 'rotating'
  | 'box-selecting';

export const CanvasView: React.FC<CanvasViewProps> = ({
  items,
  onItemsChange,
  viewport,
  onViewportChange,
  activeTool,
  onToolChange,
  selectedShapeType,
  selectedIds,
  onSelectIds,
  penColor,
  penWidth,
  eraserSize,
  backgroundColor,
  gridStyle,
  isDarkMode,
  onEditingTextChange,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // Interaction states with synchronized Refs for zero race-conditions
  const [interactionMode, setInteractionMode] = useState<InteractionMode>('none');
  const interactionModeRef = useRef<InteractionMode>('none');
  const isPointerDownRef = useRef(false);

  const [eraserCursorPos, setEraserCursorPos] = useState<Point | null>(null);

  const [activeStrokePoints, setActiveStrokePoints] = useState<Point[]>([]);
  const activeStrokePointsRef = useRef<Point[]>([]);

  const [selectionBox, setSelectionBox] = useState<{ start: Point; current: Point } | null>(null);

  // Storing items & viewport in refs to avoid stale closures in event listeners
  const itemsRef = useRef<CanvasItem[]>(items);
  itemsRef.current = items;
  const viewportRef = useRef<Viewport>(viewport);
  viewportRef.current = viewport;
  const penColorRef = useRef(penColor);
  penColorRef.current = penColor;
  const penWidthRef = useRef(penWidth);
  penWidthRef.current = penWidth;
  const activeToolRef = useRef(activeTool);
  activeToolRef.current = activeTool;
  const selectedIdsRef = useRef(selectedIds);
  selectedIdsRef.current = selectedIds;

  // Inline text editing state
  const [editingTextId, setEditingTextId] = useState<string | null>(null);
  const [editingTextValue, setEditingTextValue] = useState<string>('');
  const textInputRef = useRef<HTMLTextAreaElement>(null);

  // References for dragging / resizing math
  const dragStartRef = useRef<{
    pointerStart: Point;
    worldStart: Point;
    itemsStartPos: Map<string, { x: number; y: number; width: number; height: number; rotation: number }>;
    handleId?: string;
    center?: Point;
    initialDistance?: number;
    initialViewport?: Viewport;
  }>({
    pointerStart: { x: 0, y: 0 },
    worldStart: { x: 0, y: 0 },
    itemsStartPos: new Map(),
  });

  const isSpacePressedRef = useRef(false);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.code === 'Space' && !['INPUT', 'TEXTAREA'].includes((e.target as HTMLElement).tagName)) {
        isSpacePressedRef.current = true;
      }
    };
    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.code === 'Space') {
        isSpacePressedRef.current = false;
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, []);

  // Notify parent if text is being edited
  useEffect(() => {
    onEditingTextChange?.(editingTextId !== null);
  }, [editingTextId, onEditingTextChange]);

  // Centralized interaction finalizer that can never double-commit or leave stale blue boxes
  const finalizeInteraction = useCallback(() => {
    if (!isPointerDownRef.current && interactionModeRef.current === 'none') {
      return;
    }

    const currentMode = interactionModeRef.current;
    const currentPoints = activeStrokePointsRef.current;
    const currentItems = itemsRef.current;

    if (currentMode === 'drawing' && currentPoints.length > 0) {
      const bounds = getMultiItemBounds([
        {
          id: 'temp',
          type: 'stroke',
          points: currentPoints,
          strokeColor: penColorRef.current,
          strokeWidth: penWidthRef.current,
          x: 0,
          y: 0,
          width: 0,
          height: 0,
          rotation: 0,
          opacity: 1,
        },
      ]);

      const newStroke: StrokeItem = {
        id: 'stroke_' + Math.random().toString(36).substring(2, 9),
        type: 'stroke',
        points: currentPoints,
        strokeColor: penColorRef.current,
        strokeWidth: penWidthRef.current,
        x: bounds?.x || 0,
        y: bounds?.y || 0,
        width: bounds?.width || 0,
        height: bounds?.height || 0,
        rotation: 0,
        opacity: 1,
      };

      onItemsChange([...currentItems, newStroke], true);
    } else if (
      currentMode === 'erasing' ||
      currentMode === 'moving' ||
      currentMode === 'resizing' ||
      currentMode === 'rotating'
    ) {
      onItemsChange(currentItems, true);
    }

    // Completely reset all transient states
    isPointerDownRef.current = false;
    interactionModeRef.current = 'none';
    activeStrokePointsRef.current = [];
    setInteractionMode('none');
    setActiveStrokePoints([]);
    setSelectionBox(null);
  }, [onItemsChange]);

  // Global window pointerup & blur safety listeners
  useEffect(() => {
    const handleGlobalPointerUp = () => {
      finalizeInteraction();
    };

    const handleWindowBlur = () => {
      finalizeInteraction();
    };

    window.addEventListener('pointerup', handleGlobalPointerUp);
    window.addEventListener('pointercancel', handleGlobalPointerUp);
    window.addEventListener('blur', handleWindowBlur);

    return () => {
      window.removeEventListener('pointerup', handleGlobalPointerUp);
      window.removeEventListener('pointercancel', handleGlobalPointerUp);
      window.removeEventListener('blur', handleWindowBlur);
    };
  }, [finalizeInteraction]);

  // Selected items array
  const selectedItems = items.filter((item) => selectedIds.includes(item.id));
  const selectionBounds = getMultiItemBounds(selectedItems);

  // Resize canvas to match screen resolution with devicePixelRatio
  const resizeCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) return;

    const dpr = window.devicePixelRatio || 1;
    const width = container.clientWidth;
    const height = container.clientHeight;

    if (canvas.width !== width * dpr || canvas.height !== height * dpr) {
      canvas.width = width * dpr;
      canvas.height = height * dpr;
      canvas.style.width = `${width}px`;
      canvas.style.height = `${height}px`;
    }
  }, []);

  useEffect(() => {
    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);
    return () => window.removeEventListener('resize', resizeCanvas);
  }, [resizeCanvas]);

  // Main Canvas 2D Render Loop
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    const width = canvas.width / dpr;
    const height = canvas.height / dpr;

    ctx.save();
    ctx.scale(dpr, dpr);
    ctx.clearRect(0, 0, width, height);

    // 1. Draw Clean Pure White Whiteboard Background
    const effectiveBg =
      !backgroundColor || backgroundColor.toLowerCase() === '#0f172a'
        ? '#FFFFFF'
        : backgroundColor;
    ctx.fillStyle = effectiveBg;
    ctx.fillRect(0, 0, width, height);

    // 2. Draw Grid (if enabled)
    if (gridStyle === 'dots') {
      const dotSpacing = 32 * viewport.zoom;
      const dotRadius = Math.max(1, 1.2 * Math.min(2, viewport.zoom));
      const offsetX = ((viewport.x % dotSpacing) + dotSpacing) % dotSpacing;
      const offsetY = ((viewport.y % dotSpacing) + dotSpacing) % dotSpacing;

      ctx.fillStyle = isDarkMode ? 'rgba(255, 255, 255, 0.15)' : 'rgba(0, 0, 0, 0.12)';
      for (let x = offsetX; x < width; x += dotSpacing) {
        for (let y = offsetY; y < height; y += dotSpacing) {
          ctx.beginPath();
          ctx.arc(x, y, dotRadius, 0, Math.PI * 2);
          ctx.fill();
        }
      }
    } else if (gridStyle === 'grid') {
      const gridSpacing = 40 * viewport.zoom;
      const offsetX = ((viewport.x % gridSpacing) + gridSpacing) % gridSpacing;
      const offsetY = ((viewport.y % gridSpacing) + gridSpacing) % gridSpacing;

      ctx.strokeStyle = isDarkMode ? 'rgba(255, 255, 255, 0.07)' : 'rgba(0, 0, 0, 0.06)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      for (let x = offsetX; x < width; x += gridSpacing) {
        ctx.moveTo(x, 0);
        ctx.lineTo(x, height);
      }
      for (let y = offsetY; y < height; y += gridSpacing) {
        ctx.moveTo(0, y);
        ctx.lineTo(width, y);
      }
      ctx.stroke();
    }

    // 3. Render Canvas Items in World Coordinates
    ctx.save();
    ctx.translate(viewport.x, viewport.y);
    ctx.scale(viewport.zoom, viewport.zoom);

    for (const item of items) {
      if (item.id === editingTextId) continue;

      ctx.save();
      if (item.type === 'stroke') {
        drawSmoothStroke(ctx, item.points, item.strokeColor, item.strokeWidth, item.opacity);
      } else if (item.type === 'shape') {
        ctx.globalAlpha = item.opacity;
        const center = {
          x: item.x + item.width / 2,
          y: item.y + item.height / 2,
        };
        if (item.rotation) {
          ctx.translate(center.x, center.y);
          ctx.rotate((item.rotation * Math.PI) / 180);
          ctx.translate(-center.x, -center.y);
        }

        ctx.lineWidth = item.strokeWidth;
        ctx.strokeStyle = item.strokeColor;
        ctx.fillStyle = item.hasFill && item.fillColor ? item.fillColor : 'transparent';

        ctx.beginPath();
        if (item.shapeType === 'rect' || item.shapeType === 'square') {
          const safeW = Math.max(0, item.width);
          const safeH = Math.max(0, item.height);
          const radius = Math.max(0, Math.min(6, Math.min(safeW, safeH) / 8));
          ctx.roundRect(item.x, item.y, safeW, safeH, radius);
        } else if (item.shapeType === 'circle' || item.shapeType === 'ellipse') {
          const rx = Math.max(1, item.width / 2);
          const ry = Math.max(1, item.height / 2);
          ctx.ellipse(item.x + rx, item.y + ry, rx, ry, 0, 0, Math.PI * 2);
        } else if (item.shapeType === 'line') {
          ctx.moveTo(item.x, item.y);
          ctx.lineTo(item.x + item.width, item.y + item.height);
        } else if (item.shapeType === 'arrow' || item.shapeType === 'double-arrow') {
          const fromX = item.x;
          const fromY = item.y;
          const toX = item.x + item.width;
          const toY = item.y + item.height;

          ctx.moveTo(fromX, fromY);
          ctx.lineTo(toX, toY);
          ctx.stroke();

          const angle = Math.atan2(toY - fromY, toX - fromX);
          const headLen = Math.max(12, item.strokeWidth * 3);

          ctx.beginPath();
          ctx.moveTo(toX, toY);
          ctx.lineTo(toX - headLen * Math.cos(angle - Math.PI / 6), toY - headLen * Math.sin(angle - Math.PI / 6));
          ctx.moveTo(toX, toY);
          ctx.lineTo(toX - headLen * Math.cos(angle + Math.PI / 6), toY - headLen * Math.sin(angle + Math.PI / 6));

          if (item.shapeType === 'double-arrow') {
            ctx.moveTo(fromX, fromY);
            ctx.lineTo(fromX + headLen * Math.cos(angle - Math.PI / 6), fromY + headLen * Math.sin(angle - Math.PI / 6));
            ctx.moveTo(fromX, fromY);
            ctx.lineTo(fromX + headLen * Math.cos(angle + Math.PI / 6), fromY + headLen * Math.sin(angle + Math.PI / 6));
          }
        }

        if (item.shapeType !== 'line' && item.shapeType !== 'arrow' && item.shapeType !== 'double-arrow') {
          if (item.hasFill && item.fillColor && item.fillColor !== 'transparent') {
            ctx.fill();
          }
          if (item.strokeWidth > 0) {
            ctx.stroke();
          }
        } else {
          ctx.stroke();
        }
      } else if (item.type === 'text') {
        ctx.globalAlpha = item.opacity;
        const center = {
          x: item.x + item.width / 2,
          y: item.y + item.height / 2,
        };
        if (item.rotation) {
          ctx.translate(center.x, center.y);
          ctx.rotate((item.rotation * Math.PI) / 180);
          ctx.translate(-center.x, -center.y);
        }

        ctx.font = `${item.fontStyle || 'normal'} ${item.fontWeight || 'normal'} ${item.fontSize}px '${item.fontFamily || 'Inter'}', sans-serif`;
        ctx.fillStyle = item.color || (isDarkMode ? '#ffffff' : '#111827');
        ctx.textAlign = item.textAlign || 'left';
        ctx.textBaseline = 'top';

        const lines = item.text.split('\n');
        const lineHeight = item.fontSize * 1.25;

        let alignX = item.x;
        if (item.textAlign === 'center') alignX = item.x + item.width / 2;
        else if (item.textAlign === 'right') alignX = item.x + item.width;

        lines.forEach((line, index) => {
          ctx.fillText(line, alignX, item.y + index * lineHeight);
        });
      }
      ctx.restore();
    }

    // 4. Render Active In-Progress Stroke
    if (activeStrokePoints.length > 0) {
      drawSmoothStroke(ctx, activeStrokePoints, penColor, penWidth, 1);
    }

    ctx.restore(); // Restore world transform

    // 5. Render Selection Box and Handles (Screen Coordinates)
    if (selectionBounds && selectedItems.length > 0 && activeTool === 'select') {
      const screenNW = worldToScreen({ x: selectionBounds.x, y: selectionBounds.y }, viewport);
      const screenSE = worldToScreen(
        { x: selectionBounds.x + selectionBounds.width, y: selectionBounds.y + selectionBounds.height },
        viewport
      );

      const boxX = screenNW.x - 4;
      const boxY = screenNW.y - 4;
      const boxW = screenSE.x - screenNW.x + 8;
      const boxH = screenSE.y - screenNW.y + 8;

      ctx.save();
      ctx.strokeStyle = '#2563EB';
      ctx.lineWidth = 1.5;
      ctx.setLineDash([5, 4]);
      ctx.strokeRect(boxX, boxY, boxW, boxH);
      ctx.setLineDash([]);

      // 8 Handles
      const handleSize = 9;
      const handles = [
        { id: 'nw', x: boxX, y: boxY },
        { id: 'n', x: boxX + boxW / 2, y: boxY },
        { id: 'ne', x: boxX + boxW, y: boxY },
        { id: 'e', x: boxX + boxW, y: boxY + boxH / 2 },
        { id: 'se', x: boxX + boxW, y: boxY + boxH },
        { id: 's', x: boxX + boxW / 2, y: boxY + boxH },
        { id: 'sw', x: boxX, y: boxY + boxH },
        { id: 'w', x: boxX, y: boxY + boxH / 2 },
      ];

      ctx.fillStyle = '#FFFFFF';
      ctx.strokeStyle = '#2563EB';
      ctx.lineWidth = 1.5;

      for (const h of handles) {
        ctx.beginPath();
        ctx.rect(h.x - handleSize / 2, h.y - handleSize / 2, handleSize, handleSize);
        ctx.fill();
        ctx.stroke();
      }

      // Rotate handle on top
      const rotateY = boxY - 24;
      ctx.beginPath();
      ctx.moveTo(boxX + boxW / 2, boxY);
      ctx.lineTo(boxX + boxW / 2, rotateY);
      ctx.stroke();

      ctx.beginPath();
      ctx.arc(boxX + boxW / 2, rotateY, 5, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();

      ctx.restore();
    }

    // 6. Render Selection Rubberband Rectangle - CRITICAL: OUTLINE ONLY, NO BLUE FILL!
    if (selectionBox) {
      const minX = Math.min(selectionBox.start.x, selectionBox.current.x);
      const minY = Math.min(selectionBox.start.y, selectionBox.current.y);
      const w = Math.abs(selectionBox.start.x - selectionBox.current.x);
      const h = Math.abs(selectionBox.start.y - selectionBox.current.y);

      ctx.save();
      ctx.strokeStyle = isDarkMode ? '#60A5FA' : '#2563EB';
      ctx.lineWidth = 1.5;
      ctx.setLineDash([5, 4]);
      // Absolutely NO fillRect here to ensure the board never turns blue!
      ctx.strokeRect(minX, minY, w, h);
      ctx.restore();
    }

    // 7. Render Eraser Cursor Circle
    if (activeTool === 'eraser' && eraserCursorPos) {
      const radiusScreen = (eraserSize / 2) * viewport.zoom;
      ctx.save();
      ctx.strokeStyle = '#EF4444';
      ctx.fillStyle = 'rgba(239, 68, 68, 0.15)';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.arc(eraserCursorPos.x, eraserCursorPos.y, Math.max(4, radiusScreen), 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      ctx.restore();
    }

    ctx.restore();
  }, [
    items,
    viewport,
    activeTool,
    penColor,
    penWidth,
    eraserSize,
    backgroundColor,
    gridStyle,
    isDarkMode,
    activeStrokePoints,
    selectionBox,
    eraserCursorPos,
    selectedItems,
    selectionBounds,
    editingTextId,
  ]);

  // Insert Shape Directly
  const insertShapeAt = useCallback(
    (shapeType: ShapeType, worldCenter: Point) => {
      const baseWidth = shapeType === 'circle' || shapeType === 'square' ? 140 : shapeType === 'line' || shapeType === 'arrow' || shapeType === 'double-arrow' ? 180 : 180;
      const baseHeight = shapeType === 'circle' || shapeType === 'square' ? 140 : shapeType === 'line' || shapeType === 'arrow' || shapeType === 'double-arrow' ? 0 : 120;

      const newShape: ShapeItem = {
        id: 'shape_' + Math.random().toString(36).substring(2, 9),
        type: 'shape',
        shapeType,
        x: worldCenter.x - baseWidth / 2,
        y: worldCenter.y - (baseHeight > 0 ? baseHeight / 2 : 0),
        width: baseWidth,
        height: baseHeight,
        rotation: 0,
        opacity: 1,
        strokeColor: '#2563EB',
        strokeWidth: 3,
        fillColor: 'transparent',
        hasFill: false,
      };

      const updated = [...itemsRef.current, newShape];
      onItemsChange(updated, true);
      onSelectIds([newShape.id]);
      onToolChange('select');
    },
    [onItemsChange, onSelectIds, onToolChange]
  );

  // Insert Text Directly
  const insertTextAt = useCallback(
    (worldPos: Point) => {
      const newText: TextItem = {
        id: 'text_' + Math.random().toString(36).substring(2, 9),
        type: 'text',
        text: 'Texto novo',
        x: worldPos.x,
        y: worldPos.y,
        width: 180,
        height: 48,
        rotation: 0,
        opacity: 1,
        strokeColor: '#000000',
        strokeWidth: 0,
        color: isDarkMode ? '#FFFFFF' : '#111827',
        fontSize: 24,
        fontFamily: 'Plus Jakarta Sans',
        fontWeight: 'normal',
        fontStyle: 'normal',
        textAlign: 'left',
      };

      const updated = [...itemsRef.current, newText];
      onItemsChange(updated, true);
      onSelectIds([newText.id]);
      setEditingTextId(newText.id);
      setEditingTextValue(newText.text);
      onToolChange('select');
    },
    [onItemsChange, onSelectIds, isDarkMode, onToolChange]
  );

  // Finish Text Editing
  const finishTextEditing = useCallback(() => {
    if (!editingTextId) return;

    if (editingTextValue.trim() === '') {
      const updated = itemsRef.current.filter((item) => item.id !== editingTextId);
      onItemsChange(updated, true);
      onSelectIds([]);
    } else {
      const updated = itemsRef.current.map((item) => {
        if (item.id === editingTextId && item.type === 'text') {
          const lines = editingTextValue.split('\n');
          const maxLineLen = Math.max(...lines.map((l) => l.length), 5);
          const estWidth = Math.max(100, maxLineLen * (item.fontSize * 0.65));
          const estHeight = Math.max(36, lines.length * (item.fontSize * 1.3));

          return {
            ...item,
            text: editingTextValue,
            width: Math.round(estWidth),
            height: Math.round(estHeight),
          };
        }
        return item;
      });
      onItemsChange(updated, true);
    }

    setEditingTextId(null);
  }, [editingTextId, editingTextValue, onItemsChange, onSelectIds]);

  // Handle Double Click to edit text
  const handleDoubleClick = (e: React.MouseEvent) => {
    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return;
    const screenPt = { x: e.clientX - rect.left, y: e.clientY - rect.top };
    const worldPt = screenToWorld(screenPt, viewportRef.current);

    const currentItems = itemsRef.current;
    for (let i = currentItems.length - 1; i >= 0; i--) {
      const item = currentItems[i];
      if (item.type === 'text' && isPointInItem(worldPt, item)) {
        setEditingTextId(item.id);
        setEditingTextValue(item.text);
        onSelectIds([item.id]);
        return;
      }
    }
  };

  // Erasing Helper
  const eraseAt = (worldPt: Point) => {
    let hasChanges = false;
    const nextItems: CanvasItem[] = [];

    for (const item of itemsRef.current) {
      if (item.type === 'stroke') {
        const splitResult = splitStrokeByEraser(item, worldPt, eraserSize / 2);
        if (splitResult === null) {
          nextItems.push(item);
        } else {
          hasChanges = true;
          if (splitResult.length > 0) {
            nextItems.push(...splitResult);
          }
        }
      } else {
        nextItems.push(item);
      }
    }

    if (hasChanges) {
      onItemsChange(nextItems, false);
    }
  };

  // Pointer Down Handler
  const handlePointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    // Only respond to main button (left click) or middle button
    if (e.button !== 0 && e.button !== 1) return;

    const canvas = canvasRef.current;
    if (!canvas) return;

    try {
      canvas.setPointerCapture(e.pointerId);
    } catch {
      // Ignore if pointer capture fails
    }

    isPointerDownRef.current = true;

    const rect = canvas.getBoundingClientRect();
    const screenPt = { x: e.clientX - rect.left, y: e.clientY - rect.top };
    const worldPt = screenToWorld(screenPt, viewportRef.current);

    if (editingTextId) {
      finishTextEditing();
    }

    // TOOL: HAND or SPACEBAR or MIDDLE CLICK
    if (activeTool === 'hand' || e.button === 1 || isSpacePressedRef.current) {
      interactionModeRef.current = 'panning';
      setInteractionMode('panning');
      dragStartRef.current.pointerStart = screenPt;
      dragStartRef.current.initialViewport = { ...viewportRef.current };
      return;
    }

    // TOOL: PEN
    if (activeTool === 'pen') {
      interactionModeRef.current = 'drawing';
      setInteractionMode('drawing');
      activeStrokePointsRef.current = [worldPt];
      setActiveStrokePoints([worldPt]);
      return;
    }

    // TOOL: ERASER
    if (activeTool === 'eraser') {
      interactionModeRef.current = 'erasing';
      setInteractionMode('erasing');
      setEraserCursorPos(screenPt);
      eraseAt(worldPt);
      return;
    }

    // TOOL: TEXT
    if (activeTool === 'text') {
      isPointerDownRef.current = false;
      insertTextAt(worldPt);
      return;
    }

    // TOOL: SHAPE
    if (activeTool === 'shape') {
      isPointerDownRef.current = false;
      insertShapeAt(selectedShapeType, worldPt);
      return;
    }

    // TOOL: SELECT
    if (activeTool === 'select') {
      // 1. Check resize / rotate handles
      if (selectionBounds && selectedItems.length > 0) {
        const handle = getHandleAtScreenPoint(screenPt, selectionBounds, viewportRef.current);
        if (handle) {
          if (handle.id === 'rotate') {
            interactionModeRef.current = 'rotating';
            setInteractionMode('rotating');
            const center = {
              x: selectionBounds.x + selectionBounds.width / 2,
              y: selectionBounds.y + selectionBounds.height / 2,
            };
            dragStartRef.current.center = center;
            dragStartRef.current.pointerStart = screenPt;
            const itemsMap = new Map();
            selectedItems.forEach((it) => itemsMap.set(it.id, { ...it }));
            dragStartRef.current.itemsStartPos = itemsMap;
            return;
          } else {
            interactionModeRef.current = 'resizing';
            setInteractionMode('resizing');
            dragStartRef.current.handleId = handle.id;
            dragStartRef.current.pointerStart = screenPt;
            dragStartRef.current.worldStart = worldPt;
            const itemsMap = new Map();
            selectedItems.forEach((it) => itemsMap.set(it.id, { ...it }));
            dragStartRef.current.itemsStartPos = itemsMap;
            return;
          }
        }
      }

      // 2. Check if clicked directly on an existing item
      const currentItems = itemsRef.current;
      let clickedItem: CanvasItem | null = null;
      for (let i = currentItems.length - 1; i >= 0; i--) {
        if (isPointInItem(worldPt, currentItems[i])) {
          clickedItem = currentItems[i];
          break;
        }
      }

      if (clickedItem) {
        if (e.shiftKey) {
          if (selectedIds.includes(clickedItem.id)) {
            onSelectIds(selectedIds.filter((id) => id !== clickedItem!.id));
          } else {
            onSelectIds([...selectedIds, clickedItem.id]);
          }
        } else {
          if (!selectedIds.includes(clickedItem.id)) {
            onSelectIds([clickedItem.id]);
          }
        }

        interactionModeRef.current = 'moving';
        setInteractionMode('moving');
        dragStartRef.current.pointerStart = screenPt;
        dragStartRef.current.worldStart = worldPt;
        const itemsMap = new Map();
        const targetIds = selectedIds.includes(clickedItem.id) ? selectedIds : [clickedItem.id];
        currentItems
          .filter((it) => targetIds.includes(it.id))
          .forEach((it) => itemsMap.set(it.id, { ...it }));
        dragStartRef.current.itemsStartPos = itemsMap;
      } else {
        // Clicked on empty canvas
        if (!e.shiftKey) {
          onSelectIds([]);
        }
        interactionModeRef.current = 'box-selecting';
        setInteractionMode('box-selecting');
        dragStartRef.current.pointerStart = screenPt;
        setSelectionBox(null);
      }
    }
  };

  // Pointer Move Handler
  const handlePointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const screenPt = { x: e.clientX - rect.left, y: e.clientY - rect.top };
    const vp = viewportRef.current;
    const worldPt = screenToWorld(screenPt, vp);

    if (activeToolRef.current === 'eraser') {
      setEraserCursorPos(screenPt);
    }

    const mode = interactionModeRef.current;

    // DRAWING
    if (mode === 'drawing' && isPointerDownRef.current) {
      activeStrokePointsRef.current = [...activeStrokePointsRef.current, worldPt];
      setActiveStrokePoints(activeStrokePointsRef.current);
      return;
    }

    // ERASING
    if (mode === 'erasing' && isPointerDownRef.current) {
      eraseAt(worldPt);
      return;
    }

    // PANNING
    if (mode === 'panning' && isPointerDownRef.current) {
      const dx = screenPt.x - dragStartRef.current.pointerStart.x;
      const dy = screenPt.y - dragStartRef.current.pointerStart.y;
      const initial = dragStartRef.current.initialViewport || vp;
      onViewportChange({
        ...initial,
        x: initial.x + dx,
        y: initial.y + dy,
      });
      return;
    }

    // MOVING ITEMS
    if (mode === 'moving' && isPointerDownRef.current) {
      const dx = worldPt.x - dragStartRef.current.worldStart.x;
      const dy = worldPt.y - dragStartRef.current.worldStart.y;

      const updated = itemsRef.current.map((it) => {
        const start = dragStartRef.current.itemsStartPos.get(it.id);
        if (start) {
          if (it.type === 'stroke') {
            return {
              ...it,
              x: start.x + dx,
              y: start.y + dy,
              points: (start as any).points.map((p: Point) => ({
                x: p.x + dx,
                y: p.y + dy,
                pressure: p.pressure,
              })),
            };
          }
          return {
            ...it,
            x: start.x + dx,
            y: start.y + dy,
          };
        }
        return it;
      });

      onItemsChange(updated, false);
      return;
    }

    // RESIZING ITEMS
    if (mode === 'resizing' && isPointerDownRef.current) {
      const handleId = dragStartRef.current.handleId;
      const dx = worldPt.x - dragStartRef.current.worldStart.x;
      const dy = worldPt.y - dragStartRef.current.worldStart.y;

      const updated = itemsRef.current.map((it) => {
        const start = dragStartRef.current.itemsStartPos.get(it.id);
        if (!start) return it;

        let newX = start.x;
        let newY = start.y;
        let newW = start.width;
        let newH = start.height;

        if (handleId?.includes('e')) newW = Math.max(10, start.width + dx);
        if (handleId?.includes('s')) newH = Math.max(10, start.height + dy);
        if (handleId?.includes('w')) {
          const wDiff = Math.min(start.width - 10, dx);
          newX = start.x + wDiff;
          newW = start.width - wDiff;
        }
        if (handleId?.includes('n')) {
          const hDiff = Math.min(start.height - 10, dy);
          newY = start.y + hDiff;
          newH = start.height - hDiff;
        }

        return {
          ...it,
          x: newX,
          y: newY,
          width: newW,
          height: newH,
        };
      });

      onItemsChange(updated, false);
      return;
    }

    // ROTATING ITEMS
    if (mode === 'rotating' && isPointerDownRef.current && dragStartRef.current.center) {
      const center = dragStartRef.current.center;
      const screenCenter = worldToScreen(center, vp);
      const angleRad = Math.atan2(screenPt.y - screenCenter.y, screenPt.x - screenCenter.x);
      let angleDeg = (angleRad * 180) / Math.PI + 90;
      if (angleDeg < 0) angleDeg += 360;

      const snapInterval = 15;
      const remainder = angleDeg % snapInterval;
      if (remainder < 3 || remainder > snapInterval - 3) {
        angleDeg = Math.round(angleDeg / snapInterval) * snapInterval;
      }

      const updated = itemsRef.current.map((it) => {
        const start = dragStartRef.current.itemsStartPos.get(it.id);
        if (start) {
          return {
            ...it,
            rotation: Math.round(angleDeg),
          };
        }
        return it;
      });

      onItemsChange(updated, false);
      return;
    }

    // BOX SELECTING
    if (mode === 'box-selecting' && isPointerDownRef.current) {
      const dist = Math.hypot(
        screenPt.x - dragStartRef.current.pointerStart.x,
        screenPt.y - dragStartRef.current.pointerStart.y
      );

      if (dist > 5) {
        setSelectionBox({
          start: dragStartRef.current.pointerStart,
          current: screenPt,
        });

        const minX = Math.min(dragStartRef.current.pointerStart.x, screenPt.x);
        const maxX = Math.max(dragStartRef.current.pointerStart.x, screenPt.x);
        const minY = Math.min(dragStartRef.current.pointerStart.y, screenPt.y);
        const maxY = Math.max(dragStartRef.current.pointerStart.y, screenPt.y);

        const worldTopLeft = screenToWorld({ x: minX, y: minY }, vp);
        const worldBottomRight = screenToWorld({ x: maxX, y: maxY }, vp);

        const enclosedIds: string[] = [];
        for (const item of itemsRef.current) {
          const b = getItemBounds(item);
          if (
            b.x >= worldTopLeft.x &&
            b.x + b.width <= worldBottomRight.x &&
            b.y >= worldTopLeft.y &&
            b.y + b.height <= worldBottomRight.y
          ) {
            enclosedIds.push(item.id);
          }
        }

        onSelectIds(enclosedIds);
      }
      return;
    }
  };

  // Pointer Up Handler directly on canvas
  const handlePointerUp = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (canvas && canvas.hasPointerCapture(e.pointerId)) {
      try {
        canvas.releasePointerCapture(e.pointerId);
      } catch {
        // Ignore if pointer capture release fails
      }
    }
    finalizeInteraction();
  };

  // Pointer Leave
  const handlePointerLeave = () => {
    setEraserCursorPos(null);
  };

  // Wheel Zoom & Pan
  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const screenPt = { x: e.clientX - rect.left, y: e.clientY - rect.top };
    const vp = viewportRef.current;

    if (e.ctrlKey || e.metaKey) {
      const zoomFactor = e.deltaY < 0 ? 1.08 : 0.92;
      const nextZoom = Math.min(4.0, Math.max(0.25, vp.zoom * zoomFactor));

      const worldPt = screenToWorld(screenPt, vp);
      const nextX = screenPt.x - worldPt.x * nextZoom;
      const nextY = screenPt.y - worldPt.y * nextZoom;

      onViewportChange({
        zoom: nextZoom,
        x: nextX,
        y: nextY,
      });
    } else {
      onViewportChange({
        ...vp,
        x: vp.x - e.deltaX,
        y: vp.y - e.deltaY,
      });
    }
  };

  // Touch Pinch-to-Zoom & 2-finger Pan Handling
  const handleTouchStart = (e: React.TouchEvent<HTMLCanvasElement>) => {
    if (e.touches.length === 2) {
      finalizeInteraction();
      const t1 = { x: e.touches[0].clientX, y: e.touches[0].clientY };
      const t2 = { x: e.touches[1].clientX, y: e.touches[1].clientY };
      const dist = Math.hypot(t2.x - t1.x, t2.y - t1.y);
      dragStartRef.current.initialDistance = dist;
      dragStartRef.current.initialViewport = { ...viewportRef.current };
      dragStartRef.current.pointerStart = {
        x: (t1.x + t2.x) / 2,
        y: (t1.y + t2.y) / 2,
      };
    }
  };

  const handleTouchMove = (e: React.TouchEvent<HTMLCanvasElement>) => {
    if (e.touches.length === 2 && dragStartRef.current.initialDistance && dragStartRef.current.initialViewport) {
      e.preventDefault();
      const t1 = { x: e.touches[0].clientX, y: e.touches[0].clientY };
      const t2 = { x: e.touches[1].clientX, y: e.touches[1].clientY };
      const currentDist = Math.hypot(t2.x - t1.x, t2.y - t1.y);
      const currentMid = { x: (t1.x + t2.x) / 2, y: (t1.y + t2.y) / 2 };

      const scale = currentDist / dragStartRef.current.initialDistance;
      const initVp = dragStartRef.current.initialViewport;
      const nextZoom = Math.min(4.0, Math.max(0.25, initVp.zoom * scale));

      const dx = currentMid.x - dragStartRef.current.pointerStart.x;
      const dy = currentMid.y - dragStartRef.current.pointerStart.y;

      onViewportChange({
        zoom: nextZoom,
        x: initVp.x + dx,
        y: initVp.y + dy,
      });
    }
  };

  // Handle detection helper
  function getHandleAtScreenPoint(screenPt: Point, bounds: any, vp: Viewport) {
    const screenNW = worldToScreen({ x: bounds.x, y: bounds.y }, vp);
    const screenSE = worldToScreen({ x: bounds.x + bounds.width, y: bounds.y + bounds.height }, vp);

    const boxX = screenNW.x - 4;
    const boxY = screenNW.y - 4;
    const boxW = screenSE.x - screenNW.x + 8;
    const boxH = screenSE.y - screenNW.y + 8;

    const hitDist = 12;

    const rotX = boxX + boxW / 2;
    const rotY = boxY - 24;
    if (Math.hypot(screenPt.x - rotX, screenPt.y - rotY) <= hitDist) {
      return { id: 'rotate', cursor: 'grab' };
    }

    const handles = [
      { id: 'nw', x: boxX, y: boxY, cursor: 'nwse-resize' },
      { id: 'ne', x: boxX + boxW, y: boxY, cursor: 'nesw-resize' },
      { id: 'se', x: boxX + boxW, y: boxY + boxH, cursor: 'nwse-resize' },
      { id: 'sw', x: boxX, y: boxY + boxH, cursor: 'nesw-resize' },
      { id: 'n', x: boxX + boxW / 2, y: boxY, cursor: 'ns-resize' },
      { id: 's', x: boxX + boxW / 2, y: boxY + boxH, cursor: 'ns-resize' },
      { id: 'w', x: boxX, y: boxY + boxH / 2, cursor: 'ew-resize' },
      { id: 'e', x: boxX + boxW, y: boxY + boxH / 2, cursor: 'ew-resize' },
    ];

    for (const h of handles) {
      if (Math.hypot(screenPt.x - h.x, screenPt.y - h.y) <= hitDist) {
        return h;
      }
    }
    return null;
  }

  // Active Text item for editing
  const editingItem = editingTextId
    ? (items.find((i) => i.id === editingTextId) as TextItem | undefined)
    : null;
  const editingScreenPos = editingItem
    ? worldToScreen({ x: editingItem.x, y: editingItem.y }, viewport)
    : null;

  return (
    <div
      ref={containerRef}
      className="relative w-full h-full overflow-hidden select-none bg-white"
    >
      <canvas
        ref={canvasRef}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerLeave={handlePointerLeave}
        onDoubleClick={handleDoubleClick}
        onWheel={handleWheel}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        className={`w-full h-full block touch-none select-none ${
          activeTool === 'pen'
            ? 'cursor-crosshair'
            : activeTool === 'eraser'
            ? 'cursor-none'
            : activeTool === 'hand'
            ? interactionMode === 'panning'
              ? 'cursor-grabbing'
              : 'cursor-grab'
            : activeTool === 'text'
            ? 'cursor-text'
            : 'cursor-default'
        }`}
      />

      {/* Inline Text Editor Overlay when user is typing */}
      {editingItem && editingScreenPos && (
        <div
          className="absolute z-30"
          style={{
            left: `${editingScreenPos.x}px`,
            top: `${editingScreenPos.y}px`,
            transform: editingItem.rotation ? `rotate(${editingItem.rotation}deg)` : 'none',
            transformOrigin: 'top left',
          }}
        >
          <textarea
            ref={textInputRef}
            value={editingTextValue}
            onChange={(e) => setEditingTextValue(e.target.value)}
            onBlur={finishTextEditing}
            onKeyDown={(e) => {
              if (e.key === 'Escape') finishTextEditing();
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                finishTextEditing();
              }
            }}
            autoFocus
            rows={Math.max(1, editingTextValue.split('\n').length)}
            className="p-1 rounded bg-white/95 dark:bg-slate-900/95 border-2 border-blue-500 shadow-xl outline-none resize-none overflow-hidden text-slate-900 dark:text-white"
            style={{
              fontSize: `${editingItem.fontSize * viewport.zoom}px`,
              fontFamily: `'${editingItem.fontFamily}', sans-serif`,
              fontWeight: editingItem.fontWeight,
              fontStyle: editingItem.fontStyle,
              color: editingItem.color,
              textAlign: editingItem.textAlign,
              lineHeight: 1.25,
              minWidth: `${Math.max(140, editingItem.width * viewport.zoom)}px`,
            }}
          />
        </div>
      )}
    </div>
  );
};
