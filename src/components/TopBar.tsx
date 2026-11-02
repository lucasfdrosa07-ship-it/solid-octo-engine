import React, { useState } from 'react';
import {
  Undo2,
  Redo2,
  ZoomIn,
  ZoomOut,
  Maximize2,
  Download,
  FolderOpen,
  Plus,
  Sun,
  Moon,
  HelpCircle,
  Check,
  Edit2,
  EyeOff,
  Eye,
  Trash2
} from 'lucide-react';

interface TopBarProps {
  projectName: string;
  onRename: (newName: string) => void;
  onNewProject: () => void;
  canUndo: boolean;
  canRedo: boolean;
  onUndo: () => void;
  onRedo: () => void;
  zoom: number;
  onZoomChange: (newZoom: number) => void;
  onResetZoom: () => void;
  onFitToScreen: () => void;
  onOpenProjects: () => void;
  onOpenExport: () => void;
  onOpenHelp: () => void;
  isDarkMode: boolean;
  onToggleTheme: () => void;
  isSaving: boolean;
  isZenMode?: boolean;
  onToggleZenMode?: () => void;
  onClearBoard?: () => void;
}

export const TopBar: React.FC<TopBarProps> = ({
  projectName,
  onRename,
  onNewProject,
  canUndo,
  canRedo,
  onUndo,
  onRedo,
  zoom,
  onZoomChange,
  onResetZoom,
  onFitToScreen,
  onOpenProjects,
  onOpenExport,
  onOpenHelp,
  isDarkMode,
  onToggleTheme,
  isSaving,
  isZenMode = false,
  onToggleZenMode,
  onClearBoard,
}) => {
  const [isEditingName, setIsEditingName] = useState(false);
  const [tempName, setTempName] = useState(projectName);

  const handleFinishRename = () => {
    setIsEditingName(false);
    if (tempName.trim()) {
      onRename(tempName.trim());
    } else {
      setTempName(projectName);
    }
  };

  return (
    <header className="h-14 px-3 sm:px-5 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between gap-2 sm:gap-4 select-none shrink-0 z-30 transition-colors">
      {/* Left zone: Brand, project name & project management */}
      <div className="flex items-center gap-2 sm:gap-3 min-w-0">
        <div className="flex items-center gap-1.5 shrink-0">
          <div className="w-8 h-8 rounded-lg bg-blue-600 text-white flex items-center justify-center font-bold text-sm shadow-sm shadow-blue-500/20">
            Q
          </div>
          <span className="font-extrabold text-base tracking-tight text-slate-900 dark:text-white hidden md:inline">
            Quadro<span className="text-blue-600">Studio</span>
          </span>
        </div>

        <div className="h-4 w-px bg-slate-200 dark:bg-slate-700 hidden sm:block" />

        {/* Project Name editable */}
        <div className="flex items-center gap-1.5 min-w-0 max-w-[160px] sm:max-w-[220px]">
          {isEditingName ? (
            <input
              type="text"
              value={tempName}
              onChange={(e) => setTempName(e.target.value)}
              onBlur={handleFinishRename}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleFinishRename();
                if (e.key === 'Escape') {
                  setTempName(projectName);
                  setIsEditingName(false);
                }
              }}
              autoFocus
              className="text-sm font-semibold text-slate-900 dark:text-white bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded border border-blue-500 outline-none w-full"
            />
          ) : (
            <button
              onClick={() => {
                setTempName(projectName);
                setIsEditingName(true);
              }}
              className="group flex items-center gap-1.5 text-sm font-semibold text-slate-800 dark:text-slate-100 hover:text-blue-600 dark:hover:text-blue-400 px-1.5 py-1 rounded hover:bg-slate-100 dark:hover:bg-slate-800/60 truncate transition-colors"
              title="Clique para renomear"
            >
              <span className="truncate">{projectName}</span>
              <Edit2 className="w-3 h-3 opacity-0 group-hover:opacity-70 text-slate-500 shrink-0 transition-opacity" />
            </button>
          )}
        </div>

        {/* Auto-save status */}
        <div className="hidden lg:flex items-center gap-1 text-[11px] text-slate-500 dark:text-slate-400 font-medium">
          {isSaving ? (
            <span className="animate-pulse text-amber-500">Salvando...</span>
          ) : (
            <span className="flex items-center gap-1 text-emerald-600 dark:text-emerald-400">
              <Check className="w-3 h-3" /> Salvo local
            </span>
          )}
        </div>
      </div>

      {/* Center zone: Undo / Redo & Zoom controls */}
      <div className="flex items-center gap-1 sm:gap-2">
        <div className="flex items-center bg-slate-100 dark:bg-slate-800/80 p-0.5 rounded-lg border border-slate-200/80 dark:border-slate-700/80">
          <button
            onClick={onUndo}
            disabled={!canUndo}
            className="p-1.5 rounded-md text-slate-700 dark:text-slate-300 hover:bg-white dark:hover:bg-slate-700 disabled:opacity-30 disabled:hover:bg-transparent transition-all"
            title="Desfazer (Ctrl+Z)"
          >
            <Undo2 className="w-4 h-4" />
          </button>
          <button
            onClick={onRedo}
            disabled={!canRedo}
            className="p-1.5 rounded-md text-slate-700 dark:text-slate-300 hover:bg-white dark:hover:bg-slate-700 disabled:opacity-30 disabled:hover:bg-transparent transition-all"
            title="Refazer (Ctrl+Shift+Z)"
          >
            <Redo2 className="w-4 h-4" />
          </button>
        </div>

        {/* Zoom controls */}
        <div className="flex items-center bg-slate-100 dark:bg-slate-800/80 p-0.5 rounded-lg border border-slate-200/80 dark:border-slate-700/80 text-xs font-semibold text-slate-700 dark:text-slate-300">
          <button
            onClick={() => onZoomChange(Math.max(0.25, zoom - 0.1))}
            className="p-1.5 rounded-md hover:bg-white dark:hover:bg-slate-700 transition-all"
            title="Afastar zoom (-)"
          >
            <ZoomOut className="w-3.5 h-3.5" />
          </button>

          <button
            onClick={onResetZoom}
            className="px-1.5 py-1 min-w-[42px] text-center hover:bg-white dark:hover:bg-slate-700 rounded transition-all font-mono tabular-nums text-[11px]"
            title="Restaurar zoom para 100%"
          >
            {Math.round(zoom * 100)}%
          </button>

          <button
            onClick={() => onZoomChange(Math.min(4.0, zoom + 0.1))}
            className="p-1.5 rounded-md hover:bg-white dark:hover:bg-slate-700 transition-all"
            title="Aproximar zoom (+)"
          >
            <ZoomIn className="w-3.5 h-3.5" />
          </button>

          <button
            onClick={onFitToScreen}
            className="p-1.5 rounded-md hover:bg-white dark:hover:bg-slate-700 hidden sm:inline-block transition-all"
            title="Ajustar conteúdo à tela"
          >
            <Maximize2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Right zone: Projects, New, Export, Theme, Help */}
      <div className="flex items-center gap-1 sm:gap-2">
        <button
          onClick={onNewProject}
          className="hidden md:flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 transition-colors"
          title="Criar novo quadro em branco"
        >
          <Plus className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
          <span>Novo</span>
        </button>

        {onClearBoard && (
          <button
            onClick={() => {
              if (window.confirm('Deseja limpar todos os elementos deste quadro?')) {
                onClearBoard();
              }
            }}
            className="hidden sm:flex items-center gap-1 px-2 py-1.5 text-xs font-medium text-slate-600 dark:text-slate-300 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/40 rounded-lg border border-slate-200 dark:border-slate-700 transition-colors"
            title="Limpar todos os desenhos e objetos do quadro"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span className="hidden lg:inline">Limpar</span>
          </button>
        )}

        <button
          onClick={onOpenProjects}
          className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 transition-colors"
          title="Abrir painel de projetos salvos"
        >
          <FolderOpen className="w-3.5 h-3.5 text-amber-500" />
          <span className="hidden sm:inline">Projetos</span>
        </button>

        <button
          onClick={onOpenExport}
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 active:bg-blue-800 rounded-lg shadow-sm shadow-blue-500/20 transition-all"
          title="Exportar como PNG, JPG, SVG ou JSON"
        >
          <Download className="w-3.5 h-3.5" />
          <span>Exportar</span>
        </button>

        <button
          onClick={onToggleTheme}
          className="p-2 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg border border-transparent hover:border-slate-200 dark:hover:border-slate-700 transition-colors"
          title={isDarkMode ? 'Mudar para tema claro' : 'Mudar para tema escuro'}
        >
          {isDarkMode ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4 text-slate-700" />}
        </button>

        {onToggleZenMode && (
          <button
            onClick={onToggleZenMode}
            className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 transition-colors"
            title="Modo Tela Cheia / Quadro Limpo (Tecla F)"
          >
            {isZenMode ? <Eye className="w-3.5 h-3.5 text-blue-600" /> : <EyeOff className="w-3.5 h-3.5 text-slate-600 dark:text-slate-400" />}
            <span className="hidden lg:inline">Quadro Limpo</span>
          </button>
        )}

        <button
          onClick={onOpenHelp}
          className="p-2 text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors hidden sm:inline-block"
          title="Atalhos e Dicas"
        >
          <HelpCircle className="w-4 h-4" />
        </button>
      </div>
    </header>
  );
};
