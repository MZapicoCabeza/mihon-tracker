import React, { useState, useEffect, useRef, useCallback } from 'react';
import { BottomNavigation, TabType } from './components/layout/BottomNavigation';
import { DashboardTab } from './components/dashboard/DashboardTab';
import { LibraryTab } from './components/library/LibraryTab';
import { StatisticsTab } from './components/statistics/StatisticsTab';
import { SyncSettingsModal } from './components/sync/SyncSettingsModal';
import { MobileDownloadModal } from './components/mobile/MobileDownloadModal';
import { EMPTY_STATS } from './data/mockData';
import { MangaItem, MangaStatus, ReadingHistoryEvent, ReadingStats } from './types/tracker';
import { apiClient } from './utils/apiClient';
import { CheckCircle2, WifiOff } from 'lucide-react';

export const App: React.FC = () => {
  const [currentTab, setCurrentTab] = useState<TabType>('dashboard');
  
  // Real database-driven states (Empty by default, no mock data)
  const [mangas, setMangas] = useState<MangaItem[]>([]);
  const [recentEvents, setRecentEvents] = useState<ReadingHistoryEvent[]>([]);
  const [stats, setStats] = useState<ReadingStats>(EMPTY_STATS);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [lastSyncAt, setLastSyncAt] = useState<string | null>(null);

  // Modals & feedback
  const [isSyncModalOpen, setIsSyncModalOpen] = useState(false);
  const [isDownloadModalOpen, setIsDownloadModalOpen] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Ref tracking processed event IDs to guarantee idempotency and avoid duplicate processing
  const processedEventIdsRef = useRef<Set<string>>(new Set());
  const isPollingRef = useRef<boolean>(false);

  const showToast = (message: string) => {
    setToastMessage(message);
    setTimeout(() => {
      setToastMessage(null);
    }, 4000);
  };

  // Full fetch of library, events, and stats from the backend
  const refreshAllData = useCallback(async (isInitial = false) => {
    if (isInitial) setLoading(true);
    try {
      const [libRes, eventsRes, statsRes] = await Promise.all([
        apiClient.getLibrary(),
        apiClient.getEvents({ limit: 50 }),
        apiClient.getStats(),
      ]);

      setMangas(libRes.mangas || []);
      setRecentEvents(eventsRes.events || []);
      setStats(statsRes.stats || EMPTY_STATS);
      setLastSyncAt(new Date().toISOString());

      // Seed processed event IDs
      if (Array.isArray(eventsRes.events)) {
        for (const ev of eventsRes.events) {
          if (ev.id) processedEventIdsRef.current.add(ev.id);
        }
      }

      setError(null);
    } catch (err: any) {
      console.warn('⚠️ [API ERROR] Could not sync with backend:', err.message);
      setError(err.message || 'No se pudo conectar con el servidor.');
    } finally {
      if (isInitial) setLoading(false);
    }
  }, []);

  // Initial load on mount
  useEffect(() => {
    refreshAllData(true);
  }, [refreshAllData]);

  // Periodic background refresh every 15s to keep stats and library perfectly in sync
  useEffect(() => {
    const timer = setInterval(() => {
      refreshAllData(false);
    }, 15000);
    return () => clearInterval(timer);
  }, [refreshAllData]);

  // Delta polling every 3 seconds to catch live events dispatched from Mihon
  useEffect(() => {
    const pollEvents = async () => {
      if (isPollingRef.current) return;
      isPollingRef.current = true;

      try {
        const eventsRes = await apiClient.getEvents({ limit: 25 });
        const incomingEvents = eventsRes.events || [];

        // Find all events not yet processed
        const newEvents: ReadingHistoryEvent[] = [];
        for (const ev of incomingEvents) {
          if (ev.id && !processedEventIdsRef.current.has(ev.id)) {
            processedEventIdsRef.current.add(ev.id);
            newEvents.push(ev);
          }
        }

        // If new chapters were read in Mihon, update UI and refresh backend stats
        if (newEvents.length > 0) {
          console.log(`⚡ [LIVE SYNC] Received ${newEvents.length} new reading event(s) from Mihon`);
          
          setRecentEvents((prev) => {
            const combined = [...newEvents, ...prev];
            const seen = new Set<string>();
            return combined.filter(e => {
              if (seen.has(e.id)) return false;
              seen.add(e.id);
              return true;
            });
          });

          // Show friendly notification for the latest read chapter
          const latest = newEvents[0];
          showToast(`📱 Mihon: Leído ${latest.manga_title} Cap. ${latest.chapter_number}`);

          // Refresh full library and stats from server
          const [updatedLib, updatedStats] = await Promise.all([
            apiClient.getLibrary(),
            apiClient.getStats(),
          ]);
          setMangas(updatedLib.mangas || []);
          setStats(updatedStats.stats || EMPTY_STATS);
          setLastSyncAt(new Date().toISOString());
        }

        if (error) setError(null);
      } catch (err: any) {
        // Silent catch during background polling
      } finally {
        isPollingRef.current = false;
      }
    };

    const intervalTimer = setInterval(pollEvents, 3000);
    return () => clearInterval(intervalTimer);
  }, [error]);

  // Toggle favorite with optimistic update and server persistence
  const handleToggleFavorite = async (id: string) => {
    const target = mangas.find((m) => m.id === id);
    if (!target) return;
    const nextVal = !target.isFavorite;

    setMangas((prev) =>
      prev.map((m) => (m.id === id ? { ...m, isFavorite: nextVal } : m))
    );

    try {
      await apiClient.updateFavorite(id, nextVal);
    } catch (err: any) {
      showToast(`Error al actualizar favorito: ${err.message}`);
      refreshAllData(false);
    }
  };

  // Update status with optimistic update and server persistence
  const handleUpdateStatus = async (id: string, status: MangaStatus) => {
    setMangas((prev) =>
      prev.map((m) => (m.id === id ? { ...m, status } : m))
    );

    try {
      await apiClient.updateStatus(id, status);
      const updatedStats = await apiClient.getStats();
      setStats(updatedStats.stats);
      if (status === 'deleted') {
        showToast('🗑️ Movido a la papelera (ver en pestaña Borrados)');
      } else {
        showToast('✨ Estado actualizado');
      }
    } catch (err: any) {
      showToast(`Error al cambiar estado: ${err.message}`);
      refreshAllData(false);
    }
  };

  // Permanent delete from database
  const handleDeletePermanently = async (id: string) => {
    setMangas((prev) => prev.filter((m) => m.id !== id));
    try {
      await apiClient.deletePermanently(id);
      showToast('🗑️ Manhwa eliminado definitivamente');
      const updatedStats = await apiClient.getStats();
      setStats(updatedStats.stats);
    } catch (err: any) {
      showToast(`Error al eliminar: ${err.message}`);
      refreshAllData(false);
    }
  };

  // Empty all trash
  const handleEmptyTrash = async () => {
    setMangas((prev) => prev.filter((m) => m.status !== 'deleted'));
    try {
      const res = await apiClient.emptyTrash();
      showToast(`🗑️ Papelera vaciada (${res.emptied || 0} eliminados)`);
      const updatedStats = await apiClient.getStats();
      setStats(updatedStats.stats);
    } catch (err: any) {
      showToast(`Error al vaciar papelera: ${err.message}`);
      refreshAllData(false);
    }
  };

  const handleSelectManga = (_mangaId: string) => {
    setCurrentTab('library');
  };

  return (
    <div className="min-h-screen bg-[#F7F5FC] text-[#1E1238] flex justify-center selection:bg-[#E9D5FF] selection:text-[#5B21B6]">
      {/* Mobile container wrapper with soft lavender background */}
      <div className="w-full max-w-md min-h-screen bg-[#F7F5FC] relative px-4 pt-2 flex flex-col">
        
        {/* Floating Toast Notification */}
        {toastMessage && (
          <div className="fixed top-4 left-1/2 -translate-y-0 -translate-x-1/2 z-50 w-11/12 max-w-sm flex items-center gap-2.5 p-3 rounded-full bg-[#1E1238]/95 text-white backdrop-blur-xl border border-white/20 shadow-2xl animate-fadeIn">
            <div className="w-7 h-7 rounded-full bg-[#10B981] flex items-center justify-center flex-shrink-0">
              <CheckCircle2 className="w-4 h-4 text-white" />
            </div>
            <span className="text-xs font-bold text-white flex-1 truncate">{toastMessage}</span>
          </div>
        )}

        {/* Global Connection Error Banner if Backend is offline */}
        {error && !loading && (
          <div className="mb-3 p-3.5 rounded-2xl bg-rose-50 border border-rose-200 text-[#1E1238] shadow-xs flex items-center justify-between gap-2">
            <div className="flex items-center gap-2.5 min-w-0">
              <WifiOff className="w-4 h-4 text-rose-600 flex-shrink-0" />
              <div className="min-w-0">
                <p className="text-xs font-black text-rose-700">Sin conexión con el servidor</p>
                <p className="text-[10px] text-gray-500 truncate">{error}</p>
              </div>
            </div>
            <div className="flex gap-1.5 flex-shrink-0">
              <button
                onClick={() => refreshAllData(true)}
                className="py-1 px-2.5 rounded-full bg-white border border-rose-200 text-[10px] font-bold text-rose-700 hover:bg-rose-100 shadow-2xs"
              >
                Reintentar
              </button>
              <button
                onClick={() => setIsSyncModalOpen(true)}
                className="py-1 px-2.5 rounded-full bg-rose-600 text-white text-[10px] font-bold shadow-2xs"
              >
                Ajustes
              </button>
            </div>
          </div>
        )}

        {/* Loading Skeleton */}
        {loading ? (
          <div className="flex-1 flex flex-col items-center justify-center py-24 space-y-4">
            <div className="w-12 h-12 rounded-full border-3 border-purple-200 border-t-[#8B5CF6] animate-spin" />
            <p className="text-xs font-black text-[#1E1238] tracking-wide">
              Cargando tu biblioteca y progreso...
            </p>
            <p className="text-[11px] text-[#6B7280]">
              Conectando con el servidor en la nube
            </p>
          </div>
        ) : (
          /* Main Tab Content */
          <main className="flex-1">
            {currentTab === 'dashboard' && (
              <DashboardTab
                stats={stats}
                recentEvents={recentEvents}
                mangas={mangas}
                onSelectManga={handleSelectManga}
                onOpenSyncModal={() => setIsSyncModalOpen(true)}
                onOpenDownloadModal={() => setIsDownloadModalOpen(true)}
                onNavigateTab={(tab) => setCurrentTab(tab)}
                onToggleFavorite={handleToggleFavorite}
                onUpdateStatus={handleUpdateStatus}
                onRefreshData={async () => {
                  await refreshAllData(false);
                  showToast('✨ Sincronizado con la nube');
                }}
              />
            )}

            {currentTab === 'library' && (
              <LibraryTab
                mangas={mangas}
                onToggleFavorite={handleToggleFavorite}
                onUpdateStatus={handleUpdateStatus}
                onDeletePermanently={handleDeletePermanently}
                onEmptyTrash={handleEmptyTrash}
              />
            )}

            {currentTab === 'stats' && (
              <StatisticsTab
                stats={stats}
                mangas={mangas}
                onToggleFavorite={handleToggleFavorite}
                onUpdateStatus={handleUpdateStatus}
              />
            )}
          </main>
        )}

        {/* Bottom Navigation */}
        <BottomNavigation
          currentTab={currentTab}
          onTabChange={setCurrentTab}
          onOpenSyncModal={() => setIsSyncModalOpen(true)}
        />

        {/* Sync, Backup & Server Settings Modal */}
        <SyncSettingsModal
          isOpen={isSyncModalOpen}
          onClose={() => setIsSyncModalOpen(false)}
          onSyncComplete={() => refreshAllData(false)}
          showToast={showToast}
          lastSyncAt={lastSyncAt}
        />

        {/* Mobile APK Download Modal */}
        <MobileDownloadModal
          isOpen={isDownloadModalOpen}
          onClose={() => setIsDownloadModalOpen(false)}
        />
      </div>
    </div>
  );
};

export default App;
