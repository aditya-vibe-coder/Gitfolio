import { 
  computeLanguageScores, 
  scoreProject, 
  classifyRepo, 
  computeContributionMetrics, 
  classifyDeveloperDomain, 
  computeOverallScore,
} from '../analytics/index.js';

self.onmessage = async (e) => {
  const { type, payload } = e.data;

  if (type === 'COMPUTE_ALL') {
    try {
      const { repos, languages, contributions, commits } = payload;

      // 1. Repository Classification & Filtering
      const allClassified = repos.map(repo => ({ ...repo, classification: classifyRepo(repo) }));
      const showcaseRepos = allClassified.filter(r => ['ORIGINAL', 'FORK_ACTIVE', 'SHOWCASE'].includes(r.classification));

      // 2. Language Scores (Showcase only)
      const repoLangArray = showcaseRepos.map(repo => languages[repo.full_name] || {});
      const langScores = computeLanguageScores(showcaseRepos, repoLangArray);

      // 3. Contribution Metrics
      const contribMetrics = contributions ? computeContributionMetrics(contributions) : null;

      // 4. Project Scores (Showcase only)
      const scoredProjects = showcaseRepos.map(repo => {
        const langData = languages[repo.full_name] || {};
        const score = scoreProject(repo, Object.keys(langData), repo.commitCount || 10, repo.readmeLength || 500);
        return { 
          ...repo, 
          repoType: repo.classification,
          qualityScore: score.total, 
          scoreBreakdown: score.breakdown 
        };
      });

      // 5. Domain Classification
      const langScoreMap = langScores.reduce((acc, curr) => ({ ...acc, [curr.language]: curr.score }), {});
      const domain = classifyDeveloperDomain(showcaseRepos, langScoreMap, []);

      // 6. Overall Score with new pipeline
      const leetcodeData = payload.leetcodeData || null;
      const allMetrics = {
        projectRaw: scoredProjects.reduce((a, b) => a + b.qualityScore, 0) / (scoredProjects.length || 1),
        languageRaw: langScores[0]?.score || 0,
        contributionRaw: contribMetrics?.score || 0,
        profileRaw: payload.profileCompleteness || 100,
        hygieneRaw: payload.codeHygiene || 50,
        activeDays: contribMetrics?.activeDays || 0,
        totalContributions: contribMetrics?.totalContributions || 0,
        repos: allClassified,
        leetcodeData,
      };
      const overall = computeOverallScore(allMetrics);

      self.postMessage({
        type: 'COMPUTE_DONE',
        result: {
          langScores,
          contribMetrics,
          domain,
          scoredProjects,
          overall,
          allClassified,
          coachingMessages: overall.coachingMessages,
          scoreBreakdown: overall.scoreBreakdown,
          tier: overall.tier,
          combinedScore: overall.combinedScore || null,
          dsaTier: overall.dsaTier || null,
        }
      });
    } catch (error) {
      self.postMessage({
        type: 'COMPUTE_ERROR',
        error: error.message
      });
    }
  }
};
