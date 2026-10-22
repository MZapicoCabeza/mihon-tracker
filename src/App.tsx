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
import { CheckCircle2, AlertTriangle, RefreshCw, Server, WifiOff } from 'lucide-react';

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
            // Deduplicate by ID
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

          // Refresh full library and stats from server to keep calculations authoritative
          const [updatedLib, updatedStats] = await Promise.all([
            apiClient.getLibrary(),
            apiClient.getStats(),
          ]);
          setMangas(updatedLib.mangas || []);
          setStats(updatedStats.stats || EMPTY_STATS);
          setLastSyncAt(new Date().toISOString());
        }

        if (error) setError(null); // Clear error if poll succeeded
      } catch (err: any) {
        // Silent catch during background polling so user experience is not disrupted
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

    // Optimistic UI update
    setMangas((prev) =>
      prev.map((m) => (m.id === id ? { ...m, isFavorite: nextVal } : m))
    );

    try {
      await apiClient.updateFavorite(id, nextVal);
    } catch (err: any) {
      showToast(`Error al actualizar favorito: ${err.message}`);
      refreshAllData(false); // rollback
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
    } catch (err: any) {
      showToast(`Error al cambiar estado: ${err.message}`);
      refreshAllData(false);
    }
  };

  const handleSelectManga = (mangaId: string) => {
    setCurrentTab('library');
  };

  return (
    <div className="min-h-screen bg-[#EFE9DF] text-[#242220] flex justify-center selection:bg-[#B8DEC6] selection:text-[#242220]">
      {/* Mobile container wrapper (Warm Light Pastel Theme inspired by reference) */}
      <div className="w-full max-w-md min-h-screen bg-[#FAF7F2] border-x-[2px] border-[#2D2926]/15 relative px-4 pt-3 flex flex-col shadow-xl">
        
        {/* Floating Toast Notification */}
        {toastMessage && (
          <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 w-11/12 max-w-sm flex items-center gap-2.5 p-3 rounded-2xl bg-white border-[2px] border-[#2D2926] shadow-[0_6px_0px_#2D2926] animate-slideDown">
            <div className="w-7 h-7 rounded-full bg-[#A8D5BA] border-[1.5px] border-[#2D2926] flex items-center justify-center flex-shrink-0">
              <CheckCircle2 className="w-4 h-4 text-[#242220]" />
            </div>
            <span className="text-xs font-black text-[#242220] flex-1">{toastMessage}</span>
          </div>
        )}

        {/* Global Connection Error Banner if Backend is offline */}
        {error && !loading && (
          <div className="mb-3 p-3 rounded-2xl bg-[#FFF5F2] border-[1.8px] border-[#E27D60] text-[#242220] shadow-sm flex items-center justify-between gap-2">
            <div className="flex items-center gap-2 min-w-0">
              <WifiOff className="w-4 h-4 text-[#E27D60] flex-shrink-0" />
              <div className="min-w-0">
                <p className="text-xs font-black text-[#E27D60]">Sin conexión con el servidor</p>
                <p className="text-[10px] text-[#7A746E] truncate">{error}</p>
              </div>
            </div>
            <div className="flex gap-1.5 flex-shrink-0">
              <button
                onClick={() => refreshAllData(true)}
                className="py-1 px-2.5 rounded-lg bg-white border border-[#2D2926] text-[10px] font-black text-[#242220] hover:bg-[#FAF7F2] shadow-xs"
              >
                Reintentar
              </button>
              <button
                onClick={() => setIsSyncModalOpen(true)}
                className="py-1 px-2.5 rounded-lg bg-[#FAF7F2] border border-[#2D2926] text-[10px] font-black text-[#242220] hover:bg-white shadow-xs"
              >
                Ajustes
              </button>
            </div>
          </div>
        )}

        {/* Loading Skeleton */}
        {loading ? (
          <div className="flex-1 flex flex-col items-center justify-center py-24 space-y-3">
            <div className="w-12 h-12 rounded-full border-4 border-[#A8D5BA] border-t-[#2D2926] animate-spin" />
            <p className="text-xs font-black text-[#242220] tracking-wide">
              Cargando tu biblioteca y progreso...
            </p>
            <p className="text-[11px] text-[#7A746E]">
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
              />
            )}

            {currentTab === 'library' && (
              <LibraryTab
                mangas={mangas}
                onToggleFavorite={handleToggleFavorite}
                onUpdateStatus={handleUpdateStatus}
              />
            )}

            {currentTab === 'stats' && <StatisticsTab stats={stats} mangas={mangas} />}
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
