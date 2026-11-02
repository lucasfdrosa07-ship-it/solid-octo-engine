import React, { useState, useRef } from 'react';
import {
  X,
  Download,
  Upload,
  FileImage,
  FileCode,
  FileJson,
  Check,
  AlertCircle
} from 'lucide-react';
import { CanvasItem, ProjectData } from '../types/canvas';
import {
  downloadBlob,
  exportToImage,
  exportToJson,
  exportToSvg,
  validateAndImportJson
} from '../services/export';

interface ExportModalProps {
  isOpen: boolean;
  onClose: () => void;
  project: ProjectData;
  items: CanvasItem[];
  backgroundColor: string;
  onImportProject: (imported: ProjectData) => void;
}

export const ExportModal: React.FC<ExportModalProps> = ({
  isOpen,
  onClose,
  project,
  items,
  backgroundColor,
  onImportProject,
}) => {
  const [format, setFormat] = useState<'png' | 'jpeg' | 'svg' | 'json'>('png');
  const [transparentBg, setTransparentBg] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [importError, setImportError] = useState<string | null>(null);
  const [importSuccess, setImportSuccess] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  const handleExport = async () => {
    setIsExporting(true);
    const sanitizedTitle = (project.name || 'quadro').replace(/[^a-zA-Z0-9_-]/g, '_');

    try {
      if (format === 'png' || format === 'jpeg') {
        const blob = await exportToImage(items, format, transparentBg, backgroundColor);
        if (blob) {
          downloadBlob(blob, `${sanitizedTitle}.${format === 'png' ? 'png' : 'jpg'}`);
        }
      } else if (format === 'svg') {
        const svgContent = exportToSvg(items, transparentBg, backgroundColor);
        const blob = new Blob([svgContent], { type: 'image/svg+xml;charset=utf-8' });
        downloadBlob(blob, `${sanitizedTitle}.svg`);
      } else if (format === 'json') {
        const jsonContent = exportToJson({
          ...project,
          items,
        });
        const blob = new Blob([jsonContent], { type: 'application/json;charset=utf-8' });
        downloadBlob(blob, `${sanitizedTitle}.quadro.json`);
      }
    } catch (err) {
      console.error('Export error:', err);
    } finally {
      setIsExporting(false);
      onClose();
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setImportError(null);
    setImportSuccess(false);

    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      const result = validateAndImportJson(content);
      if (result.valid && result.project) {
        setImportSuccess(true);
        setTimeout(() => {
          onImportProject(result.project!);
          onClose();
        }, 500);
      } else {
        setImportError(result.error || 'Arquivo inválido.');
      }
    };
    reader.onerror = () => {
      setImportError('Falha ao ler o arquivo selecionado.');
    };
    reader.readAsText(file);
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-150">
      <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 w-full max-w-lg overflow-hidden text-slate-800 dark:text-slate-200">
        {/* Header */}
        <div className="px-5 py-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Download className="w-5 h-5 text-blue-600" />
            <h2 className="text-base font-bold text-slate-900 dark:text-white">Exportar & Importar</h2>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="p-5 space-y-5">
          {/* Section 1: Choose format */}
          <div>
            <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2.5">
              Formato de Exportação
            </label>
            <div className="grid grid-cols-2 gap-2.5">
              {/* PNG */}
              <button
                onClick={() => setFormat('png')}
                className={`p-3 rounded-xl border flex items-center gap-3 transition-all ${
                  format === 'png'
                    ? 'border-blue-600 bg-blue-50/60 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 font-semibold'
                    : 'border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300'
                }`}
              >
                <FileImage className="w-5 h-5 shrink-0" />
                <div className="text-left">
                  <div className="text-xs font-bold">PNG</div>
                  <div className="text-[10px] opacity-75">Imagem de alta qualidade</div>
                </div>
              </button>

              {/* JPG */}
              <button
                onClick={() => setFormat('jpeg')}
                className={`p-3 rounded-xl border flex items-center gap-3 transition-all ${
                  format === 'jpeg'
                    ? 'border-blue-600 bg-blue-50/60 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 font-semibold'
                    : 'border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300'
                }`}
              >
                <FileImage className="w-5 h-5 shrink-0" />
                <div className="text-left">
                  <div className="text-xs font-bold">JPG</div>
                  <div className="text-[10px] opacity-75">Fundo sólido compacto</div>
                </div>
              </button>

              {/* SVG */}
              <button
                onClick={() => setFormat('svg')}
                className={`p-3 rounded-xl border flex items-center gap-3 transition-all ${
                  format === 'svg'
                    ? 'border-blue-600 bg-blue-50/60 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 font-semibold'
                    : 'border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300'
                }`}
              >
                <FileCode className="w-5 h-5 shrink-0" />
                <div className="text-left">
                  <div className="text-xs font-bold">SVG</div>
                  <div className="text-[10px] opacity-75">Vetor escalável limpo</div>
                </div>
              </button>

              {/* JSON */}
              <button
                onClick={() => setFormat('json')}
                className={`p-3 rounded-xl border flex items-center gap-3 transition-all ${
                  format === 'json'
                    ? 'border-blue-600 bg-blue-50/60 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 font-semibold'
                    : 'border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300'
                }`}
              >
                <FileJson className="w-5 h-5 shrink-0" />
                <div className="text-left">
                  <div className="text-xs font-bold">JSON Projeto</div>
                  <div className="text-[10px] opacity-75">Para reabertura futura</div>
                </div>
              </button>
            </div>
          </div>

          {/* Options for PNG/SVG */}
          {(format === 'png' || format === 'svg') && (
            <div className="p-3 bg-slate-50 dark:bg-slate-800/50 rounded-xl flex items-center justify-between">
              <div>
                <div className="text-xs font-semibold text-slate-800 dark:text-slate-200">
                  Fundo Transparente
                </div>
                <div className="text-[11px] text-slate-500">
                  Exportar sem cor de fundo do quadro
                </div>
              </div>
              <input
                type="checkbox"
                checked={transparentBg}
                onChange={(e) => setTransparentBg(e.target.checked)}
                className="w-4 h-4 rounded text-blue-600 accent-blue-600 cursor-pointer"
              />
            </div>
          )}

          {/* Export Action Button */}
          <button
            onClick={handleExport}
            disabled={isExporting}
            className="w-full py-2.5 px-4 bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white font-semibold text-xs rounded-xl shadow-md shadow-blue-500/20 flex items-center justify-center gap-2 transition-all disabled:opacity-50"
          >
            <Download className="w-4 h-4" />
            <span>{isExporting ? 'Preparando arquivo...' : `Baixar como ${format.toUpperCase()}`}</span>
          </button>

          {/* Section 2: Import JSON */}
          <div className="pt-3 border-t border-slate-200 dark:border-slate-800">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                Importar Projeto JSON
              </span>
            </div>

            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileChange}
              accept=".json"
              className="hidden"
            />

            <button
              onClick={() => fileInputRef.current?.click()}
              className="w-full py-2 px-3 border border-dashed border-slate-300 dark:border-slate-700 hover:border-blue-500 rounded-xl flex items-center justify-center gap-2 text-xs font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors"
            >
              <Upload className="w-4 h-4 text-slate-500" />
              <span>Carregar arquivo .json do seu computador</span>
            </button>

            {importError && (
              <div className="mt-2 text-[11px] text-red-600 dark:text-red-400 flex items-center gap-1.5 bg-red-50 dark:bg-red-950/40 p-2 rounded-lg">
                <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                <span>{importError}</span>
              </div>
            )}

            {importSuccess && (
              <div className="mt-2 text-[11px] text-emerald-600 dark:text-emerald-400 flex items-center gap-1.5 bg-emerald-50 dark:bg-emerald-950/40 p-2 rounded-lg">
                <Check className="w-3.5 h-3.5 shrink-0" />
                <span>Projeto importado com sucesso! Carregando...</span>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
