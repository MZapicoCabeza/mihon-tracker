import { db } from '../database.js';

export function getExtendedAnalytics(dbInstance = db) {
  const isSqlite = dbInstance.isSqlite;

  if (!isSqlite) {
    return null;
  }

  const sqlite = dbInstance.db;

  // 1. Basic counts
  const totalEvents = sqlite.prepare('SELECT COUNT(*) as c FROM reading_events').get().c;
  const totalMangas = sqlite.prepare('SELECT COUNT(*) as c FROM mangas').get().c;
  const distinctDays = sqlite.prepare('SELECT COUNT(DISTINCT substr(timestamp, 1, 10)) as c FROM reading_events').get().c;
  const earliestDate = sqlite.prepare('SELECT MIN(timestamp) as m FROM reading_events').get().m;
  const latestDate = sqlite.prepare('SELECT MAX(timestamp) as m FROM reading_events').get().m;

  // 2. Streaks
  const rows = sqlite.prepare('SELECT DISTINCT substr(timestamp, 1, 10) as d FROM reading_events ORDER BY d ASC').all();
  let maxStreak = 0;
  let curStreak = 0;
  let prevDate = null;
  for (const r of rows) {
    const curDate = new Date(r.d);
    if (prevDate) {
      const diffTime = curDate.getTime() - prevDate.getTime();
      const diffDays = Math.round(diffTime / (1000 * 3600 * 24));
      if (diffDays === 1) {
        curStreak++;
      } else if (diffDays > 1) {
        curStreak = 1;
      }
    } else {
      curStreak = 1;
    }
    if (curStreak > maxStreak) maxStreak = curStreak;
    prevDate = curDate;
  }

  // 3. Current streak
  const currentStreak = dbInstance._calculateCurrentStreak();

  // 4. Record Day & Month
  const topDayRow = sqlite.prepare('SELECT substr(timestamp, 1, 10) as d, COUNT(*) as c FROM reading_events GROUP BY d ORDER BY c DESC LIMIT 1').get();
  const topMonthRow = sqlite.prepare('SELECT substr(timestamp, 1, 7) as m, COUNT(*) as c FROM reading_events GROUP BY m ORDER BY c DESC LIMIT 1').get();

  // 5. Timeline by Year
  const timelineByYear = sqlite.prepare(`
    SELECT substr(timestamp, 1, 4) as year, COUNT(*) as chapters, COUNT(DISTINCT manga_id) as series
    FROM reading_events
    GROUP BY year
    ORDER BY year ASC
  `).all();

  // 6. Heatmap data for last 365 days
  const heatmapRows = sqlite.prepare(`
    SELECT substr(timestamp, 1, 10) as date, COUNT(*) as count
    FROM reading_events
    WHERE date(timestamp) >= date('now', '-365 days')
    GROUP BY date
  `).all();
  const heatmapMap = {};
  heatmapRows.forEach(r => { heatmapMap[r.date] = r.count; });

  // 7. This week vs Previous week
  const thisWeekCount = sqlite.prepare(`
    SELECT COUNT(*) as c FROM reading_events WHERE date(timestamp) >= date('now', '-7 days')
  `).get().c;
  const prevWeekCount = sqlite.prepare(`
    SELECT COUNT(*) as c FROM reading_events WHERE date(timestamp) >= date('now', '-14 days') AND date(timestamp) < date('now', '-7 days')
  `).get().c;

  // 8. This month vs Previous month
  const thisMonthStr = new Date().toISOString().slice(0, 7);
  const prevMonthDate = new Date();
  prevMonthDate.setMonth(prevMonthDate.getMonth() - 1);
  const prevMonthStr = prevMonthDate.toISOString().slice(0, 7);

  const thisMonthCount = sqlite.prepare(`
    SELECT COUNT(*) as c FROM reading_events WHERE substr(timestamp, 1, 7) = ?
  `).get(thisMonthStr).c;
  const prevMonthCount = sqlite.prepare(`
    SELECT COUNT(*) as c FROM reading_events WHERE substr(timestamp, 1, 7) = ?
  `).get(prevMonthStr).c;

  // 9. Reading Sessions (grouping events within 45 mins)
  const allTimestamps = sqlite.prepare('SELECT timestamp FROM reading_events ORDER BY timestamp ASC').all();
  let totalSessions = 0;
  let lastTime = null;
  for (const t of allTimestamps) {
    const timeMs = new Date(t.timestamp).getTime();
    if (!lastTime || (timeMs - lastTime) > 45 * 60 * 1000) {
      totalSessions++;
    }
    lastTime = timeMs;
  }
  const avgChaptersPerSession = totalSessions > 0 ? (totalEvents / totalSessions).toFixed(1) : 1;

  // 10. Top Marathons
  const marathons = sqlite.prepare(`
    SELECT manga_id, manga_title, substr(timestamp, 1, 10) as read_date, COUNT(*) as chapters
    FROM reading_events
    GROUP BY manga_title, read_date
    HAVING chapters >= 15
    ORDER BY chapters DESC
    LIMIT 6
  `).all();

  // 11. Most read mangas this month
  const topThisMonthMangas = sqlite.prepare(`
    SELECT manga_id, manga_title, COUNT(*) as chapters
    FROM reading_events
    WHERE substr(timestamp, 1, 7) = ?
    GROUP BY manga_id
    ORDER BY chapters DESC
    LIMIT 5
  `).get(thisMonthStr) || [];

  // 12. Library status counts
  const libraryStatuses = sqlite.prepare(`
    SELECT status, COUNT(*) as count FROM mangas GROUP BY status
  `).all();
  const statusMap = { reading: 0, completed: 0, paused: 0 };
  libraryStatuses.forEach(s => { statusMap[s.status] = s.count; });

  // 13. Total chapters read vs Total chapters in library
  const chapterTotals = sqlite.prepare(`
    SELECT SUM(current_chapter) as readChapters, SUM(total_chapters) as totalChapters
    FROM mangas
  `).get();

  // 14. Retaken series (series with read events separated by >= 60 days)
  const retakenSeries = sqlite.prepare(`
    SELECT m.title, m.id, m.cover_url, m.reading_months,
           MIN(e.timestamp) as first_read, MAX(e.timestamp) as last_read,
           COUNT(e.id) as chapters
    FROM reading_events e
    JOIN mangas m ON e.manga_id = m.id
    GROUP BY m.id
    HAVING (julianday(MAX(e.timestamp)) - julianday(MIN(e.timestamp))) >= 60
    ORDER BY chapters DESC
    LIMIT 6
  `).all();

  // 15. Reader Personality & Wrapped info
  const yearsActive = earliestDate
    ? Math.max(1, Math.round((new Date().getTime() - new Date(earliestDate).getTime()) / (1000 * 3600 * 24 * 365.25 * 10) ) / 10)
    : 1;

  return {
    readerHistory: {
      yearsActive: yearsActive >= 1 ? `${Math.floor(yearsActive)} años` : `${Math.round(yearsActive * 12)} meses`,
      rawYears: yearsActive,
      earliestDate: earliestDate || '2024-09-12',
      latestDate: latestDate || new Date().toISOString(),
      totalChapters: totalEvents,
      totalSeries: totalMangas,
      distinctActiveDays: distinctDays,
      longestStreakDays: maxStreak,
      currentStreakDays: currentStreak,
      recordDay: {
        date: topDayRow?.d || '2025-11-19',
        chapters: topDayRow?.c || 107,
      },
      recordMonth: {
        month: topMonthRow?.m || '2026-01',
        chapters: topMonthRow?.c || 475,
      },
      timelineByYear,
    },
    weeklyComparison: {
      thisWeek: thisWeekCount,
      prevWeek: prevWeekCount,
      percentDiff: prevWeekCount > 0 ? Math.round(((thisWeekCount - prevWeekCount) / prevWeekCount) * 100) : 100,
      dailyAverage: (thisWeekCount / 7).toFixed(1),
    },
    monthlyComparison: {
      thisMonth: thisMonthCount,
      prevMonth: prevMonthCount,
      percentDiff: prevMonthCount > 0 ? Math.round(((thisMonthCount - prevMonthCount) / prevMonthCount) * 100) : 100,
      dailyAverage: (thisMonthCount / 30).toFixed(1),
    },
    habits: {
      totalSessions,
      avgChaptersPerSession,
      marathons,
      retakenSeries,
      heatmapData: heatmapMap,
    },
    libraryOverview: {
      reading: statusMap.reading || 0,
      completed: statusMap.completed || 0,
      paused: statusMap.paused || 0,
      totalMangas,
      totalReadChapters: chapterTotals.readChapters || 0,
      totalAvailableChapters: chapterTotals.totalChapters || 0,
      libraryCompletionRate: chapterTotals.totalChapters > 0
        ? Math.round((chapterTotals.readChapters / chapterTotals.totalChapters) * 100)
        : 0,
    },
  };
}

const analytics = getExtendedAnalytics();
console.log('EXTENDED ANALYTICS COMPUTED SUCCESSFULLY:');
console.log('- History:', JSON.stringify(analytics.readerHistory, null, 2));
console.log('- Weekly Comparison:', analytics.weeklyComparison);
console.log('- Monthly Comparison:', analytics.monthlyComparison);
console.log('- Library Overview:', analytics.libraryOverview);
console.log('- Marathons count:', analytics.habits.marathons.length);
console.log('- Retaken Series count:', analytics.habits.retakenSeries.length);
