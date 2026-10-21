import { MangaItem, MangaStatus, ReadingHistoryEvent, ReadingStats } from '../types/tracker';

const DEFAULT_CLOUD_URL = 'https://mihon-tracker.onrender.com';

export function getServerUrl(): string {
  if (typeof window === 'undefined') return DEFAULT_CLOUD_URL;

  const stored = localStorage.getItem('mihon_tracker_server_url');
  if (stored && stored.trim()) {
    return stored.trim().replace(/\/+$/, '');
  }

  // Capacitor native app running locally on device
  const isCapacitorNative = (window as unknown as { Capacitor?: { isNativePlatform?: () => boolean } })
    ?.Capacitor?.isNativePlatform?.();

  if (isCapacitorNative) {
    return DEFAULT_CLOUD_URL;
  }

  // Web environment
  const hostname = window.location.hostname;
  if (hostname === 'mihon-tracker.onrender.com') {
    return '';
  }

  if (hostname === 'localhost' || hostname === '127.0.0.1') {
    return '';
  }

  return DEFAULT_CLOUD_URL;
}

export function setServerUrl(url: string): void {
  if (url && url.trim()) {
    localStorage.setItem('mihon_tracker_server_url', url.trim().replace(/\/+$/, ''));
  } else {
    localStorage.removeItem('mihon_tracker_server_url');
  }
}

export function getApiKey(): string {
  if (typeof window === 'undefined') return '';
  return localStorage.getItem('mihon_tracker_api_key') || '';
}

export function setApiKey(key: string): void {
  if (key && key.trim()) {
    localStorage.setItem('mihon_tracker_api_key', key.trim());
  } else {
    localStorage.removeItem('mihon_tracker_api_key');
  }
}

async function apiFetch<T>(path: string, options: RequestInit = {}): Promise<T> {
  const baseUrl = getServerUrl();
  const url = `${baseUrl}${path}`;
  const apiKey = getApiKey();

  const headers: Record<string, string> = {
    'Accept': 'application/json',
    ...(options.headers as Record<string, string> || {}),
  };

  if (apiKey) {
    headers['X-API-KEY'] = apiKey;
  }

  if (options.body && typeof options.body === 'string' && !headers['Content-Type']) {
    headers['Content-Type'] = 'application/json';
  }

  const response = await fetch(url, {
    ...options,
    headers,
  });

  if (!response.ok) {
    let errorMsg = `HTTP Error ${response.status}: ${response.statusText}`;
    try {
      const errJson = await response.json();
      if (errJson?.error) {
        errorMsg = errJson.error;
      }
    } catch (e) {
      // ignore
    }
    throw new Error(errorMsg);
  }

  return response.json() as Promise<T>;
}

export const apiClient = {
  getServerUrl,
  setServerUrl,
  getApiKey,
  setApiKey,

  async checkHealth(): Promise<{ status: string; service: string; version: string; uptime: number; db: string; authRequired: boolean }> {
    return apiFetch('/api/health');
  },

  async getLibrary(params: { status?: string; favorite?: boolean; search?: string } = {}): Promise<{ mangas: MangaItem[]; total: number }> {
    const query = new URLSearchParams();
    if (params.status && params.status !== 'all') query.set('status', params.status);
    if (params.favorite !== undefined) query.set('favorite', String(params.favorite));
    if (params.search) query.set('search', params.search);

    const qs = query.toString() ? `?${query.toString()}` : '';
    return apiFetch<{ mangas: MangaItem[]; total: number }>(`/api/library${qs}`);
  },

  async getEvents(params: { limit?: number; offset?: number; since?: string; sinceId?: string } = {}): Promise<{ events: ReadingHistoryEvent[]; total: number; hasMore: boolean }> {
    const query = new URLSearchParams();
    if (params.limit) query.set('limit', String(params.limit));
    if (params.offset) query.set('offset', String(params.offset));
    if (params.since) query.set('since', params.since);
    if (params.sinceId) query.set('sinceId', params.sinceId);

    const qs = query.toString() ? `?${query.toString()}` : '';
    return apiFetch<{ events: ReadingHistoryEvent[]; total: number; hasMore: boolean }>(`/api/events${qs}`);
  },

  async getStats(): Promise<{ stats: ReadingStats }> {
    return apiFetch<{ stats: ReadingStats }>('/api/stats');
  },

  async trackChapter(payload: {
    manga_id: string;
    manga_title: string;
    chapter_number: number;
    chapter_id?: string;
    cover_url?: string;
    genres?: string[];
    timestamp?: string;
    source?: string;
  }): Promise<{ status: string; tracked: boolean; deduplicated: boolean; event: ReadingHistoryEvent }> {
    return apiFetch('/api/track', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },

  async syncLibrary(mangas: unknown[]): Promise<{ status: string; count: number; inserted: number; updated: number; lastSyncAt: string }> {
    return apiFetch('/api/sync/library', {
      method: 'POST',
      body: JSON.stringify({ mangas }),
    });
  },

  async importBackup(backupPayload: unknown): Promise<{ status: string; importedMangas: number; importedEvents: number; lastSyncAt: string }> {
    return apiFetch('/api/sync/backup', {
      method: 'POST',
      body: JSON.stringify(backupPayload),
    });
  },

  async updateFavorite(mangaId: string, isFavorite: boolean): Promise<{ status: string; manga: MangaItem }> {
    return apiFetch(`/api/library/${encodeURIComponent(mangaId)}/favorite`, {
      method: 'PUT',
      body: JSON.stringify({ isFavorite }),
    });
  },

  async updateStatus(mangaId: string, status: MangaStatus): Promise<{ status: string; manga: MangaItem }> {
    return apiFetch(`/api/library/${encodeURIComponent(mangaId)}/status`, {
      method: 'PUT',
      body: JSON.stringify({ status }),
    });
  },
};
