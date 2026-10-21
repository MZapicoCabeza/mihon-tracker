import React, { useState } from 'react';
import { X, Send, Check, Copy, Radio, ArrowRight, Zap, Code2 } from 'lucide-react';
import { MangaItem } from '../../types/tracker';

interface WebhookModalProps {
  isOpen: boolean;
  onClose: () => void;
  mangas: MangaItem[];
  onSimulateWebhook: (payload: {
    manga_id: string;
    manga_title: string;
    chapter_number: number;
    cover_url: string;
    timestamp: string;
    genres: string[];
  }) => void;
}

export const WebhookModal: React.FC<WebhookModalProps> = ({
  isOpen,
  onClose,
  mangas,
  onSimulateWebhook,
}) => {
  const [selectedMangaId, setSelectedMangaId] = useState<string>(mangas[0]?.id || '12345');
  const [chapterOffset, setChapterOffset] = useState<number>(1);
  const [copied, setCopied] = useState(false);
  const [dispatched, setDispatched] = useState(false);

  if (!isOpen) return null;

  const currentManga = mangas.find((m) => m.id === selectedMangaId) || mangas[0];
  const simulatedChapter = (currentManga?.currentChapter || 100) + chapterOffset;

  const samplePayload = {
    manga_id: currentManga.id,
    manga_title: currentManga.title,
    chapter_number: simulatedChapter,
    cover_url: currentManga.coverUrl,
    timestamp: new Date().toISOString(),
    genres: currentManga.genres,
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(JSON.stringify(samplePayload, null, 2));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDispatch = () => {
    onSimulateWebhook(samplePayload);
    setDispatched(true);
    setTimeout(() => {
      setDispatched(false);
      onClose();
    }, 700);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/70 backdrop-blur-sm animate-fadeIn">
      <div className="w-full max-w-lg bg-[#140f26] border border-purple-900/60 rounded-t-3xl sm:rounded-3xl p-5 shadow-[0_10px_50px_rgba(0,0,0,0.8),0_0_30px_rgba(168,85,247,0.2)] max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-purple-900/40">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-xl bg-purple-600/20 text-purple-400 border border-purple-500/30">
              <Radio className="w-5 h-5 text-purple-400" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white">Integración Mihon Webhook</h2>
              <p className="text-xs text-purple-300">CustomTrackerService en Kotlin</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-xl bg-purple-950/40 hover:bg-purple-900/40 text-gray-400 hover:text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="space-y-4 pt-4 text-xs text-gray-300">
          {/* Endpoint Info */}
          <div className="p-3 rounded-xl bg-[#191230] border border-purple-900/30">
            <div className="flex items-center justify-between mb-1">
              <span className="font-semibold text-gray-400 uppercase text-[10px] tracking-wider">
                URL de Escucha (Mihon Fork POST)
              </span>
              <span className="text-[10px] text-emerald-400 font-bold bg-emerald-950/80 px-2 py-0.5 rounded border border-emerald-800/40">
                HTTP 200 OK
              </span>
            </div>
            <code className="text-[11px] font-mono text-purple-300 break-all select-all">
              POST https://mihon-tracker.onrender.com/api/track
            </code>
          </div>

          {/* Test Simulator Selection */}
          <div className="space-y-2">
            <label className="font-semibold text-gray-300 flex items-center justify-between">
              <span>Selecciona Manga para Simular Lectura:</span>
              <span className="text-[11px] text-purple-400 font-bold">
                Capítulo actual: {currentManga.currentChapter}
              </span>
            </label>
            <select
              value={selectedMangaId}
              onChange={(e) => setSelectedMangaId(e.target.value)}
              className="w-full px-3 py-2 rounded-xl bg-[#1a1333] border border-purple-900/50 text-white focus:outline-none focus:border-purple-500"
            >
              {mangas.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.title} (Capítulo {m.currentChapter})
                </option>
              ))}
            </select>
          </div>

          {/* Payload Preview */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <span className="font-semibold text-gray-400 flex items-center gap-1">
                <Code2 className="w-3.5 h-3.5 text-purple-400" />
                Payload JSON generado desde Mihon:
              </span>
              <button
                onClick={handleCopy}
                className="flex items-center gap-1 text-[11px] text-purple-400 hover:text-purple-300"
              >
                {copied ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                <span>{copied ? 'Copiado' : 'Copiar JSON'}</span>
              </button>
            </div>
            <pre className="p-3 rounded-xl bg-black/60 border border-purple-900/30 font-mono text-[11px] text-purple-200 overflow-x-auto leading-relaxed">
              {JSON.stringify(samplePayload, null, 2)}
            </pre>
          </div>

          {/* Dispatch Button */}
          <button
            onClick={handleDispatch}
            disabled={dispatched}
            className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-xl bg-gradient-to-r from-purple-600 via-fuchsia-600 to-purple-600 text-white font-bold text-sm shadow-[0_0_20px_rgba(168,85,247,0.4)] hover:shadow-[0_0_28px_rgba(168,85,247,0.6)] transition-all transform active:scale-95 disabled:opacity-50"
          >
            {dispatched ? (
              <>
                <Check className="w-4 h-4 text-emerald-300" />
                <span>¡Capítulo #{simulatedChapter} Sincronizado!</span>
              </>
            ) : (
              <>
                <Send className="w-4 h-4" />
                <span>Simular Terminar Capítulo #{simulatedChapter}</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
