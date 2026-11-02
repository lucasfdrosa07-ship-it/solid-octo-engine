import React from 'react';
import {
  Bold,
  Italic,
  AlignLeft,
  AlignCenter,
  AlignRight,
  Copy,
  Trash2,
  BringToFront,
  SendToBack,
  ArrowUp,
  ArrowDown,
  Group,
  Ungroup,
  ChevronUp,
  ChevronDown,
  SlidersHorizontal
} from 'lucide-react';
import {
  CanvasItem,
  FontFamily,
  ShapeItem,
  StrokeItem,
  TextAlign,
  TextItem,
  ToolType
} from '../types/canvas';

interface PropertiesPanelProps {
  activeTool: ToolType;
  selectedItems: CanvasItem[];
  // Pen settings
  penColor: string;
  onPenColorChange: (color: string) => void;
  penWidth: number;
  onPenWidthChange: (width: number) => void;
  // Eraser settings
  eraserSize: number;
  onEraserSizeChange: (size: number) => void;
  // Text settings
  textColor?: string;
  onTextColorChange?: (color: string) => void;
  // Item modification callbacks
  onUpdateSelectedItems: (updates: Partial<CanvasItem>) => void;
  onDuplicateSelected: () => void;
  onDeleteSelected: () => void;
  onBringToFront: () => void;
  onSendToBack: () => void;
  onBringForward: () => void;
  onSendBackward: () => void;
  onGroupSelected: () => void;
  onUngroupSelected: () => void;
  // Collapsible state
  isCollapsed?: boolean;
  onToggleCollapse?: () => void;
  isZenMode?: boolean;
}

const PEN_COLORS = [
  { hex: '#2563EB', label: 'Azul' },
  { hex: '#EF4444', label: 'Vermelho' },
  { hex: '#111827', label: 'Preto' },
  { hex: '#16A34A', label: 'Verde' },
];

const TEXT_COLORS = [
  { hex: '#2563EB', label: 'Azul' },
  { hex: '#EF4444', label: 'Vermelho' },
  { hex: '#111827', label: 'Preto' },
  { hex: '#16A34A', label: 'Verde' },
  { hex: '#FFFFFF', label: 'Branco' },
];

const FONT_OPTIONS: FontFamily[] = [
  'Plus Jakarta Sans',
  'Inter',
  'Roboto',
  'Arial',
  'Caveat',
  'JetBrains Mono',
];

export const PropertiesPanel: React.FC<PropertiesPanelProps> = ({
  activeTool,
  selectedItems,
  penColor,
  onPenColorChange,
  penWidth,
  onPenWidthChange,
  eraserSize,
  onEraserSizeChange,
  textColor = '#111827',
  onTextColorChange,
  onUpdateSelectedItems,
  onDuplicateSelected,
  onDeleteSelected,
  onBringToFront,
  onSendToBack,
  onBringForward,
  onSendBackward,
  onGroupSelected,
  onUngroupSelected,
  isCollapsed = false,
  onToggleCollapse,
  isZenMode = false,
}) => {
  if (isZenMode) return null;

  const isMultiSelection = selectedItems.length > 1;
  const singleItem = selectedItems.length === 1 ? selectedItems[0] : null;

  return (
    <div className="absolute top-16 left-4 right-4 sm:left-auto sm:right-6 md:right-8 z-20 flex justify-center sm:justify-end pointer-events-none">
      {/* If Collapsed, show compact mini badge to expand */}
      {isCollapsed ? (
        <button
          onClick={onToggleCollapse}
          className="pointer-events-auto flex items-center gap-2 px-3 py-1.5 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md rounded-full shadow-lg border border-slate-200/80 dark:border-slate-800 text-xs font-semibold text-slate-700 dark:text-slate-300 hover:scale-105 active:scale-95 transition-all group"
          title="Expandir painel de cores e propriedades"
        >
          {activeTool === 'pen' && (
            <div
              className="w-3.5 h-3.5 rounded-full border border-black/10 shrink-0"
              style={{ backgroundColor: penColor }}
            />
          )}
          <SlidersHorizontal className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
          <span>Propriedades</span>
          <ChevronDown className="w-3.5 h-3.5 text-slate-400 group-hover:text-blue-600 transition-colors" />
        </button>
      ) : (
        /* Expanded Inspector */
        <div className="pointer-events-auto bg-white/95 dark:bg-slate-900/95 backdrop-blur-md px-3.5 py-2.5 rounded-2xl shadow-xl border border-slate-200/80 dark:border-slate-800 flex flex-wrap items-center gap-3 max-w-full text-slate-800 dark:text-slate-200 text-xs transition-all">
          {/* CASE 1: Multiple items selected */}
          {isMultiSelection && (
            <div className="flex items-center gap-2">
              <span className="font-semibold text-slate-500 dark:text-slate-400">
                {selectedItems.length} itens selecionados
              </span>
              <div className="h-4 w-px bg-slate-200 dark:bg-slate-700" />
              <button
                onClick={onGroupSelected}
                className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 font-medium transition-colors"
                title="Agrupar seleção"
              >
                <Group className="w-3.5 h-3.5 text-blue-600" />
                <span>Agrupar</span>
              </button>
              <button
                onClick={onDuplicateSelected}
                className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                title="Duplicar (Ctrl+D)"
              >
                <Copy className="w-4 h-4 text-slate-600 dark:text-slate-300" />
              </button>
              <button
                onClick={onDeleteSelected}
                className="p-1.5 rounded-lg hover:bg-red-50 text-red-600 transition-colors"
                title="Excluir (Delete)"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          )}

          {/* CASE 2: Single item selected */}
          {!isMultiSelection && singleItem && (
            <div className="flex flex-wrap items-center gap-3">
              {/* If Single Item is Stroke */}
              {singleItem.type === 'stroke' && (
                <div className="flex items-center gap-2">
                  <span className="font-medium text-slate-500">Traço:</span>
                  <input
                    type="color"
                    value={singleItem.strokeColor}
                    onChange={(e) => onUpdateSelectedItems({ strokeColor: e.target.value })}
                    className="w-6 h-6 rounded cursor-pointer border-0 bg-transparent"
                    title="Alterar cor do traço"
                  />
                  <div className="flex items-center gap-1.5">
                    <span className="text-[11px] font-mono">{singleItem.strokeWidth}px</span>
                    <input
                      type="range"
                      min="1"
                      max="30"
                      value={singleItem.strokeWidth}
                      onChange={(e) => onUpdateSelectedItems({ strokeWidth: Number(e.target.value) })}
                      className="w-20 accent-blue-600"
                    />
                  </div>
                </div>
              )}

              {/* If Single Item is Shape */}
              {singleItem.type === 'shape' && (
                <>
                  <div className="flex items-center gap-1.5">
                    <span className="text-slate-500 font-medium">Borda:</span>
                    <input
                      type="color"
                      value={singleItem.strokeColor}
                      onChange={(e) => onUpdateSelectedItems({ strokeColor: e.target.value })}
                      className="w-6 h-6 rounded cursor-pointer border-0 bg-transparent"
                      title="Cor da borda"
                    />
                    <input
                      type="range"
                      min="0"
                      max="20"
                      value={singleItem.strokeWidth}
                      onChange={(e) => onUpdateSelectedItems({ strokeWidth: Number(e.target.value) })}
                      className="w-16 accent-blue-600"
                      title={`Espessura: ${singleItem.strokeWidth}px`}
                    />
                    <span className="text-[11px] font-mono text-slate-500">{singleItem.strokeWidth}px</span>
                  </div>

                  {singleItem.shapeType !== 'line' && singleItem.shapeType !== 'arrow' && singleItem.shapeType !== 'double-arrow' && (
                    <div className="flex items-center gap-1.5">
                      <span className="text-slate-500 font-medium">Fundo:</span>
                      <button
                        onClick={() =>
                          onUpdateSelectedItems({
                            hasFill: !singleItem.hasFill,
                            fillColor: singleItem.fillColor && singleItem.fillColor !== 'transparent' ? singleItem.fillColor : '#FFFFFF',
                          })
                        }
                        className={`px-2 py-0.5 rounded text-[11px] font-semibold border ${
                          !singleItem.hasFill
                            ? 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-300'
                            : 'bg-blue-50 text-blue-600 border-blue-300'
                        }`}
                      >
                        {singleItem.hasFill ? 'Preenchido' : 'Transparente'}
                      </button>
                      {singleItem.hasFill && (
                        <input
                          type="color"
                          value={singleItem.fillColor && singleItem.fillColor !== 'transparent' ? singleItem.fillColor : '#FFFFFF'}
                          onChange={(e) => onUpdateSelectedItems({ fillColor: e.target.value, hasFill: true })}
                          className="w-6 h-6 rounded cursor-pointer border-0 bg-transparent"
                          title="Cor do preenchimento"
                        />
                      )}
                    </div>
                  )}

                  {/* Opacity */}
                  <div className="flex items-center gap-1">
                    <span className="text-slate-500 font-medium">Opacidade:</span>
                    <input
                      type="range"
                      min="10"
                      max="100"
                      value={Math.round((singleItem.opacity ?? 1) * 100)}
                      onChange={(e) => onUpdateSelectedItems({ opacity: Number(e.target.value) / 100 })}
                      className="w-16 accent-blue-600"
                    />
                    <span className="text-[11px] font-mono">{Math.round((singleItem.opacity ?? 1) * 100)}%</span>
                  </div>
                </>
              )}

              {/* If Single Item is Text */}
              {singleItem.type === 'text' && (
                <>
                  <select
                    value={singleItem.fontFamily}
                    onChange={(e) => onUpdateSelectedItems({ fontFamily: e.target.value as FontFamily })}
                    className="bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 px-2 py-1 rounded-lg border border-slate-200 dark:border-slate-700 outline-none text-xs font-medium cursor-pointer"
                  >
                    {FONT_OPTIONS.map((f) => (
                      <option key={f} value={f} style={{ fontFamily: f }}>
                        {f}
                      </option>
                    ))}
                  </select>

                  <div className="flex items-center gap-1">
                    <input
                      type="number"
                      min="8"
                      max="120"
                      value={singleItem.fontSize}
                      onChange={(e) =>
                        onUpdateSelectedItems({
                          fontSize: Math.max(8, Math.min(120, Number(e.target.value))),
                        })
                      }
                      className="w-12 bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 px-1.5 py-0.5 rounded border border-slate-200 dark:border-slate-700 text-center font-mono text-xs"
                    />
                    <span className="text-slate-400 text-[11px]">px</span>
                  </div>

                  {/* Text Color Presets (Azul, Vermelho, Preto, Verde, Branco) + Custom Color Picker */}
                  <div className="flex items-center gap-1.5">
                    {TEXT_COLORS.map((c) => {
                      const isSelected = (singleItem.color || '').toLowerCase() === c.hex.toLowerCase();
                      return (
                        <button
                          key={c.hex}
                          onClick={() => {
                            onUpdateSelectedItems({ color: c.hex });
                            onTextColorChange?.(c.hex);
                          }}
                          className={`w-5 h-5 rounded-full transition-all relative ${
                            c.hex === '#FFFFFF' ? 'border border-slate-300 dark:border-slate-600' : ''
                          } ${
                            isSelected
                              ? 'ring-2 ring-blue-600 ring-offset-2 dark:ring-offset-slate-900 scale-110 shadow-sm'
                              : 'hover:scale-105'
                          }`}
                          style={{ backgroundColor: c.hex }}
                          title={`Cor do texto: ${c.label}`}
                        />
                      );
                    })}
                    <input
                      type="color"
                      value={singleItem.color || '#111827'}
                      onChange={(e) => {
                        onUpdateSelectedItems({ color: e.target.value });
                        onTextColorChange?.(e.target.value);
                      }}
                      className="w-5 h-5 rounded-full cursor-pointer border-0 bg-transparent ml-0.5"
                      title="Outra cor de texto..."
                    />
                  </div>

                  <div className="flex items-center bg-slate-100 dark:bg-slate-800 p-0.5 rounded-lg border border-slate-200 dark:border-slate-700">
                    <button
                      onClick={() =>
                        onUpdateSelectedItems({
                          fontWeight: singleItem.fontWeight === 'bold' ? 'normal' : 'bold',
                        })
                      }
                      className={`p-1 rounded ${
                        singleItem.fontWeight === 'bold'
                          ? 'bg-white dark:bg-slate-700 text-blue-600 font-bold shadow-xs'
                          : 'text-slate-600 dark:text-slate-400'
                      }`}
                      title="Negrito"
                    >
                      <Bold className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() =>
                        onUpdateSelectedItems({
                          fontStyle: singleItem.fontStyle === 'italic' ? 'normal' : 'italic',
                        })
                      }
                      className={`p-1 rounded ${
                        singleItem.fontStyle === 'italic'
                          ? 'bg-white dark:bg-slate-700 text-blue-600 font-bold shadow-xs'
                          : 'text-slate-600 dark:text-slate-400'
                      }`}
                      title="Itálico"
                    >
                      <Italic className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  <div className="flex items-center bg-slate-100 dark:bg-slate-800 p-0.5 rounded-lg border border-slate-200 dark:border-slate-700">
                    <button
                      onClick={() => onUpdateSelectedItems({ textAlign: 'left' })}
                      className={`p-1 rounded ${
                        singleItem.textAlign === 'left' ? 'bg-white dark:bg-slate-700 text-blue-600 shadow-xs' : 'text-slate-500'
                      }`}
                      title="Alinhar à esquerda"
                    >
                      <AlignLeft className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => onUpdateSelectedItems({ textAlign: 'center' })}
                      className={`p-1 rounded ${
                        singleItem.textAlign === 'center' ? 'bg-white dark:bg-slate-700 text-blue-600 shadow-xs' : 'text-slate-500'
                      }`}
                      title="Centralizar"
                    >
                      <AlignCenter className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => onUpdateSelectedItems({ textAlign: 'right' })}
                      className={`p-1 rounded ${
                        singleItem.textAlign === 'right' ? 'bg-white dark:bg-slate-700 text-blue-600 shadow-xs' : 'text-slate-500'
                      }`}
                      title="Alinhar à direita"
                    >
                      <AlignRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </>
              )}

              {/* If Single Item is Group */}
              {singleItem.type === 'group' && (
                <button
                  onClick={onUngroupSelected}
                  className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 font-medium transition-colors"
                  title="Desagrupar elementos"
                >
                  <Ungroup className="w-3.5 h-3.5 text-blue-600" />
                  <span>Desagrupar</span>
                </button>
              )}

              <div className="h-4 w-px bg-slate-200 dark:bg-slate-700" />

              {/* Layers & Actions for any single item */}
              <div className="flex items-center gap-1">
                <button
                  onClick={onBringForward}
                  className="p-1 rounded hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                  title="Trazer uma camada para frente"
                >
                  <ArrowUp className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={onSendBackward}
                  className="p-1 rounded hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                  title="Enviar uma camada para trás"
                >
                  <ArrowDown className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={onBringToFront}
                  className="p-1 rounded hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                  title="Trazer para a frente máxima"
                >
                  <BringToFront className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={onSendToBack}
                  className="p-1 rounded hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                  title="Enviar para o fundo"
                >
                  <SendToBack className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={onDuplicateSelected}
                  className="p-1 rounded hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors ml-1"
                  title="Duplicar (Ctrl+D)"
                >
                  <Copy className="w-3.5 h-3.5 text-slate-600 dark:text-slate-300" />
                </button>
                <button
                  onClick={onDeleteSelected}
                  className="p-1 rounded hover:bg-red-50 text-red-600 transition-colors"
                  title="Excluir (Delete)"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          )}

          {/* CASE 3: No items selected -> Tool Defaults */}
          {selectedItems.length === 0 && (
            <>
              {/* Pen Tool Settings */}
              {activeTool === 'pen' && (
                <div className="flex flex-wrap items-center gap-3">
                  <span className="font-semibold text-slate-500 dark:text-slate-400">Caneta:</span>
                  {/* 4 Default Colors */}
                  <div className="flex items-center gap-1.5">
                    {PEN_COLORS.map((c) => (
                      <button
                        key={c.hex}
                        onClick={() => onPenColorChange(c.hex)}
                        className={`w-6 h-6 rounded-full transition-all relative ${
                          penColor.toLowerCase() === c.hex.toLowerCase()
                            ? 'ring-2 ring-blue-600 ring-offset-2 dark:ring-offset-slate-900 scale-110 shadow-sm'
                            : 'hover:scale-105'
                        }`}
                        style={{ backgroundColor: c.hex }}
                        title={c.label}
                      />
                    ))}
                    <div className="h-4 w-px bg-slate-200 dark:bg-slate-700 mx-0.5" />
                    <input
                      type="color"
                      value={penColor}
                      onChange={(e) => onPenColorChange(e.target.value)}
                      className="w-6 h-6 rounded-full cursor-pointer border-0 bg-transparent"
                      title="Outra cor..."
                    />
                  </div>

                  <div className="h-4 w-px bg-slate-200 dark:bg-slate-700" />

                  {/* Stroke width slider with live preview */}
                  <div className="flex items-center gap-2">
                    <span className="text-[11px] font-medium text-slate-500">Espessura:</span>
                    <input
                      type="range"
                      min="1"
                      max="30"
                      value={penWidth}
                      onChange={(e) => onPenWidthChange(Number(e.target.value))}
                      className="w-24 accent-blue-600 cursor-pointer"
                    />
                    <span className="text-[11px] font-mono tabular-nums text-slate-600 dark:text-slate-300 w-7">
                      {penWidth}px
                    </span>

                    {/* Live circle preview */}
                    <div className="w-7 h-7 flex items-center justify-center bg-slate-100 dark:bg-slate-800 rounded-lg">
                      <div
                        className="rounded-full"
                        style={{
                          width: `${Math.min(22, Math.max(2, penWidth))}px`,
                          height: `${Math.min(22, Math.max(2, penWidth))}px`,
                          backgroundColor: penColor,
                        }}
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* Eraser Tool Settings */}
              {activeTool === 'eraser' && (
                <div className="flex items-center gap-3">
                  <span className="font-semibold text-slate-500 dark:text-slate-400">Borracha:</span>
                  <div className="flex items-center gap-1.5 bg-slate-100 dark:bg-slate-800 p-0.5 rounded-lg border border-slate-200 dark:border-slate-700">
                    <button
                      onClick={() => onEraserSizeChange(10)}
                      className={`px-2 py-1 rounded text-xs font-medium transition-all ${
                        eraserSize === 10
                          ? 'bg-white dark:bg-slate-700 text-blue-600 font-semibold shadow-xs'
                          : 'text-slate-600 dark:text-slate-300 hover:text-slate-900'
                      }`}
                    >
                      Pequena (10px)
                    </button>
                    <button
                      onClick={() => onEraserSizeChange(25)}
                      className={`px-2 py-1 rounded text-xs font-medium transition-all ${
                        eraserSize === 25
                          ? 'bg-white dark:bg-slate-700 text-blue-600 font-semibold shadow-xs'
                          : 'text-slate-600 dark:text-slate-300 hover:text-slate-900'
                      }`}
                    >
                      Média (25px)
                    </button>
                    <button
                      onClick={() => onEraserSizeChange(50)}
                      className={`px-2 py-1 rounded text-xs font-medium transition-all ${
                        eraserSize === 50
                          ? 'bg-white dark:bg-slate-700 text-blue-600 font-semibold shadow-xs'
                          : 'text-slate-600 dark:text-slate-300 hover:text-slate-900'
                      }`}
                    >
                      Grande (50px)
                    </button>
                  </div>

                  <div className="flex items-center gap-1.5">
                    <input
                      type="range"
                      min="5"
                      max="80"
                      value={eraserSize}
                      onChange={(e) => onEraserSizeChange(Number(e.target.value))}
                      className="w-20 accent-blue-600 cursor-pointer"
                    />
                    <span className="text-[11px] font-mono text-slate-500 tabular-nums">{eraserSize}px</span>
                  </div>
                </div>
              )}

              {/* Select Tool hint */}
              {activeTool === 'select' && (
                <span className="text-slate-500 dark:text-slate-400 text-xs">
                  Clique para selecionar ou arraste para selecionar em área
                </span>
              )}

              {/* Hand Tool hint */}
              {activeTool === 'hand' && (
                <span className="text-slate-500 dark:text-slate-400 text-xs">
                  Arraste para mover pelo quadro
                </span>
              )}

              {/* Text Tool Settings */}
              {activeTool === 'text' && (
                <div className="flex items-center gap-2.5">
                  <span className="font-semibold text-slate-500 dark:text-slate-400">Cor do texto:</span>
                  <div className="flex items-center gap-1.5">
                    {TEXT_COLORS.map((c) => {
                      const isSelected = (textColor || '#111827').toLowerCase() === c.hex.toLowerCase();
                      return (
                        <button
                          key={c.hex}
                          onClick={() => onTextColorChange?.(c.hex)}
                          className={`w-5 h-5 rounded-full transition-all relative ${
                            c.hex === '#FFFFFF' ? 'border border-slate-300 dark:border-slate-600' : ''
                          } ${
                            isSelected
                              ? 'ring-2 ring-blue-600 ring-offset-2 dark:ring-offset-slate-900 scale-110 shadow-sm'
                              : 'hover:scale-105'
                          }`}
                          style={{ backgroundColor: c.hex }}
                          title={`Cor do texto: ${c.label}`}
                        />
                      );
                    })}
                    <input
                      type="color"
                      value={textColor || '#111827'}
                      onChange={(e) => onTextColorChange?.(e.target.value)}
                      className="w-5 h-5 rounded-full cursor-pointer border-0 bg-transparent ml-0.5"
                      title="Outra cor de texto..."
                    />
                  </div>
                  <div className="h-4 w-px bg-slate-200 dark:bg-slate-700 mx-1" />
                  <span className="text-slate-500 dark:text-slate-400 text-xs">
                    Clique no quadro para adicionar texto
                  </span>
                </div>
              )}

              {/* Shape Tool hint */}
              {activeTool === 'shape' && (
                <span className="text-slate-500 dark:text-slate-400 text-xs">
                  Clique no menu de formas à esquerda para escolher
                </span>
              )}
            </>
          )}

          {/* Minimize / Collapse Panel Button */}
          {onToggleCollapse && (
            <button
              onClick={onToggleCollapse}
              className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors ml-1"
              title="Recolher painel de propriedades"
            >
              <ChevronUp className="w-4 h-4" />
            </button>
          )}
        </div>
      )}
    </div>
  );
};
