import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  CanvasItem,
  ProjectData,
  ShapeType,
  ToolType,
  Viewport
} from './types/canvas';
import {
  deleteProject,
  duplicateProject,
  getAllProjects,
  getProject,
  saveProject
} from './services/storage';
import { getItemBounds, getMultiItemBounds } from './utils/geometry';
import { TopBar } from './components/TopBar';
import { Toolbar } from './components/Toolbar';
import { PropertiesPanel } from './components/PropertiesPanel';
import { CanvasView } from './components/CanvasView';
import { ProjectManagerModal } from './components/ProjectManagerModal';
import { ExportModal } from './components/ExportModal';
import { ShortcutsModal } from './components/ShortcutsModal';
import { Sparkles, X, PanelTopOpen } from 'lucide-react';

const DEFAULT_PROJECT_NAME = 'Quadro sem título';

export default function App() {
  // Theme state: defaults strictly to false (Clean Whiteboard)
  const [isDarkMode, setIsDarkMode] = useState<boolean>(() => {
    const saved = localStorage.getItem('quadrostudio_theme_v2');
    return saved === 'dark';
  });

  useEffect(() => {
    if (isDarkMode) {
      document.documentElement.classList.add('dark');
      localStorage.setItem('quadrostudio_theme_v2', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('quadrostudio_theme_v2', 'light');
    }
  }, [isDarkMode]);

  // Project state - default background is ALWAYS crisp white #FFFFFF
  const [currentProject, setCurrentProject] = useState<ProjectData>(() => ({
    id: 'proj_' + Math.random().toString(36).substring(2, 9),
    name: DEFAULT_PROJECT_NAME,
    createdAt: Date.now(),
    updatedAt: Date.now(),
    viewport: { x: 0, y: 0, zoom: 1 },
    items: [],
    backgroundColor: '#FFFFFF',
    gridStyle: 'none',
  }));

  const [projectsList, setProjectsList] = useState<ProjectData[]>([]);
  const [isSaving, setIsSaving] = useState(false);

  // Active tools & selection
  const [activeTool, setActiveTool] = useState<ToolType>('pen');
  const [selectedShapeType, setSelectedShapeType] = useState<ShapeType>('rect');
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [clipboard, setClipboard] = useState<CanvasItem[]>([]);
  const [isEditingText, setIsEditingText] = useState(false);

  // Pen and eraser properties
  const [penColor, setPenColor] = useState('#2563EB'); // Blue by default
  const [penWidth, setPenWidth] = useState(4); // 4px default as specified
  const [eraserSize, setEraserSize] = useState(25); // 25px default

  // Collapsible panels & Zen Mode
  const [isToolbarCollapsed, setIsToolbarCollapsed] = useState(false);
  const [isPropertiesCollapsed, setIsPropertiesCollapsed] = useState(false);
  const [isZenMode, setIsZenMode] = useState(false);

  // Undo / Redo history
  const [undoStack, setUndoStack] = useState<CanvasItem[][]>([]);
  const [redoStack, setRedoStack] = useState<CanvasItem[][]>([]);

  // Modals state
  const [showProjectsModal, setShowProjectsModal] = useState(false);
  const [showExportModal, setShowExportModal] = useState(false);
  const [showShortcutsModal, setShowShortcutsModal] = useState(false);
  const [showWelcomeBanner, setShowWelcomeBanner] = useState(true);

  // Load all projects on start
  const refreshProjectsList = useCallback(async () => {
    try {
      const list = await getAllProjects();
      setProjectsList(list);
    } catch (err) {
      console.warn('Error fetching projects:', err);
    }
  }, []);

  useEffect(() => {
    refreshProjectsList();
  }, [refreshProjectsList]);

  // Debounced Auto-save
  const autoSaveTimerRef = useRef<NodeJS.Timeout | null>(null);
  const triggerAutoSave = useCallback(
    (projToSave: ProjectData) => {
      setIsSaving(true);
      if (autoSaveTimerRef.current) {
        clearTimeout(autoSaveTimerRef.current);
      }
      autoSaveTimerRef.current = setTimeout(async () => {
        try {
          await saveProject(projToSave);
          await refreshProjectsList();
        } catch (err) {
          console.error('Failed auto-save:', err);
        } finally {
          setIsSaving(false);
        }
      }, 600);
    },
    [refreshProjectsList]
  );

  // Modify canvas items with history tracking
  const handleItemsChange = (newItems: CanvasItem[], recordHistory: boolean = true) => {
    if (recordHistory) {
      setUndoStack((prev) => [...prev.slice(-49), currentProject.items]);
      setRedoStack([]);
    }

    const updatedProject: ProjectData = {
      ...currentProject,
      items: newItems,
      updatedAt: Date.now(),
    };
    setCurrentProject(updatedProject);
    triggerAutoSave(updatedProject);
  };

  // Viewport change
  const handleViewportChange = (nextViewport: Viewport) => {
    setCurrentProject((prev) => ({
      ...prev,
      viewport: nextViewport,
    }));
  };

  // Undo & Redo Handlers
  const handleUndo = useCallback(() => {
    if (undoStack.length === 0) return;
    const previous = undoStack[undoStack.length - 1];
    setRedoStack((prev) => [...prev, currentProject.items]);
    setUndoStack((prev) => prev.slice(0, prev.length - 1));

    const updated = {
      ...currentProject,
      items: previous,
      updatedAt: Date.now(),
    };
    setCurrentProject(updated);
    setSelectedIds([]);
    triggerAutoSave(updated);
  }, [undoStack, currentProject, triggerAutoSave]);

  const handleRedo = useCallback(() => {
    if (redoStack.length === 0) return;
    const next = redoStack[redoStack.length - 1];
    setUndoStack((prev) => [...prev, currentProject.items]);
    setRedoStack((prev) => prev.slice(0, prev.length - 1));

    const updated = {
      ...currentProject,
      items: next,
      updatedAt: Date.now(),
    };
    setCurrentProject(updated);
    setSelectedIds([]);
    triggerAutoSave(updated);
  }, [redoStack, currentProject, triggerAutoSave]);

  // Project Actions
  const handleNewProject = () => {
    const newProj: ProjectData = {
      id: 'proj_' + Math.random().toString(36).substring(2, 9),
      name: DEFAULT_PROJECT_NAME,
      createdAt: Date.now(),
      updatedAt: Date.now(),
      viewport: { x: 0, y: 0, zoom: 1 },
      items: [],
      backgroundColor: '#FFFFFF',
      gridStyle: 'none',
    };
    setCurrentProject(newProj);
    setUndoStack([]);
    setRedoStack([]);
    setSelectedIds([]);
    triggerAutoSave(newProj);
  };

  const handleSelectProject = async (id: string) => {
    const loaded = await getProject(id);
    if (loaded) {
      // Ensure canvas background is clean white if it was saved with old dark theme color
      const cleanProject: ProjectData = {
        ...loaded,
        backgroundColor:
          loaded.backgroundColor === '#0F172A' || loaded.backgroundColor === '#0f172a'
            ? '#FFFFFF'
            : loaded.backgroundColor || '#FFFFFF',
      };
      setCurrentProject(cleanProject);
      setUndoStack([]);
      setRedoStack([]);
      setSelectedIds([]);
    }
  };

  const handleRenameProject = (newName: string) => {
    const updated = {
      ...currentProject,
      name: newName,
      updatedAt: Date.now(),
    };
    setCurrentProject(updated);
    triggerAutoSave(updated);
  };

  const handleRenameProjectInList = async (id: string, newName: string) => {
    if (id === currentProject.id) {
      handleRenameProject(newName);
    } else {
      const proj = await getProject(id);
      if (proj) {
        proj.name = newName;
        await saveProject(proj);
        await refreshProjectsList();
      }
    }
  };

  const handleDuplicateProject = async (id: string) => {
    const copy = await duplicateProject(id);
    if (copy) {
      await refreshProjectsList();
    }
  };

  const handleDeleteProject = async (id: string) => {
    await deleteProject(id);
    await refreshProjectsList();
    if (id === currentProject.id) {
      handleNewProject();
    }
  };

  // Zoom Controls
  const handleResetZoom = () => {
    handleViewportChange({
      ...currentProject.viewport,
      zoom: 1.0,
    });
  };

  const handleFitToScreen = () => {
    if (currentProject.items.length === 0) {
      handleViewportChange({ x: 0, y: 0, zoom: 1 });
      return;
    }
    const bounds = getMultiItemBounds(currentProject.items);
    if (!bounds) return;

    const padding = 80;
    const availableW = window.innerWidth - padding * 2;
    const availableH = window.innerHeight - 120 - padding * 2;

    const scaleX = availableW / bounds.width;
    const scaleY = availableH / bounds.height;
    const fitZoom = Math.min(2.0, Math.max(0.25, Math.min(scaleX, scaleY)));

    const centerX = bounds.x + bounds.width / 2;
    const centerY = bounds.y + bounds.height / 2;

    const screenCenterX = window.innerWidth / 2;
    const screenCenterY = (window.innerHeight - 56) / 2;

    handleViewportChange({
      zoom: fitZoom,
      x: screenCenterX - centerX * fitZoom,
      y: screenCenterY - centerY * fitZoom,
    });
  };

  const handleClearBoard = () => {
    handleItemsChange([], true);
    setSelectedIds([]);
  };

  // Object Manipulation Operations
  const handleUpdateSelectedItems = (updates: Partial<CanvasItem>) => {
    const updated = currentProject.items.map((item) => {
      if (selectedIds.includes(item.id)) {
        return {
          ...item,
          ...updates,
        } as CanvasItem;
      }
      return item;
    });
    handleItemsChange(updated, true);
  };

  const handleDeleteSelected = useCallback(() => {
    if (selectedIds.length === 0) return;
    const updated = currentProject.items.filter((item) => !selectedIds.includes(item.id));
    handleItemsChange(updated, true);
    setSelectedIds([]);
  }, [selectedIds, currentProject.items]);

  const handleDuplicateSelected = useCallback(() => {
    if (selectedIds.length === 0) return;
    const offset = 24;
    const newItems: CanvasItem[] = [];
    const newIds: string[] = [];

    for (const item of currentProject.items) {
      if (selectedIds.includes(item.id)) {
        const cloned: CanvasItem = {
          ...JSON.parse(JSON.stringify(item)),
          id: 'item_' + Math.random().toString(36).substring(2, 9),
          x: item.x + offset,
          y: item.y + offset,
        };

        if (cloned.type === 'stroke') {
          cloned.points = cloned.points.map((p) => ({
            x: p.x + offset,
            y: p.y + offset,
            pressure: p.pressure,
          }));
        }

        newItems.push(cloned);
        newIds.push(cloned.id);
      }
    }

    handleItemsChange([...currentProject.items, ...newItems], true);
    setSelectedIds(newIds);
  }, [selectedIds, currentProject.items]);

  // Copy & Paste
  const handleCopySelected = useCallback(() => {
    if (selectedIds.length === 0) return;
    const selected = currentProject.items.filter((it) => selectedIds.includes(it.id));
    setClipboard(JSON.parse(JSON.stringify(selected)));
  }, [selectedIds, currentProject.items]);

  const handlePaste = useCallback(() => {
    if (clipboard.length === 0) return;
    const offset = 30;
    const pastedItems = clipboard.map((it) => {
      const cloned = {
        ...JSON.parse(JSON.stringify(it)),
        id: 'item_' + Math.random().toString(36).substring(2, 9),
        x: it.x + offset,
        y: it.y + offset,
      };
      if (cloned.type === 'stroke') {
        cloned.points = cloned.points.map((p: any) => ({
          x: p.x + offset,
          y: p.y + offset,
          pressure: p.pressure,
        }));
      }
      return cloned;
    });

    handleItemsChange([...currentProject.items, ...pastedItems], true);
    setSelectedIds(pastedItems.map((p) => p.id));
  }, [clipboard, currentProject.items]);

  // Layer ordering
  const handleBringToFront = () => {
    if (selectedIds.length === 0) return;
    const nonSelected = currentProject.items.filter((it) => !selectedIds.includes(it.id));
    const selected = currentProject.items.filter((it) => selectedIds.includes(it.id));
    handleItemsChange([...nonSelected, ...selected], true);
  };

  const handleSendToBack = () => {
    if (selectedIds.length === 0) return;
    const nonSelected = currentProject.items.filter((it) => !selectedIds.includes(it.id));
    const selected = currentProject.items.filter((it) => selectedIds.includes(it.id));
    handleItemsChange([...selected, ...nonSelected], true);
  };

  const handleBringForward = () => {
    if (selectedIds.length !== 1) return;
    const id = selectedIds[0];
    const index = currentProject.items.findIndex((it) => it.id === id);
    if (index < currentProject.items.length - 1) {
      const copy = [...currentProject.items];
      const temp = copy[index];
      copy[index] = copy[index + 1];
      copy[index + 1] = temp;
      handleItemsChange(copy, true);
    }
  };

  const handleSendBackward = () => {
    if (selectedIds.length !== 1) return;
    const id = selectedIds[0];
    const index = currentProject.items.findIndex((it) => it.id === id);
    if (index > 0) {
      const copy = [...currentProject.items];
      const temp = copy[index];
      copy[index] = copy[index - 1];
      copy[index - 1] = temp;
      handleItemsChange(copy, true);
    }
  };

  // Grouping
  const handleGroupSelected = () => {
    if (selectedIds.length <= 1) return;
    const selected = currentProject.items.filter((it) => selectedIds.includes(it.id));
    const bounds = getMultiItemBounds(selected);
    if (!bounds) return;

    const groupId = 'group_' + Math.random().toString(36).substring(2, 9);
    const groupItem: CanvasItem = {
      id: groupId,
      type: 'group',
      x: bounds.x,
      y: bounds.y,
      width: bounds.width,
      height: bounds.height,
      rotation: 0,
      opacity: 1,
      strokeColor: '#2563EB',
      strokeWidth: 0,
      children: selected,
    };

    const remaining = currentProject.items.filter((it) => !selectedIds.includes(it.id));
    handleItemsChange([...remaining, groupItem], true);
    setSelectedIds([groupId]);
  };

  const handleUngroupSelected = () => {
    if (selectedIds.length !== 1) return;
    const target = currentProject.items.find((it) => it.id === selectedIds[0]);
    if (target && target.type === 'group' && target.children) {
      const remaining = currentProject.items.filter((it) => it.id !== target.id);
      handleItemsChange([...remaining, ...target.children], true);
      setSelectedIds(target.children.map((c) => c.id));
    }
  };

  // Global Keyboard Shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't intercept if user is typing in a native input or textarea
      if (
        isEditingText ||
        ['INPUT', 'TEXTAREA'].includes((e.target as HTMLElement).tagName)
      ) {
        return;
      }

      const isCtrlOrCmd = e.ctrlKey || e.metaKey;

      // Undo: Ctrl+Z
      if (isCtrlOrCmd && !e.shiftKey && e.key.toLowerCase() === 'z') {
        e.preventDefault();
        handleUndo();
        return;
      }

      // Redo: Ctrl+Shift+Z or Ctrl+Y
      if ((isCtrlOrCmd && e.shiftKey && e.key.toLowerCase() === 'z') || (isCtrlOrCmd && e.key.toLowerCase() === 'y')) {
        e.preventDefault();
        handleRedo();
        return;
      }

      // Copy: Ctrl+C
      if (isCtrlOrCmd && e.key.toLowerCase() === 'c') {
        e.preventDefault();
        handleCopySelected();
        return;
      }

      // Paste: Ctrl+V
      if (isCtrlOrCmd && e.key.toLowerCase() === 'v') {
        e.preventDefault();
        handlePaste();
        return;
      }

      // Duplicate: Ctrl+D
      if (isCtrlOrCmd && e.key.toLowerCase() === 'd') {
        e.preventDefault();
        handleDuplicateSelected();
        return;
      }

      // Select All: Ctrl+A
      if (isCtrlOrCmd && e.key.toLowerCase() === 'a') {
        e.preventDefault();
        setSelectedIds(currentProject.items.map((it) => it.id));
        return;
      }

      // Delete: Delete or Backspace
      if (e.key === 'Delete' || e.key === 'Backspace') {
        e.preventDefault();
        handleDeleteSelected();
        return;
      }

      // Escape: Deselect all and exit zen mode
      if (e.key === 'Escape') {
        e.preventDefault();
        setSelectedIds([]);
        setIsZenMode(false);
        return;
      }

      // Tool Switching & Zen Mode Shortcuts (without Ctrl)
      if (!isCtrlOrCmd) {
        if (e.key.toLowerCase() === 'v') setActiveTool('select');
        if (e.key.toLowerCase() === 'p') setActiveTool('pen');
        if (e.key.toLowerCase() === 'e') setActiveTool('eraser');
        if (e.key.toLowerCase() === 't') setActiveTool('text');
        if (e.key.toLowerCase() === 'h') setActiveTool('hand');
        if (e.key.toLowerCase() === 'f') {
          e.preventDefault();
          setIsZenMode((prev) => !prev);
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [
    isEditingText,
    handleUndo,
    handleRedo,
    handleCopySelected,
    handlePaste,
    handleDuplicateSelected,
    handleDeleteSelected,
    currentProject.items,
  ]);

  return (
    <div className="flex flex-col w-screen h-screen overflow-hidden bg-white dark:bg-zinc-900 font-sans select-none">
      {/* Top Bar - Hidden when in Zen Mode */}
      {!isZenMode && (
        <TopBar
          projectName={currentProject.name}
          onRename={handleRenameProject}
          onNewProject={handleNewProject}
          canUndo={undoStack.length > 0}
          canRedo={redoStack.length > 0}
          onUndo={handleUndo}
          onRedo={handleRedo}
          zoom={currentProject.viewport.zoom}
          onZoomChange={(newZoom) =>
            handleViewportChange({ ...currentProject.viewport, zoom: newZoom })
          }
          onResetZoom={handleResetZoom}
          onFitToScreen={handleFitToScreen}
          onOpenProjects={() => setShowProjectsModal(true)}
          onOpenExport={() => setShowExportModal(true)}
          onOpenHelp={() => setShowShortcutsModal(true)}
          isDarkMode={isDarkMode}
          onToggleTheme={() => setIsDarkMode(!isDarkMode)}
          isSaving={isSaving}
          isZenMode={isZenMode}
          onToggleZenMode={() => setIsZenMode(!isZenMode)}
          onClearBoard={handleClearBoard}
        />
      )}

      {/* Floating Restore Controls Button when in Zen Mode */}
      {isZenMode && (
        <button
          onClick={() => setIsZenMode(false)}
          className="absolute top-4 right-4 z-40 flex items-center gap-2 px-3.5 py-2 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md rounded-full shadow-2xl border border-slate-200 dark:border-slate-800 text-xs font-semibold text-slate-800 dark:text-slate-100 hover:scale-105 active:scale-95 transition-all group"
          title="Sair da tela cheia e restaurar ferramentas (Tecla F ou Esc)"
        >
          <PanelTopOpen className="w-4 h-4 text-blue-600" />
          <span>Restaurar Painéis</span>
          <kbd className="px-1.5 py-0.5 text-[10px] bg-slate-100 dark:bg-slate-800 rounded font-mono text-slate-500">F</kbd>
        </button>
      )}

      {/* Main Workspace */}
      <div className={`relative flex-1 w-full overflow-hidden ${isZenMode ? 'h-screen' : 'h-[calc(100vh-3.5rem)]'}`}>
        {/* Left Toolbar */}
        <Toolbar
          activeTool={activeTool}
          onSelectTool={setActiveTool}
          selectedShapeType={selectedShapeType}
          onSelectShapeType={setSelectedShapeType}
          isCollapsed={isToolbarCollapsed}
          isZenMode={isZenMode}
          onToggleCollapse={() => setIsToolbarCollapsed(!isToolbarCollapsed)}
          onInsertShapeDirectly={(shapeType) => {
            // Inserts at center of current view
            const screenCenter = {
              x: window.innerWidth / 2,
              y: (window.innerHeight - 56) / 2,
            };
            const worldCenter = {
              x: (screenCenter.x - currentProject.viewport.x) / currentProject.viewport.zoom,
              y: (screenCenter.y - currentProject.viewport.y) / currentProject.viewport.zoom,
            };

            const baseWidth = shapeType === 'circle' || shapeType === 'square' ? 140 : shapeType === 'line' || shapeType === 'arrow' || shapeType === 'double-arrow' ? 180 : 180;
            const baseHeight = shapeType === 'circle' || shapeType === 'square' ? 140 : shapeType === 'line' || shapeType === 'arrow' || shapeType === 'double-arrow' ? 0 : 120;

            const newShape: CanvasItem = {
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

            handleItemsChange([...currentProject.items, newShape], true);
            setSelectedIds([newShape.id]);
            setActiveTool('select');
          }}
        />

        {/* Contextual Properties Panel */}
        <PropertiesPanel
          activeTool={activeTool}
          selectedItems={currentProject.items.filter((it) => selectedIds.includes(it.id))}
          penColor={penColor}
          onPenColorChange={setPenColor}
          penWidth={penWidth}
          onPenWidthChange={setPenWidth}
          eraserSize={eraserSize}
          onEraserSizeChange={setEraserSize}
          onUpdateSelectedItems={handleUpdateSelectedItems}
          onDuplicateSelected={handleDuplicateSelected}
          onDeleteSelected={handleDeleteSelected}
          onBringToFront={handleBringToFront}
          onSendToBack={handleSendToBack}
          onBringForward={handleBringForward}
          onSendBackward={handleSendBackward}
          onGroupSelected={handleGroupSelected}
          onUngroupSelected={handleUngroupSelected}
          isCollapsed={isPropertiesCollapsed}
          isZenMode={isZenMode}
          onToggleCollapse={() => setIsPropertiesCollapsed(!isPropertiesCollapsed)}
        />

        {/* Welcome & Quick Tips Floating Card (Dismissible) */}
        {showWelcomeBanner && !isZenMode && currentProject.items.length === 0 && (
          <div className="absolute bottom-16 sm:bottom-6 left-1/2 -translate-x-1/2 z-20 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md px-4 py-2.5 rounded-2xl shadow-xl border border-blue-200 dark:border-blue-900 flex items-center gap-3 text-xs text-slate-700 dark:text-slate-300 animate-in fade-in slide-in-from-bottom-2 duration-300">
            <Sparkles className="w-4 h-4 text-blue-600 dark:text-blue-400 shrink-0" />
            <span>
              Quadro pronto! Selecione a <strong>Caneta</strong> ou <strong>Formas</strong> para começar a desenhar.
            </span>
            <button
              onClick={() => setShowShortcutsModal(true)}
              className="text-blue-600 dark:text-blue-400 font-semibold underline hover:no-underline ml-1"
            >
              Ver atalhos
            </button>
            <button
              onClick={() => setShowWelcomeBanner(false)}
              className="p-1 rounded-full text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
              title="Fechar dica"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        {/* Central Interactive Canvas */}
        <CanvasView
          items={currentProject.items}
          onItemsChange={handleItemsChange}
          viewport={currentProject.viewport}
          onViewportChange={handleViewportChange}
          activeTool={activeTool}
          onToolChange={setActiveTool}
          selectedShapeType={selectedShapeType}
          selectedIds={selectedIds}
          onSelectIds={setSelectedIds}
          penColor={penColor}
          penWidth={penWidth}
          eraserSize={eraserSize}
          backgroundColor={currentProject.backgroundColor}
          gridStyle={currentProject.gridStyle}
          isDarkMode={isDarkMode}
          onEditingTextChange={setIsEditingText}
        />
      </div>

      {/* Project Manager Modal */}
      <ProjectManagerModal
        isOpen={showProjectsModal}
        onClose={() => setShowProjectsModal(false)}
        projects={projectsList}
        currentProjectId={currentProject.id}
        onSelectProject={handleSelectProject}
        onNewProject={handleNewProject}
        onDuplicateProject={handleDuplicateProject}
        onDeleteProject={handleDeleteProject}
        onRenameProject={handleRenameProjectInList}
      />

      {/* Export Modal */}
      <ExportModal
        isOpen={showExportModal}
        onClose={() => setShowExportModal(false)}
        project={currentProject}
        items={currentProject.items}
        backgroundColor={currentProject.backgroundColor}
        onImportProject={(imported) => {
          setCurrentProject(imported);
          setUndoStack([]);
          setRedoStack([]);
          setSelectedIds([]);
          triggerAutoSave(imported);
        }}
      />

      {/* Shortcuts & Help Modal */}
      <ShortcutsModal
        isOpen={showShortcutsModal}
        onClose={() => setShowShortcutsModal(false)}
      />
    </div>
  );
}
