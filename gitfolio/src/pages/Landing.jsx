import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { Helmet } from 'react-helmet-async';
import { Filter, BarChart, Share2, X, Loader2, GitBranch, Check } from 'lucide-react';

// VITE_WORKER_URL is required — set it in your .env file or environment
// Example: VITE_WORKER_URL=https://your-worker.your-subdomain.workers.dev
const WORKER_URL = import.meta.env.VITE_WORKER_URL;

const Landing = () => {
  const { startAuth, isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const [authData, setAuthData] = useState(null);
  const [timeLeft, setTimeLeft] = useState(0);
  const [primaryCopied, setPrimaryCopied] = useState(false);
  const [studentCount, setStudentCount] = useState(null);
  const abortControllerRef = useRef(null);

  useEffect(() => {
    fetch(`${WORKER_URL}/stats/total-analyses`)
      .then(r => r.json())
      .then(d => setStudentCount(d.count))
      .catch(() => setStudentCount(500));
  }, []);

  useEffect(() => {
    if (isAuthenticated) {
      navigate('/dashboard');
    }
  }, [isAuthenticated, navigate]);

  useEffect(() => {
    let timer;
    if (authData && timeLeft > 0) {
      timer = setInterval(() => {
        setTimeLeft((prev) => prev - 1);
      }, 1000);
    }
    return () => clearInterval(timer);
  }, [authData, timeLeft]);

  const handleConnect = async () => {
    try {
      // Open GitHub verification page immediately while we still have the user gesture context
      // (popup blockers block window.open after an async await)
      window.open('https://github.com/login/device', '_blank');
      
      abortControllerRef.current = new AbortController();
      const data = await startAuth(abortControllerRef.current.signal);
      setAuthData(data);
      setTimeLeft(data.expires_in);
      
      // Auto-copy code to clipboard
      await navigator.clipboard.writeText(data.user_code);
      setPrimaryCopied(true);
    } catch (error) {
      console.error('Failed to start auth:', error);
    }
  };

  const handleCloseModal = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    setAuthData(null);
    setTimeLeft(0);
  };

  const handleOpenVerify = async () => {
    window.open(authData.verification_uri, '_blank');
    await navigator.clipboard.writeText(authData.user_code);
    setPrimaryCopied(true);
    setTimeout(() => setPrimaryCopied(false), 3000);
  };

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <>
      <Helmet>
        <title>Gitfolio — GitHub Interview Readiness Score & Portfolio Generator</title>
        <meta name="description" content="Gitfolio analyzes your GitHub profile and calculates an Interview Readiness Score. Get AI tips, generate a portfolio, and join your college leaderboard. Free for developers." />
        <link rel="canonical" href="https://gitfolio.harmnix.com/" />
        <meta property="og:url" content="https://gitfolio.harmnix.com/" />
        <meta property="og:title" content="Gitfolio — GitHub Interview Readiness Score" />
        <meta property="og:description" content="Analyze your GitHub profile, get scored, and find out exactly how to improve for your next developer interview." />
      </Helmet>
      <div className="min-h-screen text-white font-sans" style={{ backgroundColor: '#0d1117' }}>
      {/* Hero Section */}
      <section className="pt-24 pb-16 px-4 text-center max-w-4xl mx-auto">
        <h1 className="text-5xl md:text-6xl font-extrabold tracking-tight text-white mb-6">
          Your GitHub Profile, <span className="text-blue-600">Placement-Ready</span>
        </h1>
        <p className="text-xl text-slate-400 mb-10 max-w-2xl mx-auto">
          Get your Interview Readiness Score, company-specific fit analysis, and a personalized 60-day roadmap. Free forever, no email required.
        </p>
        <div className="flex flex-col items-center gap-4">
          <button 
            onClick={handleConnect}
            className="bg-blue-600 hover:bg-blue-700 text-white px-8 py-4 rounded-full font-semibold text-lg transition-all transform hover:scale-105 shadow-lg"
          >
            Connect GitHub
          </button>
          <p className="text-sm text-slate-500">
            <span id="student-count" className="text-blue-400 font-semibold">{studentCount || 500}+</span> students analyzed this month
          </p>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="py-16 px-4 max-w-6xl mx-auto">
        <h2 id="why-use-gitfolio" className="text-3xl font-bold text-center text-white mb-12">Why use Gitfolio?</h2>
        <div className="grid md:grid-cols-3 gap-8">
          <div className="p-8 bg-[#161b22] rounded-2xl shadow-sm border border-[#30363d] flex flex-col items-center text-center">
            <div className="w-12 h-12 bg-blue-100 text-blue-600 rounded-lg flex items-center justify-center mb-6">
              <Filter size={24} />
            </div>
            <h3 className="text-xl font-bold mb-3 text-white">Smart filtering</h3>
            <p className="text-slate-400">Automatically removes forks and assignments to showcase your original work.</p>
          </div>
          <div className="p-8 bg-[#161b22] rounded-2xl shadow-sm border border-[#30363d] flex flex-col items-center text-center">
            <div className="w-12 h-12 bg-green-100 text-green-600 rounded-lg flex items-center justify-center mb-6">
              <BarChart size={24} />
            </div>
            <h3 className="text-xl font-bold mb-3 text-white">Depth scores</h3>
            <p className="text-slate-400">Go beyond language bars. Get a real depth score based on commit quality and complexity.</p>
          </div>
          <div className="p-8 bg-[#161b22] rounded-2xl shadow-sm border border-[#30363d] flex flex-col items-center text-center">
            <div className="w-12 h-12 bg-purple-100 text-purple-600 rounded-lg flex items-center justify-center mb-6">
              <Share2 size={24} />
            </div>
            <h3 className="text-xl font-bold mb-3 text-white">Shareable portfolio</h3>
            <p className="text-slate-400">One clean, professional link to send to recruiters and hiring managers.</p>
            <a 
              href="/u/example" 
              className="mt-4 text-sm text-blue-500 hover:text-blue-400 transition-colors inline-flex items-center gap-1"
            >
              View a sample portfolio →
            </a>
          </div>
        </div>

        {/* New Feature Cards */}
        <div className="grid md:grid-cols-4 gap-6 mt-8">
          <div className="p-6 bg-[#161b22] rounded-2xl border border-[#30363d] flex flex-col items-center text-center">
            <div className="w-10 h-10 bg-[#1a3a2a] rounded-lg flex items-center justify-center mb-4">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#3fb950" strokeWidth="2"><circle cx="12" cy="12" r="10" /><circle cx="12" cy="12" r="6" /><circle cx="12" cy="12" r="2" /></svg>
            </div>
            <h3 className="text-lg font-bold mb-2 text-white">Company Fit Score</h3>
            <p className="text-slate-400 text-sm">See how ready you are for Amazon, Flipkart, or any company</p>
          </div>
          <div className="p-6 bg-[#161b22] rounded-2xl border border-[#30363d] flex flex-col items-center text-center">
            <div className="w-10 h-10 bg-[#1c2a3a] rounded-lg flex items-center justify-center mb-4">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#58a6ff" strokeWidth="2"><path d="M3 3v18h18" /><path d="M7 16l4-8 4 4 4-6" /></svg>
            </div>
            <h3 className="text-lg font-bold mb-2 text-white">AI Interview Roadmap</h3>
            <p className="text-slate-400 text-sm">Personalized 60-day plan built from your profile</p>
          </div>
          <div className="p-6 bg-[#161b22] rounded-2xl border border-[#30363d] flex flex-col items-center text-center">
            <div className="w-10 h-10 bg-[#3a1a1a] rounded-lg flex items-center justify-center mb-4">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#f97316" strokeWidth="2"><polyline points="16 18 22 12 16 6" /><polyline points="8 6 2 12 8 18" /></svg>
            </div>
            <h3 className="text-lg font-bold mb-2 text-white">LeetCode Integration</h3>
            <p className="text-slate-400 text-sm">Combine your DSA progress with your GitHub score</p>
          </div>
          <div className="p-6 bg-[#161b22] rounded-2xl border border-[#30363d] flex flex-col items-center text-center">
            <div className="w-10 h-10 bg-[#2a1a3a] rounded-lg flex items-center justify-center mb-4">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#a855f7" strokeWidth="2"><path d="M16 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2" /><circle cx="8.5" cy="7" r="4" /><line x1="20" y1="8" x2="20" y2="14" /><line x1="23" y1="11" x2="17" y2="11" /></svg>
            </div>
            <h3 className="text-lg font-bold mb-2 text-white">Peer Benchmarking</h3>
            <p className="text-slate-400 text-sm">See your percentile vs college peers</p>
          </div>
        </div>
      </section>

      {/* Testimonials Section */}
      <section className="py-16 px-4 max-w-5xl mx-auto">
        <h2 className="text-3xl font-bold text-center text-white mb-12">What Students Say</h2>
        <div className="grid md:grid-cols-3 gap-6">
          <div className="p-6 bg-[#161b22] rounded-2xl border border-[#30363d] flex flex-col gap-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-[#1a3a2a] flex items-center justify-center text-[#3fb950] font-bold text-sm">RK</div>
              <div><p className="text-sm font-bold text-white">Rohit K.</p><p className="text-xs text-slate-500">NIT Trichy</p></div>
            </div>
            <p className="text-sm text-slate-400 italic">"I went from 'developing' to 'strong' in 6 weeks following the roadmap. The company fit score told me exactly what I was missing."</p>
          </div>
          <div className="p-6 bg-[#161b22] rounded-2xl border border-[#30363d] flex flex-col gap-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-[#1c2a3a] flex items-center justify-center text-[#58a6ff] font-bold text-sm">PS</div>
              <div><p className="text-sm font-bold text-white">Priya S.</p><p className="text-xs text-slate-500">VIT Vellore</p></div>
            </div>
            <p className="text-sm text-slate-400 italic">"The Company Fit Score told me exactly what Amazon wanted. I focused on that. Got the offer."</p>
          </div>
          <div className="p-6 bg-[#161b22] rounded-2xl border border-[#30363d] flex flex-col gap-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-[#2a1a3a] flex items-center justify-center text-[#a855f7] font-bold text-sm">AM</div>
              <div><p className="text-sm font-bold text-white">Arjun M.</p><p className="text-xs text-slate-500">BITS Pilani</p></div>
            </div>
            <p className="text-sm text-slate-400 italic">"Best ₹999 I ever spent during placement season. The resume builder alone saved me hours."</p>
          </div>
        </div>
      </section>

      {/* FAQ Section */}
      <section id="faq" className="py-16 px-4 max-w-3xl mx-auto">
        <h2 id="frequently-asked-questions" className="text-3xl font-bold text-center text-white mb-12">Frequently Asked Questions</h2>
        <div className="space-y-4">
          <details className="bg-[#161b22] border border-[#30363d] rounded-xl overflow-hidden group">
            <summary className="px-6 py-4 text-white font-medium cursor-pointer list-none flex items-center justify-between hover:bg-[#1c2333] transition-colors">
              Does Gitfolio integrate with LeetCode?
              <span className="text-slate-500 group-open:rotate-180 transition-transform">▼</span>
            </summary>
            <div className="px-6 pb-4 text-slate-400 text-sm leading-relaxed">
              Yes! Premium users can connect their LeetCode and Codeforces profiles to get a combined placement score. Your LeetCode stats — easy/medium/hard solves, contest rating, and streak — are integrated into your overall profile score, because Indian product companies care enormously about DSA.
            </div>
          </details>
          <details className="bg-[#161b22] border border-[#30363d] rounded-xl overflow-hidden group">
            <summary className="px-6 py-4 text-white font-medium cursor-pointer list-none flex items-center justify-between hover:bg-[#1c2333] transition-colors">
              How accurate is the Company Fit Score?
              <span className="text-slate-500 group-open:rotate-180 transition-transform">▼</span>
            </summary>
            <div className="px-6 pb-4 text-slate-400 text-sm leading-relaxed">
              Our Company Fit Score is generated by analyzing your profile against publicly known hiring signals, tech stack priorities, and interview difficulty patterns for each company. It is not a guarantee of selection but an honest assessment of where you stand relative to typical expectations. Premium users get detailed category scores across DSA, system design, tech stack match, and project depth.
            </div>
          </details>
          <details className="bg-[#161b22] border border-[#30363d] rounded-xl overflow-hidden group">
            <summary className="px-6 py-4 text-white font-medium cursor-pointer list-none flex items-center justify-between hover:bg-[#1c2333] transition-colors">
              Do I need a portfolio website if I already have a GitHub profile?
              <span className="text-slate-500 group-open:rotate-180 transition-transform">▼</span>
            </summary>
            <div className="px-6 pb-4 text-slate-400 text-sm leading-relaxed">
              A GitHub profile shows your code and commit activity but does not tell your story effectively. A portfolio website lets you control what recruiters see first — your best projects, your target role, your tech stack, and your contact. Most Indian tech recruiters visit both. For frontend, full-stack, and product-focused roles, a portfolio website differentiates you from candidates who only have a GitHub. For pure backend or DSA-focused mass hiring, GitHub is sufficient.
            </div>
          </details>
          <details className="bg-[#161b22] border border-[#30363d] rounded-xl overflow-hidden group">
            <summary className="px-6 py-4 text-white font-medium cursor-pointer list-none flex items-center justify-between hover:bg-[#1c2333] transition-colors">
              What should a developer portfolio website include?
              <span className="text-slate-500 group-open:rotate-180 transition-transform">▼</span>
            </summary>
            <div className="px-6 pb-4 text-slate-400 text-sm leading-relaxed">
              A developer portfolio should include a clear headline stating what you build and for whom, three to five best projects with live links and one-sentence descriptions, your key technical skills without listing every technology you have ever touched, a contact method, and links to GitHub and LinkedIn. For Indian placement-focused portfolios, include your CGPA, graduation year, and whether you are available for full-time roles or internships. Avoid long about sections, more than six projects, or heavy animations that slow load time.
            </div>
          </details>
          <details className="bg-[#161b22] border border-[#30363d] rounded-xl overflow-hidden group">
            <summary className="px-6 py-4 text-white font-medium cursor-pointer list-none flex items-center justify-between hover:bg-[#1c2333] transition-colors">
              How do I make my GitHub portfolio visible to recruiters in India?
              <span className="text-slate-500 group-open:rotate-180 transition-transform">▼</span>
            </summary>
            <div className="px-6 pb-4 text-slate-400 text-sm leading-relaxed">
              Three things matter most. First, update your GitHub profile README with a clear summary, your target role, and your tech stack. Second, pin exactly six repositories — your best work, not your oldest. Third, give each pinned repo a one-sentence description and a live demo link. For Indian recruiters, projects with real-world relevance — payment integrations, dashboard tools, or India-specific data — stand out more than algorithmic challenges. Connect your GitHub to a portfolio website for maximum discoverability.
            </div>
          </details>
          <details className="bg-[#161b22] border border-[#30363d] rounded-xl overflow-hidden group">
            <summary className="px-6 py-4 text-white font-medium cursor-pointer list-none flex items-center justify-between hover:bg-[#1c2333] transition-colors">
              What projects should a fresher put in their developer portfolio for Indian placements?
              <span className="text-slate-500 group-open:rotate-180 transition-transform">▼</span>
            </summary>
            <div className="px-6 pb-4 text-slate-400 text-sm leading-relaxed">
              For Indian campus placements, include two to three projects that demonstrate real problem-solving: a full-stack web app with a backend and database, a frontend project with React or Vue that is deployed live, and optionally a project that integrates a real API or payment gateway. Avoid tutorial-clone projects like weather apps or to-do lists — every fresher has them. Projects that solve a real problem, have live deployments, and show measurable impact in the description get significantly more recruiter attention.
            </div>
          </details>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-12 text-center text-slate-500 text-sm">
        <p className="mb-2">Free to use. No email required. No data stored on our servers.</p>
        <p>
          Built by{' '}
          <a 
            href="https://harmnix.com" 
            target="_blank" 
            rel="noopener noreferrer" 
            className="text-blue-500 hover:text-blue-400 transition-colors"
            aria-label="Harmnix — products by Aditya"
          >
            Harmnix
          </a>
          {' '}· 2025
        </p>
      </footer>

      {/* Auth Modal */}
      {authData && (
        <div id="auth-modal" role="dialog" aria-modal="true" className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
          <div 
            className="bg-white rounded-3xl shadow-2xl relative animate-in fade-in zoom-in duration-200" 
            style={{ maxWidth: '420px', width: '100%', padding: '32px 28px' }}
          >
            <button 
              onClick={handleCloseModal}
              className="absolute top-6 right-6 p-2 rounded-lg transition-colors"
              style={{ backgroundColor: 'transparent', color: '#656d76' }}
              onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#f6f8fa'}
              onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
            >
              <X size={20} />
            </button>

            <div className="text-center">
              <h2 className="text-2xl font-bold mb-6 text-[#1a1a2e]">Connect GitHub</h2>

              <div 
                className="rounded-lg border mb-4" 
                style={{ backgroundColor: '#f6f8fa', borderColor: '#d0d7de', padding: '20px', marginBottom: '16px' }}
              >
                <p 
                  className="mb-2 uppercase" 
                  style={{ fontSize: '11px', color: '#656d76', letterSpacing: '0.08em', fontWeight: '600' }}
                >
                  Your User Code
                </p>
                <div 
                  className="font-mono select-all" 
                  style={{ fontSize: '28px', fontWeight: '700', color: '#1a1a2e', letterSpacing: '0.15em' }}
                >
                  {authData.user_code}
                </div>
              </div>

              <div className="flex flex-col gap-2.5 mb-6">
                <button 
                  onClick={handleOpenVerify}
                  className="flex items-center justify-center gap-2 transition-all"
                  style={{ 
                    backgroundColor: primaryCopied ? '#1a7f37' : '#238636', 
                    color: '#ffffff', 
                    borderRadius: '8px', 
                    padding: '12px 20px',
                    fontWeight: '600',
                    fontSize: '15px'
                  }}
                  onMouseEnter={(e) => !primaryCopied && (e.currentTarget.style.backgroundColor = '#2ea043')}
                  onMouseLeave={(e) => !primaryCopied && (e.currentTarget.style.backgroundColor = '#238636')}
                  onMouseDown={(e) => e.currentTarget.style.transform = 'scale(0.99)'}
                  onMouseUp={(e) => e.currentTarget.style.transform = 'scale(1)'}
                >
                  {primaryCopied ? (
                    <><Check size={18} /> Re-open GitHub ✓</>
                  ) : (
                    <><GitBranch size={18} /> Re-open GitHub to verify</>
                  )}
                </button>
                <p className="text-xs text-center text-[#656d76] flex items-center justify-center gap-1">
                  <Check size={12} style={{ color: '#1a7f37' }} />
                  Code <span className="font-mono font-bold text-[#1a1a2e]">{authData.user_code}</span> copied to clipboard — paste it on GitHub
                </p>
              </div>

              <div className="flex items-center justify-center gap-2 mb-4" style={{ color: '#656d76' }}>
                <Loader2 size={16} className="animate-spin text-blue-500" />
                <span className="text-sm font-medium">Waiting for authorization...</span>
              </div>
              
              <p 
                className="text-xs" 
                style={{ color: timeLeft < 120 ? '#cf222e' : '#8c959f' }}
              >
                Code expires in <span className="font-semibold">{formatTime(timeLeft)}</span>
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  </>
  );
};

export default Landing;
