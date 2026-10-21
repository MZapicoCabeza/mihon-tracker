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

  // Simulates receiving a chapter completion event from Mihon's CustomTrackerService
  const handleSimulateWebhook = (payload: {
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

    // 1. Prepend to recent events
    setRecentEvents((prev) => [newEvent, ...prev]);

    // 2. Update manga progress
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

    // 3. Update stats (Total chapters, weekly activity, monthly activity)
    setStats((prev) => {
      const newTotal = prev.totalChaptersRead + 1;
      const newHours = Math.round((newTotal * 10) / 60);

      // Update today's weekly count (Sunday / today)
      const updatedWeekly = [...prev.weeklyActivity];
      const lastIndex = updatedWeekly.length - 1;
      if (lastIndex >= 0) {
        updatedWeekly[lastIndex] = {
          ...updatedWeekly[lastIndex],
          chapters: updatedWeekly[lastIndex].chapters + 1,
        };
      }

      // Update current month (Octubre)
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

    showToast(`¡Mihon Webhook recibido! Leído ${payload.manga_title} Cap. ${payload.chapter_number}`);
  };

  return (
    <div className="min-h-screen bg-[#0b0816] text-gray-100 flex justify-center selection:bg-purple-600 selection:text-white">
      {/* Mobile container wrapper */}
      <div className="w-full max-w-md min-h-screen bg-[#0e0a1e] relative px-4 pt-3 flex flex-col shadow-[0_0_80px_rgba(0,0,0,0.8),0_0_30px_rgba(168,85,247,0.06)]">
        {/* Glow Effects Background */}
        <div className="fixed top-0 left-1/2 -translate-x-1/2 w-96 h-56 bg-purple-600/10 rounded-full blur-[90px] pointer-events-none" />
        <div className="fixed bottom-20 left-1/2 -translate-x-1/2 w-72 h-44 bg-fuchsia-600/10 rounded-full blur-[80px] pointer-events-none" />

        {/* Floating Toast Notification */}
        {toastMessage && (
          <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 w-11/12 max-w-sm flex items-center gap-2.5 p-3 rounded-2xl bg-[#1d143a]/95 border border-purple-500/50 shadow-[0_8px_30px_rgba(168,85,247,0.35)] backdrop-blur-md animate-slideDown">
            <div className="p-1.5 rounded-xl bg-purple-500/20 text-purple-300">
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
            </div>
            <span className="text-xs font-semibold text-gray-100 flex-1">{toastMessage}</span>
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
