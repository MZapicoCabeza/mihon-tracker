import React, { useState } from 'react';
import { X, RefreshCw, Upload, CheckCircle2, AlertCircle, Server, Key, ShieldCheck, Terminal, FileText } from 'lucide-react';
import { apiClient } from '../../utils/apiClient';
import { parseMihonBackupFile } from '../../utils/backupParser';

interface SyncSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSyncComplete: () => void;
  showToast: (msg: string) => void;
  lastSyncAt?: string | null;
}

export const SyncSettingsModal: React.FC<SyncSettingsModalProps> = ({
  isOpen,
  onClose,
  onSyncComplete,
  showToast,
  lastSyncAt,
}) => {
  const [activeTab, setActiveTab] = useState<'sync' | 'server' | 'dev'>('sync');
  const [serverUrl, setServerUrl] = useState(apiClient.getServerUrl());
  const [apiKey, setApiKey] = useState(apiClient.getApiKey());
  const [isTesting, setIsTesting] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [connectionMsg, setConnectionMsg] = useState('');
  const [isImporting, setIsImporting] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);

  // Dev simulation state
  const [simMangaTitle, setSimMangaTitle] = useState('Chainsaw Man');
  const [simChapter, setSimChapter] = useState(175);

  if (!isOpen) return null;

  const handleTestConnection = async () => {
    setIsTesting(true);
    setConnectionStatus('idle');
    try {
      apiClient.setServerUrl(serverUrl);
      apiClient.setApiKey(apiKey);
      const res = await apiClient.checkHealth();
      setConnectionStatus('success');
      setConnectionMsg(`Conectado exitosamente (${res.service} v${res.version})`);
    } catch (err: any) {
      setConnectionStatus('error');
      setConnectionMsg(`Error al conectar: ${err.message || 'Servidor inalcanzable'}`);
    } finally {
      setIsTesting(false);
    }
  };

  const handleSaveServerConfig = () => {
    apiClient.setServerUrl(serverUrl);
    apiClient.setApiKey(apiKey);
    showToast('Ajustes de servidor guardados');
    handleTestConnection();
  };

  const handleManualSync = async () => {
    setIsSyncing(true);
    try {
      await onSyncComplete();
      showToast('Sincronización con el servidor completada');
    } catch (err: any) {
      showToast(`Error al sincronizar: ${err.message}`);
    } finally {
      setIsSyncing(false);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsImporting(true);
    try {
      showToast(`Procesando archivo: ${file.name}...`);
      const parsed = await parseMihonBackupFile(file);

      if (parsed.mangas.length === 0) {
        throw new Error('No se encontraron mangas válidos en el archivo seleccionado.');
      }

      showToast(`Importando ${parsed.mangas.length} mangas al servidor...`);
      const res = await apiClient.importBackup({
        backupManga: parsed.mangas,
        history: parsed.history,
      });

      showToast(`¡Éxito! ${res.importedMangas} mangas importados a tu biblioteca.`);
      onSyncComplete();
      onClose();
    } catch (err: any) {
      showToast(`Error de importación: ${err.message}`);
    } finally {
      setIsImporting(false);
      e.target.value = '';
    }
  };

  const handleSimulateDevEvent = async () => {
    try {
      await apiClient.trackChapter({
        manga_id: `dev-${Date.now()}`,
        manga_title: simMangaTitle,
        chapter_number: Number(simChapter),
        timestamp: new Date().toISOString(),
        source: 'manual-dev-test',
      });
      showToast(`Prueba enviada: ${simMangaTitle} Cap. ${simChapter}`);
      onSyncComplete();
    } catch (err: any) {
      showToast(`Error al enviar prueba: ${err.message}`);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#242220]/60 backdrop-blur-xs animate-fadeIn">
      <div className="w-full max-w-sm bg-[#FAF7F2] border-[2px] border-[#2D2926] rounded-3xl p-5 shadow-[0_8px_0px_#2D2926] flex flex-col max-h-[90vh] overflow-hidden">
        {/* Modal Header */}
        <div className="flex items-center justify-between pb-3 border-b-[1.5px] border-[#2D2926]/15">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-[#A8D5BA] border-[1.5px] border-[#2D2926] flex items-center justify-center font-bold text-sm">
              ⚙️
            </div>
            <div>
              <h3 className="text-base font-black text-[#242220] leading-none">
                Sincronización & Conexión
              </h3>
              <p className="text-[10px] font-bold text-[#7A746E] mt-0.5">
                Mihon Tracker Cloud & Respaldo
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-7 h-7 rounded-full bg-white border-[1.5px] border-[#2D2926] flex items-center justify-center hover:bg-[#F6A596] transition-colors"
          >
            <X className="w-4 h-4 text-[#242220]" />
          </button>
        </div>

        {/* Tab Switcher */}
        <div className="flex gap-1.5 p-1 bg-[#EFE9DF] rounded-2xl border-[1.5px] border-[#2D2926] my-3">
          <button
            onClick={() => setActiveTab('sync')}
            className={`flex-1 py-1.5 rounded-xl text-xs font-black transition-all ${
              activeTab === 'sync' ? 'bg-white text-[#242220] shadow-sm' : 'text-[#7A746E]'
            }`}
          >
            Sincronizar
          </button>
          <button
            onClick={() => setActiveTab('server')}
            className={`flex-1 py-1.5 rounded-xl text-xs font-black transition-all ${
              activeTab === 'server' ? 'bg-white text-[#242220] shadow-sm' : 'text-[#7A746E]'
            }`}
          >
            Servidor
          </button>
          <button
            onClick={() => setActiveTab('dev')}
            className={`flex-1 py-1.5 rounded-xl text-xs font-black transition-all ${
              activeTab === 'dev' ? 'bg-white text-[#242220] shadow-sm' : 'text-[#7A746E]'
            }`}
          >
            Pruebas
          </button>
        </div>

        {/* Tab Content */}
        <div className="flex-1 overflow-y-auto space-y-3.5 pr-1 text-xs">
          {activeTab === 'sync' && (
            <div className="space-y-3">
              {/* Cloud Sync Status */}
              <div className="bg-white border-[1.8px] border-[#2D2926] rounded-2xl p-3 shadow-[0_2px_0px_#2D2926]">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-[#A8D5BA] animate-pulse" />
                    <span className="font-black text-[#242220]">Servidor Cloud en Vivo</span>
                  </div>
                  <span className="text-[10px] font-bold text-[#7A746E]">
                    {lastSyncAt ? `Última sinc: ${new Date(lastSyncAt).toLocaleTimeString()}` : 'Listo'}
                  </span>
                </div>
                <button
                  onClick={handleManualSync}
                  disabled={isSyncing}
                  className="w-full mt-3 flex items-center justify-center gap-2 py-2 px-3 rounded-xl bg-[#A8D5BA] border-[1.5px] border-[#2D2926] font-black text-[#242220] hover:brightness-105 transition-all shadow-[0_2px_0px_#2D2926]"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? 'animate-spin' : ''}`} />
                  <span>{isSyncing ? 'Actualizando datos...' : 'Actualizar ahora'}</span>
                </button>
              </div>

              {/* Import Backup File (.tachibk or .json) */}
              <div className="bg-[#FAF7F2] border-[1.8px] border-[#2D2926] rounded-2xl p-3 shadow-[0_2px_0px_#2D2926]">
                <div className="flex items-center gap-2 mb-1.5">
                  <FileText className="w-4 h-4 text-[#52796F]" />
                  <span className="font-black text-[#242220]">Importar Respaldo de Mihon</span>
                </div>
                <p className="text-[11px] text-[#5C5651] leading-relaxed mb-3">
                  Sube tu archivo de respaldo de Mihon (<b>.tachibk</b> o <b>.json</b>) para importar toda tu biblioteca y progreso existente.
                </p>

                <label className="flex items-center justify-center gap-2 w-full py-2.5 px-3 rounded-xl bg-[#F8C866] border-[1.5px] border-[#2D2926] font-black text-[#242220] cursor-pointer hover:brightness-105 shadow-[0_2px_0px_#2D2926] transition-all">
                  <Upload className="w-4 h-4" />
                  <span>{isImporting ? 'Importando respaldo...' : 'Seleccionar archivo .tachibk / .json'}</span>
                  <input
                    type="file"
                    accept="*/*"
                    onChange={handleFileUpload}
                    disabled={isImporting}
                    className="hidden"
                  />
                </label>
              </div>

              {/* Instructions on Mobile Sync */}
              <div className="bg-white/80 border-[1.5px] border-[#2D2926]/30 rounded-2xl p-3 text-[11px] text-[#5C5651]">
                <p className="font-extrabold text-[#242220] mb-1">📱 Sincronización Automática desde Mihon:</p>
                <p>
                  Cada vez que lees un capítulo en tu Mihon modificado, el capítulo se sincroniza de forma automática en segundo plano con tu servidor en la nube.
                </p>
              </div>
            </div>
          )}

          {activeTab === 'server' && (
            <div className="space-y-3">
              <div className="space-y-1">
                <label className="text-[11px] font-black text-[#242220] flex items-center gap-1.5">
                  <Server className="w-3.5 h-3.5 text-[#52796F]" /> URL del Backend
                </label>
                <input
                  type="text"
                  value={serverUrl}
                  onChange={(e) => setServerUrl(e.target.value)}
                  placeholder="https://mihon-tracker.onrender.com"
                  className="w-full px-3 py-2 rounded-xl bg-white border-[1.5px] border-[#2D2926] font-mono text-[11px] text-[#242220] focus:outline-none focus:ring-2 focus:ring-[#A8D5BA]"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[11px] font-black text-[#242220] flex items-center gap-1.5">
                  <Key className="w-3.5 h-3.5 text-[#E27D60]" /> Clave API (Opcional)
                </label>
                <input
                  type="password"
                  value={apiKey}
                  onChange={(e) => setApiKey(e.target.value)}
                  placeholder="Dejar vacío si no configuraste TRACKER_API_KEY"
                  className="w-full px-3 py-2 rounded-xl bg-white border-[1.5px] border-[#2D2926] font-mono text-[11px] text-[#242220] focus:outline-none focus:ring-2 focus:ring-[#A8D5BA]"
                />
              </div>

              {/* Status Message */}
              {connectionStatus === 'success' && (
                <div className="flex items-center gap-2 p-2.5 rounded-xl bg-[#E8F5E9] border-[1.5px] border-[#2D2926] text-[#2E7D32]">
                  <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
                  <span className="font-extrabold text-[11px]">{connectionMsg}</span>
                </div>
              )}
              {connectionStatus === 'error' && (
                <div className="flex items-center gap-2 p-2.5 rounded-xl bg-[#FFEBEE] border-[1.5px] border-[#2D2926] text-[#C62828]">
                  <AlertCircle className="w-4 h-4 flex-shrink-0" />
                  <span className="font-extrabold text-[11px]">{connectionMsg}</span>
                </div>
              )}

              <div className="flex gap-2 pt-1">
                <button
                  onClick={handleTestConnection}
                  disabled={isTesting}
                  className="flex-1 py-2 rounded-xl bg-white border-[1.5px] border-[#2D2926] font-black text-[#242220] hover:bg-[#FAF7F2] shadow-[0_2px_0px_#2D2926]"
                >
                  {isTesting ? 'Probando...' : 'Probar conexión'}
                </button>
                <button
                  onClick={handleSaveServerConfig}
                  className="flex-1 py-2 rounded-xl bg-[#A8D5BA] border-[1.5px] border-[#2D2926] font-black text-[#242220] hover:brightness-105 shadow-[0_2px_0px_#2D2926]"
                >
                  Guardar
                </button>
              </div>
            </div>
          )}

          {activeTab === 'dev' && (
            <div className="space-y-3">
              <div className="bg-[#FFF9E6] border-[1.5px] border-[#2D2926] rounded-2xl p-3">
                <div className="flex items-center gap-1.5 font-black text-[#856404] mb-1">
                  <Terminal className="w-3.5 h-3.5" /> Entorno de Pruebas
                </div>
                <p className="text-[11px] text-[#5C5651] leading-relaxed">
                  Envía un webhook de prueba real a <b>POST /api/track</b> para comprobar que tu base de datos y la persistencia registran el capítulo.
                </p>
              </div>

              <div className="space-y-1">
                <label className="text-[11px] font-black text-[#242220]">Título del Manga:</label>
                <input
                  type="text"
                  value={simMangaTitle}
                  onChange={(e) => setSimMangaTitle(e.target.value)}
                  className="w-full px-3 py-1.5 rounded-xl bg-white border-[1.5px] border-[#2D2926] font-bold text-xs"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[11px] font-black text-[#242220]">Capítulo:</label>
                <input
                  type="number"
                  value={simChapter}
                  onChange={(e) => setSimChapter(Number(e.target.value))}
                  className="w-full px-3 py-1.5 rounded-xl bg-white border-[1.5px] border-[#2D2926] font-bold text-xs"
                />
              </div>

              <button
                onClick={handleSimulateDevEvent}
                className="w-full py-2.5 rounded-xl bg-[#F6A596] border-[1.5px] border-[#2D2926] font-black text-[#242220] shadow-[0_2px_0px_#2D2926] hover:brightness-105"
              >
                Enviar Evento de Prueba
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
