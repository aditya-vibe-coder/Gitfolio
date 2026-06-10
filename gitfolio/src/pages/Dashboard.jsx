import { useMemo, useState, useEffect, useRef, useCallback } from 'react';
import { 
  MapPin, 
  Globe, 
  Share2, 
  FileDown, 
  Zap, 
  TrendingUp, 
  Calendar, 
  Code2, 
  GitFork, 
  GitPullRequest,
  ExternalLink, 
  CheckCircle2, 
  XCircle, 
  Sparkles,
  Building2,
  Lock,
  CalendarOff,
  AlertTriangle,
  Info,
  BarChart,
  HelpCircle,
  Trophy,
  ArrowUpRight,
  Target,
  BookOpen,
  GitBranch,
  MessageSquare,
  ChevronRight,
  Users,
  Briefcase,
} from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import { useGitHubData } from '../hooks/useGitHubData';
import usePremium from '../hooks/usePremium';
import { fetchFileContent, fetchUserPullRequests } from '../services/github';
import { 
  computeOverallScore, 
  computeLanguageScores, 
  computeContributionMetrics, 
  scoreProject, 
  classifyDeveloperDomain, 
  detectFrameworks,
} from '../analytics';
import { Card, Badge, Button, Skeleton } from '../components/ui';
import PremiumGate from '../components/PremiumGate';
import RepoImprover from '../components/AIFeatures/RepoImprover';
import ShareModal from '../components/ShareModal';
import ShareKit from '../components/ShareKit';
import OfflineBanner from '../components/OfflineBanner';
import LeetCodeCard from '../components/LeetCodeCard';
import CompanyFitCard from '../components/CompanyFitCard';
import PeerBenchmarking from '../components/PeerBenchmarking';
import RoadmapTimeline from '../components/RoadmapTimeline';
import InterviewQuestions from '../components/InterviewQuestions';
import OpenSourceFinder from '../components/OpenSourceFinder';
import ApplicationsCRM from '../components/ApplicationsCRM';
import OnboardingModal from '../components/OnboardingModal';
import { exportPortfolioPDF } from '../services/pdfExport';
import PlacementCard from '../components/PlacementCard';
import { db } from '../services/db';

const CompactPremiumLock = ({ featureName, description, onUnlock }) => (
  <div style={{ 
    backgroundColor: '#161b22', 
    border: '0.5px solid #30363d', 
    borderRadius: '10px', 
    padding: '14px 18px', 
    display: 'flex', 
    alignItems: 'center', 
    gap: '14px', 
    width: '100%' 
  }}>
    <div style={{ 
      width: '36px', 
      height: '36px', 
      borderRadius: '8px', 
      backgroundColor: '#2a1a1a', 
      color: '#e3b341', 
      display: 'flex', 
      alignItems: 'center', 
      justifyContent: 'center' 
    }}>
      <Lock size={16} />
    </div>
    <div style={{ flex: 1, minWidth: 0 }}>
      <div style={{ fontSize: '13px', fontWeight: '500', color: '#e6edf3', marginBottom: '2px' }}>{featureName}</div>
      <div style={{ fontSize: '11px', color: '#8b949e', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{description}</div>
    </div>
    <button 
      onClick={onUnlock}
      style={{ 
        fontSize: '11px', 
        padding: '6px 12px', 
        borderRadius: '6px', 
        backgroundColor: '#1c2a3a', 
        color: '#58a6ff', 
        border: '0.5px solid #388bfd', 
        cursor: 'pointer' 
      }}
    >
      Unlock
    </button>
  </div>
);

const HEATMAP_COLORS = {
  0:  '#161b22',
  1:  '#0e4429',
  2:  '#006d32',
  3:  '#26a641',
  4:  '#39d353',
};

function getHeatColor(count) {
  if (!count || count === 0) return HEATMAP_COLORS[0];
  if (count < 4)  return HEATMAP_COLORS[1];
  if (count < 10) return HEATMAP_COLORS[2];
  if (count < 20) return HEATMAP_COLORS[3];
  return HEATMAP_COLORS[4];
}

const DAY_LABELS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

const ActivityHeatmap = ({ contributions }) => {
  const scrollRef = useRef(null);
  const [tooltip, setTooltip] = useState(null);

  const today = new Date();
  const startDate = new Date();
  startDate.setDate(today.getDate() - 364);
  const startSunday = new Date(startDate);
  startSunday.setDate(startDate.getDate() - startDate.getDay());

  const days = [];
  const dateMap = new Map();

  if (contributions?.weeks) {
    contributions.weeks.forEach(week => {
      week.contributionDays.forEach(day => {
        dateMap.set(day.date, day.contributionCount);
      });
    });
  }

  let current = new Date(startSunday);
  while (current <= today) {
    const dateStr = current.toISOString().split('T')[0];
    days.push({
      date: dateStr,
      count: dateMap.get(dateStr) || 0,
      month: current.toLocaleString('en-US', { month: 'short' }),
      dayOfWeek: current.getDay(),
    });
    current.setDate(current.getDate() + 1);
  }

  // Month labels — track by month changes, NOT per cell
  function getMonthLabels(daysArray) {
    const labels = [];
    let lastMonth = -1;
    daysArray.forEach((day, i) => {
      if (day.dayOfWeek === 0 || i === 0) {
        const monthNum = new Date(day.date).getMonth();
        if (monthNum !== lastMonth) {
        labels.push({
          index: Math.floor(i / 7),
          month: day.month,
        });
          lastMonth = monthNum;
        }
      }
    });
    return labels;
  }
  const monthLabels = getMonthLabels(days);

  // Scroll to the rightmost (most recent) on mount
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollLeft = scrollRef.current.scrollWidth;
    }
  }, []);

  const handleMouseEnter = useCallback((e, day) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const dateObj = new Date(day.date + 'T00:00:00');
    const formatted = dateObj.toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'long',
      day: 'numeric',
      year: 'numeric',
    });
    const countText = day.count > 0 ? `${day.count} contributions` : 'No contributions';
    setTooltip({
      text: `${formatted} · ${countText}`,
      x: rect.left + rect.width / 2,
      y: rect.top - 8,
    });
  }, []);

  const handleMouseLeave = useCallback(() => {
    setTooltip(null);
  }, []);

  return (
    <div className="flex w-full overflow-hidden">
      {/* Day Labels */}
      <div className="flex flex-col justify-between text-[9px] font-mono text-right text-[#8b949e] h-[91px] w-8 pr-2" style={{ lineHeight: '13px' }}>
        {DAY_LABELS.map((label, i) => (
          <div key={i} className="h-[13px] flex items-center justify-end">{label}</div>
        ))}
      </div>

      {/* Scrollable Area */}
      <div ref={scrollRef} className="flex-1 overflow-x-auto pb-2" style={{ overflowX: 'auto' }}>
        <div className="inline-block">
          {/* Month Labels */}
          <div className="flex text-[10px] text-[#8b949e] mb-1 h-4" style={{ gap: '0' }}>
            {monthLabels.map((m, i) => (
              <span key={i} style={{ marginLeft: i === 0 ? '0' : `${(m.index - (monthLabels[i-1]?.index || 0) - 1) * 13}px`, minWidth: `${13 * (m.month.length > 3 ? 5 : 3)}px` }}>
                {m.month}
              </span>
            ))}
          </div>

          {/* Grid: 7 rows (all days), 52+ columns */}
          <div className="grid grid-flow-col grid-rows-7 gap-[2px]">
            {days.map((day, i) => (
              <div
                key={i}
                onMouseEnter={(e) => handleMouseEnter(e, day)}
                onMouseLeave={handleMouseLeave}
                className="rounded-[2px] cursor-pointer transition-colors"
                style={{
                  width: '11px',
                  height: '11px',
                  backgroundColor: getHeatColor(day.count),
                }}
              />
            ))}
          </div>

          {/* Legend */}
          <div className="flex justify-end items-center gap-1 mt-2 text-[10px] text-[#8b949e]">
            <span>Less</span>
            <div className="flex gap-[2px]">
              {Object.values(HEATMAP_COLORS).map((color, i) => (
                <div key={i} style={{ width: '11px', height: '11px', backgroundColor: color, borderRadius: '2px' }} />
              ))}
            </div>
            <span>More</span>
          </div>
        </div>
      </div>

      {/* Floating Tooltip */}
      {tooltip && (
        <div
          style={{
            position: 'fixed',
            left: tooltip.x,
            top: tooltip.y,
            transform: 'translate(-50%, -100%)',
            background: '#1c2128',
            border: '1px solid #30363d',
            borderRadius: '6px',
            padding: '6px 10px',
            fontSize: '12px',
            color: '#e6edf3',
            pointerEvents: 'none',
            zIndex: 9999,
            whiteSpace: 'nowrap',
          }}
        >
          {tooltip.text}
        </div>
      )}
    </div>
  );
};

// Company profiles for quick-select chips
const COMPANY_QUICK_SELECT = [
  ['Amazon', 'Microsoft', 'Google', 'Flipkart'],
  ['Razorpay', 'Zepto', 'Swiggy', 'Juspay'],
  ['Atlassian', 'Adobe', 'Salesforce', 'Intuit'],
  ['TCS', 'Infosys', 'Wipro', 'Accenture'],
];

const DSA_TIERS = [
  { min: 400, label: 'Grandmaster', color: '#ef4444' },
  { min: 250, label: 'Expert', color: '#f97316' },
  { min: 150, label: 'Proficient', color: '#eab308' },
  { min: 75, label: 'Practicing', color: '#84cc16' },
  { min: 20, label: 'Beginner', color: '#22c55e' },
  { min: 0, label: 'Just Started', color: '#8b949e' },
];

const Dashboard = () => {
  const { user, token } = useAuth();
  const { isPremium, openUpgradeModal } = usePremium();
  const { 
    profile, 
    repos, 
    languages: rawLanguages, 
    contributions, 
    isLoading, 
    progress 
  } = useGitHubData({ username: user?.login, token });

  const [projectFilter, setProjectFilter] = useState('All');
  const [showAllRepos, setShowAllRepos] = useState(false);
  const [frameworksData, setFrameworksData] = useState(null);
  const [improvingRepo, setImprovingRepo] = useState(null);
  const [isShareModalOpen, setShareModalOpen] = useState(false);
  const [publicPRs, setPublicPRs] = useState([]);
  const [prsLoading, setPrsLoading] = useState(true);
  const [jd, setJd] = useState('');
  const [matchResult, setMatchResult] = useState(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [toast, setToast] = useState(null);

  // Company Fit state
  const [selectedCompany, setSelectedCompany] = useState(null);
  const [companyFitResult, setCompanyFitResult] = useState(null);
  const [isAnalyzingFit, setIsAnalyzingFit] = useState(false);
  const [companyFitCount, setCompanyFitCount] = useState(0);
  const [onboardingDone, setOnboardingDone] = useState(true);
  
  // Load Company Fit usage count from Dexie with 24-hour reset
  useEffect(() => {
    db.settings.get('company_fit_usage').then(entry => {
      if (entry?.value) {
        const { count, lastReset } = entry.value;
        const now = Date.now();
        const hoursSinceReset = (now - lastReset) / (1000 * 60 * 60);
        if (hoursSinceReset >= 24) {
          setCompanyFitCount(0);
          db.settings.put({ key: 'company_fit_usage', value: { count: 0, lastReset: now } });
        } else {
          setCompanyFitCount(count);
        }
      } else {
        db.settings.put({ key: 'company_fit_usage', value: { count: 0, lastReset: Date.now() } });
      }
    });
  }, []);
  
  // LeetCode state
  const [leetcodeUsername, setLeetcodeUsername] = useState('');
  const [leetcodeData, setLeetcodeData] = useState(null);
  const [isFetchingLeetcode, setIsFetchingLeetcode] = useState(false);
  const [cfHandle, setCfHandle] = useState('');
  const [cfData, setCfData] = useState(null);

  // Roadmap state
  const [roadmapData, setRoadmapData] = useState(null);
  const [isGeneratingRoadmap, setIsGeneratingRoadmap] = useState(false);
  const [targetCompanies, setTargetCompanies] = useState('');
  const [roadmapCompleted, setRoadmapCompleted] = useState(0);
  const [roadmapChecked, setRoadmapChecked] = useState(new Set());

  // Load roadmap, checked state, and questions from Dexie on mount
  useEffect(() => {
    if (user?.login) {
      db.settings.get(`roadmap:${user.login}`).then(entry => {
        if (entry?.value?.milestones) {
          setRoadmapData(entry.value);
        }
      });
      db.settings.get(`roadmap_checked:${user.login}`).then(entry => {
        if (entry?.value) {
          const checkedArr = entry.value;
          setRoadmapChecked(new Set(checkedArr));
          setRoadmapCompleted(checkedArr.length);
        }
      });
      db.settings.get(`questions:${user.login}`).then(entry => {
        if (entry?.value) {
          setInterviewQuestions(entry.value);
        }
      });
    }
  }, [user?.login]);

  // Interview questions state
  const [interviewQuestions, setInterviewQuestions] = useState(null);
  const [isGeneratingQuestions, setIsGeneratingQuestions] = useState(false);

  // Peers state
  const [peerStats, setPeerStats] = useState(null);
  const [isLoadingPeers, setIsLoadingPeers] = useState(false);

  // OSS Finder state
  const [ossIssues, setOssIssues] = useState([]);
  const [isLoadingOss, setIsLoadingOss] = useState(false);

  // Applications state
  const [applications, setApplications] = useState([]);

  // Check onboarding completed
  useEffect(() => {
    db.settings.get('onboardingDone').then(val => {
      if (!val) setOnboardingDone(false);
    });
  }, []);

  // Load LeetCode data from Dexie if exists
  useEffect(() => {
    if (user?.login) {
      db.platforms.where('username').equals(user.login).first().then(entry => {
        if (entry?.leetcodeData) setLeetcodeData(entry.leetcodeData);
        if (entry?.cfData) setCfData(entry.cfData);
        if (entry?.leetcodeUsername) setLeetcodeUsername(entry.leetcodeUsername);
        if (entry?.cfHandle) setCfHandle(entry.cfHandle);
      });
      db.applications.toArray().then(apps => setApplications(apps));
    }
  }, [user?.login]);

  useEffect(() => {
    // Framework detection is handled in a separate useEffect below
  }, [repos, token]);

  useEffect(() => {
    async function fetchPRs() {
      if (!user?.login || !token) return;
      setPrsLoading(true);
      try {
        const prs = await fetchUserPullRequests(user.login, token);
        setPublicPRs(prs || []);
      } catch (e) {
        console.error('Failed to fetch PRs', e);
      } finally {
        setPrsLoading(false);
      }
    }
    fetchPRs();
  }, [user?.login, token]);

  // To fix the detectFrameworks issue, I'll implement a modified version of it here 
  // or just do it manually in a useMemo.
  
  const analytics = useMemo(() => {
    if (!profile || !repos) return null;

    // 1. Language Scores
    const repoLangArray = repos.map(repo => rawLanguages[repo.full_name] || {});
    const langScores = computeLanguageScores(repos, repoLangArray);

    // 2. Contribution Metrics
    const contribMetrics = contributions ? computeContributionMetrics(contributions) : null;

    // 3. Domain Classification
    // We need frameworks for this. Since detectFrameworks is async, we can't use it in useMemo.
    // I'll use a placeholder or the frameworksData state.
    const frameworks = frameworksData ? Array.from(frameworksData.values()).flatMap(f => f.frameworks) : [];
    const domain = classifyDeveloperDomain(repos, 
      langScores.reduce((acc, curr) => ({ ...acc, [curr.language]: curr.score }), {}), 
      frameworks
    );

    // 4. Project Scores
    const scoredProjects = repos.map(repo => {
      const langData = rawLanguages[repo.full_name] || {};
      const langList = Object.keys(langData);
      // We don't have commit counts or readme lengths easily available from useGitHubData.
      // I'll assume 10 commits and 500 chars for README if not available, or try to estimate.
      // In a real app, we'd fetch these.
      const score = scoreProject(repo, langList, 10, 500); 
      return { ...repo, qualityScore: score.total, scoreBreakdown: score.breakdown };
    });

    // 5. Overall Score — include LeetCode data if connected
    const allMetrics = {
      projectRaw: scoredProjects.reduce((a, b) => a + b.qualityScore, 0) / (scoredProjects.length || 1),
      languageRaw: langScores[0]?.score || 0,
      contributionRaw: contribMetrics?.score || 0,
      profileRaw: 100,
      hygieneRaw: 50,
      activeDays: contribMetrics?.activeDays || 0,
      totalContributions: contribMetrics?.totalContributions || 0,
      repos,
      leetcodeData: leetcodeData || null,
    };
    const overall = computeOverallScore(allMetrics);

    return {
      langScores,
      contribMetrics,
      domain,
      scoredProjects,
      overall,
    };
  }, [profile, repos, rawLanguages, contributions, frameworksData, leetcodeData]);

  useEffect(() => {
    async function runDetection() {
      if (!repos || !token) return;
      
      const repoContentsMap = new Map();
      const fileToRepo = new Map();
      
      repos.slice(0, 10).forEach(repo => {
        if (repo.rootContents) {
          const paths = repo.rootContents.map(f => f.path);
          repoContentsMap.set(repo.full_name, paths);
          paths.forEach(path => fileToRepo.set(path, repo));
        }
      });

      const fileContentFetcher = async (path) => {
        const repo = fileToRepo.get(path);
        if (!repo) return null;
        return await fetchFileContent(repo.owner.login, repo.name, path, token);
      };

      const results = await detectFrameworks(repoContentsMap, fileContentFetcher);
      setFrameworksData(results);
    }
    runDetection();
  }, [repos, token]);

  const filteredProjects = useMemo(() => {
    if (!analytics?.scoredProjects) return [];
    const projects = analytics.scoredProjects;
    
    const baseRepos = showAllRepos 
      ? projects 
      : projects.filter(repo => !['FORK_INACTIVE', 'TUTORIAL', 'ASSIGNMENT'].includes(repo.classification));

    if (projectFilter === 'All') return baseRepos;
    
    const domainMap = {
      'Web': ['frontend', 'backend', 'fullstack'],
      'ML/AI': ['ml_ai'],
      'Mobile': ['mobile'],
      'Systems': ['systems'],
      'DSA': ['dsa_cp'],
    };
    
    return baseRepos.filter(repo => {
      const repoLangs = rawLanguages[repo.full_name] || {};
      const repoLangScores = computeLanguageScores([repo], [repoLangs]);
      const repoFrameworks = frameworksData?.get(repo.full_name)?.frameworks || [];
      const repoDomain = classifyDeveloperDomain([repo], 
        repoLangScores.reduce((acc, curr) => ({ ...acc, [curr.language]: curr.score }), {}), 
        repoFrameworks
      ).primary;
      
      return domainMap[projectFilter].includes(repoDomain);
    });
  }, [analytics, projectFilter, showAllRepos, rawLanguages, frameworksData]);

  const displayProjects = isPremium ? filteredProjects : filteredProjects.slice(0, 5);

  const handleAnalyze = async () => {
    if (!jd.trim()) return;
    setIsAnalyzing(true);
    try {
      const response = await fetch('/ai', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          feature: 'job-match', 
          jobDescription: jd 
        }),
      });
      const data = await response.json();
      setMatchResult(data);
    } catch (e) {
      console.error('Analysis failed', e);
    } finally {
      setIsAnalyzing(false);
    }
  };

    // Section header helper for consistent styling
  const SectionHeader = ({ icon, title }) => (
    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
      <span style={{ color: '#8b949e', fontSize: '16px', display: 'flex' }}>{icon}</span>
      <h2 style={{ fontSize: '16px', fontWeight: '600', color: '#e6edf3', margin: 0 }}>{title}</h2>
    </div>
  );

  // Compute combined score for display — prefers combinedScore when LeetCode has real activity
  const hasDSA = leetcodeData && analytics?.overall?.dsaTier && analytics.overall.dsaTier !== 'None';
  const displayScore = hasDSA && analytics?.overall?.combinedScore
    ? analytics.overall.combinedScore
    : (analytics?.overall?.interviewReadiness || 0);
  const displayTier = hasDSA
    ? 'Combined'
    : (analytics?.overall?.tier?.label || 'developing');
  const displayDesc = hasDSA
    ? `GitHub ${analytics.overall.interviewReadiness} + DSA ${analytics.overall.dsaTier}`
    : (analytics?.overall?.tier?.desc || '');
  const displayDSAColor = (() => {
    if (!analytics?.overall?.dsaTier) return '#8b949e';
    const dsa = analytics.overall.dsaTier;
    if (dsa === 'Grandmaster') return '#ef4444';
    if (dsa === 'Expert') return '#f97316';
    if (dsa === 'Proficient') return '#eab308';
    if (dsa === 'Practicing') return '#84cc16';
    if (dsa === 'Beginner') return '#22c55e';
    return '#8b949e';
  })();

  if (isLoading && !profile) {
    return (
      <div className="max-w-[1200px] mx-auto p-6 space-y-6">
        <Skeleton className="h-2 w-full" />
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Skeleton className="h-48 col-span-2" />
          <Skeleton className="h-48" />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <Skeleton className="h-32" />
          <Skeleton className="h-32" />
          <Skeleton className="h-32" />
          <Skeleton className="h-32" />
        </div>
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  const handleCompanySelect = async (company) => {
    setSelectedCompany(company);
    if (!isPremium) {
      if (companyFitCount >= 2) {
        openUpgradeModal();
        return;
      }
    }
    setIsAnalyzingFit(true);
    try {
      const premiumEntry = await db.premium.toArray();
      const licenseKey = premiumEntry[0]?.licenseKey;
      const profileData = {
        languages: analytics?.langScores,
        domain: analytics?.domain,
        repos: analytics?.scoredProjects?.slice(0, 5),
        contribMetrics: analytics?.contribMetrics,
        overallScore: analytics?.overall?.interviewReadiness,
        tier: analytics?.overall?.tier,
      };
      const headers = { 'Content-Type': 'application/json' };
      if (licenseKey) headers['x-license-key'] = licenseKey;
      const response = await fetch(`${import.meta.env.VITE_WORKER_URL}/ai`, {
        method: 'POST', headers, 
        body: JSON.stringify({ feature: 'company-fit', payload: { company, profileData } }),
      });
      const data = await response.json();
      if (data.result) {
        const parsed = typeof data.result === 'string' ? JSON.parse(data.result) : data.result;
        setCompanyFitResult(parsed);          if (!isPremium) {
            setCompanyFitCount(prev => {
              const newCount = prev + 1;
              db.settings.get('company_fit_usage').then(entry => {
                const lastReset = entry?.value?.lastReset || Date.now();
                db.settings.put({ key: 'company_fit_usage', value: { count: newCount, lastReset } });
              });
              return newCount;
            });
          }
      }
    } catch (e) {
      console.error('Company fit error:', e);
    } finally {
      setIsAnalyzingFit(false);
    }
  };

  const handleLeetcodeConnect = async () => {
    if (!leetcodeUsername.trim()) return;
    setIsFetchingLeetcode(true);
    try {
      const res = await fetch(`${import.meta.env.VITE_WORKER_URL}/platforms/leetcode?username=${encodeURIComponent(leetcodeUsername)}`);
      const data = await res.json();
      if (data.error) {
        console.error('LeetCode API error:', data.error);
        return;
      }
      setLeetcodeData(data);
      let cfDataResp = cfData;
      if (cfHandle.trim()) {
        const cfRes = await fetch(`${import.meta.env.VITE_WORKER_URL}/platforms/codeforces?handle=${encodeURIComponent(cfHandle)}`);
        const cfJson = await cfRes.json();
        if (!cfJson.error) {
          cfDataResp = cfJson;
          setCfData(cfJson);
        }
      }
      // Merge data into a single Dexie entry
      await db.platforms.put({
        username: user.login,
        leetcodeUsername,
        leetcodeData: data,
        cfHandle,
        cfData: cfDataResp,
        timestamp: Date.now(),
      });
    } catch (e) {
      console.error('LeetCode fetch error:', e);
    } finally {
      setIsFetchingLeetcode(false);
    }
  };

  const handleGenerateRoadmap = async () => {
    setIsGeneratingRoadmap(true);
    try {
      const premiumEntry = await db.premium.toArray();
      const licenseKey = premiumEntry[0]?.licenseKey;
      const profileData = {
        languages: analytics?.langScores,
        domain: analytics?.domain,
        repos: analytics?.scoredProjects?.slice(0, 5),
        contribMetrics: analytics?.contribMetrics,
        overall: analytics?.overall,
      };
      const weaknesses = analytics?.overall?.coachingMessages || [];
      const headers = { 'Content-Type': 'application/json' };
      if (licenseKey) headers['x-license-key'] = licenseKey;
      const response = await fetch(`${import.meta.env.VITE_WORKER_URL}/ai`, {
        method: 'POST', headers,
        body: JSON.stringify({
          feature: 'roadmap',
          payload: { profileData, weaknesses, companies: targetCompanies || 'Any' },
        }),
      });
      const data = await response.json();
      if (data.result) {
        const parsed = typeof data.result === 'string' ? JSON.parse(data.result) : data.result;
        setRoadmapData(parsed);
        await db.settings.put({ key: `roadmap:${user.login}`, value: parsed });
      }
    } catch (e) {
      console.error('Roadmap error:', e);
    } finally {
      setIsGeneratingRoadmap(false);
    }
  };

  const handleGenerateQuestions = async () => {
    setIsGeneratingQuestions(true);
    try {
      const premiumEntry = await db.premium.toArray();
      const licenseKey = premiumEntry[0]?.licenseKey;
      const profileData = {
        languages: analytics?.langScores?.slice(0, 5),
        domain: analytics?.domain,
        topRepos: analytics?.scoredProjects?.slice(0, 2),
        overall: analytics?.overall,
      };
      const headers = { 'Content-Type': 'application/json' };
      if (licenseKey) headers['x-license-key'] = licenseKey;
      const response = await fetch(`${import.meta.env.VITE_WORKER_URL}/ai`, {
        method: 'POST', headers,
        body: JSON.stringify({ feature: 'interview-questions', payload: { profileData } }),
      });
      const data = await response.json();
      if (data.result) {
        const parsed = typeof data.result === 'string' ? JSON.parse(data.result) : data.result;
        setInterviewQuestions(parsed);
        await db.settings.put({ key: `questions:${user.login}`, value: parsed });
      }
    } catch (e) {
      console.error('Questions error:', e);
    } finally {
      setIsGeneratingQuestions(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#0d1117] text-[#e6edf3] font-sans pb-20">
      <OfflineBanner lastSyncRelativeTime={analytics?.overall?.lastSync ? 'cached' : undefined} />
      {/* Progress Bar */}
      <div className="fixed top-0 left-0 w-full h-1 z-50 bg-[#30363d]">
        <div 
          className="h-full bg-[#3fb950] transition-all duration-500" 
          style={{ width: `${progress}%` }} 
        />
      </div>

      <div style={{ maxWidth: '1100px', margin: '0 auto', padding: '24px 24px', width: '100%' }} className="space-y-8">
        {/* Profile Header */}
        <section style={{ 
          backgroundColor: '#161b22', 
          border: '0.5px solid #30363d', 
          borderRadius: '12px', 
          padding: '24px 28px', 
          display: 'flex', 
          flexDirection: 'row', 
          alignItems: 'center', 
          gap: '20px', 
          marginBottom: '20px', 
          width: '100%' 
        }} className="flex-col md:flex-row">
          {/* Zone A: Avatar */}
          <div className="shrink-0">
            {profile?.avatar_url ? (
              <img 
                src={profile.avatar_url + '?s=80'} 
                alt={profile.name} 
                style={{ width: '72px', height: '72px', borderRadius: '50%', border: '2px solid #30363d' }} 
              />
            ) : (
              <div style={{ 
                width: '72px', 
                height: '72px', 
                borderRadius: '50%', 
                backgroundColor: '#1f6feb', 
                color: 'white', 
                display: 'flex', 
                alignItems: 'center', 
                justifyContent: 'center',
                fontSize: '24px',
                fontWeight: 'bold'
              }}>
                {profile?.login?.substring(0, 2).toUpperCase() || 'G'}
              </div>
            )}
          </div>

          {/* Zone B: Profile Text */}
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: '20px', fontWeight: '500', color: '#e6edf3', marginBottom: '2px' }}>
              {profile?.name || profile?.login}
            </div>
            <div style={{ fontSize: '13px', color: '#8b949e', marginBottom: '8px' }}>
              @{profile?.login}
            </div>
            <div style={{ display: 'flex', gap: '14px', flexWrap: 'wrap', fontSize: '12px', color: '#8b949e' }}>
              {profile?.company && (
                <span className="flex items-center gap-1"><Building2 size={13} /> {profile.company}</span>
              )}
              {profile?.blog && (
                <a href={profile.blog} target="_blank" rel="noreferrer" className="flex items-center gap-1 text-[#58a6ff] hover:underline">
                  <Globe size={13} /> {profile.blog}
                </a>
              )}
              {profile?.location && (
                <span className="flex items-center gap-1"><MapPin size={13} /> {profile.location}</span>
              )}
            </div>
            <div style={{ marginTop: '10px', display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
              {analytics?.domain?.primary && analytics.domain.primary !== 'Unknown' && (
                <div style={{ 
                  backgroundColor: '#1a3a2a', 
                  color: '#3fb950', 
                  border: '0.5px solid #2ea043', 
                  fontSize: '11px', 
                  padding: '3px 10px', 
                  borderRadius: '20px', 
                  fontWeight: '500' 
                }}>
                  {analytics.domain.primary.charAt(0).toUpperCase() + analytics.domain.primary.slice(1).toLowerCase()}
                </div>
              )}
              <button 
                onClick={() => {
                  navigator.clipboard.writeText(`https://gitfolio.harmnix.com/u/${user?.login}`);
                  setToast('Link copied!');
                  setTimeout(() => setToast(null), 2000);
                }}
                style={{ 
                  backgroundColor: 'transparent', 
                  color: '#58a6ff', 
                  border: '0.5px solid #30363d', 
                  fontSize: '11px', 
                  padding: '3px 10px', 
                  borderRadius: '20px', 
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px'
                }}
              >
                <Share2 size={12} /> Share portfolio
              </button>
            </div>
          </div>

          {/* Zone C: Readiness Circle - Dual Ring Design */}
          <div style={{ 
            backgroundColor: '#0d1117', 
            border: hasDSA ? '0.5px solid #f97316' : '0.5px solid #30363d', 
            borderRadius: '10px', 
            padding: '16px 20px', 
            display: 'flex', 
            flexDirection: 'column', 
            alignItems: 'center', 
            gap: '4px',
            minWidth: '140px',
            transition: 'border-color 0.5s ease',
            boxShadow: hasDSA ? '0 0 20px rgba(249,115,22,0.15)' : 'none',
          }} className="md:flex-col flex-row md:justify-center justify-between items-center">
            <div className={`relative w-[88px] h-[88px] flex items-center justify-center ${hasDSA ? 'animate-[pulse_3s_ease-in-out_infinite]' : ''}`}
                 style={{ animation: hasDSA ? 'dsaPulse 3s ease-in-out infinite' : undefined }}>
              <svg className="absolute w-full h-full transform -rotate-90" style={{ transition: 'opacity 0.3s' }}>
                {/* SVG filter for combined glow */}
                {hasDSA && (
                  <defs>
                    <filter id="glow">
                      <feGaussianBlur stdDeviation="3" result="coloredBlur" />
                      <feMerge>
                        <feMergeNode in="coloredBlur" />
                        <feMergeNode in="SourceGraphic" />
                      </feMerge>
                    </filter>
                  </defs>
                )}
                {/* Outer ring - max possible score */}
                <circle 
                  cx="44" cy="44" r="38" 
                  stroke="#30363d" strokeWidth="3" 
                  fill="transparent" 
                />
                {/* Inner ring - actual score */}
                <circle 
                  cx="44" cy="44" r="38" 
                  stroke={hasDSA ? '#f97316' : (analytics?.overall?.tier?.color || '#3fb950')} 
                  strokeWidth="8" 
                  fill="transparent" 
                  strokeDasharray={238.8} 
                  strokeDashoffset={238.8 - (238.8 * (displayScore)) / 100} 
                  strokeLinecap="round"
                  filter={hasDSA ? 'url(#glow)' : undefined}
                  style={{ transition: 'stroke-dashoffset 1.4s ease-out' }}
                />
              </svg>

              {/* DSA Boost badge */}
              {hasDSA && (
                <div style={{
                  position: 'absolute',
                  top: '-4px',
                  right: '-4px',
                  background: '#f97316',
                  color: 'white',
                  fontSize: '8px',
                  fontWeight: '700',
                  padding: '2px 5px',
                  borderRadius: '6px',
                  lineHeight: '1.2',
                  letterSpacing: '0.04em',
                  boxShadow: '0 0 8px rgba(249,115,22,0.5)',
                  zIndex: 5,
                }}>
                  DSA+
                </div>
              )}

              <div style={{ position: 'relative', fontSize: '32px', fontWeight: '700', color: '#e6edf3', lineHeight: '1' }}>
                {displayScore}
              </div>
            </div>
            <div className="text-center md:mt-2 flex flex-col items-center">
              <div style={{ fontSize: '10px', color: '#8b949e', letterSpacing: '0.08em', textTransform: 'uppercase' }}>
                {hasDSA ? 'COMBINED' : 'READINESS'}
              </div>
              <div style={{ fontSize: '13px', fontWeight: '600', color: hasDSA ? '#f97316' : (analytics?.overall?.tier?.color || '#3fb950') }}>
                {displayTier}
              </div>
              <div style={{ fontSize: '10px', color: '#8b949e', marginTop: '2px' }}>
                {displayDesc}
              </div>
              {!hasDSA && analytics?.overall?.coachingMessage && (
                <div style={{ fontSize: '11px', color: '#ef4444', textAlign: 'center', marginTop: '6px', maxWidth: '160px', lineHeight: '1.4' }}>
                  <AlertTriangle size={11} className="inline mr-1" />
                  {analytics.overall.coachingMessage}
                </div>
              )}
              {hasDSA && (
                <div style={{ fontSize: '11px', color: '#8b949e', textAlign: 'center', marginTop: '6px', maxWidth: '160px', lineHeight: '1.3' }}>
                  <Code2 size={11} className="inline mr-1" style={{ color: displayDSAColor }} />
                  <span style={{ color: displayDSAColor }}>{analytics?.overall?.dsaTier || 'N/A'}</span>
                  <span className="mx-1">·</span>
                  <span>{leetcodeData.total} solves</span>
                </div>
              )}
            </div>
          </div>
        </section>

        <style>{`@media (max-width: 768px) { .dashboard-two-col { grid-template-columns: 1fr !important; } }`}</style>

        {/* Stats Row */}
        <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {(() => {
            const repos = profile?.public_repos || 0;
            const repoColor = repos <= 2 ? '#ef4444' : repos <= 5 ? '#f97316' : 'inherit';
            return (
              <Card padding="p-4" className="flex flex-col items-center justify-center text-center space-y-2">
                <div className="p-2 bg-green-900/20 rounded-lg text-[#3fb950]"><Zap size={20} /></div>
                <div className="text-2xl font-bold" style={{ color: repoColor }}>{repos}</div>
                <div className="text-xs text-[#8b949e] uppercase">Total Repos</div>
              </Card>
            );
          })()}
          {(() => {
            const streak = analytics?.contribMetrics?.currentStreak ?? 0;
            const streakColor = streak === 0 ? '#ef4444' : streak < 7 ? '#f97316' : 'inherit';
            return (
              <Card padding="p-4" className="flex flex-col items-center justify-center text-center space-y-2">
                <div className="p-2 bg-blue-900/20 rounded-lg text-[#58a6ff]"><TrendingUp size={20} /></div>
                <div className="text-2xl font-bold" style={{ color: streakColor }}>{streak}</div>
                <div className="text-xs text-[#8b949e] uppercase">Current Streak</div>
              </Card>
            );
          })()}
          {(() => {
            const days = analytics?.contribMetrics?.activeDays ?? 0;
            const daysColor = days === 0 ? '#ef4444' : days < 30 ? '#f97316' : 'inherit';
            return (
              <Card padding="p-4" className="flex flex-col items-center justify-center text-center space-y-2">
                <div className="p-2 bg-purple-900/20 rounded-lg text-purple-400"><Calendar size={20} /></div>
                <div className="text-2xl font-bold" style={{ color: daysColor }}>{days}</div>
                <div className="text-xs text-[#8b949e] uppercase">Active Days</div>
              </Card>
            );
          })()}
          <Card padding="p-4" className="flex flex-col items-center justify-center text-center space-y-2">
            <div className="p-2 bg-yellow-900/20 rounded-lg text-yellow-400"><Code2 size={20} /></div>
            <div className="text-2xl font-bold truncate px-2">{analytics?.langScores[0]?.language || 'N/A'}</div>
            <div className="text-xs text-[#8b949e] uppercase">Top Language</div>
          </Card>
        </section>

        {/* Score Breakdown Card */}
        {analytics?.overall?.breakdown && (
          <section className="space-y-4">
            <h2 className="text-xl font-bold flex items-center gap-2">
              <BarChart size={20} /> Score Breakdown
            </h2>
            <Card padding="p-6" className="space-y-6">
              {/* Horizontal segmented bar */}
              <div className="flex h-4 w-full rounded-full overflow-hidden">
                {(() => {
                  const b = analytics.overall.maxPoints;
                  const pts = analytics.overall.breakdown;
                  const total = Object.values(b).reduce((a, v) => a + v, 0);
                  const segments = [
                    { key: 'project', label: 'Project', color: '#22c55e', earned: pts.project, max: b.project },
                    { key: 'language', label: 'Language', color: '#3b82f6', earned: pts.language, max: b.language },
                    { key: 'contribution', label: 'Contrib', color: '#a855f7', earned: pts.contribution, max: b.contribution },
                    { key: 'profile', label: 'Profile', color: '#eab308', earned: pts.profile, max: b.profile },
                    { key: 'hygiene', label: 'Hygiene', color: '#f97316', earned: pts.hygiene, max: b.hygiene },
                  ];
                  return segments.map((seg) => (
                    <div
                      key={seg.key}
                      style={{
                        flex: `${seg.max} 0 auto`,
                        backgroundColor: seg.color,
                        opacity: seg.max > 0 ? Math.max(0.15, (seg.earned / seg.max)) : 0.15,
                        height: '100%',
                        minWidth: seg.max > 0 ? `${(seg.max / total) * 100}%` : '0%',
                      }}
                      title={`${seg.label}: ${seg.earned}/${seg.max}`}
                    />
                  ));
                })()}
              </div>
              {/* Mini stat pills */}
              <div className="flex flex-wrap gap-2">
                {(() => {
                  const b = analytics.overall.maxPoints;
                  const pts = analytics.overall.breakdown;
                  const pills = [
                    { key: 'project', label: 'Project', color: '#22c55e', earned: pts.project, max: b.project },
                    { key: 'language', label: 'Language', color: '#3b82f6', earned: pts.language, max: b.language },
                    { key: 'contrib', label: 'Contrib', color: '#a855f7', earned: pts.contribution, max: b.contribution },
                    { key: 'profile', label: 'Profile', color: '#eab308', earned: pts.profile, max: b.profile },
                    { key: 'hygiene', label: 'Hygiene', color: '#f97316', earned: pts.hygiene, max: b.hygiene },
                  ];
                  return pills.map(p => (
                    <div
                      key={p.key}
                      style={{
                        backgroundColor: `${p.color}15`,
                        border: `0.5px solid ${p.color}40`,
                        borderRadius: '6px',
                        padding: '4px 10px',
                        fontSize: '11px',
                        color: '#e6edf3',
                      }}
                    >
                      <span style={{ color: p.color, fontWeight: 600 }}>{p.label}</span>: {p.earned}/{p.max}
                    </div>
                  ));
                })()}
              </div>
            </Card>
          </section>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Language Depth */}
          <section className="lg:col-span-1 space-y-4">
            <h2 className="text-xl font-bold flex items-center gap-2">
              <Code2 size={20} /> Language Depth
            </h2>
            <Card className="space-y-6">
              {(analytics?.langScores || []).slice(0, 8).map((lang) => {
                const isExposure = lang.label === 'Exposure';
                return (
                  <div key={lang.language} className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className={`font-medium ${isExposure ? 'text-[#8b949e]' : ''}`}>
                        {lang.language}
                        {isExposure && (
                          <span title="More projects needed for meaningful proficiency data" className="ml-1 cursor-help">
                            <Info size={11} className="inline text-[#8b949e]" />
                          </span>
                        )}
                      </span>
                      <span className={`${isExposure ? 'text-[#8b949e]' : 'text-[#8b949e]'}`}>
                        {lang.label} • {lang.repoCount} repos
                      </span>
                    </div>
                    <div className="h-2 w-full bg-[#30363d] rounded-full overflow-hidden">
                      <div 
                        className={`h-full transition-all duration-1000 ${isExposure ? 'bg-[#8b949e]' : 'bg-[#58a6ff]'}`}
                        style={{ width: `${Math.max(lang.score, isExposure ? 3 : 5)}%` }} 
                      />
                    </div>
                    <div className="flex justify-between items-center text-[10px] text-[#8b949e]">
                      <span>{lang.score}% Proficiency</span>
                      {lang.trend && (
                        <span className={`flex items-center gap-1 ${lang.trend === 'growing' ? 'text-green-400' : lang.trend === 'declining' ? 'text-red-400' : ''}`}>
                          {lang.trend === 'growing' && <TrendingUp size={10} />}
                          {lang.trend}
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
              {(!analytics?.langScores || analytics.langScores.length === 0) && <Skeleton className="h-40 w-full" />}
            </Card>
          </section>

          {/* Contribution Heatmap */}
          <section className="lg:col-span-2 space-y-4">
            <h2 className="text-xl font-bold flex items-center gap-2">
              <Calendar size={20} /> Activity Heatmap
            </h2>
            <Card className="overflow-hidden">
              {analytics?.contribMetrics?.totalContributions === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 space-y-3 text-center">
                  <CalendarOff size={24} color="#30363d" />
                  <div style={{ fontSize: '13px', color: '#8b949e' }}>No contribution data yet</div>
                  <div style={{ fontSize: '13px', color: '#8b949e', maxWidth: '300px' }}>Connect with a GitHub account that has commit history to see your activity heatmap.</div>
                </div>
              ) : (
                <ActivityHeatmap contributions={contributions} />
              )}
            </Card>
          </section>
        </div>

        {/* Top Projects */}
        <section className="space-y-4">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <h2 className="text-xl font-bold flex items-center gap-2">
              <GitFork size={20} /> Top Projects
            </h2>
             <div className="flex flex-wrap gap-2">
               <Button 
                 size="sm"
                 variant="secondary" 
                 onClick={() => setShowAllRepos(!showAllRepos)}
                 className="text-xs py-1"
               >
                 {showAllRepos ? 'Hide Junk' : 'Show All Repos'}
               </Button>
               {['All', 'Web', 'ML/AI', 'Mobile', 'Systems', 'DSA'].map(filter => (
                 <Button 
                   key={filter} 
                   size="sm"
                   variant={projectFilter === filter ? 'primary' : 'secondary'} 
                   onClick={() => setProjectFilter(filter)}
                   className="text-xs py-1"
                 >
                   {filter}
                 </Button>
               ))}
             </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {displayProjects.map(repo => {
              const lang = Object.keys(rawLanguages[repo.full_name] || {})[0] || 'Unknown';
              const qualityColor = repo.qualityScore < 30 ? '#ef4444' : repo.qualityScore < 55 ? '#f97316' : repo.qualityScore < 75 ? '#eab308' : '#22c55e';
              
              return (
                <Card key={repo.id} className="flex flex-col h-full group hover:border-[#58a6ff] transition-colors relative">
                  <div className="flex justify-between items-start mb-3">
                    <div className="flex items-center gap-2 flex-1 min-w-0">
                      <h3 className="font-bold truncate">{repo.name}</h3>
                      {repo.owner?.login && repo.owner.login !== user?.login && (
                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-[#161b22] text-[#58a6ff] border border-[#388bfd]/30 whitespace-nowrap shrink-0">
                          Open Source
                        </span>
                      )}
                    </div>
                    <Badge variant="info">{lang}</Badge>
                  </div>
                  <p className="text-sm text-[#8b949e] line-clamp-2 mb-4 h-10">
                    {repo.description || 'No description provided.'}
                  </p>
                  <div className="space-y-4">
                    <div className="space-y-1 group relative">
                      <div className="flex justify-between text-[10px] uppercase font-bold text-[#8b949e]">
                        <span>Project Quality</span>
                        <span>{repo.qualityScore}%</span>
                      </div>
                      <div className="h-1.5 w-full bg-[#30363d] rounded-full overflow-hidden">
                        <div 
                          className="h-full transition-all duration-1000" 
                          style={{ width: `${repo.qualityScore}%`, backgroundColor: qualityColor }} 
                        />
                      </div>
                      {/* Mini breakdown tooltip */}
                      <div className="absolute bottom-full left-0 mb-1 hidden group-hover:block bg-[#1c2128] border border-[#30363d] rounded-md px-3 py-2 text-[10px] text-[#e6edf3] whitespace-nowrap z-10 shadow-lg">
                        {repo.scoreBreakdown && Object.entries(repo.scoreBreakdown).map(([key, val]) => (
                          <div key={key} className="flex justify-between gap-3">
                            <span className="text-[#8b949e]">{key.replace(/_/g, ' ')}</span>
                            <span>{val}/{key === 'readme_present' ? '5' : key === 'readme_quality' ? '15' : key === 'description' ? '8' : key === 'live_demo' ? '10' : key === 'license' ? '5' : key === 'stars' ? '15' : key === 'language_diversity' ? '5' : key === 'commit_count' ? '15' : key === 'recent_activity' ? '10' : key === 'not_tutorial' ? '12' : '?'}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                      <div className="flex items-center gap-3 text-xs text-[#8b949e]">
                        <span className="flex items-center gap-1">⭐ {repo.stargazers_count}</span>
                        <span className="flex items-center gap-1">🍴 {repo.forks_count}</span>
                      </div>
                      {!repo.homepage && (
                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-[#3a1a1a] text-[#ef4444] border border-[#ef4444]/30">
                          No Demo
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="mt-auto pt-4 flex justify-between items-center">
                    <div className="flex items-center gap-3">
                      <Button 
                        size="sm"
                        variant="secondary" 
                        onClick={() => setImprovingRepo(repo)} 
                        className="text-xs py-1 px-2 h-7 flex items-center gap-1"
                      >
                        <Sparkles size={12} /> Improve
                      </Button>
                      <a 
                        href={repo.html_url} 
                        target="_blank" 
                        rel="noreferrer" 
                        className="text-[#58a6ff] hover:underline text-xs flex items-center gap-1"
                      >
                        View <ExternalLink size={12} />
                      </a>
                    </div>
                  </div>
                </Card>
              );
            })}
             {displayProjects.length === 0 && <div className="col-span-full text-center py-12 text-[#8b949e]">No projects found for this filter.</div>}
           </div>
         </section>
         <ShareKit username={user?.login} profile={profile} languageScores={analytics?.langScores} />


         {/* Job Match Analyzer */}
         <section className="space-y-4">
           <h2 className="text-xl font-bold flex items-center gap-2">
             <Sparkles size={20} /> Job Match Analyzer
           </h2>
            <PremiumGate 
              feature="job_match_analyzer" 
              fallback={<CompactPremiumLock featureName="Job Match Analyzer" description="Analyze how well your profile matches a job description" onUnlock={openUpgradeModal} />}
            >
             <Card padding="p-6" className="space-y-6">
               <div className="space-y-4">
                 <p className="text-sm text-[#8b949e]">Paste a LinkedIn job description to see how well your profile matches.</p>
                 <textarea 
                   value={jd}
                   onChange={(e) => setJd(e.target.value)}
                   placeholder="Paste job description here..."
                   className="w-full h-32 bg-[#0d1117] border border-[#30363d] rounded-xl p-3 text-sm text-[#e6edf3] focus:border-[#58a6ff] outline-none transition-colors resize-none"
                 />
                 <Button 
                   onClick={handleAnalyze} 
                   disabled={isAnalyzing || !jd.trim()}
                   className="w-full md:w-auto px-8"
                 >
                   {isAnalyzing ? 'Analyzing...' : 'Analyze Match'}
                 </Button>
               </div>

               {matchResult && (
                 <div className="pt-6 border-t border-[#30363d] grid grid-cols-1 lg:grid-cols-3 gap-8">
                   <div className="flex flex-col items-center justify-center space-y-4">
                     <div className="relative w-24 h-24 flex items-center justify-center">
                       <svg className="absolute w-full h-full transform -rotate-90">
                         <circle 
                           cx="48" cy="48" r="40" 
                           stroke="#30363d" strokeWidth="8" 
                           fill="transparent" 
                         />
                         <circle 
                           cx="48" cy="48" r="40" 
                           stroke="#3fb950" strokeWidth="8" 
                           fill="transparent" 
                           strokeDasharray={251.2} 
                           strokeDashoffset={251.2 - (251.2 * (matchResult.score || 0)) / 100} 
                           strokeLinecap="round"
                           className="transition-all duration-1000"
                         />
                       </svg>
                       <div className="relative font-bold text-xl">
                         {matchResult.score || 0}%
                       </div>
                     </div>
                     <div className="text-center">
                       <div className="text-xs text-[#8b949e] uppercase tracking-wider font-semibold">Match Score</div>
                       <div className="text-sm font-bold text-[#3fb950]">
                         {matchResult.score > 80 ? 'Strong Match' : matchResult.score > 50 ? 'Good Match' : 'Needs Improvement'}
                       </div>
                     </div>
                   </div>

                   <div className="lg:col-span-2 space-y-6">
                     <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                       <div className="space-y-3">
                         <h4 className="text-sm font-bold flex items-center gap-2 text-[#3fb950]">
                           <CheckCircle2 size={16} /> Strong Matches
                         </h4>
                         <ul className="space-y-2">
                           {matchResult.matches?.map((match, i) => (
                             <li key={i} className="text-xs text-[#8b949e] flex gap-2">
                               <span className="text-[#3fb950]">•</span> {match}
                             </li>
                           ))}
                         </ul>
                       </div>
                       <div className="space-y-3">
                         <h4 className="text-sm font-bold flex items-center gap-2 text-red-400">
                           <XCircle size={16} /> Gaps
                         </h4>
                         <ul className="space-y-2">
                           {matchResult.gaps?.map((gap, i) => (
                             <li key={i} className="text-xs text-[#8b949e] flex gap-2">
                               <span className="text-red-400">•</span> {gap}
                             </li>
                           ))}
                         </ul>
                       </div>
                     </div>
                     <div className="space-y-3">
                       <h4 className="text-sm font-bold flex items-center gap-2 text-[#58a6ff]">
                         <Zap size={16} /> Recommendations
                       </h4>
                       <ul className="space-y-2">
                         {matchResult.recommendations?.map((rec, i) => (
                           <li key={i} className="text-xs text-[#8b949e] flex gap-2">
                             <span className="text-[#58a6ff]">•</span> {rec}
                           </li>
                         ))}
                       </ul>
                     </div>
                     <div className="text-center text-[10px] text-[#4a4a4a] italic pt-4">
                       Powered by Claude (Premium)
                     </div>
                   </div>
                 </div>
               )}
             </Card>
           </PremiumGate>
         </section>

         {/* Code Hygiene & Open Source */}
         <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">

           <section className="space-y-4">
              <h2 className="text-xl font-bold flex items-center gap-2">
                <CheckCircle2 size={20} /> Code Hygiene
              </h2>
               <PremiumGate 
                 feature="Advanced Analytics" 
                 fallback={<CompactPremiumLock featureName="Advanced Analytics" description="Get deep insights into your code hygiene" onUnlock={openUpgradeModal} />}
               >
                <Card padding="p-6" className="space-y-6">
                  <div className="flex items-center justify-between p-4 bg-[#0d1117] rounded-xl border border-[#30363d]">
                    <div>
                      <div className="text-sm text-[#8b949e]">Overall Hygiene Score</div>
                      <div className="text-3xl font-bold">{analytics?.overall.breakdown.codeHygiene || 0}%</div>
                    </div>
                    <div className={`p-3 rounded-full ${analytics?.overall.breakdown.codeHygiene > 70 ? 'bg-green-900/30 text-green-400' : 'bg-red-900/30 text-red-400'}`}>
                      <Zap size={24} />
                    </div>
                  </div>
                  <div className="space-y-4">
                     <div className="flex justify-between items-center">
                       <span className="text-sm text-[#8b949e]">Conventional Commits</span>
                       <span className="font-bold">{analytics?.overall.breakdown.codeHygiene > 70 ? 'High' : 'Low'}</span>
                     </div>
                     <div className="flex justify-between items-center mb-2"> 
                       <span className="text-sm text-[#8b949e]">Conventional Commits</span> 
                       <span className="text-[10px] uppercase font-bold text-[#4a4a4a]">Examples</span> 
                     </div>
                     <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="p-3 bg-green-900/10 border border-green-900/30 rounded-lg flex gap-3">
                        <CheckCircle2 size={16} className="text-green-400 shrink-0 mt-1" />
                        <div className="text-xs text-green-200/80 italic">"feat(auth): implement jwt refresh tokens"</div>
                      </div>
                      <div className="p-3 bg-red-900/10 border border-red-900/30 rounded-lg flex gap-3">
                        <XCircle size={16} className="text-red-400 shrink-0 mt-1" />
                        <div className="text-xs text-red-200/80 italic">"fixed stuff"</div>
                      </div>
                    </div>
                  </div>
                </Card>
              </PremiumGate>
            </section>

            <section className="space-y-4">
              <h2 className="text-xl font-bold flex items-center gap-2">
                <GitFork size={20} /> Open Source Contributions
              </h2>
              <Card className="space-y-4">
                {prsLoading ? (
                  <>
                    <div className="text-center py-8 text-[#8b949e] text-sm">Connecting to GitHub GraphQL to fetch merged PRs...</div>
                    <Skeleton className="h-16 w-full" />
                    <Skeleton className="h-16 w-full" />
                  </>
                ) : publicPRs.length === 0 ? (
                  <div className="text-center py-8 px-4 text-[#8b949e] text-sm flex flex-col items-center gap-3">
                    <div>No external contributions found. PRs merged into other repositories will appear here.</div>
                    <a 
                      href="/dashboard#open-source-finder"
                      className="text-[#58a6ff] hover:underline text-xs flex items-center gap-1"
                    >
                      Open source contributions can increase your score by up to 12 points. Find Repos to Contribute To →
                    </a>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {publicPRs.map((pr, idx) => (
                      <div key={idx} className="flex items-center justify-between p-3 bg-[#0d1117] border border-[#30363d] rounded-xl group hover:border-[#58a6ff] transition-colors">
                        <div className="flex flex-col overflow-hidden">
                          <span className="text-sm font-medium truncate">{pr.title}</span>
                          <span className="text-xs text-[#8b949e] truncate">{pr.repository.nameWithOwner}</span>
                        </div>
                        <a 
                          href={pr.url} 
                          target="_blank" 
                          rel="noreferrer" 
                          className="p-2 text-[#8b949e] hover:text-[#58a6ff] transition-colors"
                        >
                          <ExternalLink size={14} />
                        </a>
                      </div>
                    ))}
                  </div>
                )}
              </Card>
            </section>
        </div>

         {/* Premium Features Grid */}
         <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
           <PremiumGate 
             feature="PDF Export" 
             fallback={<CompactPremiumLock featureName="PDF Export" description="Export your portfolio to a high-quality PDF" onUnlock={openUpgradeModal} />}
           >
             <Card padding="p-6" className="flex flex-col items-center justify-center text-center space-y-4 h-full">
               <div className="p-3 bg-blue-900/20 rounded-full text-[#58a6ff]"><FileDown size={24} /></div>
               <div>
                 <div className="font-bold text-lg">PDF Export</div>
                 <div className="text-sm text-[#8b949e]">Download your professional portfolio</div>
               </div>
               <Button 
                 variant="secondary" 
                 onClick={() => exportPortfolioPDF(user?.login, profile, analytics?.langScores, displayProjects, analytics?.overall, 'minimal')} 
                 className="w-full md:w-auto"
               >
                 Export PDF
               </Button>
             </Card>
           </PremiumGate>
           <PremiumGate 
             feature="placement_card" 
             fallback={<CompactPremiumLock featureName="Placement Card" description="Get a professional summary for recruiters" onUnlock={openUpgradeModal} />}
           >
             <PlacementCard profile={profile} topProjects={displayProjects} languageScores={analytics?.langScores} />
           </PremiumGate>
         </div>

         {/* Premium Banner */}
        {!isPremium && (
          <section className="bg-gradient-to-r from-[#161b22] to-[#0d1117] border border-[#3fb950]/30 p-8 rounded-2xl flex flex-col md:flex-row items-center justify-between gap-6">
            <div className="space-y-2 text-center md:text-left">
              <h3 className="text-2xl font-bold text-white">Unlock Premium Insights</h3>
              <p className="text-[#8b949e]">Get full project analysis, advanced domain detection, and personalized interview roadmaps.</p>
            </div>
             <Button variant="primary" size="lg" className="whitespace-nowrap px-8 py-3" onClick={openUpgradeModal}>
              Upgrade to Pro
            </Button>
          </section>
        )}

        {/* Company Fit Score */}
        <section className="space-y-4">
          <h2 className="text-xl font-bold flex items-center gap-2">
            <Building2 size={20} /> Company Fit Score
          </h2>
          <div className="space-y-4">
            {/* Quick-select chips */}
            <div className="space-y-2">
              {COMPANY_QUICK_SELECT.map((row, ri) => (
                <div key={ri} className="flex flex-wrap gap-2">
                  {row.map(company => (
                    <button
                      key={company}
                      onClick={() => handleCompanySelect(company)}
                      disabled={isAnalyzingFit}
                      className={`px-3 py-1.5 text-xs rounded-full border transition-all ${
                        selectedCompany === company
                          ? 'bg-[#1a3a2a] border-[#3fb950] text-[#3fb950]'
                          : 'bg-[#21262d] border-[#30363d] text-[#e6edf3] hover:border-[#58a6ff]'
                      }`}
                    >
                      {company}
                    </button>
                  ))}
                </div>
              ))}
            </div>

            {isAnalyzingFit && (
              <Card padding="p-8" className="text-center">
                <div className="flex flex-col items-center gap-3">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#3fb950]"></div>
                  <p className="text-sm text-[#8b949e]">Analyzing your profile against {selectedCompany}...</p>
                </div>
              </Card>
            )}

            {companyFitResult && !isAnalyzingFit && (
              <CompanyFitCard fitData={{ ...companyFitResult, company: selectedCompany }} />
            )}

            {!isPremium && !companyFitResult && (
              <p className="text-xs text-[#8b949e]">{companyFitCount}/2 free analyses used today</p>
            )}
          </div>
        </section>
        {/* Two-column: DSA & Peer */}
        <div className="dashboard-two-col" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '16px' }}>

         {/* LeetCode Integration */}
        <section className="space-y-4">
          <SectionHeader icon={<Code2 size={16} />} title="DSA & Competitive Programming" />
          <PremiumGate
            feature="leetcode"
            fallback={<CompactPremiumLock featureName="LeetCode Integration" description="Connect your LeetCode to unlock your combined placement score." onUnlock={openUpgradeModal} />}
          >
            <Card padding="p-6" className="space-y-4">
              {!leetcodeData ? (
                <div className="space-y-4">
                  <div className="flex flex-col sm:flex-row gap-3">
                    <input
                      value={leetcodeUsername}
                      onChange={e => setLeetcodeUsername(e.target.value)}
                      placeholder="LeetCode username"
                      className="flex-1 bg-[#0d1117] border border-[#30363d] rounded-lg px-3 py-2 text-sm text-[#e6edf3] focus:border-[#58a6ff] outline-none"
                    />
                    <input
                      value={cfHandle}
                      onChange={e => setCfHandle(e.target.value)}
                      placeholder="Codeforces handle (optional)"
                      className="flex-1 bg-[#0d1117] border border-[#30363d] rounded-lg px-3 py-2 text-sm text-[#e6edf3] focus:border-[#58a6ff] outline-none"
                    />
                    <Button onClick={handleLeetcodeConnect} disabled={isFetchingLeetcode || !leetcodeUsername.trim()}>
                      {isFetchingLeetcode ? 'Connecting...' : 'Connect'}
                    </Button>
                  </div>
                  <p className="text-xs text-[#8b949e]">Add your LeetCode username to unlock your combined profile score</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                  <LeetCodeCard data={leetcodeData} />
                  {cfData && (
                    <Card padding="p-5" className="space-y-4">
                      <h3 className="text-lg font-bold text-[#e6edf3]">Codeforces Stats</h3>
                      <div className="grid grid-cols-2 gap-3">
                        <div className="p-3 bg-[#0d1117] border border-[#30363d] rounded-lg text-center">
                          <div className="text-lg font-bold text-[#e6edf3]">{cfData.rating || '-'}</div>
                          <div className="text-[10px] text-[#8b949e]">Rating</div>
                        </div>
                        <div className="p-3 bg-[#0d1117] border border-[#30363d] rounded-lg text-center">
                          <div className="text-lg font-bold text-[#e6edf3]">{cfData.maxRating || '-'}</div>
                          <div className="text-[10px] text-[#8b949e]">Max Rating</div>
                        </div>
                      </div>
                      {cfData.rank && (
                        <div className="text-center p-2 bg-[#0d1117] border border-[#30363d] rounded-lg">
                          <span className="text-sm font-bold text-[#58a6ff]">{cfData.rank}</span>
                        </div>
                      )}
                    </Card>
                  )}
                </div>
              )}
            </Card>
          </PremiumGate>
        </section>

        {/* Peer Benchmarking */}
        <section className="space-y-4">
          <SectionHeader icon={<Users size={16} />} title="Peer Benchmarking" />
          <PremiumGate
            feature="peer_benchmarking"
            fallback={<CompactPremiumLock featureName="Peer Benchmarking" description="See how you compare to students at your college" onUnlock={openUpgradeModal} />}
          >
            <PeerBenchmarking
              stats={peerStats}
              userStats={{
                userScore: analytics?.overall?.interviewReadiness || 0,
                userRepos: profile?.public_repos || 0,
                userActiveDays: analytics?.contribMetrics?.activeDays || 0,
                userLangs: analytics?.langScores?.length || 0,
                college: profile?.company || '',
              }}
            />
          </PremiumGate>
        </section>
        </div>

        {/* Two-column: Roadmap & Questions */}
        <div className="dashboard-two-col" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '16px' }}>

        {/* Interview Preparation Roadmap */}
        <section className="space-y-4">
          <SectionHeader icon={<MapPin size={16} />} title="Your Placement Roadmap" />
          <PremiumGate
            feature="roadmap"
            fallback={<CompactPremiumLock featureName="AI Interview Roadmap" description="Get a personalized 60-day action plan" onUnlock={openUpgradeModal} />}
          >
            <Card padding="p-6" className="space-y-4">
              {!roadmapData ? (
                <div className="space-y-4">
                  <p className="text-sm text-[#8b949e]">Generate a personalized 30-60 day placement preparation roadmap based on your GitHub profile.</p>
                  <div className="flex flex-col sm:flex-row gap-3">
                    <input
                      value={targetCompanies}
                      onChange={e => setTargetCompanies(e.target.value)}
                      placeholder="Targeting any specific companies? (optional)"
                      className="flex-1 bg-[#0d1117] border border-[#30363d] rounded-lg px-3 py-2 text-sm text-[#e6edf3] focus:border-[#58a6ff] outline-none"
                    />
                    <Button onClick={handleGenerateRoadmap} disabled={isGeneratingRoadmap}>
                      {isGeneratingRoadmap ? 'Generating...' : 'Generate My Roadmap'}
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="text-sm text-[#8b949e]">Target: </span>
                      <span className="text-sm font-bold text-[#e6edf3]">{roadmapData.targetCompanyTier}</span>
                      <span className="mx-2 text-[#8b949e]">·</span>
                      <span className="text-sm text-[#8b949e]">Readiness in: </span>
                      <span className="text-sm font-bold text-[#3fb950]">{roadmapData.readinessIn}</span>
                    </div>
                    <Button variant="secondary" size="sm" onClick={handleGenerateRoadmap} disabled={isGeneratingRoadmap}>
                      Regenerate
                    </Button>
                  </div>
                  <div className="space-y-3">
                    {/* Progress bar */}
                    {roadmapData.milestones?.length > 0 && (
                      <div className="space-y-2">
                        <div className="flex justify-between text-xs text-[#8b949e]">
                          <span>Progress</span>
                          <span>{roadmapCompleted}/{roadmapData.milestones.length} milestones completed</span>
                        </div>
                        <div className="h-2 w-full bg-[#30363d] rounded-full overflow-hidden">
                          <div
                            className="h-full bg-[#3fb950] transition-all duration-500"
                            style={{ width: `${(roadmapCompleted / Math.max(1, roadmapData.milestones.length)) * 100}%` }}
                          />
                        </div>
                      </div>
                    )}
                    <RoadmapTimeline
                      milestones={roadmapData.milestones}
                      checkedSet={roadmapChecked}
                      onToggleCheck={(id) => {
                        setRoadmapChecked(prev => {
                          const next = new Set(prev);
                          if (next.has(id)) {
                            next.delete(id);
                          } else {
                            next.add(id);
                          }
                          const arr = Array.from(next);
                          setRoadmapCompleted(arr.length);
                          db.settings.put({ key: `roadmap_checked:${user.login}`, value: arr });
                          return next;
                        });
                      }}
                    />
                  </div>
                  {roadmapData.summary && (
                    <p className="text-sm text-[#8b949e] italic">{roadmapData.summary}</p>
                  )}
                </div>
              )}
            </Card>
          </PremiumGate>
        </section>

        {/* Interview Questions */}
        <section className="space-y-4">
          <SectionHeader icon={<Sparkles size={16} />} title="Likely Interview Questions" />
          <PremiumGate
            feature="interview_questions"
            fallback={<CompactPremiumLock featureName="Interview Question Predictor" description="AI predicts questions based on your exact tech stack" onUnlock={openUpgradeModal} />}
          >
            <Card padding="p-6" className="space-y-4">
              {!interviewQuestions ? (
                <div className="text-center">
                  <p className="text-sm text-[#8b949e] mb-4">Generate interview questions tailored to your exact profile — tech stack, projects, and domains.</p>
                  <Button onClick={handleGenerateQuestions} disabled={isGeneratingQuestions}>
                    {isGeneratingQuestions ? 'Generating...' : 'Generate Questions'}
                  </Button>
                </div>
              ) : (
                <InterviewQuestions questions={interviewQuestions} />
              )}
            </Card>
          </PremiumGate>
        </section>

        </div>

        {/* Open Source Finder */}
        <section id="open-source-finder" className="space-y-4">
          <h2 className="text-xl font-bold flex items-center gap-2">
            <GitPullRequest size={20} /> Open Source Opportunities
          </h2>
          <Card padding="p-6" className="space-y-4">
            <OpenSourceFinder issues={ossIssues} />
            <div className="flex justify-between items-center">
              <p className="text-xs text-[#8b949e]">First merged PR increases your profile score by up to 12 points.</p>
              <Button
                variant="secondary"
                size="sm"
                onClick={async () => {
                  setIsLoadingOss(true);
                  try {
                    const langs = analytics?.langScores?.slice(0, 3).map(l => l.language.toLowerCase()) || ['javascript'];
                    const res = await fetch(`${import.meta.env.VITE_WORKER_URL}/opportunities?languages=${langs.join(',')}`);
                    const data = await res.json();
                    setOssIssues(Array.isArray(data) ? data : []);
                  } catch (e) {
                    console.error('OSS fetch error:', e);
                  } finally {
                    setIsLoadingOss(false);
                  }
                }}
                disabled={isLoadingOss}
              >
                {isLoadingOss ? 'Loading...' : 'Refresh'}
              </Button>
            </div>
          </Card>
        </section>

        {/* Applications CRM */}
        <section className="space-y-4">
          <h2 className="text-xl font-bold flex items-center gap-2">
            <Briefcase size={20} /> My Applications
          </h2>
          <ApplicationsCRM
            applications={applications}
            onUpdateApplication={async (id, updates) => {
              const updated = applications.map(a => a.id === id ? { ...a, ...updates } : a);
              setApplications(updated);
              const app = updated.find(a => a.id === id);
              if (app) {
                await db.applications.put(app);
              }
            }}
            onAddApplication={async (data) => {
              const id = Date.now();
              const newApp = { ...data, id };
              setApplications(prev => [...prev, newApp]);
              await db.applications.put(newApp);
            }}
          />
        </section>

        {/* Onboarding Modal */}
        <OnboardingModal
          isOpen={!onboardingDone}
          onClose={() => {
            setOnboardingDone(true);
            db.settings.put({ key: 'onboardingDone', value: true });
          }}
          profile={profile}
          analytics={analytics}
          coachingMessages={analytics?.overall?.coachingMessages}
        />
      </div>
       {toast && (
        <div style={{ 
          position: 'fixed', 
          bottom: '20px', 
          left: '50%', 
          transform: 'translateX(-50%)', 
          backgroundColor: '#3fb950', 
          color: 'white', 
          padding: '8px 16px', 
          borderRadius: '20px', 
          fontSize: '14px', 
          zIndex: 100,
          boxShadow: '0 4px 12px rgba(0,0,0,0.5)' 
        }}>
          {toast}
        </div>
      )}
       {improvingRepo && (
         <RepoImprover 
           repo={improvingRepo} 
           token={token} 
           isPremium={isPremium} 
           onClose={() => setImprovingRepo(null)} 
         />
       )}
       {isShareModalOpen && (
         <ShareModal 
           url={`https://gitfolio.harmnix.com/u/${user?.login}`} 
           onClose={() => setShareModalOpen(false)} 
         />
       )}
     </div>
   );

};

export default Dashboard;
