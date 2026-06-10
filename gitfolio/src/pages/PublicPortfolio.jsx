import { useState, useEffect, useRef, useMemo } from 'react';
import { useParams } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { 
   Building2, Globe, MapPin, ExternalLink, Code, 
   Check, Star, GitMerge, GitPullRequest, Activity, Copy, ChevronRight
} from 'lucide-react';
import { fetchPublicUserProfile, fetchPublicUserRepos, fetchRepoLanguages, fetchRepoContents, fetchFileContent, fetchPublicUserPRs } from '../services/github';
import { useAuth } from '../hooks/useAuth';
import { db } from '../services/db';
import { computeLanguageScores } from '../analytics/languageScore';
import { detectFrameworks } from '../analytics/frameworkDetector';
import { classifyDeveloperDomain } from '../analytics/domainClassifier';
import { computeOverallScore } from '../analytics/overallScore';
import { normalizeContributionData, getMonthLabels, computeTotalContributions, computeLongestStreak, computeActiveDays } from '../utils/heatmapNormalizer';

const LANGUAGE_COLORS = {
  'JavaScript': '#f7df1e', 'TypeScript': '#3178c6', 'Python': '#3572A5',
  'Java': '#b07219', 'Go': '#00ADD8', 'Rust': '#dea584', 'C++': '#f34b7d',
  'C': '#555555', 'C#': '#178600', 'Ruby': '#701516', 'PHP': '#4F5D95',
  'Swift': '#F05138', 'Kotlin': '#A97BFF', 'Dart': '#00B4AB', 'Scala': '#c22d40',
  'Shell': '#89e051', 'HTML': '#e34c26', 'CSS': '#563d7c', 'Vue': '#4fc08d',
  'React': '#61dafb', 'Solidity': '#363636', 'R': '#198CE7', 'Objective-C': '#438eff',
};

const DOMAIN_RING_COLORS = {
  frontend: '#38bdf8',
  backend:  '#4ade80',
  fullstack:'#818cf8',
  ml:       '#f472b6',
  mobile:   '#fb923c',
  devops:   '#facc15',
  systems:  '#94a3b8',
  dsa:      '#a78bfa',
};

const HEATMAP_COLORS = {
  0:  '#161b22',
  1:  '#0e4429',
  2:  '#006d32',
  3:  '#26a641',
  4:  '#39d353',
};

const PublicPortfolio = () => {
  const { username } = useParams();
  const { user: authUser } = useAuth();
  const heatmapScrollRef = useRef(null);
  const [copied, setCopied] = useState(false);

  const titleCase = str => str ? str.split(/[_\\s]/).map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()).join(' ') : '';
  
  const timeAgo = (dateString) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    const now = new Date();
    const diffInSeconds = Math.floor((now - date) / 1000);
    const diffInDays = Math.floor(diffInSeconds / 86400);
    const diffInMonths = Math.floor(diffInDays / 30);
    const diffInYears = Math.floor(diffInDays / 365);
    if (diffInDays === 0) return 'Today';
    if (diffInDays === 1) return 'Yesterday';
    if (diffInDays < 30) return `${diffInDays} days ago`;
    if (diffInMonths < 12) return `${diffInMonths} months ago`;
    return `${diffInYears} years ago`;
  };

  const [profile, setProfile] = useState(null);
  const [repos, setRepos] = useState([]);
  const [publicPRs, setPublicPRs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadingMessage, setLoadingMessage] = useState('Loading profile...');
  const [error, setError] = useState(null);
  const [contributions, setContributions] = useState([]);
  const [analytics, setAnalytics] = useState({
    score: 0,
    domain: '',
    primaryDomain: '',
    secondaryDomain: '',
    languages: [],
    frameworks: [],
    summary: '',
    topLanguage: '',
    depthLabel: '',
    peakMonth: '',
    longestStreak: 0,
    totalContributions: 0
  });

  useEffect(() => {
    if (!loading) return;
    const messages = ["Fetching profile...", "Analyzing repositories...", "Calculating scores...", "Almost there..."];
    let index = 0;
    const interval = setInterval(() => {
      index = (index + 1) % messages.length;
      setLoadingMessage(messages[index]);
    }, 3000);
    return () => clearInterval(interval);
  }, [loading]);

  useEffect(() => {
    if (!loading) return;
    const timer = setTimeout(() => {
      setLoadingMessage("Taking longer than usual. GitHub API rate limits may be affecting the load time. Please refresh in a few minutes.");
    }, 15000);
    return () => clearTimeout(timer);
  }, [loading]);

  useEffect(() => {
    async function loadData() {
      try {
        const [userProfile, userRepos, publicPRs] = await Promise.all([
          fetchPublicUserProfile(username),
          fetchPublicUserRepos(username),
          fetchPublicUserPRs(username)
        ]);

        if (!userProfile) {
          setLoading(false);
          return;
        }

        setProfile(userProfile);
        setRepos(userRepos);
        setPublicPRs(publicPRs);

        const topRepos = userRepos.slice(0, 5);
        const repoLangs = await Promise.all(
          topRepos.map(repo => fetchRepoLanguages(userProfile.login, repo.name))
        );

        const langScores = computeLanguageScores(userRepos, repoLangs);
        
        const repoContentsMap = new Map();
        for (const repo of topRepos) {
          try {
            const contents = await fetchRepoContents(userProfile.login, repo.name);
            repoContentsMap.set(repo.name, Array.isArray(contents) ? contents.map(c => c.path) : []);
          } catch {
            repoContentsMap.set(repo.name, []);
          }
        }

        const frameworkMap = await detectFrameworks(repoContentsMap, (path) => {
          const repoName = Array.from(repoContentsMap.entries()).find(([, files]) => files.includes(path))?.[0];
          if (!repoName) return '';
          return fetchFileContent(userProfile.login, repoName, path);
        });

        const allFrameworks = Array.from(new Set(
          Array.from(frameworkMap.values()).flatMap(f => f.frameworks)
        ));

        const domainResult = classifyDeveloperDomain(userRepos, 
          Object.fromEntries(langScores.map(l => [l.language, l.score])), 
          allFrameworks
        );

        const pushesByMonth = {};
        userRepos.forEach(repo => {
          if (repo.pushed_at) {
            const month = new Date(repo.pushed_at).toLocaleString('en-US', { month: 'long' });
            pushesByMonth[month] = (pushesByMonth[month] || 0) + 1;
          }
        });
        const peakMonth = Object.entries(pushesByMonth).sort((a, b) => b[1] - a[1])[0]?.[0] || 'the past year';

        const topRepo = userRepos.sort((a, b) => b.stargazers_count - a.stargazers_count)[0];
        let topProjectCategory = titleCase(domainResult.primary);
        if (topRepo) {
          const topRepoDomain = classifyDeveloperDomain([topRepo], 
            { [topRepo.language || 'Unknown']: 1 }, 
            []
          );
          topProjectCategory = titleCase(topRepoDomain.primary);
        }

        const metrics = {
          projectQuality: Math.min(100, (userRepos.length * 10) + (userRepos[0]?.stargazers_count || 0)),
          languageDepth: langScores[0]?.score || 0,
          consistency: 70,
          profileCompleteness: profile?.bio ? 100 : 50,
          codeHygiene: 60
        };
        const scoreResult = computeOverallScore(metrics);

        const computedAnalytics = {
          score: scoreResult.interviewReadiness,
          overall: scoreResult,
          domain: domainResult.primary,
          primaryDomain: domainResult.primary,
          secondaryDomain: domainResult.secondary || null,
          languages: langScores,
          frameworks: allFrameworks,
          topLanguage: langScores[0]?.language || 'Unknown',
          depthLabel: langScores[0]?.depth || 'Unknown',
          peakMonth: peakMonth,
          summary: `${userProfile.name || username} is primarily a ${titleCase(domainResult.primary)} developer with strong ${langScores[0]?.language || 'various languages'} depth. Most active during ${peakMonth} with a focus on ${topProjectCategory}.`
        };
        setAnalytics(computedAnalytics);

      } catch (error) {
        console.error('Error loading public portfolio:', error);
        setError('We encountered a problem loading the portfolio. This could be due to GitHub API rate limits.');
      } finally {
        setLoading(false);
      }
    }

    loadData();
  }, [username]);

  useEffect(() => {
    async function loadContributions() {
      if (!username) return;
      try {
        const data = await db.contributions.where('username').equals(username).toArray();
        setContributions(data);
        if (data.length > 0) {
          const total = data.reduce((sum, d) => sum + (d.contributionCount || 0), 0);
          let longest = 0;
          let current = 0;
          const sortedData = data.sort((a, b) => new Date(a.date) - new Date(b.date));
          for (const day of sortedData) {
            if (day.contributionCount > 0) {
              current++;
              longest = Math.max(longest, current);
            } else {
              current = 0;
            }
          }
          setAnalytics(prev => ({ 
            ...prev, 
            longestStreak: longest, 
            totalContributions: total 
          }));
        } else {
          setAnalytics(prev => ({ ...prev, totalContributions: 0 }));
        }
      } catch (e) {
        console.error('Error loading contributions from Dexie:', e);
      }
    }
    loadContributions();
  }, [username]);

  const isOwner = authUser?.login === profile?.login;
  const topProjects = (repos || []).sort((a, b) => b.stargazers_count - a.stargazers_count).slice(0, 6);
  const domainColor = DOMAIN_RING_COLORS[analytics.primaryDomain] || '#30363d';

  const getScoreColor = (score) => {
    if (score >= 86) return '#22c55e';
    if (score >= 70) return '#84cc16';
    if (score >= 55) return '#eab308';
    if (score >= 38) return '#f97316';
    if (score >= 20) return '#ef4444';
    return '#dc2626';
  };
  const scoreColor = getScoreColor(analytics.score);
  const tierLabel = analytics.score >= 86 ? 'Exceptional' : analytics.score >= 70 ? 'Strong' : analytics.score >= 55 ? 'Competitive' : analytics.score >= 38 ? 'Developing' : analytics.score >= 20 ? 'Beginner' : 'Getting Started';

  const getQualityColor = (score) => {
    if (score < 40) return '#ef4444';
    if (score < 60) return '#f97316';
    if (score < 75) return '#eab308';
    return '#22c55e';
  };

  // Normalized heatmap data
  const normalizedWeeks = useMemo(() => {
    if (!contributions || contributions.length === 0) return [];
    // contributions from Dexie is an array of {date, contributionCount}
    // Convert it to a date map
    const dateMap = {};
    contributions.forEach(d => {
      dateMap[d.date] = d.contributionCount || 0;
    });
    return normalizeContributionData(dateMap);
  }, [contributions]);

  const heatmapTotalContributions = computeTotalContributions(normalizedWeeks);
  const heatmapStreak = computeLongestStreak(normalizedWeeks);
  const heatmapActiveDays = computeActiveDays(normalizedWeeks);
  const monthLabels = getMonthLabels(normalizedWeeks);
  const displayTotalContributions = analytics.totalContributions || heatmapTotalContributions;

  // Scroll heatmap to latest on mount
  useEffect(() => {
    if (heatmapScrollRef.current && normalizedWeeks.length > 0) {
      heatmapScrollRef.current.scrollLeft = heatmapScrollRef.current.scrollWidth;
    }
  }, [normalizedWeeks.length]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen bg-[#0d1117]">
        <div className="flex flex-col items-center gap-4">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white"></div>
          <p style={{ color: '#8b949e', fontSize: '14px' }}>{loadingMessage}</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-screen bg-[#0d1117] text-[#e6edf3] text-center px-4">
        <div>
          <h1 className="text-2xl font-bold mb-2">Something went wrong</h1>
          <p style={{ color: '#8b949e' }}>{error}</p>
          <button 
            onClick={() => window.location.reload()}
            className="mt-4 px-4 py-2 bg-[#21262d] border border-[#30363d] rounded-md hover:bg-[#30363d] transition-colors"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="flex items-center justify-center h-screen bg-[#0d1117] text-[#e6edf3]">
        <h1 className="text-2xl font-bold">User not found</h1>
      </div>
    );
  }

  // Score ring SVG attributes
  const scoreRingRadius = 40;
  const scoreRingCircumference = 2 * Math.PI * scoreRingRadius; // ~251.33
  const scoreDashOffset = scoreRingCircumference - (scoreRingCircumference * Math.min(analytics.score, 100)) / 100;

  return (
    <>
      <Helmet>
        <title>{profile?.name ? `${profile.name} (@${username}) — Gitfolio Portfolio` : `@${username} — Gitfolio Portfolio`}</title>
        <meta 
          name="description" 
          content={`${profile?.name || username}'s GitHub portfolio on Gitfolio. Interview Readiness Score: ${analytics.score}/100. Tier: ${tierLabel}. Analyzed repositories, languages, and contributions.`} 
        />
        <link rel="canonical" href={`https://gitfolio.harmnix.com/u/${username}`} />
        <meta property="og:type" content="profile" />
        <meta property="og:url" content={`https://gitfolio.harmnix.com/u/${username}`} />
        <meta property="og:title" content={`${profile?.name || username} — GitHub Portfolio on Gitfolio`} />
        <meta 
          property="og:description" 
          content={`Check out ${profile?.name || username}'s developer profile. Score: ${analytics.score}/100. Tier: ${tierLabel}.`}
        />
        <meta name="twitter:card" content="summary" />
        <meta name="twitter:title" content={`${profile?.name || username} on Gitfolio`} />
        <meta 
          name="twitter:description" 
          content={`Interview Readiness Score: ${analytics.score}/100. Tier: ${tierLabel}.`}
        />
      </Helmet>

      <div className="portfolio-page" style={{ minHeight: '100vh', background: '#0d1117', color: '#e6edf3', fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif" }}>
        {/* ── Sticky Navbar ── */}
        <nav className="portfolio-nav" style={{ 
          position: 'sticky', top: 0, zIndex: 100, height: '52px',
          background: 'rgba(13, 17, 23, 0.85)', backdropFilter: 'blur(12px)',
          borderBottom: '1px solid #21262d',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '0 24px'
        }}>
          <a href="/" style={{ fontSize: '15px', fontWeight: 700, color: '#e6edf3', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#3fb950" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M22 12h-4l-3 9L9 3l-3 9H2" />
            </svg>
            Gitfolio
          </a>
          <a 
            href="/"
            style={{
              background: '#238636', color: 'white', borderRadius: '6px',
              padding: '6px 14px', fontSize: '13px', fontWeight: 500,
              textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '6px',
              transition: 'background 0.2s'
            }}
            className="hover:bg-[#2ea043]"
          >
            Create yours <ChevronRight size={14} />
          </a>
        </nav>

        {/* ── Hero Section ── */}
        <div className="portfolio-hero" style={{
          display: 'flex', alignItems: 'flex-start', gap: '40px',
          padding: '48px 24px 40px', maxWidth: '900px', margin: '0 auto',
        }}>
          {/* Left column: Avatar + Info */}
          <div style={{ flex: '1 1 55%', minWidth: '280px' }}>
            {/* Avatar */}
            <div style={{
              width: '96px', height: '96px', borderRadius: '50%',
              overflow: 'hidden', marginBottom: '16px',
              background: '#21262d', flexShrink: 0,
              boxShadow: `0 0 0 3px ${domainColor}`,
            }}>
              {profile.avatar_url ? (
                <img src={profile.avatar_url} alt={profile.name || profile.login} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              ) : (
                <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '32px', fontWeight: 700, color: '#e6edf3' }}>
                  {(profile.name || profile.login).charAt(0).toUpperCase()}
                </div>
              )}
            </div>

            {/* Name */}
            <h1 style={{ fontSize: '36px', fontWeight: 700, color: '#e6edf3', margin: '0 0 4px' }}>
              {profile.name || profile.login}
            </h1>
            <p style={{ fontSize: '14px', color: '#8b949e', margin: '0 0 16px' }}>
              @{profile.login}
            </p>

            {/* Location / Blog Pills */}
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginBottom: '16px' }}>
              {profile.location && (
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', fontSize: '12px', color: '#8b949e', background: '#21262d', border: '1px solid #30363d', borderRadius: '20px', padding: '4px 10px' }}>
                  <MapPin size={11} /> {profile.location}
                </span>
              )}
              {profile.blog && (
                <a href={profile.blog} target="_blank" rel="noopener noreferrer" style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', fontSize: '12px', color: '#58a6ff', background: '#21262d', border: '1px solid #30363d', borderRadius: '20px', padding: '4px 10px', textDecoration: 'none' }}>
                  <Globe size={11} /> Blog
                </a>
              )}
              {profile.company && (
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', fontSize: '12px', color: '#8b949e', background: '#21262d', border: '1px solid #30363d', borderRadius: '20px', padding: '4px 10px' }}>
                  <Building2 size={11} /> {profile.company}
                </span>
              )}
            </div>

            {/* Domain + Tier Badges */}
            <div style={{ display: 'flex', gap: '8px', marginBottom: '20px' }}>
              <span style={{
                background: 'rgba(88, 166, 255, 0.1)', color: '#58a6ff',
                border: '1px solid rgba(88, 166, 255, 0.3)', borderRadius: '20px',
                padding: '4px 12px', fontSize: '12px', fontWeight: 500,
              }}>
                {analytics.primaryDomain && analytics.primaryDomain !== 'Unknown' 
                  ? titleCase(analytics.primaryDomain) 
                  : 'Web'}
              </span>
              <span style={{
                background: 'rgba(63, 185, 80, 0.1)', color: scoreColor,
                border: `1px solid ${scoreColor}40`, borderRadius: '20px',
                padding: '4px 12px', fontSize: '12px', fontWeight: 500,
              }}>
                {tierLabel}
              </span>
            </div>

            {/* Action Buttons */}
            <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
              <a 
                href={`https://github.com/${profile.login}`} 
                target="_blank" rel="noopener noreferrer"
                style={{
                  display: 'inline-flex', alignItems: 'center', gap: '6px',
                  padding: '8px 16px', fontSize: '13px', fontWeight: 500,
                  color: '#e6edf3', background: 'transparent',
                  border: '1px solid #30363d', borderRadius: '6px',
                  textDecoration: 'none', transition: 'background 0.2s'
                }}
                className="hover:bg-[#30363d]"
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M12 0C5.373 0 0 5.373 0 12c0 5.302 3.068 9.816 7.41 11.287a.993.993 0 0 1 .213-.85C6.62 17.52 5.4 14.54 5.4 12c0-4.357 3.442-7.905 7.633-7.905 1.13 0 2.16.344 3.025.935.865-.591 1.895-.935 3.025-.935C18.558 4.095 22 8.643 22 12c0 4.357-3.442 7.905-7.633 7.905-1.13 0-2.16-.344-3.025-.935a.993.993 0 0 1-.213-.85C11.068 21.816 8 21.302 8 12c0-4.357 3.442-7.905 7.633-7.905z"/>
                </svg>
                View GitHub
              </a>
              {isOwner && (
                <button 
                  onClick={() => {
                    navigator.clipboard.writeText(`https://gitfolio.harmnix.com/u/${username}`);
                    setCopied(true);
                    setTimeout(() => setCopied(false), 2000);
                  }}
                  style={{
                    display: 'inline-flex', alignItems: 'center', gap: '6px',
                    padding: '8px 16px', fontSize: '13px', fontWeight: 500,
                    color: 'white', background: '#238636',
                    border: '1px solid #2ea043', borderRadius: '6px',
                    cursor: 'pointer', transition: 'background 0.2s'
                  }}
                  className="hover:bg-[#2ea043]"
                >
                  {copied ? <><Check size={14} /> Copied!</> : <><Copy size={14} /> Share Profile</>}
                </button>
              )}
            </div>
          </div>

          {/* Right column: Score Card */}
          <div className="score-card" style={{
            flexShrink: 0, width: '240px',
            border: '1px solid #30363d', borderRadius: '12px',
            background: '#161b22', padding: '24px',
            boxShadow: `0 0 0 1px rgba(255,255,255,0.04), 0 0 20px ${scoreColor}15`,
          }}>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '6px' }}>
              {/* Score Ring */}
              <div style={{ position: 'relative', width: '96px', height: '96px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <svg width="96" height="96" viewBox="0 0 96 96" style={{ position: 'absolute', transform: 'rotate(-90deg)' }}>
                  <circle cx="48" cy="48" r={scoreRingRadius} fill="none" stroke="#30363d" strokeWidth="6" />
                  <circle 
                    cx="48" cy="48" r={scoreRingRadius} 
                    fill="none" stroke={scoreColor} strokeWidth="6" 
                    strokeDasharray={scoreRingCircumference} 
                    strokeDashoffset={scoreDashOffset} 
                    strokeLinecap="round"
                    style={{ transition: 'stroke-dashoffset 1.4s ease-out' }}
                  />
                </svg>
                <div style={{ position: 'relative', fontSize: '28px', fontWeight: 700, color: '#e6edf3', lineHeight: '1' }}>
                  {analytics.score}
                </div>
              </div>

              <div style={{ fontSize: '10px', color: '#8b949e', letterSpacing: '0.08em', textTransform: 'uppercase', marginTop: '4px' }}>
                READINESS
              </div>
              <div style={{ fontSize: '14px', fontWeight: 600, color: scoreColor }}>
                {tierLabel}
              </div>

              {/* 5-segment breakdown bar */}
              {analytics.overall?.breakdown && analytics.overall?.maxPoints && (() => {
                const b = analytics.overall.maxPoints;
                const pts = analytics.overall.breakdown;
                const segments = [
                  { label: 'Project', color: '#22c55e', earned: pts.project, max: b.project },
                  { label: 'Lang', color: '#3b82f6', earned: pts.language, max: b.language },
                  { label: 'Contrib', color: '#a855f7', earned: pts.contribution, max: b.contribution },
                  { label: 'Profile', color: '#eab308', earned: pts.profile, max: b.profile },
                  { label: 'Hygiene', color: '#f97316', earned: pts.hygiene, max: b.hygiene },
                ];
                const total = Object.values(b).reduce((a, v) => a + v, 0);
                return (
                  <div style={{ width: '100%', marginTop: '12px' }}>
                    <div style={{ display: 'flex', height: '4px', borderRadius: '2px', overflow: 'hidden', gap: '2px' }}>
                      {segments.map(seg => (
                        <div key={seg.label} style={{
                          flex: `${seg.max} 0 auto`,
                          background: seg.color,
                          opacity: seg.max > 0 ? Math.max(0.15, seg.earned / seg.max) : 0.15,
                          height: '100%',
                          minWidth: seg.max > 0 ? `${(seg.max / total) * 100}%` : '0%',
                        }} title={`${seg.label}: ${seg.earned}/${seg.max}`} />
                      ))}
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '6px', fontSize: '8px', color: '#8b949e' }}>
                      {segments.map(s => (
                        <span key={s.label} style={{ color: s.color }}>{s.label}: {s.earned}/{s.max}</span>
                      ))}
                    </div>
                  </div>
                );
              })()}

              <div style={{ fontSize: '10px', color: '#8b949e', marginTop: '4px' }}>
                {analytics.topLanguage && `Top: ${analytics.topLanguage}`}
              </div>
            </div>
          </div>
        </div>

        <style>{`
          @media (max-width: 640px) {
            .portfolio-hero { flex-direction: column; align-items: center; text-align: center; }
            .score-card { width: 100% !important; max-width: 280px; }
          }
          .projects-grid { grid-template-columns: repeat(2, 1fr); }
          @media (max-width: 640px) { .projects-grid { grid-template-columns: 1fr; } }
          .dashboard-two-col { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; margin-bottom: 16px; }
          @media (max-width: 768px) { .dashboard-two-col { grid-template-columns: 1fr; } }
        `}</style>

        {/* ── Divider ── */}
        <div style={{ height: '1px', background: '#21262d', margin: '0 24px' }} />

        {/* ── Technical Expertise Section ── */}
        <div className="portfolio-section" style={{ maxWidth: '780px', margin: '0 auto', padding: '32px 24px' }}>
          <h2 style={{ fontSize: '10px', color: '#8b949e', letterSpacing: '0.12em', textTransform: 'uppercase', marginBottom: '16px', textAlign: 'center' }}>
            TECHNICAL EXPERTISE
          </h2>
          <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'center', gap: '8px' }}>
            {analytics.languages
              .filter(l => l.label && l.label !== 'Exposure')
              .map(lang => (
                <div 
                  key={lang.language}
                  style={{
                    display: 'inline-flex', alignItems: 'center', gap: '6px',
                    background: '#21262d', border: '1px solid #30363d',
                    borderRadius: '20px', padding: '6px 14px', fontSize: '13px',
                    color: '#e6edf3',
                  }}
                >
                  <span style={{
                    width: '8px', height: '8px', borderRadius: '50%',
                    background: LANGUAGE_COLORS[lang.language] || '#8b949e',
                    display: 'inline-block', flexShrink: 0,
                  }} />
                  {lang.language} 
                  <span style={{ color: '#8b949e' }}>·</span>
                  <span style={{ color: getScoreColor(lang.score >= 70 ? 75 : lang.score >= 40 ? 55 : 25) }}>
                    {lang.label}
                  </span>
                </div>
              ))}
          </div>
        </div>

        {/* ── Contribution Activity Section ── */}
        <div className="portfolio-heatmap-section" style={{
          width: '100%', background: '#0d1117', padding: '32px 24px',
          borderTop: '1px solid #21262d',
        }}>
          <div className="portfolio-heatmap-inner" style={{ maxWidth: '900px', margin: '0 auto' }}>
            <h2 style={{ fontSize: '10px', color: '#8b949e', letterSpacing: '0.12em', textTransform: 'uppercase', marginBottom: '16px', textAlign: 'center' }}>
              CONTRIBUTION ACTIVITY
            </h2>
            
            {normalizedWeeks.length > 0 ? (
              <div style={{ width: '100%', overflowX: 'auto', overflowY: 'visible' }}>
                <div style={{ display: 'flex', flexDirection: 'row', gap: '2px', minWidth: 'max-content' }}>
                  {/* Month Labels */}
                  <div style={{ display: 'flex', marginBottom: '4px', marginLeft: '28px', fontSize: '10px', color: '#8b949e', height: '14px', position: 'relative' }}>
                    {monthLabels.map((m, i) => (
                      <span key={i} style={{
                        position: 'absolute',
                        left: `${m.weekIndex * 13}px`,
                        whiteSpace: 'nowrap',
                      }}>
                        {m.label}
                      </span>
                    ))}
                  </div>
                </div>
                <div style={{ display: 'flex' }}>
                  {/* Day labels */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', marginRight: '4px', fontSize: '9px', color: '#8b949e', fontFamily: 'monospace', lineHeight: '13px' }}>
                    {['Mon', '', 'Wed', '', 'Fri', '', ''].map((label, i) => (
                      <div key={i} style={{ height: '11px', display: 'flex', alignItems: 'center' }}>{label}</div>
                    ))}
                  </div>
                  {/* Heatmap grid */}
                  <div ref={heatmapScrollRef} style={{ overflowX: 'auto' }}>
                    <div style={{ display: 'flex', flexDirection: 'row', gap: '2px', minWidth: 'max-content' }}>
                      {normalizedWeeks.map((week, weekIdx) => (
                        <div key={weekIdx} style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                          {week.map((day, dayIdx) => {
                            const count = day?.count || 0;
                            let cellColor = HEATMAP_COLORS[0];
                            if (count > 0) {
                              if (count < 4) cellColor = HEATMAP_COLORS[1];
                              else if (count < 8) cellColor = HEATMAP_COLORS[2];
                              else if (count < 15) cellColor = HEATMAP_COLORS[3];
                              else cellColor = HEATMAP_COLORS[4];
                            }
                            return (
                              <div
                                key={dayIdx}
                                title={day?.date ? `${day.date}: ${count} contributions` : ''}
                                style={{
                                  width: '11px', height: '11px',
                                  borderRadius: '2px',
                                  backgroundColor: cellColor,
                                }}
                              />
                            );
                          })}
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
                {/* Stats row */}
                <p style={{ fontSize: '13px', color: '#8b949e', textAlign: 'center', marginTop: '12px' }}>
                  {displayTotalContributions} contributions · {heatmapStreak === 0 ? 'No active streak' : `${heatmapStreak} day streak`} · {heatmapActiveDays} active days
                </p>
                {/* Heatmap Legend */}
                <div style={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center', gap: '4px', marginTop: '8px', fontSize: '10px', color: '#8b949e' }}>
                  <span>Less</span>
                  {Object.values(HEATMAP_COLORS).map((color, i) => (
                    <div key={i} style={{ width: '11px', height: '11px', backgroundColor: color, borderRadius: '2px' }} />
                  ))}
                  <span>More</span>
                </div>
              </div>
            ) : (
              <div style={{ background: '#161b22', border: '1px solid #30363d', borderRadius: '8px', padding: '24px', textAlign: 'center' }}>
                <Activity size={28} style={{ color: '#30363d', marginBottom: '8px' }} />
                <p style={{ fontSize: '13px', color: '#656d76' }}>Contribution history visible to profile owner</p>
              </div>
            )}
          </div>
        </div>

        {/* ── Featured Projects Section ── */}
        <div className="portfolio-section" style={{ maxWidth: '900px', margin: '0 auto', padding: '32px 24px', borderTop: '1px solid #21262d' }}>
          <h2 style={{ fontSize: '10px', color: '#8b949e', letterSpacing: '0.12em', textTransform: 'uppercase', marginBottom: '20px', textAlign: 'center' }}>
            FEATURED PROJECTS
          </h2>
          <div className="projects-grid" style={{
            display: 'grid', gap: '16px',
          }}>
            {topProjects.map(repo => {
              const qualityScore = (() => {
                // Simple quality estimate from available data
                let score = 0;
                if (repo.description) score += 20;
                if (repo.homepage) score += 15;
                if (repo.license) score += 10;
                if (repo.stargazers_count > 0) score += Math.min(repo.stargazers_count * 5, 20);
                if (repo.forks_count > 0) score += Math.min(repo.forks_count * 3, 10);
                if (repo.language) score += 10;
                // recency bonus
                const daysSincePush = (Date.now() - new Date(repo.pushed_at).getTime()) / 86400000;
                if (daysSincePush < 30) score += 15;
                else if (daysSincePush < 90) score += 10;
                else if (daysSincePush < 365) score += 5;
                return Math.min(score, 100);
              })();
              const qualityColor = getQualityColor(qualityScore);
              const topLang = repo.language || Object.keys(repo.languages || {})[0] || null;

              return (
                <div 
                  key={repo.id}
                  className="project-card"
                  style={{
                    background: '#161b22', border: '1px solid #30363d',
                    borderRadius: '10px', padding: '20px',
                    display: 'flex', flexDirection: 'column',
                    transition: 'border-color 0.2s',
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px' }}>
                    <a 
                      href={repo.html_url} target="_blank" rel="noopener noreferrer"
                      style={{ color: '#58a6ff', fontSize: '16px', fontWeight: 600, textDecoration: 'none' }}
                      className="hover:underline"
                    >
                      {repo.name}
                    </a>
                    {topLang && (
                      <span style={{
                        display: 'inline-flex', alignItems: 'center', gap: '4px',
                        fontSize: '11px', padding: '2px 8px', borderRadius: '4px',
                        background: '#21262d', border: '1px solid #30363d', color: '#e6edf3',
                        whiteSpace: 'nowrap', flexShrink: 0, marginLeft: '8px',
                      }}>
                        <span style={{ width: '7px', height: '7px', borderRadius: '50%', background: LANGUAGE_COLORS[topLang] || '#8b949e', display: 'inline-block' }} />
                        {topLang}
                      </span>
                    )}
                  </div>

                  <p style={{ fontSize: '13px', color: '#8b949e', lineHeight: '1.5', marginBottom: '12px', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                    {repo.description || 'No description provided.'}
                  </p>

                  <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginBottom: '12px', fontSize: '11px' }}>
                    <span style={{ color: '#8b949e', display: 'flex', alignItems: 'center', gap: '3px' }}>
                      <Star size={12} style={{ color: '#eab308' }} /> {repo.stargazers_count}
                    </span>
                    <span style={{ color: '#8b949e', display: 'flex', alignItems: 'center', gap: '3px' }}>
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"/></svg>
                      {repo.forks_count}
                    </span>
                    <span style={{ color: '#656d76' }}>
                      Updated {timeAgo(repo.pushed_at)}
                    </span>
                  </div>

                  {/* Thin quality bar (NO text label) */}
                  <div style={{ marginTop: 'auto', marginBottom: '12px' }}>
                    <div style={{ height: '3px', width: '100%', background: '#30363d', borderRadius: '2px', overflow: 'hidden' }}>
                      <div style={{ height: '100%', width: `${qualityScore}%`, background: qualityColor, borderRadius: '2px', transition: 'width 1s' }} />
                    </div>
                  </div>

                  {/* Action row */}
                  <div style={{ display: 'flex', gap: '8px', marginTop: 'auto' }}>
                    {repo.homepage && repo.homepage.startsWith('http') && (
                      <a 
                        href={repo.homepage} target="_blank" rel="noopener noreferrer"
                        style={{
                          display: 'inline-flex', alignItems: 'center', gap: '4px',
                          fontSize: '12px', padding: '5px 10px', borderRadius: '6px',
                          color: '#58a6ff', border: '1px solid #388bfd',
                          textDecoration: 'none', transition: 'background 0.2s',
                        }}
                        className="hover:bg-[#58a6ff1a]"
                      >
                        Live Demo <ExternalLink size={12} />
                      </a>
                    )}
                    <a 
                      href={repo.html_url} target="_blank" rel="noopener noreferrer"
                      style={{
                        display: 'inline-flex', alignItems: 'center', gap: '4px',
                        fontSize: '12px', padding: '5px 10px', borderRadius: '6px',
                        color: '#8b949e', border: '1px solid #30363d',
                        textDecoration: 'none', transition: 'all 0.2s',
                      }}
                      className="hover:bg-[#30363d] hover:text-[#e6edf3]"
                    >
                      <Code size={12} /> Code
                    </a>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* ── Open Source Contributions (only if > 0) ── */}
        {publicPRs.length > 0 && (
          <div className="portfolio-section" style={{ maxWidth: '900px', margin: '0 auto', padding: '32px 24px', borderTop: '1px solid #21262d' }}>
            <h2 style={{ fontSize: '10px', color: '#8b949e', letterSpacing: '0.12em', textTransform: 'uppercase', marginBottom: '16px', textAlign: 'center' }}>
              OPEN SOURCE CONTRIBUTIONS
            </h2>
            <div style={{ display: 'grid', gap: '8px' }}>
              {publicPRs.slice(0, 8).map((pr, idx) => (
                <div 
                  key={idx}
                  style={{
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                    background: '#161b22', border: '1px solid #30363d', borderRadius: '8px',
                    padding: '12px 16px',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px', overflow: 'hidden' }}>
                    <GitMerge size={16} style={{ color: '#3fb950', flexShrink: 0 }} />
                    <div>
                      <div style={{ color: '#58a6ff', fontSize: '13px', fontWeight: 500 }}>{pr.repository}</div>
                      <div style={{ color: '#8b949e', fontSize: '13px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{pr.title}</div>
                    </div>
                  </div>
                  <span style={{ color: '#656d76', fontSize: '12px', flexShrink: 0, marginLeft: '12px' }}>
                    {timeAgo(pr.merged_at || pr.created_at)}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── Footer CTA ── */}
        <div className="portfolio-cta" style={{
          width: '100%',
          background: 'linear-gradient(180deg, #0d1117 0%, #161b22 100%)',
          borderTop: '1px solid #21262d',
          padding: '64px 24px',
          textAlign: 'center',
        }}>
          <h3 style={{ fontSize: '24px', color: '#e6edf3', fontWeight: 700, margin: '0 0 8px' }}>
            Build your own placement-ready portfolio
          </h3>
          <p style={{ fontSize: '14px', color: '#8b949e', margin: '0 0 24px' }}>
            No email required · Takes 30 seconds
          </p>
          <a 
            href="/"
            style={{
              display: 'inline-flex', alignItems: 'center', gap: '8px',
              background: '#238636', color: 'white', padding: '12px 28px',
              borderRadius: '8px', fontSize: '15px', fontWeight: 600,
              textDecoration: 'none', transition: 'background 0.2s',
            }}
            className="hover:bg-[#2ea043]"
          >
            Connect GitHub — Free <ChevronRight size={18} />
          </a>
          <p style={{ fontSize: '12px', color: '#656d76', marginTop: '32px' }}>
            Powered by <a href="/" style={{ color: '#58a6ff', textDecoration: 'none' }}>Gitfolio</a>
          </p>
        </div>
      </div>
    </>
  );
};

export default PublicPortfolio;
