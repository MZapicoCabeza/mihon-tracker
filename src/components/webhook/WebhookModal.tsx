import React, { useState } from 'react';
import { X, Send, Check, Copy, Radio, Code2 } from 'lucide-react';
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
  const [chapterOffset] = useState<number>(1);
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
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-3 sm:p-4 bg-black/40 backdrop-blur-sm animate-fadeIn">
      <div className="w-full max-w-lg bg-[#FAF7F2] border-[2px] border-[#2D2926] rounded-3xl p-5 shadow-[0_10px_0px_#2D2926] max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b-[1.5px] border-[#E8E0D5]">
          <div className="flex items-center gap-2">
            <div className="w-9 h-9 rounded-xl bg-[#A8D5BA] border-[1.5px] border-[#2D2926] flex items-center justify-center text-[#242220] shadow-sm">
              <Radio className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-base font-black text-[#242220]">Webhook Mihon (Cloud)</h2>
              <p className="text-xs font-bold text-[#7A746E]">Servicio activo en Render 24/7</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-white border-[1.5px] border-[#2D2926] flex items-center justify-center text-[#242220] hover:bg-[#F0EBE1] transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content */}
        <div className="space-y-4 pt-4 text-xs text-[#242220]">
          {/* Endpoint Info */}
          <div className="p-3.5 rounded-2xl bg-white border-[1.8px] border-[#2D2926] shadow-sm">
            <div className="flex items-center justify-between mb-1.5">
              <span className="font-extrabold text-[#7A746E] uppercase text-[10px] tracking-wider">
                URL Cloud (POST en Mihon)
              </span>
              <span className="text-[10px] text-[#242220] font-black bg-[#A8D5BA] px-2 py-0.5 rounded-full border border-[#2D2926]">
                ONLINE 24/7
              </span>
            </div>
            <code className="text-xs font-mono font-bold text-[#242220] break-all select-all block bg-[#FAF7F2] p-2 rounded-xl border border-[#2D2926]">
              POST https://mihon-tracker.onrender.com/api/track
            </code>
          </div>

          {/* Test Simulator Selection */}
          <div className="space-y-1.5">
            <label className="font-black text-[#242220] flex items-center justify-between">
              <span>Selecciona Manga para Simular:</span>
              <span className="text-xs font-extrabold text-[#52796F]">
                Capítulo actual: {currentManga.currentChapter}
              </span>
            </label>
            <select
              value={selectedMangaId}
              onChange={(e) => setSelectedMangaId(e.target.value)}
              className="w-full px-3 py-2.5 rounded-xl bg-white border-[1.8px] border-[#2D2926] text-sm font-black text-[#242220] focus:outline-none shadow-sm"
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
              <span className="font-extrabold text-[#7A746E] flex items-center gap-1">
                <Code2 className="w-3.5 h-3.5" />
                Payload JSON generado desde Mihon:
              </span>
              <button
                onClick={handleCopy}
                className="flex items-center gap-1 text-[11px] font-black text-[#242220] hover:text-[#52796F]"
              >
                {copied ? <Check className="w-3 h-3 text-[#52796F]" /> : <Copy className="w-3 h-3" />}
                <span>{copied ? 'Copiado' : 'Copiar'}</span>
              </button>
            </div>
            <pre className="p-3 rounded-xl bg-white border-[1.8px] border-[#2D2926] font-mono text-[11px] text-[#242220] overflow-x-auto leading-relaxed shadow-sm">
              {JSON.stringify(samplePayload, null, 2)}
            </pre>
          </div>

          {/* Dispatch Button */}
          <button
            onClick={handleDispatch}
            disabled={dispatched}
            className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-full bg-[#F8C866] border-[2px] border-[#2D2926] text-[#242220] font-black text-sm shadow-[0_4px_0px_#2D2926] hover:translate-y-[-1px] transition-all disabled:opacity-50"
          >
            {dispatched ? (
              <>
                <Check className="w-4 h-4 stroke-[3]" />
                <span>¡Capítulo #{simulatedChapter} Sincronizado en Render!</span>
              </>
            ) : (
              <>
                <Send className="w-4 h-4 stroke-[2.5]" />
                <span>Simular Terminar Capítulo #{simulatedChapter}</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
