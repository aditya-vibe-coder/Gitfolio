export function computeContributionMetrics(contributionCalendar) {
  const emptyMetrics = {
    score: 0,
    currentStreak: 0,
    longestStreak: 0,
    activeDays: 0,
    totalContributions: 0,
    consistencyScore: 0,
    peakMonth: '',
    totalDays: 0,
  };

  if (!contributionCalendar || !contributionCalendar.weeks) {
    return emptyMetrics;
  }

  const { weeks } = contributionCalendar;
  const allDays = weeks.flatMap(week => week.contributionDays);
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  // Calculate total contributions and active days
  let totalContributions = 0;
  let activeDays = 0;

  const sortedDays = [...allDays].sort((a, b) => new Date(a.date) - new Date(b.date));

  for (const day of sortedDays) {
    const count = day.contributionCount || 0;
    totalContributions += count;
    if (count > 0) {
      const d = new Date(day.date);
      d.setHours(0, 0, 0, 0);
      const diffDays = Math.ceil(Math.abs(today - d) / (1000 * 60 * 60 * 24));
      if (diffDays <= 365) {
        activeDays++;
      }
    }
  }

  // Hard gates — FIRST TWO LINES
  if (!activeDays || activeDays === 0) return { score: 0, ...emptyMetrics };
  if (!totalContributions || totalContributions === 0) return { score: 0, ...emptyMetrics };

  let currentStreak = 0;
  let longestStreak = 0;
  let tempStreak = 0;
  let weekdayContribs = 0;
  let weekendContribs = 0;
  const monthTotals = new Array(12).fill(0);
  const weeklyTotals = weeks.map(week =>
    week.contributionDays.reduce((sum, day) => sum + (day.contributionCount || 0), 0)
  );

  let recentContributions = 0;

  const ninetyDaysAgo = new Date(today);
  ninetyDaysAgo.setDate(today.getDate() - 90);

  // First pass: compute streaks and aggregates
  for (let i = 0; i < sortedDays.length; i++) {
    const { date, count } = sortedDays[i];
    const d = new Date(date);
    d.setHours(0, 0, 0, 0);
    const c = count || 0;

    if (c > 0) {
      tempStreak++;

      const dayOfWeek = d.getDay();
      if (dayOfWeek === 0 || dayOfWeek === 6) {
        weekendContribs += c;
      } else {
        weekdayContribs += c;
      }

      const month = d.getMonth();
      monthTotals[month] += c;

      if (d >= ninetyDaysAgo && d <= today) {
        recentContributions += c;
      }

      const diffDays = Math.ceil(Math.abs(today - d) / (1000 * 60 * 60 * 24));
      if (diffDays <= 365) {
        // Already counted in activeDays
      }
    } else {
      longestStreak = Math.max(longestStreak, tempStreak);
      tempStreak = 0;
    }
  }
  longestStreak = Math.max(longestStreak, tempStreak);

  // Current streak: go backwards from today
  {
    let checkDate = new Date(today);
    for (let i = sortedDays.length - 1; i >= 0; i--) {
      const { date, count } = sortedDays[i];
      const d = new Date(date);
      d.setHours(0, 0, 0, 0);

      const diffFromToday = Math.round((today - d) / (1000 * 60 * 60 * 24));
      if (diffFromToday > currentStreak) break;

      if ((count || 0) > 0) {
        currentStreak++;
      } else {
        break;
      }
    }
  }

  // Consistency Score (CV-normalized weekly)
  const avgWeekly = weeklyTotals.reduce((a, b) => a + b, 0) / Math.max(1, weeklyTotals.length);
  const variance = weeklyTotals.reduce((a, b) => a + Math.pow(b - avgWeekly, 2), 0) / Math.max(1, weeklyTotals.length);
  const stdDev = Math.sqrt(variance);
  const consistencyScore = avgWeekly === 0 ? 0 : Math.max(0, Math.min(100, 100 - (stdDev / avgWeekly * 100)));

  // Peak month
  const peakMonthIndex = monthTotals.indexOf(Math.max(...monthTotals));
  const peakMonth = peakMonthIndex >= 0
    ? new Date(2000, peakMonthIndex).toLocaleString('default', { month: 'long' })
    : '';

  const totalDays = sortedDays.length;

  // ─── Explicit 100-pt breakdown ───

  // Streak (25 pts max): 30-day current streak = full marks
  const streakPts = Math.min(25, Math.round((currentStreak / 30) * 25));

  // Volume (25 pts max): 365 contributions/year is the bar for "active"
  const volumePts = Math.min(25, Math.round((totalContributions / 365) * 25));

  // Active days (20 pts max): 150 active days/year is committed
  const activePts = Math.min(20, Math.round((activeDays / 150) * 20));

  // Consistency (20 pts max): use CV-normalized weekly score
  const consistencyPts = Math.min(20, Math.round((consistencyScore / 100) * 20));

  // Recency (10 pts max): contributions in last 90 days vs total
  const recentRatio = recentContributions / Math.max(1, totalContributions);
  const recencyPts = Math.min(10, Math.round(recentRatio * 10 * 3));

  return {
    score: streakPts + volumePts + activePts + consistencyPts + recencyPts,
    currentStreak,
    longestStreak,
    activeDays,
    totalContributions,
    consistencyScore: Math.round(consistencyScore),
    peakMonth,
    totalDays,
    weekdayVsWeekend: weekendContribs === 0 ? weekdayContribs : weekdayContribs / weekendContribs,
  };
}
