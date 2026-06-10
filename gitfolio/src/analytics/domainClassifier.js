const DOMAIN_KEYWORDS = {
  backend:  ['api','server','invoice','gst','billing','payment','auth','backend',
             'express','fastapi','django','flask','spring','erp','crm','razorpay',
             'stripe','webhook','microservice','database','crud','rest','graphql'],
  frontend: ['landing','portfolio','ui','design','website','css','html','react',
             'vue','angular','tailwind','nextjs','gatsby','svelte','component'],
  fullstack: ['saas','webapp','dashboard','admin','app','platform','fullstack'],
  ml:       ['model','train','predict','ml','ai','nlp','cv','tensorflow','pytorch',
             'sklearn','dataset','jupyter','notebook','classification','regression'],
  mobile:   ['android','ios','flutter','react-native','kotlin','swift','mobile','apk'],
  devops:   ['docker','kubernetes','ci','cd','terraform','ansible','deploy','nginx'],
  systems:  ['compiler','os','kernel','embedded','firmware','assembly','cli','tool'],
  dsa:      ['leetcode','dsa','algo','algorithm','cp','competitive','hackerrank'],
};

export function classifyDeveloperDomain(repos, languageScores, frameworks) {
  const domainWeights = {
    frontend: {
      languages: { 'JavaScript': 2, 'TypeScript': 2, 'CSS': 1, 'HTML': 1 },
      frameworks: { 'React': 3, 'Vue': 3, 'Angular': 3, 'Svelte': 3, 'Next.js': 3 }
    },
    backend: {
      languages: { 'Python': 1, 'Java': 2, 'Go': 2, 'C#': 2, 'Ruby': 2, 'Node.js': 2 },
      frameworks: { 'Express': 3, 'Spring': 3, 'Django': 3, 'Flask': 3, 'Rails': 3, 'NestJS': 3 }
    },
    ml: {
      languages: { 'Python': 2, 'R': 2, 'Julia': 2 },
      frameworks: { 'PyTorch': 4, 'TensorFlow': 4, 'Keras': 4, 'Scikit-learn': 3, 'Pandas': 2, 'NumPy': 2 }
    },
    mobile: {
      languages: { 'Swift': 2, 'Kotlin': 2, 'Java': 1, 'Dart': 2 },
      frameworks: { 'React Native': 4, 'Flutter': 4, 'SwiftUI': 4, 'Android SDK': 4 }
    },
    devops: {
      languages: { 'Bash': 2, 'YAML': 1, 'HCL': 2, 'Groovy': 1 },
      frameworks: { 'Kubernetes': 4, 'Terraform': 4, 'Ansible': 4, 'Docker': 3, 'Jenkins': 3, 'GitHub Actions': 3 }
    },
    systems: {
      languages: { 'C': 3, 'C++': 3, 'Rust': 3, 'Zig': 3, 'Assembly': 4 },
      frameworks: { 'LLVM': 3, 'Qt': 2 }
    },
    dsa: {
      languages: { 'C++': 1, 'Java': 1, 'Python': 1 },
      keywords: ['dsa', 'leetcode', 'competitive', 'codeforces', 'cp', 'algo']
    }
  };

  const allDomains = Object.keys(domainWeights);

  // Initialize scores for all three pathways
  const langScores = {};
  const nameScores = {};
  const descScores = {};
  allDomains.forEach(d => { langScores[d] = 0; nameScores[d] = 0; descScores[d] = 0; });

  // ── 1. Language/framework heuristics (60%) ──
  for (const [lang, score] of Object.entries(languageScores)) {
    for (const domain of allDomains) {
      const w = domainWeights[domain];
      if (w.languages && w.languages[lang]) {
        langScores[domain] += w.languages[lang] * score;
      }
    }
  }

  for (const framework of frameworks) {
    for (const domain of allDomains) {
      const w = domainWeights[domain];
      if (w.frameworks && w.frameworks[framework]) {
        langScores[domain] += w.frameworks[framework];
      }
    }
  }

  // ── 2. Repo name keyword matching (25%) ──
  for (const repo of repos) {
    const name = repo.name || '';
    const nameParts = name.toLowerCase().split(/[-_\s]+/);
    for (const domain of allDomains) {
      const keywords = DOMAIN_KEYWORDS[domain] || [];
      if (keywords.some(kw => nameParts.includes(kw) || name.toLowerCase().includes(kw))) {
        nameScores[domain] += 5;
      }
    }
  }

  // ── 3. Repo description keyword matching (15%) ──
  for (const repo of repos) {
    const desc = (repo.description || '').toLowerCase();
    for (const domain of allDomains) {
      const keywords = DOMAIN_KEYWORDS[domain] || [];
      if (keywords.some(kw => desc.includes(kw))) {
        descScores[domain] += 4;
      }
    }
  }

    // ── 3b. Repo name direct keyword matching (THIRD fallback) ──
  function classifyByName(repoName) {
    const words = repoName.toLowerCase().split(/[-_\s]+/);
    const KEYWORD_DOMAIN_MAP = {
      backend:  ['api','server','invoice','gst','billing','payment','auth','backend',
                 'express','crud','rest','db','database'],
      frontend: ['ui','landing','portfolio','website','design','dashboard','admin'],
      fullstack: ['app','saas','webapp','platform','portal'],
      ml:       ['model','train','predict','ml','ai','nlp','cv','dataset'],
      mobile:   ['android','ios','flutter','mobile','app'],
      dsa:      ['leetcode','dsa','algo','algorithm','cp','practice'],
    };
    for (const [domain, keywords] of Object.entries(KEYWORD_DOMAIN_MAP)) {
      if (words.some(w => keywords.includes(w))) return domain;
    }
    return null;
  }

  // ── 4. Weighted combination ──
  // Normalize each pathway to 0-100
  const maxLang = Math.max(...Object.values(langScores), 1);
  const maxName = Math.max(...Object.values(nameScores), 1);
  const maxDesc = Math.max(...Object.values(descScores), 1);

  const finalScores = {};
  let totalScore = 0;
  for (const domain of allDomains) {
    const langNorm  = (langScores[domain] / maxLang) * 60;
    const nameNorm  = (nameScores[domain] / maxName) * 25;
    const descNorm  = (descScores[domain] / maxDesc) * 15;
    finalScores[domain] = langNorm + nameNorm + descNorm;
    totalScore += finalScores[domain];
  }

  const sortedDomains = Object.entries(finalScores).sort((a, b) => b[1] - a[1]);
  let primary = sortedDomains[0][0];
  const secondary = sortedDomains[1]?.[0] || primary;
  const confidence = totalScore === 0 ? 0 : sortedDomains[0][1] / Math.max(1, totalScore);

  // If all pathways produced zero, try direct name matching on each repo
  if (totalScore === 0) {
    for (const repo of repos) {
      const nameDomain = classifyByName(repo.name || '');
      if (nameDomain) {
        primary = nameDomain;
        totalScore = 1;
        break;
      }
    }
  }

  // If STILL zero, default to fullstack, NEVER 'Unknown'
  if (totalScore === 0) {
    primary = 'fullstack';
  }

  // Fullstack check: if frontend and backend are both high
  if (finalScores['frontend'] > 0 && finalScores['backend'] > 0) {
    const ratio = Math.min(finalScores['frontend'], finalScores['backend']) / Math.max(finalScores['frontend'], finalScores['backend']);
    if (ratio > 0.6) {
      return { primary: 'fullstack', secondary, confidence: Math.min(confidence + 0.1, 1) };
    }
  }

  return { primary, secondary, confidence };
}
