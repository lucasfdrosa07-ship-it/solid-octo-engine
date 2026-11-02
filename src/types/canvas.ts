export type ToolType = 'select' | 'pen' | 'eraser' | 'text' | 'shape' | 'hand';

export type ShapeType =
  | 'rect'
  | 'square'
  | 'circle'
  | 'ellipse'
  | 'triangle'
  | 'trapezoid'
  | 'line'
  | 'arrow'
  | 'double-arrow';

export type FontFamily = 'Plus Jakarta Sans' | 'Inter' | 'Roboto' | 'Arial' | 'Caveat' | 'JetBrains Mono';

export type TextAlign = 'left' | 'center' | 'right';

export interface Point {
  x: number;
  y: number;
  pressure?: number;
}

export interface BaseItem {
  id: string;
  type: string;
  x: number;
  y: number;
  width: number;
  height: number;
  rotation: number; // in degrees
  opacity: number; // 0 to 1
  strokeColor: string;
  strokeWidth: number;
  locked?: boolean;
}

export interface StrokeItem extends BaseItem {
  type: 'stroke';
  points: Point[]; // raw points
  smoothPath?: string; // cached SVG path data
}

export interface ShapeItem extends BaseItem {
  type: 'shape';
  shapeType: ShapeType;
  fillColor?: string; // empty string or 'transparent' for no fill
  hasFill: boolean;
}

export interface TextItem extends BaseItem {
  type: 'text';
  text: string;
  fontSize: number;
  fontFamily: FontFamily;
  fontWeight: 'normal' | 'bold';
  fontStyle: 'normal' | 'italic';
  textAlign: TextAlign;
  color: string;
}

export interface GroupItem extends BaseItem {
  type: 'group';
  children: CanvasItem[];
}

export type CanvasItem = StrokeItem | ShapeItem | TextItem | GroupItem;

export interface Viewport {
  x: number; // pan X in pixels
  y: number; // pan Y in pixels
  zoom: number; // scale factor, 0.25 to 4.0 (1 = 100%)
}

export interface ProjectData {
  id: string;
  name: string;
  createdAt: number;
  updatedAt: number;
  thumbnail?: string;
  viewport: Viewport;
  items: CanvasItem[];
  backgroundColor: string;
  gridStyle: 'none' | 'dots' | 'grid';
}

export interface HistorySnapshot {
  items: CanvasItem[];
  description?: string;
}

export interface ResizeHandle {
  id: 'nw' | 'n' | 'ne' | 'e' | 'se' | 's' | 'sw' | 'w' | 'rotate';
  x: number;
  y: number;
  cursor: string;
}
