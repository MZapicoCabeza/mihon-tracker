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
import { persistentStorage } from './utils/persistentStorage';
import { CheckCircle2, WifiOff } from 'lucide-react';

export const App: React.FC = () => {
  const [currentTab, setCurrentTab] = useState<TabType>('dashboard');
  
  // Local-First Persistent State: initialized from persistent storage immediately (0ms cold start)
  const [mangas, setMangas] = useState<MangaItem[]>(() => persistentStorage.loadLibrary() || []);
  const [recentEvents, setRecentEvents] = useState<ReadingHistoryEvent[]>(() => persistentStorage.loadEvents() || []);
  const [stats, setStats] = useState<ReadingStats>(() => persistentStorage.loadStats() || EMPTY_STATS);
  const [loading, setLoading] = useState<boolean>(() => !persistentStorage.loadLibrary());
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

  // Full fetch of library, events, and stats from the backend with Smart Two-Way Reconciliation
  const refreshAllData = useCallback(async (isInitial = false) => {
    // Only show full loading spinner if we have no local data cached
    if (isInitial && (!mangas || mangas.length === 0)) {
      setLoading(true);
    }

    try {
      const [libRes, eventsRes, statsRes] = await Promise.all([
        apiClient.getLibrary(),
        apiClient.getEvents({ limit: 50 }),
        apiClient.getStats(),
      ]);

      const serverMangas = libRes.mangas || [];
      const serverEvents = eventsRes.events || [];

      // Load freshest local state
      const currentLocalMangas = persistentStorage.loadLibrary() || mangas;
      const currentLocalEvents = persistentStorage.loadEvents() || recentEvents;

      // Smart Reconciliation: Protect local reads against Render free-tier ephemeral container resets
      const { merged: reconciledMangas, hasLocalOverrides, overrideCount } =
        persistentStorage.reconcileLibrary(currentLocalMangas, serverMangas);

      const { merged: reconciledEvents, missingOnServer } =
        persistentStorage.reconcileEvents(currentLocalEvents, serverEvents);

      // Optimistically apply reconciled state
      setMangas(reconciledMangas);
      setRecentEvents(reconciledEvents);
      setStats(statsRes.stats || EMPTY_STATS);
      setLastSyncAt(new Date().toISOString());

      // Persist to device storage immediately
      persistentStorage.saveLibrary(reconciledMangas);
      persistentStorage.saveEvents(reconciledEvents);
      persistentStorage.saveStats(statsRes.stats || EMPTY_STATS);

      // Seed processed event IDs
      for (const ev of reconciledEvents) {
        if (ev.id) processedEventIdsRef.current.add(ev.id);
      }

      // If local device had newer progress than server (Render reset overnight), push to restore Render!
      if (hasLocalOverrides && overrideCount > 0) {
        console.log(`🔄 [CLOUD RE-SYNC] Re-syncing ${overrideCount} locally advanced mangas to restore Render cloud database`);
        apiClient.syncLibrary(reconciledMangas).catch((e) =>
          console.warn('Could not re-sync library to server:', e.message)
        );
      }

      // If there were events locally that Render lost overnight, restore them on Render!
      if (missingOnServer.length > 0) {
        console.log(`⚡ [CLOUD RE-SYNC] Re-syncing ${missingOnServer.length} local reading events to Render`);
        for (const ev of missingOnServer) {
          apiClient.trackChapter({
            manga_id: ev.manga_id,
            manga_title: ev.manga_title,
            chapter_number: ev.chapter_number,
            chapter_id: ev.chapter_id,
            cover_url: ev.cover_url,
            genres: ev.genres,
            timestamp: ev.timestamp,
            source: ev.source || 'client-resync',
          }).catch(() => {});
        }
      }

      setError(null);
    } catch (err: any) {
      console.warn('⚠️ [API ERROR] Could not sync with backend:', err.message);
      setError(err.message || 'No se pudo conectar con el servidor.');
      // Keep displaying local persistent data even when offline or Render is asleep
    } finally {
      if (isInitial) setLoading(false);
    }
  }, [mangas, recentEvents]);

  // Initial load on mount
  useEffect(() => {
    refreshAllData(true);
  }, [refreshAllData]);

  // Periodic background refresh every 20s to keep stats and library in sync
  useEffect(() => {
    const timer = setInterval(() => {
      refreshAllData(false);
    }, 20000);
    return () => clearInterval(timer);
  }, [refreshAllData]);

  // Delta polling every 4 seconds to catch live events dispatched from Mihon
  useEffect(() => {
    const pollEvents = async () => {
      if (isPollingRef.current) return;
      isPollingRef.current = true;

      try {
        const eventsRes = await apiClient.getEvents({ limit: 25 });
        const incomingEvents = eventsRes.events || [];

        const newEvents: ReadingHistoryEvent[] = [];
        for (const ev of incomingEvents) {
          if (ev.id && !processedEventIdsRef.current.has(ev.id)) {
            processedEventIdsRef.current.add(ev.id);
            newEvents.push(ev);
          }
        }

        if (newEvents.length > 0) {
          console.log(`⚡ [LIVE SYNC] Received ${newEvents.length} new reading event(s) from Mihon`);
          
          setRecentEvents((prev) => {
            const combined = [...newEvents, ...prev];
            const seen = new Set<string>();
            const deduped = combined.filter(e => {
              if (seen.has(e.id)) return false;
              seen.add(e.id);
              return true;
            });
            persistentStorage.saveEvents(deduped);
            return deduped;
          });

          const latest = newEvents[0];
          showToast(`📱 Mihon: Leído ${latest.manga_title} Cap. ${latest.chapter_number}`);

          const [updatedLib, updatedStats] = await Promise.all([
            apiClient.getLibrary(),
            apiClient.getStats(),
          ]);
          setMangas(updatedLib.mangas || []);
          setStats(updatedStats.stats || EMPTY_STATS);
          persistentStorage.saveLibrary(updatedLib.mangas || []);
          persistentStorage.saveStats(updatedStats.stats || EMPTY_STATS);
          setLastSyncAt(new Date().toISOString());
        }

        if (error) setError(null);
      } catch (err: any) {
        // Silent catch during background polling
      } finally {
        isPollingRef.current = false;
      }
    };

    const intervalTimer = setInterval(pollEvents, 4000);
    return () => clearInterval(intervalTimer);
  }, [error]);

  // Update chapter progress with local-first instant persistence & cloud sync
  const handleUpdateChapter = async (id: string, newChapter: number) => {
    const target = mangas.find((m) => m.id === id);
    if (!target) return;

    const validatedChapter = Math.max(0, newChapter);
    const nowIso = new Date().toISOString();

    const updatedMangas = mangas.map((m) =>
      m.id === id ? { ...m, currentChapter: validatedChapter, lastReadAt: nowIso } : m
    );

    const newEvent: ReadingHistoryEvent = {
      id: `evt_${id}_${validatedChapter}_${Date.now()}`,
      manga_id: id,
      manga_title: target.title,
      chapter_number: validatedChapter,
      cover_url: target.coverUrl,
      genres: target.genres,
      timestamp: nowIso,
      received_at: nowIso,
      source: 'app-reader',
    };

    const updatedEvents = [
      newEvent,
      ...recentEvents.filter((e) => !(e.manga_id === id && e.chapter_number === validatedChapter)),
    ];

    // 1. Immediately update React state
    setMangas(updatedMangas);
    setRecentEvents(updatedEvents);

    // 2. Immediately save to device persistent storage (Guaranteed zero data loss)
    persistentStorage.saveLibrary(updatedMangas);
    persistentStorage.saveEvents(updatedEvents);

    showToast(`📖 ${target.title}: Cap. ${validatedChapter} guardado`);

    // 3. Dispatch to server
    try {
      await apiClient.updateChapter(id, validatedChapter);
      const updatedStats = await apiClient.getStats();
      setStats(updatedStats.stats);
      persistentStorage.saveStats(updatedStats.stats);
    } catch (err: any) {
      console.warn('Could not sync chapter to server immediately, saved in local device storage:', err.message);
      persistentStorage.queuePendingEvent(newEvent);
    }
  };

  // Toggle favorite with optimistic update and local + server persistence
  const handleToggleFavorite = async (id: string) => {
    const target = mangas.find((m) => m.id === id);
    if (!target) return;
    const nextVal = !target.isFavorite;

    const updated = mangas.map((m) => (m.id === id ? { ...m, isFavorite: nextVal } : m));
    setMangas(updated);
    persistentStorage.saveLibrary(updated);

    try {
      await apiClient.updateFavorite(id, nextVal);
    } catch (err: any) {
      showToast(`Error al actualizar favorito: ${err.message}`);
      refreshAllData(false);
    }
  };

  // Update status with optimistic update and local + server persistence
  const handleUpdateStatus = async (id: string, status: MangaStatus) => {
    const updated = mangas.map((m) => (m.id === id ? { ...m, status } : m));
    setMangas(updated);
    persistentStorage.saveLibrary(updated);

    try {
      await apiClient.updateStatus(id, status);
      const updatedStats = await apiClient.getStats();
      setStats(updatedStats.stats);
      persistentStorage.saveStats(updatedStats.stats);
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

  // Permanent delete from database & local storage
  const handleDeletePermanently = async (id: string) => {
    const updated = mangas.filter((m) => m.id !== id);
    setMangas(updated);
    persistentStorage.saveLibrary(updated);

    try {
      await apiClient.deletePermanently(id);
      showToast('🗑️ Manhwa eliminado definitivamente');
      const updatedStats = await apiClient.getStats();
      setStats(updatedStats.stats);
      persistentStorage.saveStats(updatedStats.stats);
    } catch (err: any) {
      showToast(`Error al eliminar: ${err.message}`);
      refreshAllData(false);
    }
  };

  // Empty all trash
  const handleEmptyTrash = async () => {
    const updated = mangas.filter((m) => m.status !== 'deleted');
    setMangas(updated);
    persistentStorage.saveLibrary(updated);

    try {
      const res = await apiClient.emptyTrash();
      showToast(`🗑️ Papelera vaciada (${res.emptied || 0} eliminados)`);
      const updatedStats = await apiClient.getStats();
      setStats(updatedStats.stats);
      persistentStorage.saveStats(updatedStats.stats);
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

        {/* Global Connection Error Banner if Backend is offline (non-blocking) */}
        {error && !loading && (
          <div className="mb-3 p-3.5 rounded-2xl bg-amber-50 border border-amber-200 text-[#1E1238] shadow-xs flex items-center justify-between gap-2">
            <div className="flex items-center gap-2.5 min-w-0">
              <WifiOff className="w-4 h-4 text-amber-600 flex-shrink-0" />
              <div className="min-w-0">
                <p className="text-xs font-black text-amber-800">Modo Local Activo (Servidor en reposo)</p>
                <p className="text-[10px] text-amber-600 truncate">Tus lecturas se guardan seguras en este dispositivo</p>
              </div>
            </div>
            <div className="flex gap-1.5 flex-shrink-0">
              <button
                onClick={() => refreshAllData(false)}
                className="py-1 px-2.5 rounded-full bg-white border border-amber-300 text-[10px] font-bold text-amber-800 hover:bg-amber-100 shadow-2xs"
              >
                Reconectar
              </button>
              <button
                onClick={() => setIsSyncModalOpen(true)}
                className="py-1 px-2.5 rounded-full bg-amber-600 text-white text-[10px] font-bold shadow-2xs"
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
                onDeletePermanently={handleDeletePermanently}
                onUpdateChapter={handleUpdateChapter}
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
                onUpdateChapter={handleUpdateChapter}
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
