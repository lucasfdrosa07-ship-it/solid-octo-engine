import { CanvasItem, Point, StrokeItem, Viewport } from '../types/canvas';

export function distance(p1: Point, p2: Point): number {
  const dx = p1.x - p2.x;
  const dy = p1.y - p2.y;
  return Math.sqrt(dx * dx + dy * dy);
}

export function pointToSegmentDistance(
  p: Point,
  a: Point,
  b: Point
): { dist: number; closest: Point } {
  const l2 = (b.x - a.x) * (b.x - a.x) + (b.y - a.y) * (b.y - a.y);
  if (l2 === 0) return { dist: distance(p, a), closest: a };

  let t = ((p.x - a.x) * (b.x - a.x) + (p.y - a.y) * (b.y - a.y)) / l2;
  t = Math.max(0, Math.min(1, t));

  const closest = {
    x: a.x + t * (b.x - a.x),
    y: a.y + t * (b.y - a.y),
  };

  return { dist: distance(p, closest), closest };
}

export function worldToScreen(p: Point, viewport: Viewport): Point {
  return {
    x: p.x * viewport.zoom + viewport.x,
    y: p.y * viewport.zoom + viewport.y,
  };
}

export function screenToWorld(p: Point, viewport: Viewport): Point {
  return {
    x: (p.x - viewport.x) / viewport.zoom,
    y: (p.y - viewport.y) / viewport.zoom,
  };
}

export function rotatePoint(p: Point, center: Point, angleDeg: number): Point {
  const rad = (angleDeg * Math.PI) / 180;
  const cos = Math.cos(rad);
  const sin = Math.sin(rad);
  const dx = p.x - center.x;
  const dy = p.y - center.y;
  return {
    x: center.x + (dx * cos - dy * sin),
    y: center.y + (dx * sin + dy * cos),
  };
}

export function calculateStrokeBounds(points: Point[], strokeWidth: number) {
  if (points.length === 0) {
    return { x: 0, y: 0, width: 0, height: 0 };
  }
  let minX = points[0].x;
  let maxX = points[0].x;
  let minY = points[0].y;
  let maxY = points[0].y;

  for (let i = 1; i < points.length; i++) {
    const pt = points[i];
    if (pt.x < minX) minX = pt.x;
    if (pt.x > maxX) maxX = pt.x;
    if (pt.y < minY) minY = pt.y;
    if (pt.y > maxY) maxY = pt.y;
  }

  const halfWidth = Math.max(1, strokeWidth / 2);
  const padding = halfWidth + 2;

  return {
    x: minX - padding,
    y: minY - padding,
    width: Math.max(1, maxX - minX + padding * 2),
    height: Math.max(1, maxY - minY + padding * 2),
  };
}

export function getItemBounds(item: CanvasItem): { x: number; y: number; width: number; height: number } {
  if (item.type === 'stroke') {
    return calculateStrokeBounds(item.points, item.strokeWidth);
  }
  return {
    x: item.x,
    y: item.y,
    width: item.width,
    height: item.height,
  };
}

export function getMultiItemBounds(items: CanvasItem[]): { x: number; y: number; width: number; height: number } | null {
  if (items.length === 0) return null;

  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;

  for (const item of items) {
    const bounds = getItemBounds(item);
    if (bounds.x < minX) minX = bounds.x;
    if (bounds.y < minY) minY = bounds.y;
    if (bounds.x + bounds.width > maxX) maxX = bounds.x + bounds.width;
    if (bounds.y + bounds.height > maxY) maxY = bounds.y + bounds.height;
  }

  return {
    x: minX,
    y: minY,
    width: Math.max(1, maxX - minX),
    height: Math.max(1, maxY - minY),
  };
}

export function isPointInItem(worldPoint: Point, item: CanvasItem): boolean {
  if (item.type === 'stroke') {
    const effectiveRadius = Math.max(8, item.strokeWidth);
    const bounds = calculateStrokeBounds(item.points, item.strokeWidth);
    if (
      worldPoint.x < bounds.x - effectiveRadius ||
      worldPoint.x > bounds.x + bounds.width + effectiveRadius ||
      worldPoint.y < bounds.y - effectiveRadius ||
      worldPoint.y > bounds.y + bounds.height + effectiveRadius
    ) {
      return false;
    }

    for (let i = 0; i < item.points.length - 1; i++) {
      const p1 = item.points[i];
      const p2 = item.points[i + 1];
      const { dist } = pointToSegmentDistance(worldPoint, p1, p2);
      if (dist <= effectiveRadius) {
        return true;
      }
    }
    return false;
  }

  const center = {
    x: item.x + item.width / 2,
    y: item.y + item.height / 2,
  };

  // Un-rotate the point for simpler rectangle hit test
  const unrotated = item.rotation !== 0 ? rotatePoint(worldPoint, center, -item.rotation) : worldPoint;

  const hitTolerance = Math.max(6, item.strokeWidth / 2);

  return (
    unrotated.x >= item.x - hitTolerance &&
    unrotated.x <= item.x + item.width + hitTolerance &&
    unrotated.y >= item.y - hitTolerance &&
    unrotated.y <= item.y + item.height + hitTolerance
  );
}

/**
 * Splits a freehand stroke into multiple stroke items if the eraser intersects any part.
 * Returns null if the stroke is entirely untouched,
 * or an array of new StrokeItems (which can be empty if completely erased).
 */
export function splitStrokeByEraser(
  stroke: StrokeItem,
  eraserCenter: Point,
  eraserRadius: number
): StrokeItem[] | null {
  const points = stroke.points;
  if (!points || points.length === 0) return [];

  // Fast bounding box check
  const bounds = calculateStrokeBounds(points, stroke.strokeWidth);
  const totalRadius = eraserRadius + stroke.strokeWidth / 2;
  if (
    eraserCenter.x < bounds.x - totalRadius ||
    eraserCenter.x > bounds.x + bounds.width + totalRadius ||
    eraserCenter.y < bounds.y - totalRadius ||
    eraserCenter.y > bounds.y + bounds.height + totalRadius
  ) {
    return null; // Untouched
  }

  // Dense point sampling check
  // Subdivide segments if distance between consecutive points is large so fast mouse moves don't jump over eraser
  const interpolatedPoints: Point[] = [];
  for (let i = 0; i < points.length; i++) {
    interpolatedPoints.push(points[i]);
    if (i < points.length - 1) {
      const next = points[i + 1];
      const d = distance(points[i], next);
      const step = Math.max(2, totalRadius / 3);
      if (d > step) {
        const count = Math.floor(d / step);
        for (let j = 1; j <= count; j++) {
          const ratio = j / (count + 1);
          interpolatedPoints.push({
            x: points[i].x + (next.x - points[i].x) * ratio,
            y: points[i].y + (next.y - points[i].y) * ratio,
            pressure: (points[i].pressure || 0.5) * (1 - ratio) + (next.pressure || 0.5) * ratio,
          });
        }
      }
    }
  }

  let hasHit = false;
  const segments: Point[][] = [];
  let currentSegment: Point[] = [];

  for (const pt of interpolatedPoints) {
    const d = distance(pt, eraserCenter);
    if (d <= totalRadius) {
      hasHit = true;
      if (currentSegment.length > 0) {
        segments.push(currentSegment);
        currentSegment = [];
      }
    } else {
      currentSegment.push(pt);
    }
  }

  if (currentSegment.length > 0) {
    segments.push(currentSegment);
  }

  if (!hasHit) {
    return null; // No intersection found
  }

  // Convert valid segments with at least 2 points (or 1 point dot) into new stroke items
  const newStrokes: StrokeItem[] = [];
  for (const seg of segments) {
    // Simplify/decimate segment if needed to avoid overly dense arrays
    const cleanSeg: Point[] = [];
    for (let i = 0; i < seg.length; i++) {
      if (
        i === 0 ||
        i === seg.length - 1 ||
        distance(cleanSeg[cleanSeg.length - 1], seg[i]) >= 2
      ) {
        cleanSeg.push(seg[i]);
      }
    }

    if (cleanSeg.length >= 2 || (cleanSeg.length === 1 && seg.length === 1)) {
      const segBounds = calculateStrokeBounds(cleanSeg, stroke.strokeWidth);
      newStrokes.push({
        ...stroke,
        id: 'stroke_' + Math.random().toString(36).substring(2, 9),
        points: cleanSeg,
        x: segBounds.x,
        y: segBounds.y,
        width: segBounds.width,
        height: segBounds.height,
      });
    }
  }

  return newStrokes;
}
