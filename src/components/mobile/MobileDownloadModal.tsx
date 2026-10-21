import React, { useState } from 'react';
import { X, Smartphone, Download, QrCode, Copy, Check, ShieldCheck, Sparkles, Terminal } from 'lucide-react';

interface MobileDownloadModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const MobileDownloadModal: React.FC<MobileDownloadModalProps> = ({ isOpen, onClose }) => {
  const [copiedIp, setCopiedIp] = useState(false);
  const mobileUrl = 'https://mihon-tracker.onrender.com';
  const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=220x220&data=${encodeURIComponent(
    mobileUrl
  )}&color=2d2926&bgcolor=faf7f2&qzone=1`;

  if (!isOpen) return null;

  const handleCopyIp = () => {
    navigator.clipboard.writeText(mobileUrl);
    setCopiedIp(true);
    setTimeout(() => setCopiedIp(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/40 backdrop-blur-sm animate-fadeIn">
      <div className="w-full max-w-md bg-[#FAF7F2] border-[2px] border-[#2D2926] rounded-3xl p-5 shadow-[0_10px_0px_#2D2926] max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b-[1.5px] border-[#E8E0D5]">
          <div className="flex items-center gap-2">
            <div className="w-9 h-9 rounded-xl bg-[#F6A596] border-[1.5px] border-[#2D2926] flex items-center justify-center text-[#242220] shadow-sm">
              <Smartphone className="w-5 h-5 text-[#242220]" />
            </div>
            <div>
              <h2 className="text-base font-black text-[#242220]">Instalar en tu Móvil</h2>
              <p className="text-xs font-bold text-[#7A746E]">Descarga de APK y Acceso Cloud</p>
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
          {/* Card 1: Direct Download Mihon APK */}
          <div className="rounded-2xl bg-white border-[1.8px] border-[#2D2926] p-4 shadow-[0_3px_0px_#2D2926]">
            <div className="flex items-start justify-between">
              <div>
                <span className="text-[10px] font-black text-[#242220] uppercase bg-[#A8D5BA] px-2 py-0.5 rounded-full border border-[#2D2926]">
                  APK Listo para Descargar
                </span>
                <h3 className="text-base font-black text-[#242220] mt-1.5">
                  Mihon v0.21.2 (ARM64)
                </h3>
                <p className="text-[#7A746E] text-[11px] font-bold mt-0.5">
                  Tamaño: 27.7 MB • Compatible con Android 8.0+
                </p>
              </div>
              <ShieldCheck className="w-6 h-6 text-[#52796F] flex-shrink-0" />
            </div>

            <a
              href="/mihon-arm64.apk"
              download="mihon-arm64-v0.21.2.apk"
              className="mt-3.5 w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-full bg-[#A8D5BA] border-[1.8px] border-[#2D2926] text-[#242220] font-black text-xs shadow-[0_3px_0px_#2D2926] hover:translate-y-[-1px] transition-all"
            >
              <Download className="w-4 h-4 stroke-[2.5]" />
              <span>Descargar APK al Móvil (27.7 MB)</span>
            </a>
          </div>

          {/* Card 2: Open 24/7 on Render via QR Code */}
          <div className="rounded-2xl bg-white border-[1.8px] border-[#2D2926] p-4 space-y-3 shadow-[0_3px_0px_#2D2926]">
            <div className="flex items-center gap-2">
              <QrCode className="w-4 h-4 text-[#242220]" />
              <h4 className="text-xs font-black text-[#242220] uppercase">
                Abrir en tu móvil 24/7 (Render):
              </h4>
            </div>

            <div className="flex items-center gap-4">
              <div className="p-2 rounded-xl bg-[#FAF7F2] border-[1.5px] border-[#2D2926] flex-shrink-0">
                <img
                  src={qrUrl}
                  alt="QR Code"
                  className="w-24 h-24 rounded-lg"
                  loading="lazy"
                />
              </div>

              <div className="space-y-1.5 flex-1 min-w-0">
                <p className="text-[11px] font-bold text-[#5C5651]">
                  1. Escanea el código con tu móvil o entra en:
                </p>
                <div className="flex items-center gap-1.5 p-2 rounded-xl bg-[#FAF7F2] border border-[#2D2926] text-[10px] font-mono font-bold text-[#242220]">
                  <span className="truncate flex-1">{mobileUrl}</span>
                  <button
                    onClick={handleCopyIp}
                    className="p-1 hover:text-[#52796F] transition-colors"
                    title="Copiar URL"
                  >
                    {copiedIp ? <Check className="w-3.5 h-3.5 text-[#52796F]" /> : <Copy className="w-3.5 h-3.5" />}
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Card 3: Instructions to install on Mobile */}
          <div className="rounded-2xl bg-[#FFF5F2] border-[1.8px] border-[#2D2926] p-3.5 space-y-2">
            <h4 className="text-xs font-black text-[#242220] flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-[#E27D60]" />
              Cómo poner el icono en la pantalla de tu móvil:
            </h4>
            <ol className="list-decimal list-inside space-y-1 text-[11px] font-bold text-[#5C5651] pl-1">
              <li>Abre el enlace de Render en Chrome desde tu móvil.</li>
              <li>Toca los tres puntos <strong className="text-[#242220]">⋮</strong> arriba a la derecha.</li>
              <li>Pulsa <strong className="text-[#242220]">"Añadir a pantalla de inicio"</strong>.</li>
            </ol>
          </div>
        </div>
      </div>
    </div>
  );
};
