import React, { useState, useRef, useEffect } from 'react';
import {
  MousePointer2,
  PenLine,
  Eraser,
  Type,
  Square,
  Circle,
  RectangleHorizontal,
  Minus,
  MoveRight,
  ArrowLeftRight,
  Hand,
  Shapes,
  ChevronLeft,
  ChevronRight,
  PanelLeftClose,
  PanelLeftOpen
} from 'lucide-react';
import { ToolType, ShapeType } from '../types/canvas';

interface ToolbarProps {
  activeTool: ToolType;
  onSelectTool: (tool: ToolType) => void;
  selectedShapeType: ShapeType;
  onSelectShapeType: (shape: ShapeType) => void;
  onInsertShapeDirectly: (shape: ShapeType) => void;
  isCollapsed?: boolean;
  onToggleCollapse?: () => void;
  isZenMode?: boolean;
}

export const Toolbar: React.FC<ToolbarProps> = ({
  activeTool,
  onSelectTool,
  selectedShapeType,
  onSelectShapeType,
  onInsertShapeDirectly,
  isCollapsed = false,
  onToggleCollapse,
  isZenMode = false,
}) => {
  if (isZenMode) return null;

  const [shapesMenuOpen, setShapesMenuOpen] = useState(false);
  const shapesMenuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (shapesMenuRef.current && !shapesMenuRef.current.contains(event.target as Node)) {
        setShapesMenuOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const shapeOptions: { type: ShapeType; label: string; icon: React.ReactNode }[] = [
    { type: 'rect', label: 'Retângulo', icon: <RectangleHorizontal className="w-4 h-4" /> },
    { type: 'square', label: 'Quadrado', icon: <Square className="w-4 h-4" /> },
    { type: 'circle', label: 'Círculo', icon: <Circle className="w-4 h-4" /> },
    { type: 'ellipse', label: 'Elipse', icon: <Circle className="w-4 h-4 scale-x-125" /> },
    { type: 'line', label: 'Linha Reta', icon: <Minus className="w-4 h-4 rotate-45" /> },
    { type: 'arrow', label: 'Seta Simples', icon: <MoveRight className="w-4 h-4" /> },
    { type: 'double-arrow', label: 'Seta Dupla', icon: <ArrowLeftRight className="w-4 h-4" /> },
  ];

  const handleShapeSelect = (type: ShapeType) => {
    onSelectShapeType(type);
    onSelectTool('shape');
    onInsertShapeDirectly(type);
    setShapesMenuOpen(false);
  };

  return (
    <>
      {/* Desktop Toolbar: Collapsed mini trigger */}
      {isCollapsed ? (
        <aside className="hidden md:flex absolute left-4 top-20 z-20">
          <button
            onClick={onToggleCollapse}
            className="p-2.5 rounded-xl bg-white/95 dark:bg-slate-900/95 backdrop-blur-md shadow-lg border border-slate-200/80 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:text-blue-600 dark:hover:text-blue-400 hover:scale-105 active:scale-95 transition-all group"
            title="Expandir barra de ferramentas"
          >
            <PanelLeftOpen className="w-5 h-5" />
            <span className="absolute left-full ml-2 px-2 py-1 bg-slate-900 text-white text-[11px] font-medium rounded shadow opacity-0 pointer-events-none group-hover:opacity-100 transition-opacity whitespace-nowrap z-50">
              Mostrar ferramentas
            </span>
          </button>
        </aside>
      ) : (
        /* Desktop Left Floating Toolbar Expanded */
        <aside className="hidden md:flex absolute left-4 top-20 z-20 flex-col gap-1.5 p-1.5 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md rounded-2xl shadow-lg border border-slate-200/80 dark:border-slate-800 transition-all">
          {/* Select */}
          <button
            onClick={() => onSelectTool('select')}
            className={`relative group p-3 rounded-xl transition-all ${
              activeTool === 'select'
                ? 'bg-blue-600 text-white shadow-sm shadow-blue-500/30'
                : 'text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
            }`}
            title="Selecionar e Mover (V)"
          >
            <MousePointer2 className="w-5 h-5" />
            <span className="absolute left-full ml-3 px-2 py-1 bg-slate-900 text-white text-[11px] font-medium rounded shadow opacity-0 pointer-events-none group-hover:opacity-100 transition-opacity whitespace-nowrap z-50">
              Selecionar (V)
            </span>
          </button>

          {/* Pen */}
          <button
            onClick={() => onSelectTool('pen')}
            className={`relative group p-3 rounded-xl transition-all ${
              activeTool === 'pen'
                ? 'bg-blue-600 text-white shadow-sm shadow-blue-500/30'
                : 'text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
            }`}
            title="Caneta de Desenho Livre (P)"
          >
            <PenLine className="w-5 h-5" />
            <span className="absolute left-full ml-3 px-2 py-1 bg-slate-900 text-white text-[11px] font-medium rounded shadow opacity-0 pointer-events-none group-hover:opacity-100 transition-opacity whitespace-nowrap z-50">
              Caneta (P)
            </span>
          </button>

          {/* Eraser */}
          <button
            onClick={() => onSelectTool('eraser')}
            className={`relative group p-3 rounded-xl transition-all ${
              activeTool === 'eraser'
                ? 'bg-blue-600 text-white shadow-sm shadow-blue-500/30'
                : 'text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
            }`}
            title="Borracha Pontual (E)"
          >
            <Eraser className="w-5 h-5" />
            <span className="absolute left-full ml-3 px-2 py-1 bg-slate-900 text-white text-[11px] font-medium rounded shadow opacity-0 pointer-events-none group-hover:opacity-100 transition-opacity whitespace-nowrap z-50">
              Borracha (E)
            </span>
          </button>

          {/* Text */}
          <button
            onClick={() => onSelectTool('text')}
            className={`relative group p-3 rounded-xl transition-all ${
              activeTool === 'text'
                ? 'bg-blue-600 text-white shadow-sm shadow-blue-500/30'
                : 'text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
            }`}
            title="Caixa de Texto (T)"
          >
            <Type className="w-5 h-5" />
            <span className="absolute left-full ml-3 px-2 py-1 bg-slate-900 text-white text-[11px] font-medium rounded shadow opacity-0 pointer-events-none group-hover:opacity-100 transition-opacity whitespace-nowrap z-50">
              Texto (T)
            </span>
          </button>

          {/* Shapes Menu Trigger */}
          <div className="relative" ref={shapesMenuRef}>
            <button
              onClick={() => {
                setShapesMenuOpen(!shapesMenuOpen);
              }}
              className={`relative group p-3 rounded-xl transition-all w-full flex items-center justify-center ${
                activeTool === 'shape'
                  ? 'bg-blue-600 text-white shadow-sm shadow-blue-500/30'
                  : 'text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
              }`}
              title="Elementos Geométricos"
            >
              <Shapes className="w-5 h-5" />
              <span className="absolute left-full ml-3 px-2 py-1 bg-slate-900 text-white text-[11px] font-medium rounded shadow opacity-0 pointer-events-none group-hover:opacity-100 transition-opacity whitespace-nowrap z-50">
                Formas Geométricas
              </span>
            </button>

            {/* Shapes Popup Dropdown */}
            {shapesMenuOpen && (
              <div className="absolute left-full ml-3 top-0 bg-white dark:bg-slate-900 rounded-xl shadow-xl border border-slate-200 dark:border-slate-800 p-2 w-48 flex flex-col gap-1 z-50 animate-in fade-in slide-in-from-left-2 duration-150">
                <div className="text-[11px] font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400 px-2 py-1">
                  Formas
                </div>
                {shapeOptions.map((shape) => (
                  <button
                    key={shape.type}
                    onClick={() => handleShapeSelect(shape.type)}
                    className={`flex items-center gap-2.5 px-3 py-2 text-xs font-medium rounded-lg transition-colors ${
                      selectedShapeType === shape.type && activeTool === 'shape'
                        ? 'bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 font-semibold'
                        : 'text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800'
                    }`}
                  >
                    <span className="text-slate-500 dark:text-slate-400">{shape.icon}</span>
                    <span>{shape.label}</span>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Hand / Pan Tool */}
          <button
            onClick={() => onSelectTool('hand')}
            className={`relative group p-3 rounded-xl transition-all ${
              activeTool === 'hand'
                ? 'bg-blue-600 text-white shadow-sm shadow-blue-500/30'
                : 'text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
            }`}
            title="Mão para Movimentar (H ou Segurar Espaço)"
          >
            <Hand className="w-5 h-5" />
            <span className="absolute left-full ml-3 px-2 py-1 bg-slate-900 text-white text-[11px] font-medium rounded shadow opacity-0 pointer-events-none group-hover:opacity-100 transition-opacity whitespace-nowrap z-50">
              Mão para Pan (H)
            </span>
          </button>

          <div className="h-px w-6 mx-auto bg-slate-200 dark:bg-slate-800 my-1" />

          {/* Collapse button */}
          <button
            onClick={onToggleCollapse}
            className="relative group p-2 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-all flex items-center justify-center"
            title="Recolher ferramentas"
          >
            <PanelLeftClose className="w-4 h-4" />
            <span className="absolute left-full ml-3 px-2 py-1 bg-slate-900 text-white text-[11px] font-medium rounded shadow opacity-0 pointer-events-none group-hover:opacity-100 transition-opacity whitespace-nowrap z-50">
              Recolher barra
            </span>
          </button>
        </aside>
      )}

      {/* Mobile Toolbar & Mini Floating Toggle */}
      {isCollapsed ? (
        <div className="flex md:hidden fixed bottom-4 left-4 z-30">
          <button
            onClick={onToggleCollapse}
            className="p-3 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md rounded-2xl shadow-xl border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 active:scale-95 transition-all"
            title="Mostrar ferramentas"
          >
            <PanelLeftOpen className="w-5 h-5 text-blue-600" />
          </button>
        </div>
      ) : (
        <nav className="flex md:hidden fixed bottom-0 left-0 right-0 z-30 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border-t border-slate-200 dark:border-slate-800 px-2 py-1.5 justify-around items-center touch-manipulation">
          <button
            onClick={() => onSelectTool('select')}
            className={`flex flex-col items-center justify-center min-w-[44px] min-h-[44px] rounded-xl transition-colors ${
              activeTool === 'select'
                ? 'text-blue-600 dark:text-blue-400 font-bold'
                : 'text-slate-600 dark:text-slate-400'
            }`}
            title="Selecionar"
          >
            <MousePointer2 className="w-5 h-5" />
            <span className="text-[10px] mt-0.5">Mover</span>
          </button>

          <button
            onClick={() => onSelectTool('pen')}
            className={`flex flex-col items-center justify-center min-w-[44px] min-h-[44px] rounded-xl transition-colors ${
              activeTool === 'pen'
                ? 'text-blue-600 dark:text-blue-400 font-bold'
                : 'text-slate-600 dark:text-slate-400'
            }`}
            title="Caneta"
          >
            <PenLine className="w-5 h-5" />
            <span className="text-[10px] mt-0.5">Caneta</span>
          </button>

          <button
            onClick={() => onSelectTool('eraser')}
            className={`flex flex-col items-center justify-center min-w-[44px] min-h-[44px] rounded-xl transition-colors ${
              activeTool === 'eraser'
                ? 'text-blue-600 dark:text-blue-400 font-bold'
                : 'text-slate-600 dark:text-slate-400'
            }`}
            title="Borracha"
          >
            <Eraser className="w-5 h-5" />
            <span className="text-[10px] mt-0.5">Borracha</span>
          </button>

          <button
            onClick={() => onSelectTool('text')}
            className={`flex flex-col items-center justify-center min-w-[44px] min-h-[44px] rounded-xl transition-colors ${
              activeTool === 'text'
                ? 'text-blue-600 dark:text-blue-400 font-bold'
                : 'text-slate-600 dark:text-slate-400'
            }`}
            title="Texto"
          >
            <Type className="w-5 h-5" />
            <span className="text-[10px] mt-0.5">Texto</span>
          </button>

          <button
            onClick={() => {
              setShapesMenuOpen(!shapesMenuOpen);
              onSelectTool('shape');
            }}
            className={`flex flex-col items-center justify-center min-w-[44px] min-h-[44px] rounded-xl transition-colors ${
              activeTool === 'shape'
                ? 'text-blue-600 dark:text-blue-400 font-bold'
                : 'text-slate-600 dark:text-slate-400'
            }`}
            title="Formas"
          >
            <Shapes className="w-5 h-5" />
            <span className="text-[10px] mt-0.5">Formas</span>
          </button>

          <button
            onClick={() => onSelectTool('hand')}
            className={`flex flex-col items-center justify-center min-w-[44px] min-h-[44px] rounded-xl transition-colors ${
              activeTool === 'hand'
                ? 'text-blue-600 dark:text-blue-400 font-bold'
                : 'text-slate-600 dark:text-slate-400'
            }`}
            title="Mão"
          >
            <Hand className="w-5 h-5" />
            <span className="text-[10px] mt-0.5">Mão</span>
          </button>

          {/* Mobile Collapse */}
          <button
            onClick={onToggleCollapse}
            className="flex flex-col items-center justify-center min-w-[40px] min-h-[44px] text-slate-400 hover:text-slate-600"
            title="Ocultar barra"
          >
            <PanelLeftClose className="w-4 h-4" />
            <span className="text-[10px] mt-0.5">Ocultar</span>
          </button>
        </nav>
      )}

      {/* Mobile Shapes Bottom Sheet Modal */}
      {shapesMenuOpen && (
        <div className="md:hidden fixed inset-0 z-40 bg-black/40 backdrop-blur-xs flex flex-col justify-end">
          <div className="bg-white dark:bg-slate-900 rounded-t-3xl p-4 shadow-2xl border-t border-slate-200 dark:border-slate-800 animate-in slide-in-from-bottom duration-200 pb-20">
            <div className="w-10 h-1 bg-slate-300 dark:bg-slate-700 rounded-full mx-auto mb-3" />
            <div className="flex items-center justify-between mb-3 px-1">
              <span className="text-sm font-bold text-slate-800 dark:text-white">Inserir Forma</span>
              <button
                onClick={() => setShapesMenuOpen(false)}
                className="text-xs font-semibold text-blue-600 dark:text-blue-400"
              >
                Fechar
              </button>
            </div>
            <div className="grid grid-cols-3 gap-2">
              {shapeOptions.map((shape) => (
                <button
                  key={shape.type}
                  onClick={() => handleShapeSelect(shape.type)}
                  className="flex flex-col items-center justify-center p-3 rounded-xl border border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/80 active:bg-blue-50 text-slate-800 dark:text-slate-200 gap-1.5 transition-colors"
                >
                  <span className="text-blue-600 dark:text-blue-400">{shape.icon}</span>
                  <span className="text-[11px] font-medium">{shape.label}</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </>
  );
};
