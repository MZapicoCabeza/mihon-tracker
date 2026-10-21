import React, { useState } from 'react';
import { X, Smartphone, Download, QrCode, Copy, Check, ExternalLink, ShieldCheck, Sparkles, Terminal } from 'lucide-react';

interface MobileDownloadModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const MobileDownloadModal: React.FC<MobileDownloadModalProps> = ({ isOpen, onClose }) => {
  const [copiedIp, setCopiedIp] = useState(false);
  const mobileUrl = 'http://192.168.1.18:3000';
  const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=220x220&data=${encodeURIComponent(
    mobileUrl
  )}&color=c084fc&bgcolor=140f26&qzone=1`;

  if (!isOpen) return null;

  const handleCopyIp = () => {
    navigator.clipboard.writeText(mobileUrl);
    setCopiedIp(true);
    setTimeout(() => setCopiedIp(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fadeIn">
      <div className="w-full max-w-md bg-[#130e26] border border-purple-800/50 rounded-3xl p-5 shadow-[0_10px_50px_rgba(0,0,0,0.9),0_0_40px_rgba(168,85,247,0.25)] max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-purple-900/40">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-xl bg-purple-600/20 text-purple-400 border border-purple-500/30">
              <Smartphone className="w-5 h-5 text-purple-400" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white">Instalar en tu Móvil</h2>
              <p className="text-xs text-purple-300">Descarga de APK y App PWA</p>
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
        <div className="space-y-4 pt-4 text-xs">
          {/* Card 1: Direct Download APK */}
          <div className="rounded-2xl bg-gradient-to-br from-[#1d143a] to-[#120d26] border border-purple-500/40 p-4 shadow-[0_4px_20px_rgba(168,85,247,0.2)]">
            <div className="flex items-start justify-between">
              <div>
                <span className="text-[10px] font-bold text-emerald-400 uppercase tracking-wider bg-emerald-950/80 px-2 py-0.5 rounded-full border border-emerald-800/40">
                  APK Listo para Descargar
                </span>
                <h3 className="text-base font-extrabold text-white mt-1">
                  Mihon v0.21.2 (ARM64)
                </h3>
                <p className="text-gray-300 text-[11px] mt-0.5">
                  Tamaño: 27.7 MB • Compatible con Android 8.0 o superior
                </p>
              </div>
              <ShieldCheck className="w-6 h-6 text-emerald-400 flex-shrink-0" />
            </div>

            <a
              href="/mihon-arm64.apk"
              download="mihon-arm64-v0.21.2.apk"
              className="mt-3 w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl bg-gradient-to-r from-purple-600 via-fuchsia-600 to-purple-600 text-white font-bold text-xs shadow-[0_0_15px_rgba(168,85,247,0.4)] hover:shadow-[0_0_25px_rgba(168,85,247,0.6)] transition-all transform active:scale-95"
            >
              <Download className="w-4 h-4" />
              <span>Descargar APK al Móvil (27.7 MB)</span>
            </a>
          </div>

          {/* Card 2: Open on Mobile via QR Code / Local Wi-Fi */}
          <div className="rounded-2xl bg-[#17112e] border border-purple-900/40 p-4 space-y-3">
            <div className="flex items-center gap-2">
              <QrCode className="w-4 h-4 text-purple-400" />
              <h4 className="text-xs font-bold text-white uppercase tracking-wider">
                Escanear para abrir en tu móvil:
              </h4>
            </div>

            <div className="flex items-center gap-4">
              {/* QR Image */}
              <div className="p-2 rounded-xl bg-[#140f26] border border-purple-800/40 flex-shrink-0">
                <img
                  src={qrUrl}
                  alt="QR Code para móvil"
                  className="w-24 h-24 rounded-lg"
                  loading="lazy"
                />
              </div>

              {/* Steps */}
              <div className="space-y-1.5 flex-1 min-w-0">
                <p className="text-[11px] text-gray-300">
                  1. Conecta tu móvil al mismo Wi-Fi.
                </p>
                <p className="text-[11px] text-gray-300">
                  2. Escanea el código o entra a:
                </p>
                <div className="flex items-center gap-1.5 p-1.5 rounded-lg bg-black/50 border border-purple-900/40 text-[10px] font-mono text-purple-300">
                  <span className="truncate flex-1">{mobileUrl}</span>
                  <button
                    onClick={handleCopyIp}
                    className="p-1 hover:text-white transition-colors"
                    title="Copiar URL"
                  >
                    {copiedIp ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Card 3: PWA Installation instructions */}
          <div className="rounded-2xl bg-[#151028] border border-purple-900/30 p-3.5 space-y-2">
            <h4 className="text-xs font-bold text-purple-300 flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-purple-400" />
              Cómo instalar la app Tracker en tu pantalla de inicio:
            </h4>
            <ol className="list-decimal list-inside space-y-1 text-[11px] text-gray-400 pl-1">
              <li>Abre el enlace en Chrome desde tu móvil.</li>
              <li>Toca los tres puntos <strong className="text-gray-200">⋮</strong> (menú arriba a la derecha).</li>
              <li>Selecciona <strong className="text-purple-300">"Añadir a pantalla de inicio"</strong> o <strong className="text-purple-300">"Instalar aplicación"</strong>.</li>
            </ol>
          </div>

          {/* Card 4: Custom Fork compilation with GitHub Actions */}
          <div className="rounded-2xl bg-[#151028] border border-purple-900/30 p-3.5 space-y-2">
            <h4 className="text-xs font-bold text-gray-200 flex items-center gap-1.5">
              <Terminal className="w-3.5 h-3.5 text-purple-400" />
              Compilar el Fork con TrackerService en GitHub:
            </h4>
            <p className="text-[11px] text-gray-400">
              El repositorio ya cuenta con el flujo de trabajo de <strong className="text-gray-200">GitHub Actions</strong> (`.github/workflows/build.yml`). Al hacer push de la rama <code className="text-purple-300">feature/custom-tracker</code> a tu repositorio en GitHub, GitHub compilará automáticamente el APK personalizado y te entregará el archivo listo para instalar.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
