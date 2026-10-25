import { MangaItem, ReadingHistoryEvent, ReadingStats } from '../types/tracker';

const STORAGE_KEYS = {
  MANGAS: 'mihon_offline_mangas_v1',
  EVENTS: 'mihon_offline_events_v1',
  STATS: 'mihon_offline_stats_v1',
  PENDING_EVENTS: 'mihon_pending_sync_events_v1',
  LAST_UPDATE: 'mihon_last_local_write_at',
};

/**
 * Robust Local-First Persistent Storage:
 * Guarantees that chapters read, status changes, and history events
 * are NEVER lost on page reload, app restart, or when cloud servers (e.g. Render free tier)
 * spin down and reset their ephemeral containers overnight.
 */
export const persistentStorage = {
  /**
   * Load mangas from local storage immediately on app startup (0ms latency)
   */
  loadLibrary(): MangaItem[] | null {
    if (typeof window === 'undefined') return null;
    try {
      const raw = localStorage.getItem(STORAGE_KEYS.MANGAS);
      if (!raw) return null;
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed) && parsed.length > 0 ? parsed : null;
    } catch (e) {
      console.warn('⚠️ [STORAGE] Could not read local library:', e);
      return null;
    }
  },

  /**
   * Save mangas to local storage
   */
  saveLibrary(mangas: MangaItem[]): void {
    if (typeof window === 'undefined' || !Array.isArray(mangas)) return;
    try {
      localStorage.setItem(STORAGE_KEYS.MANGAS, JSON.stringify(mangas));
      localStorage.setItem(STORAGE_KEYS.LAST_UPDATE, new Date().toISOString());
    } catch (e) {
      console.warn('⚠️ [STORAGE] Could not save local library:', e);
    }
  },

  /**
   * Load history events from local storage
   */
  loadEvents(): ReadingHistoryEvent[] | null {
    if (typeof window === 'undefined') return null;
    try {
      const raw = localStorage.getItem(STORAGE_KEYS.EVENTS);
      if (!raw) return null;
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? parsed : null;
    } catch (e) {
      return null;
    }
  },

  /**
   * Save up to 250 most recent events to local storage
   */
  saveEvents(events: ReadingHistoryEvent[]): void {
    if (typeof window === 'undefined' || !Array.isArray(events)) return;
    try {
      const sliced = events.slice(0, 250);
      localStorage.setItem(STORAGE_KEYS.EVENTS, JSON.stringify(sliced));
    } catch (e) {
      console.warn('⚠️ [STORAGE] Could not save local events:', e);
    }
  },

  /**
   * Load reading stats
   */
  loadStats(): ReadingStats | null {
    if (typeof window === 'undefined') return null;
    try {
      const raw = localStorage.getItem(STORAGE_KEYS.STATS);
      if (!raw) return null;
      return JSON.parse(raw);
    } catch (e) {
      return null;
    }
  },

  /**
   * Save reading stats
   */
  saveStats(stats: ReadingStats): void {
    if (typeof window === 'undefined' || !stats) return;
    try {
      localStorage.setItem(STORAGE_KEYS.STATS, JSON.stringify(stats));
    } catch (e) {
      console.warn('⚠️ [STORAGE] Could not save local stats:', e);
    }
  },

  /**
   * Queue an event that must be pushed to the server when connected
   */
  queuePendingEvent(event: ReadingHistoryEvent): void {
    if (typeof window === 'undefined') return;
    try {
      const existing = this.getPendingEvents();
      const updated = [event, ...existing.filter(e => e.id !== event.id)];
      localStorage.setItem(STORAGE_KEYS.PENDING_EVENTS, JSON.stringify(updated));
    } catch (e) {
      console.warn('⚠️ [STORAGE] Could not queue pending event:', e);
    }
  },

  getPendingEvents(): ReadingHistoryEvent[] {
    if (typeof window === 'undefined') return [];
    try {
      const raw = localStorage.getItem(STORAGE_KEYS.PENDING_EVENTS);
      return raw ? JSON.parse(raw) : [];
    } catch (e) {
      return [];
    }
  },

  clearPendingEvents(): void {
    if (typeof window === 'undefined') return;
    localStorage.removeItem(STORAGE_KEYS.PENDING_EVENTS);
  },

  removePendingEvent(id: string): void {
    if (typeof window === 'undefined') return;
    try {
      const remaining = this.getPendingEvents().filter(e => e.id !== id);
      localStorage.setItem(STORAGE_KEYS.PENDING_EVENTS, JSON.stringify(remaining));
    } catch (e) {}
  },

  /**
   * Smart Two-Way Reconciler:
   * Merges server library with local library.
   * CRITICAL RULE: NEVER overwrite a local manga's progress if local.currentChapter > server.currentChapter!
   * This protects against Render free tier spindown where the container boots up with older git-commit data.
   */
  reconcileLibrary(
    localMangas: MangaItem[],
    serverMangas: MangaItem[]
  ): { merged: MangaItem[]; hasLocalOverrides: boolean; overrideCount: number } {
    if (!localMangas || localMangas.length === 0) {
      return { merged: serverMangas || [], hasLocalOverrides: false, overrideCount: 0 };
    }
    if (!serverMangas || serverMangas.length === 0) {
      return { merged: localMangas, hasLocalOverrides: true, overrideCount: localMangas.length };
    }

    const localMap = new Map<string, MangaItem>();
    for (const lm of localMangas) {
      localMap.set(lm.id, lm);
    }

    let hasLocalOverrides = false;
    let overrideCount = 0;

    const merged = serverMangas.map((sm) => {
      const lm = localMap.get(sm.id);
      if (!lm) return sm;

      // Check if local has advanced further than the server
      const localChapter = Number(lm.currentChapter || 0);
      const serverChapter = Number(sm.currentChapter || 0);

      let finalChapter = serverChapter;
      let finalLastRead = sm.lastReadAt || '';
      let isOverridden = false;

      if (localChapter > serverChapter) {
        finalChapter = localChapter;
        finalLastRead = lm.lastReadAt || new Date().toISOString();
        isOverridden = true;
        hasLocalOverrides = true;
        overrideCount++;
      }

      // Preserve local status if it was changed locally
      const finalStatus = lm.status && lm.status !== 'reading' ? lm.status : sm.status;
      const finalFavorite = lm.isFavorite !== undefined ? lm.isFavorite : sm.isFavorite;

      return {
        ...sm,
        currentChapter: finalChapter,
        lastReadAt: finalLastRead,
        status: finalStatus,
        isFavorite: finalFavorite,
        // Keep updated cover if server or local has better
        coverUrl: sm.coverUrl || lm.coverUrl || '',
      };
    });

    // Check if there are local mangas not present on the server
    const serverIds = new Set(serverMangas.map(m => m.id));
    for (const lm of localMangas) {
      if (!serverIds.has(lm.id)) {
        merged.push(lm);
        hasLocalOverrides = true;
        overrideCount++;
      }
    }

    return { merged, hasLocalOverrides, overrideCount };
  },

  /**
   * Merges local reading events with server events without losing newly read chapters.
   */
  reconcileEvents(
    localEvents: ReadingHistoryEvent[],
    serverEvents: ReadingHistoryEvent[]
  ): { merged: ReadingHistoryEvent[]; missingOnServer: ReadingHistoryEvent[] } {
    const combined = [...(localEvents || []), ...(serverEvents || [])];
    const seenHashes = new Set<string>();
    const seenIds = new Set<string>();
    const merged: ReadingHistoryEvent[] = [];

    const serverIdSet = new Set((serverEvents || []).map(e => e.id));

    for (const ev of combined) {
      if (!ev) continue;
      const key = ev.id || `${ev.manga_id}_${ev.chapter_number}_${ev.timestamp?.slice(0, 10)}`;
      if (seenIds.has(key)) continue;
      seenIds.add(key);

      if (ev.event_hash) {
        if (seenHashes.has(ev.event_hash)) continue;
        seenHashes.add(ev.event_hash);
      }

      merged.push(ev);
    }

    // Sort descending by timestamp
    merged.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

    // Find events that exist locally but were missing from the server
    const missingOnServer = (localEvents || []).filter(e => e.id && !serverIdSet.has(e.id));

    return { merged: merged.slice(0, 250), missingOnServer };
  },
};
