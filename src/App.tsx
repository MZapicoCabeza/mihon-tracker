import React, { useState } from 'react';
import { BottomNavigation, TabType } from './components/layout/BottomNavigation';
import { DashboardTab } from './components/dashboard/DashboardTab';
import { LibraryTab } from './components/library/LibraryTab';
import { StatisticsTab } from './components/statistics/StatisticsTab';
import { WebhookModal } from './components/webhook/WebhookModal';
import { MobileDownloadModal } from './components/mobile/MobileDownloadModal';
import { INITIAL_MANGAS, INITIAL_RECENT_EVENTS, INITIAL_STATS } from './data/mockData';
import { MangaItem, MangaStatus, ReadingHistoryEvent, ReadingStats } from './types/tracker';
import { Bell, CheckCircle2 } from 'lucide-react';

export const App: React.FC = () => {
  const [currentTab, setCurrentTab] = useState<TabType>('dashboard');
  const [mangas, setMangas] = useState<MangaItem[]>(INITIAL_MANGAS);
  const [recentEvents, setRecentEvents] = useState<ReadingHistoryEvent[]>(INITIAL_RECENT_EVENTS);
  const [stats, setStats] = useState<ReadingStats>(INITIAL_STATS);
  const [isWebhookModalOpen, setIsWebhookModalOpen] = useState(false);
  const [isDownloadModalOpen, setIsDownloadModalOpen] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Cloud API Endpoint (Render 24/7)
  const API_ENDPOINT =
    typeof window !== 'undefined' && window.location.hostname === 'mihon-tracker.onrender.com'
      ? ''
      : 'https://mihon-tracker.onrender.com';

  // Poll /api/events to automatically reflect any chapter read on the mobile phone via 24/7 cloud API
  React.useEffect(() => {
    const checkServerEvents = async () => {
      try {
        const res = await fetch(`${API_ENDPOINT}/api/events`);
        if (res.ok) {
          const data = await res.json();
          if (Array.isArray(data?.events) && data.events.length > 0) {
            const latest = data.events[0];
            setRecentEvents((prev) => {
              if (prev.some((e) => e.id === latest.id)) return prev;
              applyEvent(latest);
              showToast(`📱 Mihon Sync (Cloud): ${latest.manga_title} Cap. ${latest.chapter_number}`);
              return [latest, ...prev];
            });
          }
        }
      } catch (err) {
        // Server might be compiling or offline
      }
    };

    const timer = setInterval(checkServerEvents, 2500);
    return () => clearInterval(timer);
  }, [API_ENDPOINT]);

  const showToast = (message: string) => {
    setToastMessage(message);
    setTimeout(() => {
      setToastMessage(null);
    }, 3500);
  };

  const handleToggleFavorite = (id: string) => {
    setMangas((prev) =>
      prev.map((m) => (m.id === id ? { ...m, isFavorite: !m.isFavorite } : m))
    );
  };

  const handleUpdateStatus = (id: string, status: MangaStatus) => {
    setMangas((prev) =>
      prev.map((m) => (m.id === id ? { ...m, status } : m))
    );
  };

  const handleSelectManga = (mangaId: string) => {
    setCurrentTab('library');
  };

  const applyEvent = (payload: {
    manga_id: string;
    manga_title: string;
    chapter_number: number;
    cover_url: string;
    timestamp: string;
    genres: string[];
  }) => {
    // 1. Update manga progress
    setMangas((prev) =>
      prev.map((manga) => {
        if (manga.id === payload.manga_id) {
          const isCompleted = payload.chapter_number >= manga.totalChapters;
          return {
            ...manga,
            currentChapter: payload.chapter_number,
            lastReadAt: payload.timestamp,
            status: isCompleted ? 'completed' : manga.status,
          };
        }
        return manga;
      })
    );

    // 2. Update stats (Total chapters, weekly activity, monthly activity)
    setStats((prev) => {
      const newTotal = prev.totalChaptersRead + 1;
      const newHours = Math.round((newTotal * 10) / 60);

      const updatedWeekly = [...prev.weeklyActivity];
      const lastIndex = updatedWeekly.length - 1;
      if (lastIndex >= 0) {
        updatedWeekly[lastIndex] = {
          ...updatedWeekly[lastIndex],
          chapters: updatedWeekly[lastIndex].chapters + 1,
        };
      }

      const updatedMonthly = prev.monthlyActivity.map((m) =>
        m.month === 'Octubre' ? { ...m, chapters: m.chapters + 1 } : m
      );

      return {
        ...prev,
        totalChaptersRead: newTotal,
        estimatedHoursRead: newHours,
        weeklyActivity: updatedWeekly,
        monthlyActivity: updatedMonthly,
      };
    });
  };

  // Simulates receiving a chapter completion event from Mihon's CustomTrackerService
  const handleSimulateWebhook = async (payload: {
    manga_id: string;
    manga_title: string;
    chapter_number: number;
    cover_url: string;
    timestamp: string;
    genres: string[];
  }) => {
    const newEvent: ReadingHistoryEvent = {
      id: `evt-${Date.now()}`,
      manga_id: payload.manga_id,
      manga_title: payload.manga_title,
      chapter_number: payload.chapter_number,
      cover_url: payload.cover_url,
      timestamp: payload.timestamp,
      genres: payload.genres,
    };

    setRecentEvents((prev) => [newEvent, ...prev]);
    applyEvent(payload);

    // Dispatch real POST to API
    try {
      await fetch(`${API_ENDPOINT}/api/track`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
    } catch (e) {
      // Ignore if offline
    }

    showToast(`¡Mihon Webhook recibido! Leído ${payload.manga_title} Cap. ${payload.chapter_number}`);
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

        {/* Tab Content Rendering */}
        <main className="flex-1">
          {currentTab === 'dashboard' && (
            <DashboardTab
              stats={stats}
              recentEvents={recentEvents}
              mangas={mangas}
              onSelectManga={handleSelectManga}
              onOpenWebhookModal={() => setIsWebhookModalOpen(true)}
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

          {currentTab === 'stats' && <StatisticsTab stats={stats} />}
        </main>

        {/* Bottom Navigation */}
        <BottomNavigation
          currentTab={currentTab}
          onTabChange={setCurrentTab}
          onOpenWebhookModal={() => setIsWebhookModalOpen(true)}
        />

        {/* Mihon Webhook Simulator Modal */}
        <WebhookModal
          isOpen={isWebhookModalOpen}
          onClose={() => setIsWebhookModalOpen(false)}
          mangas={mangas}
          onSimulateWebhook={handleSimulateWebhook}
        />

        {/* Mobile APK Download & PWA Modal */}
        <MobileDownloadModal
          isOpen={isDownloadModalOpen}
          onClose={() => setIsDownloadModalOpen(false)}
        />
      </div>
    </div>
  );
};

export default App;
