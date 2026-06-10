export function scoreProject(repo, repoLanguages, commits, readmeLength) {
  const classification = repo.classification || 'ORIGINAL';

  const score = {
    // 1. README present (max 5)
    readme_present: repo.hasReadme ? 5 : 0,

    // 2. README quality (max 15)
    readme_quality: (() => {
      const len = repo.readmeLength || readmeLength || 0;
      if (len < 100)  return 0;
      if (len < 300)  return 4;
      if (len < 800)  return 8;
      if (len < 2000) return 12;
      return 15;
    })(),

    // 3. Description (max 8)
    description: (() => {
      const d = repo.description || '';
      if (!d || d.length < 15) return 0;
      if (d.length < 40) return 3;
      return 8;
    })(),

    // 4. Live demo URL (max 10)
    live_demo: repo.homepage && repo.homepage.startsWith('http') ? 10 : 0,

    // 5. License (max 5)
    license: repo.license ? 5 : 0,

    // 6. Stars (max 15)
    stars: (() => {
      const s = repo.stargazers_count || 0;
      if (s === 0) return 0;
      if (s < 3)   return 2;
      if (s < 10)  return 6;
      if (s < 25)  return 10;
      if (s < 100) return 13;
      return 15;
    })(),

    // 7. Language diversity (max 5)
    language_diversity: (() => {
      const langObj = repo.languages || repoLanguages || {};
      const count = Object.keys(langObj).length;
      if (count <= 1) return 1;
      if (count === 2) return 3;
      return 5;
    })(),

    // 8. Commit count (max 15)
    commit_count: (() => {
      const c = repo.commitCount || commits || 0;
      if (c < 3)   return 0;
      if (c < 10)  return 4;
      if (c < 25)  return 8;
      if (c < 60)  return 11;
      return 15;
    })(),

    // 9. Recent activity (max 10)
    recent_activity: (() => {
      if (!repo.pushed_at) return 0;
      const days = (Date.now() - new Date(repo.pushed_at)) / 86_400_000;
      if (days > 365) return 0;
      if (days > 180) return 2;
      if (days > 90)  return 5;
      if (days > 30)  return 7;
      return 10;
    })(),

    // 10. Not a tutorial/assignment/fork (max 12)
    not_tutorial: ['TUTORIAL', 'ASSIGNMENT', 'FORK_INACTIVE'].includes(classification)
      ? 0 : 12,
  };

  // Max: 5+15+8+10+5+15+5+15+10+12 = 100 ✓
  const total = Object.values(score).reduce((a, b) => a + b, 0);

  return { total, breakdown: score };
}
