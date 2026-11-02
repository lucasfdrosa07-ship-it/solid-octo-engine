import React from 'react';
import { X, Keyboard, Sparkles, MousePointer, Touchpad, CheckCircle } from 'lucide-react';

interface ShortcutsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const ShortcutsModal: React.FC<ShortcutsModalProps> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  const shortcuts = [
    { key: 'V', desc: 'Ferramenta Seleção & Mover' },
    { key: 'P', desc: 'Caneta de Desenho Livre' },
    { key: 'E', desc: 'Borracha Pontual' },
    { key: 'T', desc: 'Inserir Caixa de Texto' },
    { key: 'H', desc: 'Mão para Navegação (Pan)' },
    { key: 'Segurar Shift', desc: 'Linhas 100% retas (0°, 45°, 90°) e formas proporcionais' },
    { key: 'Shift + Mover', desc: 'Travar movimento em linha reta horizontal ou vertical' },
    { key: 'Ctrl + Z', desc: 'Desfazer última ação' },
    { key: 'Ctrl + Shift + Z', desc: 'Refazer ação' },
    { key: 'Ctrl + C / V', desc: 'Copiar e Colar objetos selecionados' },
    { key: 'Ctrl + D', desc: 'Duplicar objeto' },
    { key: 'Delete / Backspace', desc: 'Excluir objeto selecionado' },
    { key: 'Ctrl + A', desc: 'Selecionar todos os objetos' },
    { key: 'Espaço + Arrastar', desc: 'Mover quadro temporariamente' },
    { key: 'F', desc: 'Alternar Quadro Limpo (Tela Cheia)' },
    { key: 'Ctrl + Roda Mouse', desc: 'Zoom focalizado no cursor' },
    { key: 'Dois dedos no touch', desc: 'Zoom por pinça e navegação fluida' },
  ];

  return (
    <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-150">
      <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 w-full max-w-lg overflow-hidden text-slate-800 dark:text-slate-200">
        <div className="px-5 py-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Keyboard className="w-5 h-5 text-blue-600" />
            <h2 className="text-base font-bold text-slate-900 dark:text-white">Atalhos & Dicas de Uso</h2>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-5 max-h-[75vh] overflow-y-auto space-y-4">
          <div className="p-3 bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-900 rounded-xl flex items-start gap-3">
            <Sparkles className="w-5 h-5 text-blue-600 dark:text-blue-400 shrink-0 mt-0.5" />
            <div className="text-xs text-blue-900 dark:text-blue-200">
              <span className="font-bold">Dica da Borracha:</span> A borracha do QuadroStudio apaga apenas as partes tocadas do traço manual sem apagar formas geométricas ou caixas de texto.
            </div>
          </div>

          <div className="space-y-2">
            {shortcuts.map((sc, i) => (
              <div
                key={i}
                className="flex items-center justify-between py-1.5 px-2 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800/50 text-xs"
              >
                <span className="text-slate-600 dark:text-slate-300">{sc.desc}</span>
                <kbd className="px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 font-mono text-[11px] font-semibold text-slate-800 dark:text-slate-200 shadow-xs">
                  {sc.key}
                </kbd>
              </div>
            ))}
          </div>

          <button
            onClick={onClose}
            className="w-full mt-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-xl shadow-xs transition-colors"
          >
            Entendido, começar a criar!
          </button>
        </div>
      </div>
    </div>
  );
};
