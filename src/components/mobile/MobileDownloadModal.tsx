import React, { useState } from 'react';
import { X, Smartphone, Download, QrCode, Copy, Check, ShieldCheck, Sparkles } from 'lucide-react';

interface MobileDownloadModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const MobileDownloadModal: React.FC<MobileDownloadModalProps> = ({ isOpen, onClose }) => {
  const [copiedIp, setCopiedIp] = useState(false);
  const mobileUrl = 'https://mihon-tracker.onrender.com';
  const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=220x220&data=${encodeURIComponent(
    mobileUrl
  )}&color=1e1238&bgcolor=ffffff&qzone=1`;

  if (!isOpen) return null;

  const handleCopyIp = () => {
    navigator.clipboard.writeText(mobileUrl);
    setCopiedIp(true);
    setTimeout(() => setCopiedIp(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-[#1E1238]/60 backdrop-blur-md animate-fadeIn">
      <div className="w-full max-w-md bg-white/95 border border-purple-100 rounded-3xl p-5 shadow-2xl max-h-[90vh] overflow-y-auto no-scrollbar space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-[#F3E8FF]">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-2xl bg-[#F3E8FF] flex items-center justify-center text-[#7C3AED]">
              <Smartphone className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-black text-[#1E1238]">Descargas & Acceso Móvil</h2>
              <p className="text-xs font-semibold text-[#6B7280]">APKs oficiales y Acceso Web 24/7</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-[#F3EFFC] flex items-center justify-center text-[#6B7280] hover:text-[#1E1238] transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content */}
        <div className="space-y-3.5 text-xs text-[#1E1238]">
          {/* Card 1: Mihon Tracker APK */}
          <div className="rounded-2xl bg-[#FAF9FE] border border-purple-100 p-4 space-y-2">
            <div className="flex items-start justify-between">
              <div>
                <span className="text-[10px] font-black text-[#7C3AED] uppercase bg-[#F3E8FF] px-2.5 py-0.5 rounded-full inline-block">
                  APK Tracker Oficial
                </span>
                <h3 className="text-sm font-black text-[#1E1238] mt-1">
                  Mihon Tracker APK v1.0.0
                </h3>
                <p className="text-[#6B7280] text-[11px] font-medium mt-0.5">
                  Estadísticas, Historial, Calendario de lectura y Biblioteca
                </p>
              </div>
              <ShieldCheck className="w-5 h-5 text-[#10B981] flex-shrink-0" />
            </div>

            <a
              href="https://github.com/MZapicoCabeza/mihon-tracker/releases/download/v1.0.0-16/app-debug.apk"
              className="mt-2 w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl bg-gradient-to-r from-[#8B5CF6] to-[#7C3AED] text-white font-bold text-xs shadow-xs hover:brightness-105 transition-all"
            >
              <Download className="w-4 h-4" />
              <span>Descargar APK Tracker</span>
            </a>
          </div>

          {/* Card 2: Mihon Sync Reader APK */}
          <div className="rounded-2xl bg-[#FAF9FE] border border-purple-100 p-4 space-y-2">
            <div className="flex items-start justify-between">
              <div>
                <span className="text-[10px] font-black text-[#047857] uppercase bg-[#ECFDF5] px-2.5 py-0.5 rounded-full inline-block">
                  Lector Modificado
                </span>
                <h3 className="text-sm font-black text-[#1E1238] mt-1">
                  Mihon Sync (v1.0.0-10)
                </h3>
                <p className="text-[#6B7280] text-[11px] font-medium mt-0.5">
                  Sincronización en tiempo real sin perder tu Mihon original
                </p>
              </div>
              <Sparkles className="w-5 h-5 text-[#F59E0B] flex-shrink-0" />
            </div>

            <a
              href="https://github.com/MZapicoCabeza/mihon/releases/download/mihon-v1.0.0-10/app-dev-arm64-v8a.apk"
              className="mt-2 w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl bg-gradient-to-r from-[#10B981] to-[#059669] text-white font-bold text-xs shadow-xs hover:brightness-105 transition-all"
            >
              <Download className="w-4 h-4" />
              <span>Descargar APK Mihon Sync</span>
            </a>
          </div>

          {/* Card 3: Open 24/7 on Render via QR Code */}
          <div className="rounded-2xl bg-[#FAF9FE] border border-purple-100 p-4 space-y-3">
            <div className="flex items-center gap-2">
              <QrCode className="w-4 h-4 text-[#7C3AED]" />
              <h4 className="text-xs font-black text-[#1E1238] uppercase">
                Abrir en tu móvil 24/7 (Web Cloud):
              </h4>
            </div>

            <div className="flex items-center gap-4">
              <div className="p-2 rounded-xl bg-white border border-purple-100 flex-shrink-0 shadow-2xs">
                <img
                  src={qrUrl}
                  alt="QR Code"
                  className="w-20 h-20 rounded-lg"
                  loading="lazy"
                />
              </div>

              <div className="space-y-1.5 flex-1 min-w-0">
                <p className="text-[11px] font-semibold text-[#6B7280]">
                  Escanea con tu cámara o abre:
                </p>
                <div className="flex items-center gap-1.5 p-2 rounded-xl bg-white border border-purple-100 text-[10px] font-mono font-bold text-[#1E1238]">
                  <span className="truncate flex-1">{mobileUrl}</span>
                  <button
                    onClick={handleCopyIp}
                    className="p-1 hover:text-[#7C3AED] transition-colors"
                    title="Copiar URL"
                  >
                    {copiedIp ? <Check className="w-3.5 h-3.5 text-[#10B981]" /> : <Copy className="w-3.5 h-3.5" />}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
