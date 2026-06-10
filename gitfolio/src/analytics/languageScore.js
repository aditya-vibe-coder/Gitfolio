const LANGUAGE_BENCHMARKS = {
  JavaScript:  { bytes: 800_000, repos: 8, months: 18 },
  TypeScript:  { bytes: 700_000, repos: 7, months: 15 },
  Python:      { bytes: 600_000, repos: 7, months: 18 },
  Java:        { bytes: 1_000_000, repos: 6, months: 18 },
  CSS:         { bytes: 400_000, repos: 6, months: 12 },
  HTML:        { bytes: 300_000, repos: 5, months: 10 },
  'C++':       { bytes: 800_000, repos: 5, months: 18 },
  C:           { bytes: 600_000, repos: 5, months: 15 },
  Go:          { bytes: 400_000, repos: 4, months: 12 },
  Rust:        { bytes: 300_000, repos: 3, months: 12 },
  Dart:        { bytes: 350_000, repos: 4, months: 12 },
  Kotlin:      { bytes: 500_000, repos: 4, months: 12 },
  Swift:       { bytes: 500_000, repos: 4, months: 12 },
  _default:    { bytes: 500_000, repos: 6, months: 15 },
};

const LABEL_THRESHOLDS = {
  Expert:       { bytes: 500_000, repos: 5, months: 12 },
  Advanced:     { bytes: 100_000, repos: 3, months:  6 },
  Intermediate: { bytes:  20_000, repos: 2, months:  3 },
  Beginner:     { bytes:   2_000, repos: 1, months:  1 },
};

function getHonestLabel(bytes, repoCount, distinctMonths) {
  for (const [label, t] of Object.entries(LABEL_THRESHOLDS)) {
    if (bytes >= t.bytes && repoCount >= t.repos && distinctMonths >= t.months) {
      return label;
    }
  }
  return 'Exposure';
}

function getProficiencyPercent(language, bytes, repoCount, distinctMonths) {
  const bm = LANGUAGE_BENCHMARKS[language] || LANGUAGE_BENCHMARKS._default;

  const byteScore  = Math.min(100, (bytes       / bm.bytes)  * 100);
  const repoScore  = Math.min(100, (repoCount   / bm.repos)  * 100);
  const monthScore = Math.min(100, (distinctMonths / bm.months) * 100);

  // Weighted: volume of code is most important signal
  return Math.round((byteScore * 0.55) + (repoScore * 0.30) + (monthScore * 0.15));
}

export function computeLanguageScores(repos, repoLanguages) {
  const languageData = {};
  const now = new Date();

  // Process each repo and its language breakdown
  repos.forEach((repo, index) => {
    const pushedAt = repo.pushed_at ? new Date(repo.pushed_at) : null;
    const langBytes = repoLanguages[index] || {};

    Object.entries(langBytes).forEach(([language, bytes]) => {
      if (!languageData[language]) {
        languageData[language] = {
          totalBytes: 0,
          repoCount: 0,
          monthSet: new Set(),
          lastUsedDate: null,
        };
      }

      const data = languageData[language];
      data.totalBytes += bytes;
      data.repoCount += 1;

      if (pushedAt) {
        const yearMonth = pushedAt.toISOString().slice(0, 7);
        data.monthSet.add(yearMonth);
        if (!data.lastUsedDate || pushedAt > data.lastUsedDate) {
          data.lastUsedDate = pushedAt;
        }
      }
    });
  });

  // Calculate benchmark-relative scores (no self-normalization)
  const languageObjects = [];

  for (const [language, data] of Object.entries(languageData)) {
    const distinctMonths = data.monthSet.size;

    // Determine trend based on last used date
    let trend = 'stable';
    if (data.lastUsedDate) {
      const diffTime = now - data.lastUsedDate;
      const diffMonths = diffTime / (1000 * 60 * 60 * 24 * 30);
      if (diffMonths <= 1) trend = 'growing';
      else if (diffMonths > 3) trend = 'declining';
    }

    const score = getProficiencyPercent(language, data.totalBytes, data.repoCount, distinctMonths);
    const label = getHonestLabel(data.totalBytes, data.repoCount, distinctMonths);

    // Only show trend if user has > 1 repo in that language
    const displayTrend = data.repoCount > 1 ? trend : null;

    languageObjects.push({
      language,
      totalBytes: data.totalBytes,
      repoCount: data.repoCount,
      distinctMonths,
      lastUsedDate: data.lastUsedDate ? data.lastUsedDate.toISOString() : null,
      trend: displayTrend,
      score,
      label,
      depth: label,
    });
  }

  // Sort by score descending
  languageObjects.sort((a, b) => b.score - a.score);
  return languageObjects;
}
