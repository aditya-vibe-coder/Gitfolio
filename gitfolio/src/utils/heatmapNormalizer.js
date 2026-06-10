/**
 * Normalizes contribution data from either authenticated or public API format
 * into a consistent weeks array for the heatmap component.
 * 
 * Shape A (authenticated): { weeks: [{ contributionDays: [{ date, contributionCount }] }] }
 * Shape B (public): JSON string or object of { "unixTimestamp": count }
 */

export function normalizeContributionData(rawData) {
  if (!rawData) return buildEmptyWeeks();

  // Shape A — already correct format, just normalize field names
  if (rawData.weeks) {
    return rawData.weeks.map(week =>
      (week.contributionDays || []).map(day => ({
        date: day.date,
        count: day.contributionCount ?? 0,
      }))
    );
  }

  // Shape B — convert Unix timestamps to week matrix
  let parsed;
  if (typeof rawData === 'string') {
    try {
      parsed = JSON.parse(rawData);
    } catch {
      return buildEmptyWeeks();
    }
  } else if (typeof rawData === 'object') {
    parsed = rawData;
  } else {
    return buildEmptyWeeks();
  }

  // Build a date → count map from Unix timestamps
  const dateMap = {};
  try {
    Object.entries(parsed).forEach(([ts, count]) => {
      const date = new Date(parseInt(ts, 10) * 1000);
      const dateStr = date.toISOString().split('T')[0];
      dateMap[dateStr] = count;
    });
  } catch {
    return buildEmptyWeeks();
  }

  return buildWeeksFromDateMap(dateMap);
}

function buildWeeksFromDateMap(dateMap) {
  // Build 52 weeks (364 days) ending today
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  // Find the Sunday that is >= 364 days ago
  const startDate = new Date(today);
  startDate.setDate(startDate.getDate() - 364);
  // Rewind to Sunday
  startDate.setDate(startDate.getDate() - startDate.getDay());

  const weeks = [];
  const cursor = new Date(startDate);

  while (cursor <= today) {
    const week = [];
    for (let d = 0; d < 7; d++) {
      const dateStr = cursor.toISOString().split('T')[0];
      week.push({
        date: dateStr,
        count: dateMap[dateStr] ?? 0,
      });
      cursor.setDate(cursor.getDate() + 1);
    }
    weeks.push(week);
  }
  return weeks;
}

function buildEmptyWeeks() {
  return buildWeeksFromDateMap({});
}

/**
 * Get month labels for the heatmap — one label per unique month, not per week.
 */
export function getMonthLabels(weeks) {
  const labels = [];
  let lastMonth = -1;

  weeks.forEach((week, weekIndex) => {
    // Use the first non-null/non-future day in the week
    const firstDay = week.find(d => d && d.date && d.count !== undefined);
    if (!firstDay) return;

    const month = new Date(firstDay.date).getMonth();
    if (month !== lastMonth) {
      labels.push({
        weekIndex,
        label: new Date(firstDay.date).toLocaleString('default', { month: 'short' }),
      });
      lastMonth = month;
    }
  });

  return labels;
}

/**
 * Compute total contributions from normalized weeks
 */
export function computeTotalContributions(weeks) {
  if (!weeks || !Array.isArray(weeks)) return 0;
  return weeks.flat().reduce((sum, day) => sum + (day?.count ?? 0), 0);
}

/**
 * Compute longest streak from normalized weeks
 */
export function computeLongestStreak(weeks) {
  if (!weeks || !Array.isArray(weeks)) return 0;
  const days = weeks.flat();
  let longest = 0;
  let current = 0;
  for (const day of days) {
    if (day?.count > 0) {
      current++;
      longest = Math.max(longest, current);
    } else {
      current = 0;
    }
  }
  return longest;
}

/**
 * Compute active days from normalized weeks
 */
export function computeActiveDays(weeks) {
  if (!weeks || !Array.isArray(weeks)) return 0;
  return weeks.flat().filter(d => d?.count > 0).length;
}
